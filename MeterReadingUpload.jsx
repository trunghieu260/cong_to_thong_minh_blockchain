import React, { useState, useRef } from "react";
import { ethers } from "ethers";

/* =========================================================
   CẤU HÌNH BẬC THANG GIÁ ĐIỆN (tự định nghĩa - 3 bậc)
   Đơn vị: VNĐ/kWh
   ========================================================= */
const PRICE_TIERS = [
  { limit: 100, price: 1678 },   // Bậc 1: 0 - 100 kWh
  { limit: 200, price: 2051 },   // Bậc 2: 101 - 200 kWh
  { limit: Infinity, price: 2749 }, // Bậc 3: > 200 kWh
];

// Địa chỉ backend Python OCR (đổi lại nếu deploy nơi khác)
const OCR_API_URL = "http://localhost:5000";

/**
 * Tính tổng tiền điện theo biểu giá bậc thang.
 */
export function calculateBill(units) {
  let remaining = units;
  let prevLimit = 0;
  let amount = 0;
  const breakdown = [];

  for (const tier of PRICE_TIERS) {
    if (remaining <= 0) break;
    const tierCapacity = tier.limit - prevLimit;
    const unitsInTier = Math.min(remaining, tierCapacity);

    if (unitsInTier > 0) {
      const cost = unitsInTier * tier.price;
      amount += cost;
      breakdown.push({
        from: prevLimit,
        to: prevLimit + unitsInTier,
        units: unitsInTier,
        price: tier.price,
        cost,
      });
    }

    remaining -= unitsInTier;
    prevLimit = tier.limit;
  }

  return { amount: Math.round(amount), breakdown };
}

/* =========================================================
   CONTRACT CONFIG - điền ABI + address hợp đồng SmartMeter
   ========================================================= */
const CONTRACT_ADDRESS = "0x4710Eead581235ab111dE62ecdc50428F81e4233";
const CONTRACT_ABI = [
  [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_meterId",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "_wallet",
        "type": "address"
      }
    ],
    "name": "addCustomer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_meterId",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "addReading",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "billId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "meterId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "BillCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "billId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "payer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "BillPaid",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "changeOwner",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_meterId",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_month",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_year",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_totalUnit",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      }
    ],
    "name": "createBill",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "customerId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "fullName",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "meterId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "wallet",
        "type": "address"
      }
    ],
    "name": "CustomerAdded",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_billId",
        "type": "uint256"
      }
    ],
    "name": "payBill",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "readingId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "meterId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "electricValue",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "ReadingAdded",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  },
  {
    "inputs": [],
    "name": "billCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "bills",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "billId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "meterId",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "month",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "year",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalUnit",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "paid",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "paidTime",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "customerCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "customers",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "customerId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "fullName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "meterId",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "wallet",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "exists",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllBills",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "billId",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "meterId",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "month",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "year",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalUnit",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "paid",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "paidTime",
            "type": "uint256"
          }
        ],
        "internalType": "struct SmartMeter.Bill[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllCustomers",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "customerId",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "fullName",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "meterId",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "wallet",
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "exists",
            "type": "bool"
          }
        ],
        "internalType": "struct SmartMeter.Customer[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllReadings",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "readingId",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "meterId",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "electricValue",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          }
        ],
        "internalType": "struct SmartMeter.Reading[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "getBill",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_billId",
        "type": "uint256"
      }
    ],
    "name": "getBillStatus",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "getCustomer",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getLatestBill",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getLatestReading",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "getReading",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "readingCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "readings",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "readingId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "meterId",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "electricValue",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]
];

