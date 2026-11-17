# SmaRes — Smart Restaurant Management & Table Reservation System

Hệ thống quản lý, đặt bàn và gọi món nhà hàng thông minh trên nền tảng Next.js, React 19, TypeScript và MongoDB.

---

## 1. Giới thiệu dự án
SmaRes là giải pháp chuyển đổi số toàn diện cho nhà hàng, hỗ trợ đặt bàn trực tuyến, gọi món qua thực đơn số hóa và quản lý trạng thái chế biến thời gian thực giữa Khách hàng và Nhân viên.

Dự án đã hoàn thành toàn bộ 57 hạng mục kỹ thuật (tasks) từ thiết kế cơ sở dữ liệu, API backend, giao diện frontend responsive trên thiết bị di động đến kiểm thử hệ thống.

---

## 2. Tính năng nổi bật
- **Xác thực & Phân quyền:** Đăng ký, đăng nhập bảo mật qua JWT và Cookie, bảo vệ route truy cập.
- **Sơ đồ & Đặt bàn:** Sơ đồ bàn trực quan với mã màu trạng thái (Trống / Đã đặt), modal đặt bàn và lịch sử quản lý đặt bàn.
- **Thực đơn & Giỏ hàng:** Lọc theo danh mục, tìm kiếm món ăn, giỏ hàng lưu trữ bền vững chống mất khi tải lại trang.
- **Quản lý đơn hàng (Staff Dashboard):** Bảng điều khiển cho nhân viên cập nhật luồng chế biến món ăn và đồng bộ trạng thái sang phía khách.

---

## 3. Công nghệ sử dụng
- **Frontend & Backend:** Next.js (App Router), React 19, TypeScript (87.4%), JavaScript
- **Cơ sở dữ liệu:** MongoDB với Mongoose ODM
- **Styling:** CSS Modules, Modern Responsive CSS
- **Quản lý dự án:** Git, GitHub, Jira Agile Board

---

## 4. Cấu trúc thư mục
- `app/`: Next.js App Router (giao diện và API routes)
- `backend/`: Models Mongoose (User, Table, MenuItem, Order, Reservation) và logic xử lý
- `components/`: Các thành phần giao diện tái sử dụng
- `public/`: Tài nguyên tĩnh (hình ảnh, biểu tượng)

---

## 5. Hướng dẫn cài đặt & Khởi chạy

### Cài đặt dependencies:
```bash
npm install
```

### Cấu hình biến môi trường:
Tạo file `.env.local` tại thư mục gốc:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Chạy development server:
```bash
npm run dev
```
Truy cập ứng dụng tại `http://localhost:3000`.

---

## 6. Lộ trình phát triển tiếp theo
- Dynamic Table QR Code gọi món tại bàn.
- Kết nối thời gian thực qua WebSockets hoặc Server-Sent Events (SSE).
- Tích hợp cổng thanh toán trực tuyến (VietQR, VNPay, MoMo).
- Màn hình hiển thị chuyên biệt cho quầy Bếp (KDS).
- Báo cáo và phân tích doanh thu cho quản lý.
