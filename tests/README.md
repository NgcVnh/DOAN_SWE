# Hướng dẫn kiểm thử (Testing Guide) — BrewLite

Thư mục `tests/` chứa các kịch bản kiểm thử tích hợp (Integration Tests) và kiểm thử đầu-cuối (End-to-End Tests) xuyên suốt hệ thống BrewLite.

---

## 1. Cấu trúc thư mục

```text
tests/
├── integration/        # Kiểm thử tích hợp giữa Controller, Service và Repository
│   └── cart.integration.spec.ts
├── e2e/                # Kiểm thử luồng người dùng hoàn chỉnh (API E2E)
│   └── cart-flow.e2e.spec.ts
└── README.md
```

---

## 2. Cách chạy kiểm thử

### Kiểm thử Unit & E2E của Backend (`apps/api`):
```bash
# Chạy Unit Tests
npm --prefix apps/api run test

# Chạy E2E Tests
npm --prefix apps/api run test:e2e
```

### Chạy toàn bộ bộ test từ root:
```bash
npm run test
```
