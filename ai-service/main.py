import csv
import io
import json
import time
from pathlib import Path

import torch
import torch.nn as nn
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError
from torchvision import models, transforms
from ultralytics import YOLO

BASE = Path(__file__).parent / "models"
DET_CONF = 0.4   # ngưỡng tin cậy của detector (giống notebook)
TOP_N = 3        # số món gợi ý cho mỗi phần ăn

for fname in ["detect_to_mon.pt", "food_cls.pt", "portion_best.pt",
              "portion_classes.json", "portion_config.json", "nutrition_v2.csv"]:
    if not (BASE / fname).exists():
        raise FileNotFoundError(f"Thiếu file models/{fname}")

# ---------- MÔ HÌNH 1: YOLO đếm và cắt từng phần ăn ----------
det = YOLO(str(BASE / "detect_to_mon.pt"))
# ---------- MÔ HÌNH 2: nhận món (30 lớp) ----------
cls_model = YOLO(str(BASE / "food_cls.pt"))


# ---------- BẢNG DINH DƯỠNG: tính cho MỘT KHẨU PHẦN CHUẨN ----------
def load_nutrition(path):
    raw = path.read_text(encoding="utf-8-sig")
    head = raw.splitlines()[0]
    delim = ";" if head.count(";") > head.count(",") else ","
    num = lambda v: float(str(v).replace(",", "."))
    nut = {}
    for r in csv.DictReader(io.StringIO(raw), delimiter=delim):
        r = {k.strip(): (v or "").strip() for k, v in r.items()}
        nut[r["class_name"]] = dict(
            name=r["ten_hien_thi"], serving=num(r["khau_phan_gram"]),
            kcal=num(r["kcal"]), protein=num(r["protein_g"]),
            carb=num(r["carb_g"]), fat=num(r["fat_g"]),
        )
    return nut


NUT = load_nutrition(BASE / "nutrition_v2.csv")

CLASSES = json.load(open(BASE / "portion_classes.json", encoding="utf-8"))
CID = {c: i for i, c in enumerate(CLASSES)}
cfg = json.load(open(BASE / "portion_config.json", encoding="utf-8"))
K_MIN, K_MAX = cfg["k_min"], cfg["k_max"]
DA_HOC = set(cfg["da_hoc"])        # các món đã có tô được cân trong tập train
DOI_TEN = cfg.get("doi_ten", {})   # ánh xạ tên lớp nếu khác class_name trong CSV

missing = [c for c in CLASSES if c not in NUT]
if missing:
    print(f"CẢNH BÁO: {len(missing)} món có trong mô hình nhưng thiếu trong nutrition_v2.csv: {missing}")


# ---------- MÔ HÌNH 3: ước lượng khẩu phần k = gram thật / khẩu phần chuẩn ----------
class PortionNet(nn.Module):
    # Phải giống hệt lớp trong notebook (tên thuộc tính khớp với file trọng số)
    def __init__(self, n_cls):
        super().__init__()
        b = models.efficientnet_b0(weights=None)   # không tải lại trọng số ImageNet
        self.backbone = b.features
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.emb = nn.Embedding(n_cls, 16)
        self.head = nn.Sequential(
            nn.Linear(1280 + 16, 128), nn.ReLU(), nn.Dropout(0.3), nn.Linear(128, 1)
        )

    def features(self, x):
        return self.pool(self.backbone(x)).flatten(1)

    def from_features(self, f, c):
        return self.head(torch.cat([f, self.emb(c)], 1)).squeeze(1)


portion = PortionNet(len(CLASSES))
portion.load_state_dict(torch.load(BASE / "portion_best.pt", map_location="cpu"))
portion.eval()

tf_ev = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])


def crop_bowl(im, box, fill=0.6):
    # Giống hệt notebook: cắt vuông quanh phần ăn, phần ăn chiếm ~60% khung
    x1, y1, x2, y2 = box
    cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
    s = max(x2 - x1, y2 - y1) / fill
    return im.crop((int(cx - s / 2), int(cy - s / 2), int(cx + s / 2), int(cy + s / 2)))


def scale(info, k):
    # gram và dinh dưỡng của khẩu phần chuẩn nhân với k
    return {
        "grams": round(k * info["serving"]),
        "nutrition": {
            "kcal": round(k * info["kcal"]),
            "protein": round(k * info["protein"], 1),
            "carb": round(k * info["carb"], 1),
            "fat": round(k * info["fat"], 1),
        },
    }


app = FastAPI(title="Food AI Service")


