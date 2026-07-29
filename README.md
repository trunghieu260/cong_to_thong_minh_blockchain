# XÂY DỰNG HỆ THỐNG CÔNG TƠ ĐIỆN THÔNG MINH ỨNG DỤNG BLOCKCHAIN

## 1. Giới thiệu

Dự án xây dựng hệ thống đọc chỉ số công tơ điện tự động bằng công nghệ OCR kết hợp Blockchain.

Hệ thống gồm:

- Frontend React:
  - Upload ảnh công tơ điện.
  - Gửi ảnh sang server OCR.
  - Hiển thị kết quả nhận diện.
  - Tính tiền điện theo bậc thang.
  - Ghi chỉ số điện và hóa đơn lên Blockchain thông qua MetaMask.

- Backend Python Flask:
  - Nhận ảnh công tơ.
  - Tiền xử lý ảnh bằng OpenCV.
  - Nhận diện số bằng EasyOCR.
  - Trả kết quả OCR qua REST API.

- Blockchain:
  - Lưu chỉ số điện.
  - Lưu thông tin hóa đơn.
  - Theo dõi trạng thái thanh toán.

---

# 2. Kiến trúc hệ thống

```
             Ảnh công tơ điện
                    |
                    |
              React Frontend
                    |
                    |
              Flask OCR API
                    |
        OpenCV + EasyOCR xử lý ảnh
                    |
                    |
          Kết quả chỉ số điện
                    |
                    |
          Tính tiền điện bậc thang
                    |
                    |
             MetaMask Wallet
                    |
                    |
        Smart Contract Ethereum Sepolia
```

---

# 3. Công nghệ sử dụng

## Frontend

- ReactJS
- JavaScript
- ethers.js
- MetaMask

## Backend

- Python
- Flask
- Flask-CORS
- OpenCV
- NumPy
- EasyOCR
- Pillow

## Blockchain

- Solidity Smart Contract
- Ethereum Sepolia Testnet
- ethers.js

---

# 4. Chức năng hệ thống

## 4.1 Nhận diện công tơ bằng OCR

Người dùng:

1. Chọn ảnh công tơ.
2. Gửi ảnh tới Flask server.
3. Backend xử lý:

- Chuyển ảnh RGB sang grayscale.
- Tăng tương phản bằng CLAHE.
- Nhị phân hóa bằng Otsu Threshold.
- Khử nhiễu Median Blur.
- OCR chỉ nhận ký tự:

```
0123456789.
```

Kết quả trả về:

```json
{
    "success": true,
    "value": "12345",
    "confidence": 0.95
}
```

---

## 4.2 Tính tiền điện

Hệ thống sử dụng biểu giá 3 bậc:

| Bậc | Sản lượng | Giá |
|-|-|-|
| Bậc 1 | 0 - 100 kWh | 1678 VNĐ/kWh |
| Bậc 2 | 101 - 200 kWh | 2051 VNĐ/kWh |
| Bậc 3 | >200 kWh | 2749 VNĐ/kWh |


Công thức:

```
Điện tiêu thụ = Chỉ số mới - Chỉ số cũ
```

Tiền điện được tính tự động theo từng bậc.

---

# 5. Cấu trúc thư mục

```
SmartMeter/
│
├── backend/
│   ├── app.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   └── MeterReadingUpload.jsx
│   ├── package.json
│
└── README.md
```

---

# 6. Cài đặt Backend

## Yêu cầu

- Python >= 3.10


## Cài thư viện

Vào thư mục backend:

```bash
cd backend
```

Cài đặt:

```bash
pip install flask flask-cors opencv-python numpy easyocr pillow
```


Hoặc:

```bash
pip install -r requirements.txt
```


---

# 7. Chạy Flask OCR Server


Chạy:

```bash
python app.py
```


Server chạy tại:

```
http://localhost:5000
```


Kiểm tra:

```
GET /health
```


Kết quả:

```json
{
 "status":"ok"
}
```

---

# 8. Cài đặt Frontend


Yêu cầu:

- NodeJS >= 18


Cài thư viện:

```bash
npm install
```


Cài ethers:

```bash
npm install ethers
```


Chạy React:

```bash
npm start
```


Frontend chạy:

```
http://localhost:3000
```

---

# 9. Kết nối Blockchain


Hệ thống sử dụng:

- MetaMask
- Ethereum Sepolia Testnet


Cấu hình trong React:

```javascript
const CONTRACT_ADDRESS =
"0x4710Eead581235ab111dE62ecdc50428F81e4233";
```


ABI Smart Contract được khai báo trong:

```
CONTRACT_ABI
```


---

# 10. Quy trình hoạt động


## Bước 1

Nhập:

```
Meter ID
```

Ví dụ:

```
CT001
```


## Bước 2

Upload ảnh công tơ.


## Bước 3

Nhấn:

```
Nhận diện số từ ảnh (OCR)
```


Backend trả về chỉ số điện.


## Bước 4

Nhập:

```
Chỉ số kỳ trước
```


Ví dụ:

```
1000 kWh
```


OCR nhận:

```
1250 kWh
```


Hệ thống tính:

```
1250 - 1000 = 250 kWh
```


## Bước 5

Tính tiền điện.


## Bước 6

Kết nối MetaMask.


Smart Contract thực hiện:

```
addReading()
```

Lưu chỉ số điện.


Sau đó:

```
createBill()
```

Tạo hóa đơn.


---

# 11. Smart Contract Functions sử dụng


## Lưu chỉ số điện

```solidity
addReading(
    string meterId,
    uint256 value
)
```


## Tạo hóa đơn

```solidity
createBill(
    string meterId,
    uint256 month,
    uint256 year,
    uint256 totalUnit,
    uint256 amount
)
```


---

# 12. API Backend


## Upload ảnh OCR


Endpoint:

```
POST /api/ocr
```


Request:

```
multipart/form-data

image: file ảnh
```


Response thành công:

```json
{
 "success": true,
 "value":"12345",
 "confidence":0.96
}
```


Response lỗi:

```json
{
 "success":false,
 "error":"Không nhận diện được số"
}
```


---

# 13. Điểm nổi bật

- Không sử dụng MySQL.
- Không sử dụng ESP32-CAM.
- Không cần database trung gian.
- Dữ liệu hóa đơn lưu trực tiếp trên Blockchain.
- OCR tự động đọc công tơ từ ảnh.
- Minh bạch lịch sử điện năng.
- Có thể mở rộng IoT trong tương lai.

---

# 14. Hạn chế

- OCR phụ thuộc chất lượng ảnh.
- Chưa tự động chụp ảnh công tơ.
- Smart Contract đang chạy trên Testnet.
- Chưa tích hợp thanh toán thật.

---

# 15. Hướng phát triển

- Kết nối ESP32-CAM để tự chụp ảnh.
- Lưu ảnh lên IPFS.
- Thêm Dashboard quản lý điện.
- Thêm cảnh báo tiêu thụ điện bất thường.
- Triển khai Smart Contract lên Mainnet.

