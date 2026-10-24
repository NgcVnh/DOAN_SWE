<<<<<<< HEAD
<<<<<<< HEAD
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

=======
=======
>>>>>>> origin/Nhanbranch
# Hướng dẫn triển khai (Deployment Guide) — BrewLite

Tài liệu hướng dẫn triển khai hệ thống **BrewLite** cho môi trường phát triển cục bộ (Local Development) và môi trường thực tế (Cloud / Production).

---

## 1. Triển khai cục bộ bằng Docker Compose

Hệ thống cung cấp sẵn file `docker-compose.yml` để khởi chạy đồng thời Database PostgreSQL, Backend API (NestJS), và Frontend Web (Next.js) với một lệnh duy nhất:

### Yêu cầu tiên quyết:
- Đã cài đặt Docker và Docker Compose.

### Các bước thực hiện:

1. **Khởi tạo file cấu hình môi trường:**
   ```bash
   cp .env.example .env
   ```

2. **Khởi chạy toàn bộ hệ thống bằng Docker Compose:**
   ```bash
   docker compose up --build -d
   ```

3. **Kiểm tra trạng thái các container:**
   ```bash
   docker compose ps
   ```

4. **Truy cập ứng dụng:**
   - **Frontend (Next.js):** [http://localhost:3000](http://localhost:3000)
   - **Backend API (NestJS):** [http://localhost:3001](http://localhost:3001)
   - **PostgreSQL Database:** `localhost:5432` (Username: `brewlite_user`, Password: `brewlite_password`, DB: `brewlite_db`)

5. **Dừng hệ thống:**
   ```bash
   docker compose down
   ```

---

## 2. Chạy trực tiếp trong môi trường phát triển (Local Monorepo)

1. **Cài đặt thư viện phụ thuộc:**
   ```bash
   # Cài đặt tại root monorepo
   npm install

   # Cài đặt cho Backend (apps/api)
   npm --prefix apps/api install

   # Cài đặt cho Frontend (apps/web)
   npm --prefix apps/web install
   ```

2. **Đồng bộ và khởi tạo dữ liệu Database:**
   ```bash
   npm run db:push
   npm run db:seed
   ```

3. **Khởi chạy ứng dụng:**
   ```bash
   # Chạy riêng biệt từng service:
   npm run dev:api    # Chạy Backend tại port 3001
   npm run dev:web    # Chạy Frontend tại port 3000
   ```

---

## 3. Triển khai lên Production (Cloud Deployment)

### 3.1. Cơ sở dữ liệu (PostgreSQL)
- Sử dụng **Supabase**, **Neon Serverless Postgres**, hoặc **AWS RDS**.
- Lấy chuỗi kết nối `DATABASE_URL` dạng:
  `postgresql://user:password@host:5432/brewlite_db?schema=public`

### 3.2. Backend API (`apps/api`)
- Nền tảng khuyến nghị: **Render**, **Railway**, hoặc máy chủ ảo **VPS / AWS EC2**.
- Build command: `npm --prefix apps/api run build`
- Start command: `node apps/api/dist/main.js`
- Cấu hình các biến môi trường: `PORT=3001`, `DATABASE_URL=...`

### 3.3. Frontend PWA (`apps/web`)
- Nền tảng khuyến nghị: **Vercel** (tối ưu hóa hoàn hảo cho Next.js).
- Root Directory trong thiết lập Vercel: `apps/web`.
- Biến môi trường: `NEXT_PUBLIC_API_URL=https://api.yourdomain.com`
<<<<<<< HEAD
>>>>>>> origin/Nhanbranch
=======

>>>>>>> origin/Nhanbranch