@app.get("/health")
def health():
    return {"ok": True, "foods": len(CLASSES), "inNutritionTable": len(NUT), "kRange": [K_MIN, K_MAX]}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...), same_dish: bool = False):
    # same_dish=true: cả ảnh là cùng một món (giống tham số cung_mon trong notebook)
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(400, "File phải là ảnh")
    try:
        im = ImageOps.exif_transpose(Image.open(io.BytesIO(await file.read()))).convert("RGB")
    except UnidentifiedImageError:
        raise HTTPException(400, "Không đọc được ảnh")

    t0 = time.time()

    # Bước 1 (mô hình 1): YOLO đếm số phần ăn
    boxes = det.predict(im, conf=DET_CONF, verbose=False)[0].boxes.xyxy.cpu().numpy().tolist()
    detected = len(boxes) > 0
    regions = boxes if detected else [None]   # không thấy phần nào: dùng cả ảnh

    # Bước 2 (mô hình 2): nhận món cho từng phần
    parts = []
    for i, bx in enumerate(regions, 1):
        if bx is None:
            pad, bowl = im, im
        else:
            x1, y1, x2, y2 = bx
            w, h = x2 - x1, y2 - y1
            pad = im.crop((max(0, x1 - .08 * w), max(0, y1 - .08 * h),
                           min(im.width, x2 + .08 * w), min(im.height, y2 + .08 * h)))
            bowl = crop_bowl(im, bx)
        probs = cls_model.predict(pad, verbose=False)[0].probs
        top = []
        for j, c in zip(probs.top5[:TOP_N], probs.top5conf[:TOP_N]):
            name = cls_model.names[int(j)]
            top.append((DOI_TEN.get(name, name), float(c)))
        parts.append({"index": i, "box": bx, "bowl": bowl, "top": top})

    if same_dish and len(parts) > 1:
        score = {}
        for p in parts:
            name, conf = p["top"][0]
            score[name] = score.get(name, 0.0) + conf
        chosen = max(score, key=score.get)
        for p in parts:
            p["top"] = ([(chosen, p["top"][0][1])] + [t for t in p["top"] if t[0] != chosen])[:TOP_N]

    # Bước 3 (mô hình 3 + bảng dinh dưỡng): khẩu phần k rồi gram, kcal, đạm, carb, béo
    items = []
    with torch.no_grad():
        for p in parts:
            f = portion.features(tf_ev(p["bowl"]).unsqueeze(0))   # đặc trưng ảnh tính một lần
            cands = []
            for name, conf in p["top"]:
                info = NUT.get(name)
                if info is None:
                    continue   # tên món không có trong bảng dinh dưỡng

                # Áp dụng mô hình 3 (PortionNet) ước lượng hệ số khẩu phần thực tế k từ ảnh
                if name in CID:
                    k_pred = torch.exp(portion.from_features(f, torch.tensor([CID[name]]))).detach()
                    k = float(k_pred.squeeze().cpu())
                    k, method = min(max(k, K_MIN), K_MAX), "ai"
                else:
                    k, method = 1.0, "standard"

                scaled = scale(info, k)
                std_serving = info["serving"]
                small_grams = round(std_serving * 0.75)
                large_grams = round(std_serving * 1.25)

                cands.append({
                    "classId": name,
                    "name": info["name"],
                    "confidence": round(conf, 4),
                    "k": round(k, 3),
                    "method": method,
                    "grams": scaled["grams"],
                    "nutrition": scaled["nutrition"],
                    "portionOptions": [
                        {
                            "label": "Nhỏ",
                            "grams": small_grams,
                            "kValue": round(small_grams / std_serving, 2),
                            "isAiEstimated": False,
                            **scale(info, 0.75)["nutrition"],
                        },
                        {
                            "label": "Vừa",
                            "grams": scaled["grams"],
                            "kValue": round(k, 3),
                            "isDefault": True,
                            "isAiEstimated": method == "ai",
                            **scaled["nutrition"],
                        },
                        {
                            "label": "Lớn",
                            "grams": large_grams,
                            "kValue": round(large_grams / std_serving, 2),
                            "isAiEstimated": False,
                            **scale(info, 1.25)["nutrition"],
                        },
                    ],
                })
            if cands:
                items.append({
                    "index": p["index"],
                    "box": [round(v, 1) for v in p["box"]] if p["box"] else None,
                    "candidates": cands,
                })

    # Tổng của cả ảnh, tính theo món đứng đầu của từng phần
    total = {"grams": 0, "kcal": 0, "protein": 0.0, "carb": 0.0, "fat": 0.0}
    for it in items:
        c = it["candidates"][0]
        total["grams"] += c["grams"]
        for key in ("kcal", "protein", "carb", "fat"):
            total[key] += c["nutrition"][key]
    total = {k: round(v, 1) for k, v in total.items()}

    return {
        "detected": detected,
        "count": len(boxes),     # số phần (tô) YOLO đếm được
        "items": items,
        "total": total,
        "inferenceMs": int((time.time() - t0) * 1000),
    }