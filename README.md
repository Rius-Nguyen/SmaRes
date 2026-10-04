# SmaRes - Hệ Thống Quản Lý & Đặt Bàn Nhà Hàng Thông Minh

Dự án được xây dựng với [Next.js](https://nextjs.org) (App Router), React 19, TypeScript và MongoDB (Mongoose).

## Hướng dẫn chạy dự án

1. **Cài đặt thư viện:**
```bash
npm install
```

2. **Cấu hình môi trường (.env.local):**
Tạo file `.env.local` ở thư mục gốc và khai báo:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

3. **Chạy máy chủ phát triển (Dev server):**
```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) trên trình duyệt để trải nghiệm ứng dụng.
