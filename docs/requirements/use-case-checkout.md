# Đặc tả Use-Case Trọng Tâm: Đặt và Thanh Toán Đơn Hàng (Task 1.3)

- **Mã Use-Case:** `UC-01`
- **Tên Use-Case:** Đặt và thanh toán đơn hàng không tiền mặt
- **Liên kết mã yêu cầu (Traceability):** `FR-04` (Đặt đơn hàng), `FR-05` (Thanh toán không tiền mặt), `FR-06` (Xác nhận đơn & tích điểm), `NFR-01` (Thời gian phản hồi API < 500ms), `NFR-02` (Bảo mật JWT, Validation & Idempotency).
- **Sơ đồ đi kèm:**
  - Nguồn PlantUML: [`docs/diagrams/usecase-checkout.puml`](../diagrams/usecase-checkout.puml)
  - Ảnh Vector SVG: [`docs/diagrams/usecase-checkout.svg`](../diagrams/usecase-checkout.svg)

---

## 1. Bảng Đặc tả Chi tiết Use-Case `UC-01`

| Mục | Nội dung mô tả chi tiết |
| :--- | :--- |
| **Actor chính (Primary Actor)** | **Khách hàng (Customer):** Người dùng đặt mua đồ uống trên ứng dụng web BrewLite (Next.js). |
| **Actor phụ (Secondary Actor)** | **Cổng thanh toán (Mock Payment Gateway):** Hệ thống xử lý thanh toán Ví điện tử (`WALLET`) hoặc Thẻ ngân hàng (`CARD`). |
| **Sự kiện kích hoạt (Trigger)** | Khách hàng có ít nhất 1 đồ uống trong giỏ hàng và bấm nút **"Thanh toán"** tại màn hình Giỏ hàng. |
| **Tiền điều kiện (Pre-conditions)** | 1. Khách hàng đã đăng nhập thành công và có token xác thực **JWT** hợp lệ.<br>2. Giỏ hàng hiện tại có ít nhất 01 sản phẩm hợp lệ (`qty >= 1`).<br>3. Các sản phẩm và topping trong giỏ đang ở trạng thái sẵn sàng phục vụ (`isAvailable = true`, `stock >= qty`). |
| **Hậu điều kiện khi Thành công (Success Post-conditions)** | 1. Đơn hàng được khởi tạo và chuyển trạng thái từ `PENDING` sang **`PAID`** theo đúng Order State Machine.<br>2. Tồn kho sản phẩm (`stock`) được trừ chính xác và tăng `version` (Optimistic Locking).<br>3. Một bản ghi `Payment` mới được lưu với trạng thái **`SUCCESS`**, kèm `idempotencyKey` duy nhất và mã giao dịch (`WALLET_xxx` hoặc `CARD_xxx`).<br>4. Điểm tích lũy (`loyaltyPoints`) được cộng vào tài khoản của Khách hàng.<br>5. Giỏ hàng trên trình duyệt được làm trống (`clearCart`) và hiển thị màn hình Xác nhận đơn hàng (`#5`). |
| **Hậu điều kiện khi Thất bại (Failure Post-conditions)** | 1. Nếu lỗi ở bước thanh toán: Đơn hàng chuyển sang trạng thái **`PAYMENT_FAILED`**, bản ghi `Payment` lưu trạng thái **`FAILED`**.<br>2. **Giỏ hàng của khách hàng được GIỮ NGUYÊN 100%** (không bị mất món) để khách hàng có thể chọn lại phương thức hoặc bấm **"Thử thanh toán lại"**. |

---

## 2. Luồng Sự Kiện Chính (Main Success Scenario — Happy Path)

1. **Khách hàng** kiểm tra danh sách món, size (`S/M/L`), topping và tổng tiền tại màn hình Giỏ hàng rồi bấm **"Thanh toán"**.
2. **Hệ thống (Frontend Next.js)** kiểm tra trạng thái đăng nhập (JWT) và chuyển khách hàng sang màn hình Checkout (`/checkout`).
3. **Hệ thống (Backend NestJS `POST /orders`)** kiểm tra dữ liệu đầu vào (`class-validator`), kiểm tra tồn kho (`stock`), tính toán `subtotal`, `discountAmount`, `total`, `pointsEarned` và lưu đơn hàng mới vào CSDL với trạng thái khởi tạo là **`PENDING`** trong một Database Transaction.
4. **Hệ thống** hiển thị tổng số tiền cần thanh toán và 2 tùy chọn phương thức: **Ví điện tử (`WALLET`)** hoặc **Thẻ ngân hàng (`CARD`)**.
5. **Khách hàng** chọn phương thức thanh toán **Ví điện tử (`WALLET`)** và bấm nút **"Xác nhận trả"**.
6. **Hệ thống (Frontend)** tự động sinh khóa chống trùng lặp `idempotencyKey` (UUID) và gửi yêu cầu `POST /payments` kèm `{ orderId, method, idempotencyKey }` lên Backend.
7. **Hệ thống (Backend `PaymentsService`)**:
   - Kiểm tra `idempotencyKey` chưa từng tồn tại trong bảng `payments`.
   - Kiểm tra trạng thái đơn hàng hợp lệ (`PENDING`).
   - Áp dụng tính Đa hình (**Strategy Pattern**): Gọi `WalletPaymentStrategy.charge(total)` tới **Cổng thanh toán**.
