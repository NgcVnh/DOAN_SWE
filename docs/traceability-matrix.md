# Ma trận truy vết (Traceability Matrix)

| Mã yêu cầu | Use-case / User Story | Thiết kế / Sơ đồ | Code / API | Test |
|---|---|---|---|---|
| FR-01 | US-01 Xem menu | Activity-01, Class-01 | `GET /products` | API-T01 |
| FR-02 | US-02 Chi tiết sản phẩm | Activity-01, Class-01 | `GET /products/:id` | API-T02 |
| FR-03 | US-03 Giỏ hàng | Activity-01 | Cart Store (Frontend) | UI-T01 |
| FR-04 | US-04 Tạo đơn hàng | Sequence-01, Class-01 | `POST /orders` | INT-T02 |
| FR-05 | UC-01 Thanh toán không tiền mặt | Sequence-01, Class-01 | `POST /payments` | INT-T03 |
| FR-06 | US-06 Lịch sử đơn hàng | Activity-01 | `GET /orders/me` | API-T04 |

