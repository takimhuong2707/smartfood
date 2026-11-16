"""
Script huấn luyện Mô hình 3: PortionNet (Ước lượng khẩu phần ăn từ hình ảnh)
Đồ án Chuyên ngành 2: Xây dựng hệ thống AI nhận diện và ước lượng khẩu phần món ăn.

Mô hình 3 kết hợp:
  - Backbone: EfficientNet-B0 trích xuất đặc trưng thị giác từ tô món ăn (1280 dims)
  - Embedding: Lớp nhúng danh mục món ăn (16 dims)
  - Regression Head: Dự đoán hệ số khẩu phần k = gram_thuc / khau_phan_chuan
"""

import argparse
import csv
import io
import json
import math
import os
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms
from PIL import Image


class PortionNet(nn.Module):
    """
    Kiến trúc PortionNet đồng bộ với main.py để có thể nạp trọng số trực tiếp.
    """
    def __init__(self, n_cls: int, pretrained: bool = True):
        super().__init__()
        weights = models.EfficientNet_B0_Weights.DEFAULT if pretrained else None
        b = models.efficientnet_b0(weights=weights)
        self.backbone = b.features
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.emb = nn.Embedding(n_cls, 16)
        self.head = nn.Sequential(
            nn.Linear(1280 + 16, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 1)
        )

    def features(self, x):
        return self.pool(self.backbone(x)).flatten(1)

    def from_features(self, f, c):
        return self.head(torch.cat([f, self.emb(c)], dim=1)).squeeze(1)

    def forward(self, x, c):
        f = self.features(x)
        return self.from_features(f, c)


class PortionDataset(Dataset):
    def __init__(self, samples, transform=None):
        self.samples = samples
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        item = self.samples[idx]
        image = Image.open(item["img_path"]).convert("RGB")
        if self.transform:
            image = self.transform(image)
        cls_idx = torch.tensor(item["class_idx"], dtype=torch.long)
        log_k = torch.tensor(item["log_k"], dtype=torch.float32)
        actual_gram = torch.tensor(item["gram_thuc"], dtype=torch.float32)
        serving = torch.tensor(item["serving"], dtype=torch.float32)
        return image, cls_idx, log_k, actual_gram, serving


def load_data(data_dir: Path, csv_can_to: Path, csv_nutrition: Path, classes_list: list):
    # Đọc bảng dinh dưỡng chuẩn
    raw_nut = csv_nutrition.read_text(encoding="utf-8-sig")
    head = raw_nut.splitlines()[0]
    delim = ";" if head.count(";") > head.count(",") else ","
    nut = {}
    for r in csv.DictReader(io.StringIO(raw_nut), delimiter=delim):
        r = {k.strip(): (v or "").strip() for k, v in r.items()}
        nut[r["class_name"]] = float(str(r["khau_phan_gram"]).replace(",", "."))

    class_to_id = {c: i for i, c in enumerate(classes_list)}

    # Đọc danh sách cân tô thực tế
    raw_can = csv_can_to.read_text(encoding="utf-8-sig")
    samples = []
    da_hoc_classes = set()

    for r in csv.DictReader(io.StringIO(raw_can)):
        meal_id = r["meal_id"].strip()
        gram_thuc = float(r["gram_thuc"].strip())
        cls_name = meal_id.rsplit("_", 1)[0]

        if cls_name not in nut or cls_name not in class_to_id:
            continue

        # Tìm file ảnh
        img_path = data_dir / f"{meal_id}.jpg"
        if not img_path.exists():
            img_path = data_dir / f"{meal_id}.png"
        if not img_path.exists():
            continue

        std_serving = nut[cls_name]
        k = gram_thuc / std_serving
        log_k = math.log(k)

        samples.append({
            "meal_id": meal_id,
            "img_path": img_path,
            "class_name": cls_name,
            "class_idx": class_to_id[cls_name],
            "gram_thuc": gram_thuc,
            "serving": std_serving,
            "k": k,
            "log_k": log_k,
        })
        da_hoc_classes.add(cls_name)

    return samples, sorted(list(da_hoc_classes))


