# Tài liệu API Thanh toán & Cơ chế Idempotency (Payments API & Idempotency) — BrewLite

Tài liệu chi tiết về API thanh toán không dùng tiền mặt, cơ chế chống trừ tiền trùng lặp (**Idempotency**), mô hình hướng đối tượng (**Strategy Pattern & Polymorphism**), và máy trạng thái đơn hàng (**Order State Machine**).

---

## 1. Tổng quan Kiến trúc Thanh toán (Architecture Overview)

Module thanh toán (`PaymentsModule`) áp dụng các nguyên lý **OOP & SOLID**:
- **Strategy Pattern (Đa hình - Polymorphism):** Cung cấp lớp trừu tượng `PaymentStrategy` và 2 lớp cụ thể `WalletPaymentStrategy` (Ví điện tử) và `CardPaymentStrategy` (Thẻ ngân hàng). `PaymentsService` gọi phương thức `.charge()` thông qua interface mà không phụ thuộc vào triển khai cụ thể.
- **Idempotency (Tính bất biến theo khóa):** Sử dụng trường `idempotencyKey` duy nhất cho mỗi giao dịch để đảm bảo khi khách hàng bấm đúp, mạng chập chờn hoặc retry thì hệ thống **không bao giờ trừ tiền 2 lần**.
- **ACID Transaction:** Sử dụng `this.prisma.$transaction` để cập nhật đồng bộ 3 thực thể trong PostgreSQL:
  1. Trạng thái giao dịch `Payment` (`PENDING` $\rightarrow$ `SUCCESS` hoặc `FAILED`).
  2. Trạng thái đơn hàng `Order` (`PENDING` / `PAYMENT_FAILED` $\rightarrow$ `PAID` hoặc `PAYMENT_FAILED`).
  3. Điểm tích lũy thành viên `User.loyaltyPoints` (chỉ cộng khi thanh toán thành công).

---

## 2. Danh sách Endpoints

### 2.1. Thực hiện thanh toán đơn hàng

- **Method:** `POST`
- **Path:** `/payments`
- **Headers:** `Content-Type: application/json`

#### Request Body (DTO: `CreatePaymentDto`):
```json
{
  "orderId": 1,
  "method": "WALLET",
  "idempotencyKey": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "mockSuccess": true
}
```

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `orderId` | `number` | Có | ID đơn hàng trong cơ sở dữ liệu (`@IsInt()`, `@Min(1)`) |
| `method` | `string` | Có | Phương thức: `WALLET` hoặc `CARD` (`@IsEnum(PaymentMethod)`) |
| `idempotencyKey` | `string` | Có | Khóa UUID duy nhất chống trùng lặp (`@IsString()`, `@IsNotEmpty()`) |
| `mockSuccess` | `boolean` | Không | Cờ giả lập thành công/thất bại (mặc định: `true`) phục vụ demo |

#### Response (201 Created):

##### Lần gọi đầu tiên (Giao dịch mới):
```json
{
  "success": true,
  "isIdempotent": false,
  "orderId": 1,
  "orderStatus": "PAID",
  "payment": {
    "id": 1,
    "orderId": 1,
    "idempotencyKey": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "amount": 123000,
    "method": "WALLET",
    "status": "SUCCESS",
    "mockSuccess": true,
    "transactionRef": "WALLET_1740000000000",
    "createdAt": "2026-10-26T14:30:00.000Z"
  },
  "errorMessage": null
}
```

##### Khi gửi lại cùng `idempotencyKey` (Tránh trừ tiền trùng):
```json
{
  "success": true,
  "isIdempotent": true,
  "orderId": 1,
  "orderStatus": "PAID",
  "payment": {
    "id": 1,
    "orderId": 1,
    "idempotencyKey": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "amount": 123000,
    "method": "WALLET",
    "status": "SUCCESS",
    "mockSuccess": true,
    "transactionRef": "WALLET_1740000000000",
    "createdAt": "2026-10-26T14:30:00.000Z"
  }
}
```

#### Các mã lỗi HTTP:
- **`400 Bad Request`:**
  - Thiếu hoặc sai định dạng các trường trong DTO (`class-validator`).
  - Vi phạm **Order State Machine**: Đơn hàng đã ở trạng thái `PAID`, `PREPARING`, `READY`, `COMPLETED`, hoặc `CANCELLED`.
- **`404 Not Found`:** Không tìm thấy đơn hàng với `orderId` tương ứng.
- **`409 Conflict`:** Khóa `idempotencyKey` đã được sử dụng cho một yêu cầu thanh toán khác (khác đơn hàng, khác phương thức).

---

### 2.2. Lấy lịch sử giao dịch theo Đơn hàng

- **Method:** `GET`
- **Path:** `/payments/order/:orderId`
- **Response (200 OK):**
```json
[
  {
    "id": 1,
    "orderId": 1,
    "idempotencyKey": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "amount": 123000,
    "method": "WALLET",
    "status": "SUCCESS",
    "mockSuccess": true,
    "transactionRef": "WALLET_1740000000000",
    "createdAt": "2026-10-26T14:30:00.000Z"
  }
]
```

---

### 2.3. Lấy chi tiết giao dịch thanh toán theo ID

- **Method:** `GET`
- **Path:** `/payments/:id`
- **Response (200 OK):** Chi tiết bản ghi `Payment`.

---

## 3. Order State Machine trong Luồng Thanh toán

```text
               +----------------------------------+
               |             PENDING              |
               +----------------------------------+
                     |                      |
      Thanh toán     |                      | Thanh toán
      thành công     |                      | thất bại
                     v                      v
          +--------------------+  Retry   +--------------------+
          |        PAID        | <------- |   PAYMENT_FAILED   |
          +--------------------+          +--------------------+
                     |                              |
                     v                              | Khách hủy
          +--------------------+                    v
          |     PREPARING      |          +--------------------+
          +--------------------+          |     CANCELLED      |
                     |                    +--------------------+
                     v
          +--------------------+
          |       READY        |
          +--------------------+
                     |
                     v
          +--------------------+
          |     COMPLETED      |
          +--------------------+
```

- **Hợp lệ:**
  - `PENDING` $\rightarrow$ `PAID` (thành công)
  - `PENDING` $\rightarrow$ `PAYMENT_FAILED` (thất bại)
  - `PAYMENT_FAILED` $\rightarrow$ `PAID` (thử lại thành công với khóa `idempotencyKey` mới)
- **Bị chặn (Ném `BadRequestException`):**
  - Mọi yêu cầu thanh toán cho đơn hàng đã `PAID`, `PREPARING`, `READY`, `COMPLETED`, hoặc `CANCELLED`.

