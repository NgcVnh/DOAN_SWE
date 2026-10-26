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
| **FR-05** | Thanh toán không tiền mặt & Idempotency | `Payment` ([Tài liệu API](api/payments.md)) | `POST /payments` | `apps/web/src/app/checkout/page.tsx` | INT-T03: Chống thanh toán trùng & Strategy Pattern (`apps/api/test/payments.e2e-spec.ts`, `apps/api/src/payments/payments.integration.spec.ts`) |
| **FR-10.3** | Khuyến mãi & Quản lý Điểm thưởng (Task 10.3) | `Promotion`, `User.loyaltyPoints`, `Order.pointsEarned` | `GET /promotions`, `POST /promotions/validate`, `GET /promotions/loyalty/me` | `apps/web/src/app/checkout/page.tsx` | TC-PROMO-01: Chiết khấu Strategy Pattern (`discount-strategy.spec.ts`), Kiểm tra điều kiện mã (`promotions.service.spec.ts`), Tích & tiêu điểm (`loyalty.service.spec.ts`, `orders.service.spec.ts`) |