export default function MeterReadingUpload() {
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [ocrConfidence, setOcrConfidence] = useState(null);
  const [ocrError, setOcrError] = useState("");
  const [manualValue, setManualValue] = useState("");
  const [previousValue, setPreviousValue] = useState("");
  const [meterId, setMeterId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [billResult, setBillResult] = useState(null);
  const [txStatus, setTxStatus] = useState("");
  const fileInputRef = useRef(null);

  // ---- 1. Chọn ảnh ----
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setOcrError("");
    setOcrConfidence(null);
  };

  // ---- 2. Gửi ảnh lên backend Python để OCR ----
  const handleRunOcr = async () => {
    if (!imageFile) {
      alert("Vui lòng chọn ảnh công tơ trước.");
      return;
    }

    setIsProcessing(true);
    setOcrError("");

    try {
      const formData = new FormData();
      formData.append("image", imageFile);

      const res = await fetch(OCR_API_URL, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setManualValue(data.value);
        setOcrConfidence(data.confidence);
      } else {
        setOcrError(data.error || "Không nhận diện được, vui lòng nhập tay.");
      }
    } catch (err) {
      console.error("Lỗi gọi OCR API:", err);
      setOcrError(
        "Không kết nối được backend OCR (kiểm tra server Python đã chạy chưa)."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // ---- 3. Tính tiền điện ----
  const handleCalculate = () => {
    const current = parseFloat(manualValue);
    const previous = parseFloat(previousValue);

    if (isNaN(current) || isNaN(previous)) {
      alert("Vui lòng nhập đầy đủ chỉ số điện (cũ và mới hợp lệ).");
      return;
    }
    if (current < previous) {
      alert("Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ.");
      return;
    }

    const units = current - previous;
    const result = calculateBill(units);
    setBillResult({ units, ...result });
  };

  // ---- 4. Gửi lên blockchain ----
  const handleSubmitToChain = async () => {
    if (!window.ethereum) {
      alert("Vui lòng cài đặt MetaMask.");
      return;
    }
    if (!meterId || !billResult) {
      alert("Cần nhập Meter ID và tính tiền điện trước khi gửi.");
      return;
    }

    try {
      setTxStatus("Đang kết nối ví...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const current = parseFloat(manualValue);

      setTxStatus("Đang gửi chỉ số công tơ (addReading)...");
      const tx1 = await contract.addReading(meterId, Math.round(current));
      await tx1.wait();

      const now = new Date();
      setTxStatus("Đang tạo hóa đơn (createBill)...");
      const tx2 = await contract.createBill(
        meterId,
        now.getMonth() + 1,
        now.getFullYear(),
        Math.round(billResult.units),
        billResult.amount
      );
      await tx2.wait();

      setTxStatus("✅ Đã ghi chỉ số và tạo hóa đơn thành công trên Sepolia!");
    } catch (err) {
      console.error(err);
      setTxStatus("❌ Giao dịch thất bại: " + (err.reason || err.message));
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Nhập chỉ số công tơ điện</h2>

      <label style={styles.label}>Mã công tơ (Meter ID)</label>
      <input
        style={styles.input}
        value={meterId}
        onChange={(e) => setMeterId(e.target.value)}
        placeholder="VD: CT001"
      />

      <label style={styles.label}>Ảnh công tơ điện</label>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleImageSelect}
      />

      {imagePreview && (
        <img src={imagePreview} alt="preview" style={styles.preview} />
      )}

      <button
        style={styles.button}
        onClick={handleRunOcr}
        disabled={!imageFile || isProcessing}
      >
        {isProcessing ? "Đang nhận diện..." : "Nhận diện số từ ảnh (OCR)"}
      </button>

      {ocrConfidence !== null && (
        <p style={styles.ocrText}>
          Độ tin cậy nhận diện: <strong>{(ocrConfidence * 100).toFixed(1)}%</strong>
          {ocrConfidence < 0.6 && (
            <span style={{ color: "#b45309" }}>
              {" "}
              — độ tin cậy thấp, vui lòng kiểm tra lại số bên dưới.
            </span>
          )}
        </p>
      )}
      {ocrError && <p style={{ color: "#dc2626" }}>{ocrError}</p>}

      <label style={styles.label}>Chỉ số kỳ trước (kWh)</label>
      <input
        style={styles.input}
        type="number"
        value={previousValue}
        onChange={(e) => setPreviousValue(e.target.value)}
      />

      <label style={styles.label}>
        Chỉ số hiện tại (kWh) — tự động điền từ OCR, có thể sửa tay
      </label>
      <input
        style={styles.input}
        type="number"
        value={manualValue}
        onChange={(e) => setManualValue(e.target.value)}
      />

      <button style={styles.button} onClick={handleCalculate}>
        Tính tiền điện
      </button>

      {billResult && (
        <div style={styles.result}>
          <p>
            <strong>Số điện tiêu thụ:</strong> {billResult.units} kWh
          </p>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Bậc (kWh)</th>
                <th>Số kWh</th>
                <th>Đơn giá</th>
                <th>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {billResult.breakdown.map((b, i) => (
                <tr key={i}>
                  <td>
                    {b.from} - {b.to}
                  </td>
                  <td>{b.units}</td>
                  <td>{b.price.toLocaleString()} đ</td>
                  <td>{b.cost.toLocaleString()} đ</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={styles.total}>
            Tổng tiền: <strong>{billResult.amount.toLocaleString()} VNĐ</strong>
          </p>

          <button style={styles.buttonPrimary} onClick={handleSubmitToChain}>
            Gửi lên Blockchain (addReading + createBill)
          </button>
          {txStatus && <p>{txStatus}</p>}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: 500, margin: "0 auto", fontFamily: "sans-serif" },
  title: { textAlign: "center" },
  label: { display: "block", marginTop: 12, fontWeight: 600 },
  input: {
    width: "100%",
    padding: 8,
    marginTop: 4,
    border: "1px solid #ccc",
    borderRadius: 6,
  },
  preview: { width: "100%", marginTop: 10, borderRadius: 6 },
  ocrText: { fontSize: 13, color: "#555" },
  button: {
    marginTop: 16,
    padding: "8px 16px",
    background: "#eee",
    border: "1px solid #ccc",
    borderRadius: 6,
    cursor: "pointer",
  },
  buttonPrimary: {
    marginTop: 12,
    padding: "10px 18px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  result: {
    marginTop: 20,
    padding: 12,
    background: "#f9fafb",
    borderRadius: 8,
  },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 8 },
  total: { fontSize: 18, marginTop: 10 },
};