8. **Cổng thanh toán** xác nhận giao dịch thành công và trả về `{ success: true, transactionRef: "WALLET_..." }`.
9. **Hệ thống (Backend)** mở **Database Transaction (`prisma.$transaction`)** thực hiện nguyên tử 3 thao tác:
   - Tạo bản ghi `Payment` với trạng thái `SUCCESS`.
   - Cập nhật trạng thái `Order` từ `PENDING` $\rightarrow$ **`PAID`**.
   - Cộng `pointsEarned` vào `loyaltyPoints` của `User`.
10. **Hệ thống (Frontend)** nhận phản hồi `PAID`, xóa giỏ hàng và hiển thị **Màn hình Xác nhận đơn hàng** (Mã đơn `#id`, trạng thái `PAID`, lời nhắn *"Mời tới quầy lấy nước"*). Use-case kết thúc thành công.

---

## 3. Luồng Thay Thế (Alternative Flows)

- **3a. Khách hàng áp dụng Mã khuyến mãi (Promotion) hợp lệ:**
  - *Tại bước 1:* Khách hàng nhập mã giảm giá (ví dụ: `BREWLITE20` hoặc `GIAM10K`).
  - *Xử lý:* Hệ thống kiểm tra mã còn hạn (`expiredAt`), còn lượt dùng (`usedCount < usageLimit`) và đơn đạt giá trị tối thiểu (`subtotal >= minOrderValue`). Hệ thống trừ `discountAmount` vào `total`, tăng `usedCount` và tiếp tục **Bước 3**.
- **5a. Khách hàng chọn thanh toán bằng Thẻ ngân hàng (`CARD`):**
  - *Tại bước 5:* Khách hàng chọn radio **Thẻ ngân hàng (`CARD`)**.
  - *Xử lý:* Tại Bước 7, `PaymentsService` điều phối sang `CardPaymentStrategy.charge(total)`, sinh mã giao dịch `CARD_...` và tiếp tục **Bước 8**.
- **6a. Khách hàng bấm đúp nút "Xác nhận trả" hoặc mạng gửi lặp request (Idempotent Request):**
  - *Tại bước 7:* `PaymentsService` phát hiện `idempotencyKey` đã tồn tại trong bảng `payments`.
  - *Xử lý:* Hệ thống **không gọi lại Cổng thanh toán** (tránh trừ tiền 2 lần), lập tức trả về kết quả của giao dịch trước đó (`isIdempotent: true`).
- **9a. Khách hàng bấm "Thử thanh toán lại" từ đơn hàng bị lỗi (`PAYMENT_FAILED`):**
  - *Điều kiện:* Đơn hàng đang ở trạng thái `PAYMENT_FAILED` từ lần thanh toán trước.
  - *Xử lý:* Khách hàng đổi phương thức thanh toán hoặc bấm **"Thử thanh toán lại"** với `idempotencyKey` mới. Order State Machine cho phép chuyển tiếp hợp lệ từ `PAYMENT_FAILED` $\rightarrow$ `PAID`. Quay lại **Bước 6**.

---

## 4. Luồng Ngoại Lệ (Exception Flows — Error Handling)

- **E1. Khách hàng chưa đăng nhập hoặc JWT không hợp lệ (Tại bước 2 & 3):**
  - Hệ thống trả về mã lỗi `401 Unauthorized`, giữ nguyên giỏ hàng trên trình duyệt và chuyển hướng khách hàng sang trang Đăng nhập (`/login`).
- **E2. Sản phẩm hết hàng hoặc xung đột đặt đồng thời — Optimistic Locking (Tại bước 3):**
  - Khi nhiều khách đặt cùng lúc làm `stock < qty` hoặc `version` của `Product` đã thay đổi trong lúc giao dịch:
  - Hệ thống rollback Transaction, trả về lỗi `400 Bad Request / 409 Conflict` thông báo tên món đã hết hàng để khách hàng điều chỉnh giỏ hàng.
- **E3. Giao dịch thanh toán bị từ chối bởi Ví / Thẻ (Tại bước 8 — Kịch bản US-05):**
  1. Cổng thanh toán trả về `{ success: false, errorMessage }`.
  2. Backend thực thi Transaction: Lưu bản ghi `Payment` với trạng thái **`FAILED`** và cập nhật trạng thái `Order` sang **`PAYMENT_FAILED`**.
  3. Frontend nhận trạng thái `PAYMENT_FAILED`, **GIỮ NGUYÊN GIỎ HÀNG**, hiển thị cảnh báo lỗi màu đỏ và hiển thị nút **"Thử thanh toán lại"**.
- **E4. Vi phạm Máy trạng thái đơn hàng — Order State Machine (Tại bước 7):**
  - Nếu hệ thống nhận yêu cầu thanh toán cho đơn hàng đã ở trạng thái `PAID`, `PREPARING`, `READY`, `COMPLETED` hoặc `CANCELLED`:
  - Hệ thống chặn ngay lập tức và ném ngoại lệ `BadRequestException("Không thể thanh toán cho đơn hàng đang ở trạng thái ...")`.

