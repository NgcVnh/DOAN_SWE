# Task 1: Software Requirements Specification (SRS) — BrewLite

## 1. Giới thiệu dự án (Project Overview)
**BrewLite** là nền tảng đặt đồ uống và cà phê trực tuyến hiện đại, hướng đến trải nghiệm người dùng tối ưu trên thiết bị di động (**Mobile-First / Progressive Web App - PWA**). Hệ thống hỗ trợ khách hàng duyệt menu, tùy biến đồ uống (kích thước, lượng đường, đá, topping), quản lý giỏ hàng, đặt hàng thanh toán nhanh chóng và theo dõi trạng thái đơn hàng thời gian thực.

---

## 2. Đối tượng người dùng (User Personas & Roles)

| Vai trò | Mô tả | Trách nhiệm chính |
|---|---|---|
| **Khách hàng (Customer)** | Người mua đồ uống qua trình duyệt di động / PWA | Duyệt menu, tùy biến món, thêm giỏ hàng, thanh toán, theo dõi đơn |
| **Nhân viên pha chế (Barista)** | Nhân viên tại quầy nhận và pha chế đồ uống | Tiếp nhận đơn, cập nhật tiến độ (Đang pha, Đã sẵn sàng) |
| **Quản trị viên (Store Manager)** | Người quản lý cửa hàng và hệ thống | Quản lý danh mục sản phẩm, giá bán, topping, xem thống kê |

---

## 3. Yêu cầu chức năng (Functional Requirements - FR)

### FR1: Quản lý danh mục sản phẩm & Menu (Catalog Management)
- **FR1.1**: Hiển thị danh sách đồ uống phân chia theo danh mục (Cà phê, Trà sữa, Sinh tố, Bánh ngọt).
- **FR1.2**: Tìm kiếm sản phẩm theo tên và lọc theo mức giá/danh mục.
- **FR1.3**: Hiển thị chi tiết sản phẩm: hình ảnh, mô tả, giá gốc, các lựa chọn tùy chỉnh khả dụng.

### FR2: Tùy biến món đồ uống (Product Customization)
- **FR2.1**: Cho phép chọn kích cỡ ly (**Size S / M / L**) kèm phụ phí tương ứng.
- **FR2.2**: Cho phép tùy chỉnh mức đường (0%, 30%, 50%, 70%, 100%) và mức đá (Không đá, Ít đá, Bình thường).
- **FR2.3**: Cho phép chọn nhiều topping (Trân châu trắng, Thạch nha đam, Kem cheese,...) với đơn giá cộng thêm.
- **FR2.4**: Tự động tính toán lại đơn giá đơn vị (`unitPrice`) và tổng tiền món theo tùy chọn.

### FR3: Quản lý giỏ hàng (Cart Management)
- **FR3.1**: Thêm sản phẩm cùng các tùy chọn vào giỏ hàng (`POST /cart/items`).
- **FR3.2**: Hiển thị danh sách món trong giỏ hàng kèm size, topping, số lượng và thành tiền từng dòng.
- **FR3.3**: Cập nhật số lượng (+ / -) trực tiếp trong giỏ hàng (`PATCH /cart/items/:id`).
- **FR3.4**: Xóa từng món hoặc làm rỗng toàn bộ giỏ hàng (`DELETE /cart/items/:id`, `DELETE /cart`).
- **FR3.5**: Hiển thị huy hiệu số lượng món (Cart Badge) tức thời trên thanh điều hướng.

### FR4: Đặt hàng & Thanh toán (Checkout & Order Placement)
- **FR4.1**: Hỗ trợ hai phương thức nhận hàng: Lấy tại quán (Pick-up) và Giao hàng (Delivery).
- **FR4.2**: Thu thập thông tin người nhận: Họ tên, Số điện thoại, Địa chỉ giao hàng (nếu có), Ghi chú cho quán.
- **FR4.3**: Lựa chọn phương thức thanh toán: Tiền mặt khi nhận hàng (COD), Chuyển khoản ngân hàng / Ví điện tử (QR Code).
- **FR4.4**: Tạo đơn hàng mới và lưu vào cơ sở dữ liệu (`POST /orders`).

### FR5: Theo dõi trạng thái đơn hàng (Order Tracking)
- **FR5.1**: Khách hàng có thể tra cứu trạng thái đơn hàng qua mã đơn:
  - `PENDING` (Chờ tiếp nhận)
  - `CONFIRMED` (Đã tiếp nhận)
  - `PREPARING` (Đang pha chế)
  - `READY` (Đã pha xong / Sẵn sàng lấy)
  - `DELIVERING` (Đang giao)
  - `COMPLETED` (Hoàn tất)
  - `CANCELLED` (Đã hủy)

### FR6: Trải nghiệm Mobile-First & PWA
- **FR6.1**: Giao diện phản hồi chuẩn (Responsive Design) tối ưu cho màn hình cảm ứng di động.
- **FR6.2**: Cài đặt ứng dụng PWA vào màn hình chính thiết bị (Add to Home Screen).
- **FR6.3**: Khả năng hoạt động ngoại tuyến cơ bản (Offline view menu đã lưu cache qua Service Worker).

---

## 4. Yêu cầu phi chức năng (Non-Functional Requirements - NFR)

| Mã NFR | Tiêu chuẩn | Mô tả chi tiết |
|---|---|---|
| **NFR1: Performance** | Tốc độ phản hồi | Thời gian tải trang ban đầu (FCP) < 1.5s trên 4G di động; API phản hồi < 200ms. |
| **NFR2: Scalability** | Khả năng mở rộng | Thiết kế theo mô hình Clean Architecture & Monorepo, dễ dàng mở rộng tính năng mới. |
| **NFR3: Reliability** | Độ tin cậy | Giữ trạng thái giỏ hàng liên tục (Persistent State / LocalStorage + Backend Sync). |
| **NFR4: Usability** | Trải nghiệm người dùng | Thao tác ngón tay cái thuận tiện (Bottom Navigation, Sticky Checkout button). |
| **NFR5: Maintainability** | Khả năng bảo trì | Tuân thủ TypeScript nghiêm ngặt, tách biệt ranh giới domain logic và infrastructure. |

