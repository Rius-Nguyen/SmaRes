<div align="center">

# 🍽️ SmaRes — Smart Restaurant Management & Table Reservation System

**Nền tảng đặt bàn thông minh, gọi món qua mã QR động và điều phối bếp thời gian thực cho nhà hàng hiện đại.**

[![Next.js](https://img.shields.io/badge/Next.js-16.3.5-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-Mongoose_9-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Ready-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

</div>

---

## 📖 1. Giới Thiệu Tổng Quan (About Project)

**SmaRes** (*Smart Restaurant Management & Table Reservation System*) là hệ thống ứng dụng web Fullstack được xây dựng nhằm số hóa toàn diện quy trình vận hành của nhà hàng Việt Nam đương đại. Hệ thống kết nối liền mạch trải nghiệm giữa **Khách hàng**, **Nhân viên phục vụ / Quầy bếp (KDS)** và **Quản trị viên (Admin)** trên một kiến trúc **Next.js App Router Fullstack** thống nhất.

### Bài toán giải quyết
- **Đặt bàn & Giữ chỗ an toàn:** Loại bỏ tình trạng đặt trùng bàn (Race Condition) khi nhiều khách hàng chọn cùng một bàn tại cùng khung giờ nhờ cơ chế **Distributed Table Lock (TTL)** kết hợp thanh toán tiền cọc trực tuyến.
- **Trải nghiệm tại bàn không gián đoạn:** Hỗ trợ khách hàng quét mã **QR động theo bàn** để xem thực đơn, gọi món, gọi thêm món vào phiên hiện tại và gửi yêu cầu hỗ trợ phục vụ mà không cần cài đặt ứng dụng riêng.
- **Điều phối bếp & Quản trị thời gian thực:** Đồng bộ tức thì đơn hàng mới và yêu cầu gọi nhân viên qua **Server-Sent Events (SSE)**, tối ưu tốc độ ra món và cung cấp số liệu doanh thu trực quan cho quản lý.

---

## ✨ 2. Tính Năng Nổi Bật (Key Features)

### 👤 Dành cho Khách hàng (Customer)
- **Đặt bàn trực quan theo sơ đồ thời gian thực (`/booking`, `/booking/diagram`):** Tra cứu bàn trống theo ngày, khung giờ, số lượng khách và khu vực ngồi với trạng thái trực quan (*Trống, Đã đặt, Đang phục vụ, Đang dọn*).
- **Đặt cọc giữ chỗ chống trùng bàn (Race Condition Prevention):**
  - Cơ chế khóa bàn tạm thời có thời hạn (`TableLock` TTL) trong lúc khách thao tác thanh toán, tự động giải phóng khi hủy hoặc hết hạn.
  - Hỗ trợ thanh toán tiền cọc qua **MoMo Sandbox**, **VNPay Sandbox** (đối soát qua IPN Webhook) hoặc **Chuyển khoản Bank QR**.
  - Tự động gửi **Email xác nhận đặt bàn** qua Resend API (kèm chế độ fallback log an toàn trên môi trường sandbox).
- **Gọi món & Gọi thêm tại bàn qua mã QR động (`/qr`, `/table-menu`):**
  - Xác thực phiên QR theo bàn (`/api/v1/tables/validate-qr-access`), hỗ trợ gọi món mới hoặc gọi thêm món vào đơn hiện có (`/api/orders/add-items`).
  - Tùy chỉnh khẩu vị (*mức cay, lượng đá, độ ngọt, ghi chú dị ứng*) và lưu giỏ hàng bền vững.
- **Tìm kiếm món ăn thông minh (Semantic & Vector Search):**
  - Bộ lọc ngữ nghĩa nhận diện ý định và phủ định (ví dụ: *"không cay"*, *"thanh đạm"*, *"cay đậm"*, *"giải nhiệt"*).
  - Hỗ trợ script tạo Vector Embedding cho món ăn bằng Google Gemini (`gemini-embedding-001`) lưu trữ trên MongoDB (`scripts/generateFoodEmbeddings.js`).
- **Theo dõi lịch sử & Trạng thái đơn hàng (`/history`, `/orders`):** Theo dõi tiến độ chế biến món ăn và lịch sử giao dịch đặt cọc.

### 👨‍🍳 Dành cho Nhân viên & Bếp (Staff & KDS)
- **Màn hình Bếp KDS & Dashboard Nhân viên thời gian thực (`/kds`, `/staff/orders`):**
  - Nhận đơn hàng và yêu cầu gọi phục vụ tức thì qua luồng **Server-Sent Events (SSE)** (`/api/realtime/events`) kèm cơ chế tự động kết nối lại.
  - Tổng hợp món ăn theo phiên bếp (`kdsAggregation`) giúp đầu bếp ưu tiên chế biến theo thời gian chờ.
- **Bật / Tắt trạng thái hết món nhanh:** Cập nhật tức thời trạng thái còn/hết món (`isAvailable`) qua `/api/menu/[id]/toggle-availability`; hệ thống tự động ngăn khách đặt các món tạm hết.
- **Cập nhật luồng trạng thái đơn hàng & Bàn (`/staff/tables`):**
  - Xử lý đơn hàng theo quy trình: **`Chờ xác nhận (PENDING)` ➔ `Đang nấu (COOKING)` ➔ `Hoàn tất (COMPLETED)`** (hoặc `CANCELLED`).
  - Quản lý check-in bàn tại sảnh theo máy trạng thái (`TableStateMachine`: `AVAILABLE ➔ RESERVED ➔ SEATED ➔ CLEANING`).

### 🛡️ Dành cho Quản trị viên (Admin)
- **Quản lý thực đơn (`/admin/menu`):** Thêm, sửa, xóa món ăn, phân loại danh mục (*Khai vị, Món chính, Tráng miệng, Đồ uống*), cấu hình món đặt trước (`isPreOrderOnly`) và bật/tắt trạng thái phục vụ.
- **Xác thực & Phân quyền RBAC (`proxy.ts`, `app/lib/auth.ts`):**
  - Xác thực bằng JWT lưu trong **HttpOnly Cookie**, mã hóa mật khẩu bằng `bcryptjs`, bảo vệ chống brute-force (tạm khóa sau 5 lần đăng nhập sai liên tiếp trong 10 phút).
  - Kiểm soát truy cập theo 3 vai trò (`customer`, `staff`, `admin`) tại cả tầng SSR Proxy và API Route Handlers.
- **Báo cáo & Thống kê doanh thu (`/admin/analytics`):**
  - Tổng hợp dữ liệu bằng **MongoDB Aggregation Pipeline** theo khung thời gian 7 / 14 / 30 ngày: Doanh thu thuần, Giá trị đơn trung bình (AOV), Phân bổ doanh thu theo ngày/giờ, Tỷ lệ trạng thái đơn hàng, Top món bán chạy và Tổng hợp lượt đặt bàn.

---

## 🛠️ 3. Công Nghệ Sử Dụng (Tech Stack)

| Nhóm công nghệ | Thành phần / Thư viện | Mục đích sử dụng trong hệ thống |
| :--- | :--- | :--- |
| **Frontend** | Next.js `16.3.5` (App Router), React `19.2.8`, TypeScript `^5` | Giao diện SSR/CSR thống nhất, định tuyến theo vai trò và tối ưu trải nghiệm đa thiết bị |
| **Styling & UI** | Tailwind CSS `^4`, Google Fonts (*Playfair Display*, *Be Vietnam Pro*), `qrcode` | Hệ thống thiết kế SmaRes Gastronomy UI, tạo mã QR động cho bàn ăn |
| **Backend & Auth** | Next.js Route Handlers (`app/api/`), Node.js Runtime, `jsonwebtoken`, `jose`, `bcryptjs` | Xử lý RESTful API, xác thực JWT HttpOnly Cookie, phân quyền RBAC tại `proxy.ts` |
| **Realtime** | Server-Sent Events (`ReadableStream` + `realtimeBus`) | Đẩy sự kiện đơn mới và gọi phục vụ tức thì tới KDS và Staff Dashboard |
| **Database & AI** | MongoDB Atlas, Mongoose ODM (`^9.10.2`), Google Gemini Embedding (`gemini-embedding-001`) | Lưu trữ dữ liệu, khóa bàn phân tán TTL (`TableLock`), Aggregation Analytics, Vector Embedding |
| **Thanh toán & Email** | MoMo Sandbox API, VNPay Sandbox & IPN Webhook, Resend API | Thanh toán cọc đặt bàn, đối soát giao dịch qua webhook và gửi email xác nhận |
| **Testing & DevOps** | Vitest `^4.1.12`, ESLint `^9`, Git & GitHub, Jira Agile, Vercel | Kiểm thử đơn vị/tích hợp, kiểm soát chất lượng mã nguồn, quản lý tiến độ và triển khai |

---

## 📁 4. Cấu Trúc Thư Mục (Project Structure)

```text
smares-frontend/
├── app/
│   ├── (customer)/          # Luồng giao diện khách tại bàn (table-menu)
│   ├── (staff)/             # Màn hình bếp KDS (/kds)
│   ├── admin/               # Quản trị thực đơn (/admin/menu) & phân tích (/admin/analytics)
│   ├── api/                 # Backend Route Handlers (auth, booking, menu, orders, payments, qr, realtime, tables)
│   ├── booking/             # Quy trình đặt bàn 4 bước, sơ đồ bàn & chọn món đặt trước
│   ├── context/             # React Context (CartContext)
│   ├── lib/                 # Business logic (auth, db, payments, email, tableLockService, kdsAggregation, semanticMenuSearch)
│   ├── models/              # Mongoose Schemas (User, Table, TableLock, MenuItem, Reservation, Order, Transaction, WaiterCall)
│   └── staff/               # Bảng điều phối đơn hàng (/staff/orders) & bàn (/staff/tables)
├── components/              # UI Components tái sử dụng (menu, payment, ui, Navbar, Footer)
├── scripts/                 # CLI scripts (seed-tables.js, create-admin.cjs, generateFoodEmbeddings.js)
├── __tests__/               # Bộ kiểm thử Vitest cho core logic, API & state machine
├── public/                  # Tài nguyên tĩnh (hình ảnh món ăn, Bank QR)
├── proxy.ts                 # Next.js 16 SSR Auth & Role-Based Access Control Proxy
└── .env.example             # Mẫu cấu hình biến môi trường chuẩn
```

---

## 🚀 5. Hướng Dẫn Cài Đặt & Khởi Chạy (Getting Started)

### Yêu cầu hệ thống
- **Node.js** `>= 20.x` và **npm**
- Tài khoản **MongoDB Atlas** (hoặc MongoDB instance hỗ trợ connection string `mongodb+srv://...`)

### Các bước cài đặt

1. **Clone repository về máy:**
   ```bash
   git clone https://github.com/Rius-Nguyen/SmaRes.git
   ```

2. **Di chuyển vào thư mục dự án:**
   ```bash
   cd SmaRes
   ```

3. **Cài đặt các gói phụ thuộc:**
   ```bash
   npm install
   ```

4. **Thiết lập biến môi trường:**
   Tạo file `.env.local` từ file mẫu `.env.example`:
   - **macOS / Linux / Git Bash:**
     ```bash
     cp .env.example .env.local
     ```
   - **Windows PowerShell:**
     ```powershell
     Copy-Item .env.example .env.local
     ```

   Mở file `.env.local` và điền các giá trị cấu hình phù hợp:
   - **Bắt buộc:** `MONGODB_URI`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`.
   - **Tùy chọn (Sandbox & Scripts):**
     - `MOMO_*` / `VNPAY_*`: Khóa Sandbox nếu kiểm thử thanh toán MoMo hoặc VNPay.
     - `RESEND_API_KEY`, `EMAIL_FROM`: API key của Resend nếu muốn gửi email xác nhận thật (mặc định sandbox sẽ ghi log an toàn ra console).
     - `ADMIN_PASSWORD`: Mật khẩu dùng cho script tạo tài khoản quản trị (`node scripts/create-admin.cjs`).
     - `GEMINI_API_KEY`: API key dùng cho script tạo vector embedding món ăn (`node scripts/generateFoodEmbeddings.js`).

   *(Tùy chọn) Khởi tạo dữ liệu mẫu hoặc tài khoản Admin:*
   ```bash
   node scripts/seed-tables.js
   node scripts/create-admin.cjs
   ```

5. **Khởi chạy máy chủ phát triển (Development Server):**
   ```bash
   npm run dev
   ```
   Mở trình duyệt và truy cập **`http://localhost:3000`**.

### Các lệnh kiểm thử & kiểm tra chất lượng khác
```bash
npm test       # Chạy bộ unit/integration tests với Vitest
npm run lint   # Kiểm tra quy chuẩn mã nguồn với ESLint
npm run build  # Build kiểm tra bản production
```

---

## 👥 6. Phân Chia Vai Trò Thành Viên Nhóm (Project Contributors)

| STT | Họ và Tên | Tài khoản Git | Vai trò & Đóng góp chính |
| :---: | :--- | :--- | :--- |
| 1 | **Thịnh Nguyễn Ngọc** | `Rius-Nguyen` / `NNThinh` | **Team Lead & Fullstack Architect** — Thiết kế kiến trúc Next.js App Router, Core Auth/DB, Realtime SSE (`KDS` & `Staff`), Admin Menu CRUD & Analytics Aggregation Dashboard, Table State Machine, Vitest Suite & Git Integration |
| 2 | **Mai Thị Tú Trinh** | `tutrinhh26` | **Backend & Payment Engineer** — Xây dựng cơ chế Distributed Table Lock (chống trùng bàn), tích hợp cổng thanh toán MoMo/VNPay Sandbox, IPN Webhook, Bank QR Deposit, Transaction Schema & đồng bộ lịch sử đặt bàn |
| 3 | **Nguyễn Thị Hướng Giang** | `Huong Giang` | **Frontend & UI/UX Engineer** — Chuẩn hóa SmaRes Design System, phát triển giao diện QR bàn động, luồng xác nhận email đặt bàn, tối ưu hiệu năng tìm kiếm/đặt bàn, Skeleton loading & Mobile-first UI |
| 4 | **Hoàng Quốc Huy** | `JuniorHoang` | **Security & AI Search Engineer** — Hoàn thiện bảo mật mật khẩu & chống brute-force, phân quyền RBAC (`proxy.ts`), mẫu Email HTML xác nhận đặt bàn và script tạo Vector Embedding bằng `gemini-embedding-001` |
| 5 | **Nguyễn Vũ** | `nguyenvux0` | **Fullstack Feature Engineer** — Phát triển luồng quét QR tại bàn (`QrScannerView`), hiển thị phiên bàn ăn (`TableSessionHeader`), API gọi thêm món tại bàn (`/api/orders/add-items`) và trang theo dõi đơn hàng khách hàng (`/orders`) |

---

## 🎓 7. Thông Tin Môn Học & Giảng Viên Hướng Dẫn

> Tài liệu này thuộc hồ sơ báo cáo đồ án môn học theo chuẩn **CMU-IS 432 AIS**.

| Hạng mục | Thông tin chi tiết |
| :--- | :--- |
| **Mã môn học** | **CMU-IS 432 AIS** |
| **Tên dự án** | **SmaRes — Smart Restaurant Management & Table Reservation System** |
| **Phiên bản phát hành** | `v1.0.0` |
| **Giảng viên hướng dẫn** | Lê Kim Hoàng |
| **Kho lưu trữ mã nguồn** | [github.com/Rius-Nguyen/SmaRes](https://github.com/Rius-Nguyen/SmaRes) |
