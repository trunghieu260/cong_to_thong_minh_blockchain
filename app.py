import re
import io

import cv2
import numpy as np
import easyocr
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image

app = Flask(__name__)
CORS(app) 
reader = easyocr.Reader(["en"], gpu=False)


def preprocess_image(pil_image: Image.Image) -> np.ndarray:
    """
    Tiền xử lý ảnh công tơ điện trước khi đưa vào OCR:
    - Chuyển ảnh xám
    - CLAHE (tăng tương phản cục bộ) để xử lý ảnh chụp thiếu sáng/lóa
    - Otsu threshold để tách chữ số khỏi nền
    """
    img = np.array(pil_image.convert("RGB"))
    img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    # Otsu threshold tự động chọn ngưỡng nhị phân hoá
    _, thresh = cv2.threshold(
        enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )

    # Khử nhiễu nhỏ
    denoised = cv2.medianBlur(thresh, 3)

    return denoised


def extract_best_number(detections):
    """
    Từ danh sách kết quả OCR (bbox, text, confidence), chọn chuỗi số dài nhất
    và có độ tin cậy cao nhất — thường là chỉ số công tơ chính giữa khung hình.
    """
    candidates = []
    for _, text, conf in detections:
        cleaned = re.sub(r"[^0-9.]", "", text)
        if cleaned:
            candidates.append((cleaned, conf))

    if not candidates:
        return None, 0.0

    # Ưu tiên chuỗi dài nhất, nếu bằng nhau thì lấy confidence cao hơn
    candidates.sort(key=lambda x: (len(x[0]), x[1]), reverse=True)
    return candidates[0]


@app.route("/api/ocr", methods=["POST"])
def ocr_meter_reading():
    if "image" not in request.files:
        return jsonify({"success": False, "error": "Thiếu file ảnh (field 'image')"}), 400

    file = request.files["image"]

    try:
        pil_image = Image.open(io.BytesIO(file.read()))
    except Exception:
        return jsonify({"success": False, "error": "File ảnh không hợp lệ"}), 400

    processed = preprocess_image(pil_image)

    # allowlist chỉ cho phép nhận diện số, tăng độ chính xác đáng kể
    detections = reader.readtext(
        processed,
        allowlist="0123456789.",
        detail=1,
    )

    value, confidence = extract_best_number(detections)

    if value is None:
        return jsonify({
            "success": False,
            "error": "Không nhận diện được số nào trong ảnh, vui lòng nhập tay.",
            "raw_detections": [d[1] for d in detections],
        }), 200

    return jsonify({
        "success": True,
        "value": value,
        "confidence": round(float(confidence), 3),
        "raw_detections": [{"text": d[1], "confidence": round(float(d[2]), 3)} for d in detections],
    })


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
