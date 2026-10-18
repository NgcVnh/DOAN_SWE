# Hướng dẫn Triển khai (Deployment Guide)

## 1. Chạy môi trường Local bằng Docker Compose
```bash
docker compose up --build
```

## 2. Chạy môi trường Phát triển (Development)
```bash
# Cài đặt và đồng bộ Database
npm run db:push
npm run db:seed

# Chạy Backend (Port 3001)
npm run dev:api

# Chạy Frontend (Port 3000)
npm run dev:web
```

