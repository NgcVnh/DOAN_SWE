# Task 2: System Diagrams — BrewLite

Tài liệu trực quan hóa kiến trúc và quy trình nghiệp vụ của hệ thống **BrewLite** qua các biểu đồ chuẩn UML và ERD.

---

## 1. Use Case Diagram (Biểu đồ ca sử dụng)

```mermaid
flowchart LR
    subgraph Actors
        Customer["Khách hàng (Customer)"]
        Barista["Pha chế (Barista)"]
        Admin["Quản lý (Admin)"]
    end

    subgraph System["Hệ thống BrewLite"]
        UC1["Duyệt Menu & Tìm kiếm món"]
        UC2["Tùy chỉnh món (Size, Topping)"]
        UC3["Quản lý giỏ hàng"]
        UC4["Thanh toán & Đặt hàng"]
        UC5["Theo dõi trạng thái đơn hàng"]
        UC6["Tiếp nhận & Pha chế đơn"]
        UC7["Quản lý thực đơn & Giá"]
        UC8["Xem báo cáo doanh thu"]
    end

    Customer --> UC1
    Customer --> UC2
    Customer --> UC3
    Customer --> UC4
    Customer --> UC5

    Barista --> UC5
    Barista --> UC6

    Admin --> UC7
    Admin --> UC8
```

---

## 2. Sequence Diagram: Quy trình Thêm vào giỏ & Đặt hàng

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Khách hàng
    participant Web as Next.js PWA (Web)
    participant Store as Zustand (useCartStore)
    participant API as NestJS Cart Controller
    participant DB as PostgreSQL (Prisma)

    Customer->>Web: Chọn món + Size M + Topping
    Customer->>Web: Nhấn "Thêm vào giỏ hàng"
    Web->>Store: addToCart(payload)
    Store->>API: POST /cart/items
    API->>DB: Upsert CartItem & Tính lại Total
    DB-->>API: Trả về Cart mới
    API-->>Store: 200 OK + JSON Cart
    Store-->>Web: Cập nhật Badge Count & Giỏ hàng
    Web-->>Customer: Hiệu ứng Toast "Đã thêm vào giỏ"

    Customer->>Web: Nhấn "Đặt hàng" (Checkout)
    Web->>API: POST /orders
    API->>DB: Tạo Order & Xóa Cart
    DB-->>API: Trả về Order (Status: PENDING)
    API-->>Web: 201 Created + Order ID
    Web-->>Customer: Chuyển sang màn hình Theo dõi đơn
```

---

## 3. Entity-Relationship Diagram (ERD — Cơ sở dữ liệu)

```mermaid
erDiagram
    USERS ||--o{ CARTS : "has"
    USERS ||--o{ ORDERS : "places"
    CARTS ||--o{ CART_ITEMS : "contains"
    PRODUCTS ||--o{ CART_ITEMS : "referenced_by"
    PRODUCTS ||--o{ ORDER_ITEMS : "referenced_by"
    ORDERS ||--o{ ORDER_ITEMS : "contains"
    TOPPINGS ||--o{ CART_ITEM_TOPPINGS : "included_in"
    CART_ITEMS ||--o{ CART_ITEM_TOPPINGS : "has"

    USERS {
        string id PK
        string email
        string fullName
        string phone
        string role
        datetime createdAt
    }

    PRODUCTS {
        int id PK
        string name
        int basePrice
        string category
        string image
        boolean isAvailable
    }

    CARTS {
        string id PK
        string userId FK
        datetime updatedAt
    }

    CART_ITEMS {
        int id PK
        string cartId FK
        int productId FK
        string size
        int quantity
        int unitPrice
        int lineTotal
    }

    ORDERS {
        string id PK
        string userId FK
        string orderStatus
        string paymentMethod
        int totalAmount
        string deliveryAddress
        datetime createdAt
    }

    ORDER_ITEMS {
        int id PK
        string orderId FK
        int productId FK
        string size
        int quantity
        int unitPrice
    }

    TOPPINGS {
        int id PK
        string name
        int price
    }

    CART_ITEM_TOPPINGS {
        int id PK
        int cartItemId FK
        int toppingId FK
    }
```

---

## 4. State Diagram: Vòng đời trạng thái đơn hàng (Order State Machine)

```mermaid
stateDiagram-v2
    [*] --> PENDING: Khách đặt hàng thành công
    PENDING --> CONFIRMED: Quán tiếp nhận đơn
    PENDING --> CANCELLED: Khách hủy / Quán hết nguyên liệu
    CONFIRMED --> PREPARING: Barista bắt đầu pha chế
    PREPARING --> READY: Pha chế hoàn tất
    READY --> DELIVERING: Shipper lấy hàng (Đơn Delivery)
    READY --> COMPLETED: Khách lấy hàng tại quầy (Pick-up)
    DELIVERING --> COMPLETED: Giao thành công
    DELIVERING --> CANCELLED: Giao thất bại
    COMPLETED --> [*]
    CANCELLED --> [*]
```
