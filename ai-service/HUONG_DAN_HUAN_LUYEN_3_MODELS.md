# TÀI LIỆU HƯỚNG DẪN HUẤN LUYỆN VÀ KẾT NỐI 3 MÔ HÌNH AI (SMARTFOOD)
**Đề tài**: Xây dựng hệ thống AI nhận diện và ước lượng khẩu phần món ăn từ hình ảnh kết hợp phân tích dinh dưỡng cá nhân hóa.

---

## I. TỔNG QUAN KIẾN TRÚC 3 MÔ HÌNH AI

Hệ thống AI không chỉ dừng lại ở việc tra bảng dinh dưỡng tĩnh mà vận hành theo **chuỗi suy luận khép kín (AI Inference Pipeline)** gồm 3 mô hình liên tiếp:

```
                  [ ẢNH CHỤP BỮA ĂN (CAMERA / THƯ VIỆN) ]
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │   MÔ HÌNH 1: YOLOv8 Detector (detect_to_mon.pt)        │
       │   - Đếm số lượng tô/phần ăn trên bàn (Bowl Count)      │
       │   - Xác định tọa độ Bounding Boxes [x1, y1, x2, y2]     │
       └────────────────────────────┬───────────────────────────┘
                                    │
                     Cắt (Crop) từng phần ăn độc lập
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌───────────────────────────────────────┐  ┌────────────────────────────────────────┐
│  MÔ HÌNH 2: YOLOv8 Cls (food_cls.pt)  │  │  MÔ HÌNH 3: PortionNet (portion_best)  │
│  - Nhận diện tên món ăn               │  │  - EfficientNet-B0 + Food Embedding    │
│  - Phân loại 30 món ăn Việt Nam       │  │  - Ước lượng hệ số khẩu phần thực tế k │
│  - Trả về Top 3 món kèm % độ tin cậy  │  │  - gram_thuc = k * serving_chuan       │
└───────────────────┬───────────────────┘  └───────────────────┬────────────────────┘
                    │                                          │
                    └───────────────────┬──────────────────────┘
                                        │
                                        ▼
             ┌───────────────────────────────────────────────────────┐
             │            TÍNH TOÁN DINH DƯỠNG CÁ NHÂN HÓA           │
             │  kcal = (nutritionPer100g.kcal * gram_thuc) / 100     │
             │  protein, carb, fat, fiber theo khối lượng thực tế    │
             └──────────────────────────┬────────────────────────────┘
                                        │
                                        ▼
             [ LƯU VÀO CSDL: meals, meal_items, ai_predictions ]
```

---

## II. CHI TIẾT HUẤN LUYỆN TỪNG MÔ HÌNH

### 1. MÔ HÌNH 1: Đếm và Định vị Tô/Phần Ăn (`detect_to_mon.pt`)
- **Mục tiêu**: Phát hiện chính xác vị trí và đếm số lượng tô/dĩa/phần ăn trong bức ảnh (hỗ trợ cả ảnh 1 món và ảnh nhiều món/nhiều tô trên một bàn ăn).
- **Kiến trúc**: YOLOv8 Nano hoặc Small Object Detection (`yolov8s.pt` / `yolov8n.pt`).
- **Dữ liệu**: Tập ảnh `anh_nhieu_to` (370 ảnh) và `anh_tung_to` (140 ảnh) được gán nhãn bounding box (label `to_mon`).
- **Lệnh huấn luyện YOLOv8**:
  ```bash
  yolo detect train data=dataset_detect_to.yaml model=yolov8n.pt epochs=80 imgsz=640 batch=16 name=detect_to_mon
  ```
- **Đầu ra**: Trọng số `best.pt` đổi tên thành `detect_to_mon.pt` lưu vào `ai-service/models/`.

---

