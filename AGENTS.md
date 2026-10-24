# Dự án BrewLite — Hướng dẫn ngữ cảnh cho AI Assistant (Antigravity)

Tài liệu này cung cấp ngữ cảnh bắt buộc để Antigravity (VSCode, Antigravity IDE, CLI) luôn hỗ trợ lập trình chính xác nhất cho dự án này.

## 1. Cấu trúc Monorepo
- **Frontend Web:** `apps/web/` (Next.js App Router, Tailwind CSS, TypeScript). Port: 3000.
- **Backend API:** `apps/api/` (NestJS, TypeScript). Port: 3001.
- **Database:** PostgreSQL (Database name: `brewlite_db`), quản lý bằng **Prisma ORM** (`apps/api/prisma/schema.prisma`).

## 2. Tiêu chuẩn Lập trình Bắt buộc (Chuẩn bị vấn đáp Giảng viên)
- **OOP & SOLID:** Luôn ưu tiên lập trình hướng đối tượng. Khi có nhiều phương thức xử lý (như thanh toán Ví điện tử vs Thẻ ngân hàng), bắt buộc sử dụng **Strategy Pattern** (kế thừa từ `PaymentStrategy`) để thể hiện tính **Đa hình (Polymorphism)**.
- **Validation:** Mọi Request Body gửi lên Backend phải được đóng gói bằng **DTO** và kiểm tra bằng `class-validator`.
- **An toàn giao dịch:** Tất cả các thao tác liên quan đến tiền bạc, thanh toán, đổi trạng thái đơn phải bọc trong `this.prisma.$transaction`.
- **Idempotency:** Endpoint thanh toán bắt buộc kiểm tra trường `idempotencyKey` để chống trừ tiền 2 lần khi khách hàng bấm đúp hoặc mạng lag.

## 3. Order State Machine (Máy trạng thái đơn hàng)
Tuân thủ nghiêm ngặt sơ đồ chuyển trạng thái:
- Luồng chính: `PENDING` ➔ `PAID` ➔ `PREPARING` ➔ `READY` ➔ `COMPLETED`.
- Ngoại lệ: `PAYMENT_FAILED` (cho phép bấm thử lại để chuyển sang `PAID`) hoặc `CANCELLED` (kết thúc).
- Mọi hành vi cố tình thanh toán cho đơn hàng đã `PAID` hoặc `COMPLETED` phải bị chặn và ném lỗi `BadRequestException`.

## 4. Các lệnh điều khiển hệ thống
- Chạy Backend: `npm run dev:api`
- Chạy Frontend: `npm run dev:web`
- Đồng bộ Database: `npm run db:push`
- Chạy dữ liệu mẫu: `npm run db:seed`