def train():
    parser = argparse.ArgumentParser(description="Huấn luyện PortionNet")
    parser.add_argument("--epochs", type=int, default=35, help="Số epoch huấn luyện")
    parser.add_argument("--batch-size", type=int, default=16, help="Kích thước batch")
    parser.add_argument("--lr", type=float, default=3e-4, help="Learning rate")
    parser.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu")
    parser.add_argument("--save-dir", type=str, default="models")
    args = parser.parse_args()

    base_dir = Path(__file__).parent
    save_dir = Path(args.save_dir) if Path(args.save_dir).is_absolute() else base_dir / args.save_dir
    save_dir.mkdir(parents=True, exist_ok=True)

    # Đường dẫn dữ liệu
    candidate_data_dirs = [
        base_dir.parent.parent / "đồ án chuyên ngành 2" / "vn_food",
        base_dir / "data" / "vn_food",
        Path("D:/Download/ki1_nam4/đồ án chuyên ngành 2/vn_food"),
    ]

    vn_food_dir = None
    for p in candidate_data_dirs:
        if (p / "can_to.csv").exists():
            vn_food_dir = p
            break

    if not vn_food_dir:
        raise FileNotFoundError("Không tìm thấy thư mục vn_food chứa can_to.csv")

    img_dir = vn_food_dir / "anh_tung_to"
    can_csv = vn_food_dir / "can_to.csv"
    nut_csv = save_dir / "nutrition_v2.csv"
    if not nut_csv.exists():
        nut_csv = vn_food_dir / "nutrition_v2.csv"

    # Nạp 30 nhãn món ăn
    classes_json = save_dir / "portion_classes.json"
    if classes_json.exists():
        classes = json.load(open(classes_json, encoding="utf-8"))
    else:
        classes = [
            "banh_beo", "banh_bot_loc", "banh_can", "banh_canh", "banh_chung", "banh_cuon",
            "banh_duc", "banh_gio", "banh_khot", "banh_mi", "banh_pia", "banh_tet",
            "banh_trang_nuong", "banh_xeo", "bun_bo_hue", "bun_dau_mam_tom", "bun_mam",
            "bun_rieu", "bun_thit_nuong", "ca_kho_to", "canh_chua", "cao_lau", "chao_long",
            "com_tam", "goi_cuon", "hu_tieu", "mi_quang", "nem_chua", "pho", "xoi_xeo"
        ]
        with open(classes_json, "w", encoding="utf-8") as f:
            json.dump(classes, f, ensure_ascii=False)

    samples, da_hoc = load_data(img_dir, can_csv, nut_csv, classes)
    print(f"Tổng số mẫu ảnh có cân khối lượng: {len(samples)}")
    print(f"Các món ăn đã học trong tập train: {da_hoc}")

    # Chia Train/Val (80% - 20%)
    import random
    random.seed(42)
    random.shuffle(samples)
    split_idx = int(len(samples) * 0.8)
    train_samples = samples[:split_idx]
    val_samples = samples[split_idx:]

    tf_train = transforms.Compose([
        transforms.Resize((240, 240)),
        transforms.RandomCrop(224),
        transforms.RandomHorizontalFlip(),
        transforms.ColorJitter(brightness=0.15, contrast=0.15),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    tf_val = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    train_loader = DataLoader(PortionDataset(train_samples, tf_train), batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(PortionDataset(val_samples, tf_val), batch_size=args.batch_size, shuffle=False)

    device = torch.device(args.device)
    model = PortionNet(n_cls=len(classes), pretrained=True).to(device)

    criterion = nn.SmoothL1Loss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    best_mae = float("inf")
    all_k = [s["k"] for s in samples]
    k_min, k_max = min(all_k), max(all_k)

    print(f"\nBắt đầu huấn luyện PortionNet trên {device} ({args.epochs} epochs)...")
    for epoch in range(1, args.epochs + 1):
        model.train()
        total_loss = 0.0
        for imgs, cls_ids, log_k_targets, _, _ in train_loader:
            imgs, cls_ids, log_k_targets = imgs.to(device), cls_ids.to(device), log_k_targets.to(device)
            optimizer.zero_grad()
            preds = model(imgs, cls_ids)
            loss = criterion(preds, log_k_targets)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * len(imgs)

        scheduler.step()
        train_loss = total_loss / len(train_samples)

        # Đánh giá trên tập val
        model.eval()
        gram_errors = []
        with torch.no_grad():
            for imgs, cls_ids, _, actual_grams, servings in val_loader:
                imgs, cls_ids = imgs.to(device), cls_ids.to(device)
                preds = model(imgs, cls_ids)
                k_preds = torch.exp(preds).cpu()
                pred_grams = k_preds * servings
                diff = torch.abs(pred_grams - actual_grams)
                gram_errors.extend(diff.tolist())

        val_mae = sum(gram_errors) / len(gram_errors) if gram_errors else 0.0

        if val_mae < best_mae:
            best_mae = val_mae
            torch.save(model.state_dict(), save_dir / "portion_best.pt")
            config = {
                "k_min": k_min,
                "k_max": k_max,
                "da_hoc": da_hoc,
                "doi_ten": {}
            }
            with open(save_dir / "portion_config.json", "w", encoding="utf-8") as f:
                json.dump(config, f, indent=2, ensure_ascii=False)

        print(f"Epoch [{epoch:02d}/{args.epochs:02d}] - Loss: {train_loss:.4f} | Val MAE: {val_mae:.2f}g (Best: {best_mae:.2f}g)")

    print(f"\nHuấn luyện hoàn tất! Trọng số tối ưu đã được lưu tại: {save_dir / 'portion_best.pt'}")


if __name__ == "__main__":
    train()