### 2. MÔ HÌNH 2: Phân loại 30 Món Ăn Việt Nam (`food_cls.pt`)
- **Mục tiêu**: Nhận diện loại món ăn sau khi đã crop ảnh vùng tô từ Mô hình 1.
- **Kiến trúc**: YOLOv8 Classification (`yolov8s-cls.pt` hoặc `yolov8n-cls.pt`).
- **30 nhãn món ăn**:
  `banh_beo`, `banh_bot_loc`, `banh_can`, `banh_canh`, `banh_chung`, `banh_cuon`, `banh_duc`, `banh_gio`, `banh_khot`, `banh_mi`, `banh_pia`, `banh_tet`, `banh_trang_nuong`, `banh_xeo`, `bun_bo_hue`, `bun_dau_mam_tom`, `bun_mam`, `bun_rieu`, `bun_thit_nuong`, `ca_kho_to`, `canh_chua`, `cao_lau`, `chao_long`, `com_tam`, `goi_cuon`, `hu_tieu`, `mi_quang`, `nem_chua`, `pho`, `xoi_xeo`.
- **Lệnh huấn luyện**:
  ```bash
  yolo classify train data=dataset_30_foods model=yolov8s-cls.pt epochs=60 imgsz=224 batch=32 name=food_cls
  ```
- **Đầu ra**: Trọng số `best.pt` đổi tên thành `food_cls.pt` lưu vào `ai-service/models/`.

---

### 3. MÔ HÌNH 3: Ước lượng Khẩu phần Thực tế (`portion_best.pt`)
- **Mục tiêu**: Ước lượng hệ số tỉ lệ $k$ giữa khối lượng thực tế trong ảnh so với khẩu phần chuẩn:
  $$k = \frac{\text{gram thực tế}}{\text{khẩu phần chuẩn (g)}}$$
  từ đó:
  $$\text{gram thực tế} = k \times \text{khẩu phần chuẩn}$$
- **Kiến trúc (PortionNet)**:
  - **Backbone**: `EfficientNet-B0` (1280 đặc trưng thị giác của tô sau khi được cắt vuông chiếm ~60% khung).
  - **Class Embedding**: `nn.Embedding(30, 16)` (vector nhúng 16 chiều đại diện cho đặc tính của món).
  - **Regression Head**: `Linear(1296, 128) -> ReLU -> Dropout(0.3) -> Linear(128, 1)` dự đoán $\log(k)$ hoặc $k$.
- **Tập dữ liệu**: `anh_tung_to/` kết hợp bảng cân thực nghiệm `can_to.csv` (`meal_id, gram_thuc`).
- **Chạy script huấn luyện**:
  ```powershell
  cd d:\Download\ki1_nam4\dacn2\smartfood\ai-service
  .\venv\Scripts\python.exe train_portion.py --epochs 35 --batch-size 16
  ```
- **Đầu ra**:
  - `portion_best.pt`: File trọng số mô hình tốt nhất (Val MAE thấp nhất).
  - `portion_config.json`: Giới hạn `k_min`, `k_max`, danh sách món đã cân.
  - `portion_classes.json`: Danh mục 30 món ăn.

---

## III. NGUYÊN LÝ HOẠT ĐỘNG TRONG HỆ THỐNG

1. **Không phụ thuộc cứng vào bảng dinh dưỡng**:
   - Trước đây nếu chỉ lấy cố định từ bảng tĩnh, một tô bún bò sẽ luôn luôn là 600g (540 kcal) bất kể người dùng ăn tô nhỏ hay tô lớn.
   - Với **Mô hình 3 (PortionNet)**: Mô hình nhìn vào diện tích, độ đầy của tô thức ăn trong ảnh và dự đoán hệ số $k$ (ví dụ $k = 0.92$). Hệ thống tính ra $\text{gram} = 0.92 \times 600 = 550\text{g}$, từ đó Kcal thực tế là $540 \times 0.92 = 497\text{ kcal}$.
2. **Xử lý ảnh nhiều tô**:
   - Mô hình 1 đếm số tô và trả về danh sách `items` kèm `count`.
   - Ứng dụng di động cung cấp tab chuyển đổi giữa các tô (`Tô #1`, `Tô #2`...) để người dùng kiểm tra kết quả nhận diện và khẩu phần cho từng tô.
3. **Lưu trữ CSDL chuẩn đồ án**:
   - `ai_predictions`: Lưu thông tin cả 3 models (`modelVersion`, `bowlCount`, `detected`, `top3`, $k$, grams).
   - `meals` & `meal_items`: Lưu bữa ăn, món ăn, khẩu phần thực tế, và lượng calo/macros được cập nhật theo đúng thời gian thực.
