# Bối cảnh, Stakeholder và Phạm vi (Task 1.1)

## 1. Bối cảnh & Vấn đề nghiệp vụ
BrewLite giúp khách hàng đặt và thanh toán đồ uống không dùng tiền mặt chỉ trong vài chạm, giảm thời gian xếp hàng và nhận đơn nhanh tại quầy.

## 2. Danh sách Stakeholders

| Stakeholder | Vai trò | Mục tiêu & Kỳ vọng |
|---|---|---|
| Khách hàng | Người dùng cuối | Đặt nước nhanh, chọn size/topping, thanh toán không tiền mặt, theo dõi trạng thái đơn |
| Nhân viên quầy / Barista | Vận hành | Tiếp nhận đơn và cập nhật trạng thái pha chế |
| Quản lý cửa hàng (PO) | Quản trị | Xác định yêu cầu, quản lý menu, khuyến mãi và doanh thu |
| Đơn vị thanh toán | Hệ thống tích hợp | Xử lý giao dịch Ví điện tử / Thẻ ngân hàng an toàn, idempotent |
| Nhóm phát triển | Đội dự án | Thiết kế, lập trình, kiểm thử và triển khai hệ thống |
| Giảng viên nghiệm thu | Đánh giá | Nghiệm thu quy trình Scrum, kiến trúc, tài liệu và sản phẩm |

## 3. Phạm vi (Scope)
- **In-scope (MVP):** Xem menu, chi tiết sản phẩm (size/topping), giỏ hàng, đăng ký/đăng nhập JWT, đặt đơn, thanh toán không tiền mặt (Ví/Thẻ), xác nhận đơn & lịch sử đơn.
- **Out-of-scope:** Quản lý kho nguyên liệu chi tiết theo định lượng gram/ml, giao hàng tận nơi (shipper).

## 4. Giả định & Ràng buộc
- **Công nghệ bắt buộc:** Next.js (Frontend), NestJS (Backend), PostgreSQL + Prisma (Database), Docker.
- **Thời gian phản hồi API:** < 500ms với dữ liệu mẫu.

