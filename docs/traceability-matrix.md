<<<<<<< HEAD
# Ma trận truy vết (Traceability Matrix)

| Mã yêu cầu | Use-case / User Story | Thiết kế / Sơ đồ | Code / API | Test |
|---|---|---|---|---|
| FR-01 | US-01 Xem menu | Activity-01, Class-01 | `GET /products` | API-T01 |
| FR-02 | US-02 Chi tiết sản phẩm | Activity-01, Class-01 | `GET /products/:id` | API-T02 |
| FR-03 | US-03 Giỏ hàng | Activity-01 | Cart Store (Frontend) | UI-T01 |
| FR-04 | US-04 Tạo đơn hàng | Sequence-01, Class-01 | `POST /orders` | INT-T02 |
| FR-05 | UC-01 Thanh toán không tiền mặt | Sequence-01, Class-01 | `POST /payments` | INT-T03 |
| FR-06 | US-06 Lịch sử đơn hàng | Activity-01 | `GET /orders/me` | API-T04 |

=======
# Ma trận truy vết yêu cầu (Traceability Matrix) — BrewLite

Ma trận truy vết kết nối giữa **Yêu cầu chức năng (FR)**, **Mô hình thiết kế**, **API Backend**, **Giao diện Frontend**, và **Kiểm thử (Test Cases)**.

| Mã YC | Tên yêu cầu chức năng | Tầng Domain / Thực thể | Endpoint API (Backend) | Màn hình / Component (Frontend) | Kịch bản kiểm thử (Test Case) |
|---|---|---|---|---|---|
| **FR1** | Duyệt danh mục sản phẩm | `Product` | `GET /products` | `apps/web/src/app/page.tsx` | TC-CAT-01: Tải danh sách menu thành công |
| **FR2** | Tùy biến món (Size, Topping) | `CartItem` | `POST /cart/items` | `ProductOptionModal.tsx` | TC-OPT-01: Tính đúng phụ phí size và topping |
| **FR3.1** | Thêm món vào giỏ | `Cart.addItem` | `POST /cart/items` | `CartBadge.tsx`, `useCartStore` | TC-CRT-01: Thêm món mới vào giỏ hàng |
| **FR3.2** | Xem chi tiết giỏ hàng | `Cart.getItems` | `GET /cart` | `apps/web/src/app/cart/page.tsx` | TC-CRT-02: Hiển thị đúng danh sách và tổng tiền |
| **FR3.3** | Cập nhật số lượng item | `Cart.updateItemQuantity` | `PATCH /cart/items/:id` | `apps/web/src/app/cart/page.tsx` | TC-CRT-03: Tăng/giảm số lượng cập nhật lại tổng |
| **FR3.4** | Xóa item khỏi giỏ | `Cart.removeItem` | `DELETE /cart/items/:id` | `apps/web/src/app/cart/page.tsx` | TC-CRT-04: Xóa item và giảm badge count |
| **FR3.5** | Làm rỗng giỏ hàng | `Cart.clear` | `DELETE /cart` | `apps/web/src/app/cart/page.tsx` | TC-CRT-05: Làm rỗng giỏ hàng |
| **FR4** | Đặt hàng & Thanh toán | `Order`, `OrderItem` | `POST /orders` | `apps/web/src/app/checkout/page.tsx` | TC-ORD-01: Tạo đơn hàng mới thành công |
| **FR5** | Theo dõi trạng thái đơn | `Order.status` | `GET /orders/:id` | `apps/web/src/app/orders/[id]/page.tsx` | TC-ORD-02: Tra cứu đúng tiến độ đơn hàng |
| **FR6** | Trải nghiệm PWA Mobile | `PWA Manifest / SW` | N/A | `apps/web/public/manifest.json` | TC-PWA-01: Khả năng cài đặt Add-to-Home-Screen |
>>>>>>> origin/Nhanbranch
