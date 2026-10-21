# ADR 001: Tổ chức dự án theo mô hình Monorepo

## Trạng thái
Accepted (Đã chấp nhận)

## Bối cảnh
Dự án BrewLite bao gồm Frontend (Next.js) và Backend (NestJS) cùng tài liệu thiết kế, sơ đồ và kiểm thử.

## Quyết định
Sử dụng cấu trúc Monorepo với `apps/web`, `apps/api`, `docs/` và `tests/` trong cùng một kho mã nguồn Git.

## Hệ quả
- **Ưu điểm:** Dễ dàng đồng bộ thay đổi giữa Frontend, Backend và tài liệu; quản lý CI/CD tập trung.
- **Hạn chế:** Cần phân tách rõ ràng phạm vi làm việc trên từng nhánh để tránh xung đột khi merge.

