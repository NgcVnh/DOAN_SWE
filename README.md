# BrewLite — Mobile-First Coffee & Beverage Ordering Platform

<p align="center">
  <strong>Nền tảng đặt đồ uống cà phê trực tuyến hiện đại với kiến trúc Monorepo, Next.js PWA & NestJS Clean Architecture</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js%2015-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

---

## 📖 Giới thiệu (Overview)

**BrewLite** là đồ án môn học Kỹ thuật Phần mềm (Software Engineering). Dự án hướng đến việc giải quyết bài toán đặt món và tùy biến đồ uống tại chuỗi cửa hàng cà phê thông qua giải pháp **Mobile-First Progressive Web App (PWA)** kết hợp backend chuẩn **Clean Architecture / Domain-Driven Design (DDD)**.

---

## 📂 Cấu trúc thư mục chuẩn (Project Structure)

```text
brewlite/
├── apps/
│   ├── web/                     # Next.js mobile-first / PWA
│   └── api/                     # NestJS backend
├── docs/
│   ├── requirements/            # Task 1: Đặc tả yêu cầu phần mềm (SRS)
│   ├── diagrams/                # Task 2: Các biểu đồ UML & ERD (Mermaid)
│   ├── architecture/            # Task 3: Thiết kế kiến trúc Clean Architecture & Monorepo
│   ├── traceability-matrix.md   # Ma trận truy vết yêu cầu (Traceability Matrix)
│   └── deployment.md            # Hướng dẫn triển khai (Local & Cloud)
├── tests/                       # Bộ kiểm thử tích hợp & E2E
├── .github/workflows/           # CI/CD GitHub Actions
├── docker-compose.yml           # Khởi chạy toàn bộ hệ thống bằng Docker
├── .env.example                 # Mẫu cấu hình biến môi trường
└── README.md                    # Tài liệu hướng dẫn chính
```

---

## 📑 Tài liệu chi tiết các Task (Documentation)

- **Task 1 — Đặc tả yêu cầu (Requirements):** Xem chi tiết tại [docs/requirements/README.md](docs/requirements/README.md).
- **Task 2 — Thiết kế biểu đồ (Diagrams):** Xem chi tiết tại [docs/diagrams/README.md](docs/diagrams/README.md) (Use Case, Sequence, ERD, State Machine).
- **Task 3 — Thiết kế kiến trúc (Architecture):** Xem chi tiết tại [docs/architecture/README.md](docs/architecture/README.md) (Clean Architecture, DDD, Monorepo).
- **Ma trận truy vết (Traceability Matrix):** [docs/traceability-matrix.md](docs/traceability-matrix.md).
- **Hướng dẫn triển khai (Deployment Guide):** [docs/deployment.md](docs/deployment.md).

---

## 🚀 Khởi động nhanh (Quick Start)

### Cách 1: Sử dụng Docker Compose (Khuyến nghị)

```bash
cp .env.example .env
docker compose up --build -d
```
- **Web App (PWA):** [http://localhost:3000](http://localhost:3000)
- **API Backend:** [http://localhost:3001](http://localhost:3001)

### Cách 2: Chạy trực tiếp qua npm

1. **Cài đặt thư viện:**
```bash
npm install
npm --prefix apps/api install
npm --prefix apps/web install
```

2. **Chạy đồng thời cả Frontend và Backend:**
```bash
# Chạy Backend (Port 3001)
npm run dev:api

# Chạy Frontend Web (Port 3000)
npm run dev:web
```

---

## 🧪 Kiểm thử (Testing)

```bash
# Chạy unit tests backend
npm --prefix apps/api run test

# Chạy E2E tests
npm run test
```
