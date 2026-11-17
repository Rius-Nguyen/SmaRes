# 🏛️ SMARES DESIGN SYSTEM — TÀI LIỆU QUY CHUẨN GIAO DIỆN
> **Dự án:** SmaRes — Nền Tảng Đặt Bàn & Ẩm Thực Việt Nam Thông Minh  
> **Phiên bản:** v1.0.0 (Chuẩn bị nâng cấp toàn diện giao diện)  
> **Nguyên tắc cốt lõi:** *Ấm cúng — Tinh tế — Có chiều sâu — Chuẩn hóa trải nghiệm Ẩm thực (Gastronomy UI)*  
> **Công nghệ áp dụng:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Google Fonts (Playfair Display & Be Vietnam Pro)

---

## 1. 🔍 Phân Tích & Đánh Giá Hiện Trạng Giao Diện (UI Audit)

Qua khảo sát toàn bộ file cấu hình CSS và các layout chính (`app/globals.css`, `app/layout.tsx`, `components/Navbar.tsx`, `components/Footer.tsx`, `components/BookingStepper.tsx`, `app/page.tsx`, `app/booking/page.tsx`, `app/menu/page.tsx`, `app/booking/diagram/page.tsx`, `app/staff/orders/page.tsx`):

### 1.1. Các vấn đề còn tồn tại
1. **Thiếu sự đồng nhất về màu sắc (Color Fragmentation):**
   - Header (Navbar) sử dụng xanh lá rừng đậm (`bg-green-700`, `text-green-800`).
   - Hero Banner kết hợp nút vàng tươi (`bg-yellow-500`) chọi với nút xanh lá (`bg-green-800`).
   - Footer đột ngột chuyển sang tông cam chói (`text-orange-500`, `bg-orange-500`) và vàng (`text-yellow-500`) trên nền đen thô `zinc-900`.
   - Trang nhân viên (Staff) lại dùng tông xanh dương công nghệ (`bg-blue-600`, `text-indigo-800`).
   - *Hệ quả:* Thương hiệu bị phân mảnh, cảm giác chắp vá giữa nhiều template khác nhau.
2. **Giao diện phẳng, thiếu chiều sâu (Lack of Visual Depth):**
   - Hầu hết các thẻ (card), thanh điều hướng và khung form sử dụng nền trắng phẳng (`bg-white`) đặt trên nền xám lạnh (`bg-gray-50`), đổ bóng mặc định rất nhạt (`shadow-sm` hoặc `border-gray-100`).
   - Thiếu các lớp bóng mờ ấm (warm ambient shadows) đặc trưng của ngành nhà hàng sang trọng (Fine Dining & Contemporary Gastronomy).
3. **Typography đơn điệu:**
   - Toàn bộ giao diện từ tiêu đề lớn (H1, H2), tên món ăn, banner đến nội dung form đều dùng chung một font không chân `Be Vietnam Pro`.
   - Thiếu một font Serif mang hơi thở nghệ thuật ẩm thực (Artisanal / Culinary Editorial) để tạo sự trang nhã, kích thích vị giác và định vị đẳng cấp nhà hàng.
4. **Sử dụng Emoji làm icon chức năng (Anti-pattern):**
   - Trong `Navbar.tsx` có dùng icon emoji `🛒` làm giỏ hàng; trong trang Staff có `🔄`.
   - Emoji phụ thuộc vào hệ điều hành (iOS, Android, Windows hiển thị khác nhau) và không điều chỉnh được màu sắc, độ dày nét vẽ (stroke).
5. **Thang bo góc (Border-Radius) và Spacing tự phát:**
   - Bo góc dùng lẫn lộn: `rounded-full` (Navbar, pills), `rounded-lg` (Hero buttons), `rounded-xl` (Cards), `rounded-2xl` (Booking container).

---

## 2. 🎨 Bảng Màu Chuẩn Hóa (Harmonized Color Palette)

Bộ màu SmaRes được thiết kế dựa trên triết lý **"Ngọc Lục Bảo & Thảo Mộc Việt (Heritage Jade) kết hợp Ánh Kim Hoàng Gia (Imperial Amber)"** trên nền **Trắng ngà ấm (Warm Ivory & Rice Paper)**.

### 2.1. Màu Thương Hiệu Chính (Primary — Heritage Jade)
*Đại diện cho thảo mộc tươi ngon nguyên bản của ẩm thực Việt Nam, thiên nhiên và sự thịnh vượng.*

| Tên Token | Hex Code | Ứng Dụng | Chuẩn WCAG |
| :--- | :--- | :--- | :--- |
| `--color-primary-50` | `#F0FDF4` | Nền chip trạng thái "Bàn trống", hover nhẹ | AAA |
| `--color-primary-100` | `#DCFCE7` | Viền badge món bán chạy, highlight nhẹ | AAA |
| `--color-primary-200` | `#BBF7D0` | Đường viền tiến trình đã hoàn tất | AA |
| `--color-primary-500` | `#22C55E` | Điểm nhấn tươi sáng, icon thành công | AA |
| `--color-primary-700` | `#15803D` | Màu nút phụ, hover trạng thái | AA |
| **`--color-primary-800` (Core)** | **`#14532D`** | **Màu nút chính (Primary CTA), Logo, Header chính** | **AAA (Contrast > 8:1)** |
| `--color-primary-900` | `#0F4C3A` | Nền footer cao cấp, gradient banner ban đêm | AAA |
| `--color-primary-950` | `#082F22` | Text nhấn mạnh đặc biệt, viền đậm | AAA |

### 2.2. Màu Phụ Điểm Nhấn (Accent — Imperial Amber & Champagne Gold)
*Tạo cảm giác ánh đèn vàng ấm cúng của phòng tiệc tối, hương vị món nướng tẩm ướp vàng giòn, các món VIP đặc biệt.*

| Tên Token | Hex Code | Ứng Dụng |
| :--- | :--- | :--- |
| `--color-accent-50` | `#FFFBEB` | Nền card món đặc biệt (Signature / Pre-order) |
| `--color-accent-100` | `#FEF3C7` | Nền badge VIP, tag "Khuyên dùng" |
| `--color-accent-400` | `#FBBF24` | Ngôi sao đánh giá chất lượng (Rating Stars) |
| **`--color-accent-600` (Core)** | **`#D97706`** | **Giá tiền món ăn, nút "Khám phá thực đơn", viền bàn VIP** |
| `--color-accent-700` | `#B45309` | Hover cho các nút màu vàng ánh kim |
| `--color-accent-800` | `#92400E` | Tiêu đề phụ ấm áp |

### 2.3. Màu Trung Tính Nền Ấm (Warm Neutrals — Gạo Rang & Gỗ Trầm)
*Thay thế toàn bộ bảng xám lạnh (Zinc/Slate) bằng tông đá ấm (Warm Stone) giúp hình ảnh đồ ăn luôn trông hấp dẫn, tươi ngon và thân thiện.*

| Tên Token | Hex Code | Ứng Dụng |
| :--- | :--- | :--- |
| **`--color-bg-canvas`** | **`#FAF8F5`** | **Nền tổng thể toàn trang (Warm Rice Paper)** |
| `--color-bg-surface` | `#FFFFFF` | Nền thẻ món ăn, modal, khối thông tin trắng tinh khiết |
| `--color-bg-subtle` | `#F5F2EB` | Nền khu vực thông tin phụ, input form bị disable |
| `--color-border-subtle`| `#EBE7DF` | Viền ngăn cách giữa các item, border thẻ |
| `--color-border-strong`| `#D6D0C4` | Viền input khi ở trạng thái bình thường |
| `--color-text-subtle` | `#78716C` | Chú thích ngày giờ, mô tả nhỏ, placeholder |
| `--color-text-muted`  | `#57534E` | Đoạn văn mô tả món ăn, phụ đề |
| **`--color-text-main`**  | **`#1C1917`** | **Tiêu đề, chữ chính (Espresso Charcoal — không dùng đen tuyệt đối #000)** |

### 2.4. Màu Ngữ Nghĩa (Semantic & Table Status Colors)
*Đồng nhất hệ thống mã màu hiển thị trên sơ đồ bàn ăn và luồng đặt bàn:*

* **Bàn trống / Sẵn sàng (Available):** 
  - Nền: `#DCFCE7` | Viền: `#86EFAC` | Text/Icon: `#15803D`
* **Bàn đang có khách (Occupied):** 
  - Nền: `#FEE2E2` | Viền: `#FCA5A5` | Text/Icon: `#B91C1C`
* **Bàn đang dọn dẹp / Chờ phục vụ (Cleaning/Reserved):** 
  - Nền: `#FEF3C7` | Viền: `#FDE68A` | Text/Icon: `#B45309`
* **Khu vực bàn VIP (VIP Zone):** 
  - Gradient viền: `linear-gradient(135deg, #F59E0B, #B45309)` | Điểm nhấn ánh kim

---

## 3. ✍️ Cặp Font Chữ & Hệ Thống Typography (Font Pairings)

Để khắc phục cảm giác giao diện "phẳng như ứng dụng kỹ thuật", SmaRes áp dụng cặp font tiêu chuẩn cho ngành Ẩm thực cao cấp có hỗ trợ tiếng Việt hoàn chỉnh:

```
┌────────────────────────────────────────────────────────┐
│  Heading Font: Playfair Display (Serif Tinh Tế)         │
│  "Nghệ Thuật Ẩm Thực Việt Nam Đương Đại & Đẳng Cấp"     │
├────────────────────────────────────────────────────────┤
│  Body Font: Be Vietnam Pro (Sans-serif Hiện Đại)        │
│  "Đặt bàn trực tuyến nhanh chóng, món ăn tươi ngon"     │
└────────────────────────────────────────────────────────┘
```

### 3.1. Phân vai Typography
1. **Font Tiêu Đề (`font-serif`): Playfair Display**
   - *Đặc điểm:* Font chữ có chân (Serif) cổ điển, nét thanh nét đậm sang trọng, tương thích 100% tiếng Việt trên Google Fonts.
   - *Phạm vi áp dụng:* Tiêu đề Banner (Hero H1), Tên phân mục lớn (H2), Tên món ăn đặc trưng, Tiêu đề bước đặt bàn, Tên thương hiệu.
2. **Font Thân Bài & Giao Diện (`font-sans`): Be Vietnam Pro**
   - *Đặc điểm:* Font chữ không chân hình học được thiết kế chuyên biệt cho hệ dấu tiếng Việt, chống dính dấu, cực kỳ thoáng mắt ở cỡ chữ nhỏ.
   - *Phạm vi áp dụng:* Toàn bộ mô tả món ăn, nút bấm, bảng số liệu, form nhập liệu, nhãn bàn, menu điều hướng.

### 3.2. Bảng Thang Kích Thước (Typographic Hierarchy)

| Cấp Bậc | Kích Thước (Desktop / Mobile) | Font Family | Font Weight | Line Height |
| :--- | :--- | :--- | :--- | :--- |
| **Display (Hero Title)** | `3.5rem (56px)` / `2.25rem (36px)` | Playfair Display | Bold (700) | 1.15 |
| **Heading 1 (Trang chính)** | `2.5rem (40px)` / `1.875rem (30px)` | Playfair Display | Bold (700) | 1.25 |
| **Heading 2 (Phân mục)** | `2rem (32px)` / `1.5rem (24px)` | Playfair Display | SemiBold (600) | 1.3 |
| **Heading 3 (Tên món ăn)** | `1.25rem (20px)` / `1.125rem (18px)`| Playfair Display | SemiBold (600) | 1.35 |
| **Subhead / Lead** | `1.125rem (18px)` / `1rem (16px)` | Be Vietnam Pro | Medium (500) | 1.6 |
| **Body Regular** | `1rem (16px)` / `0.9375rem (15px)` | Be Vietnam Pro | Regular (400) | 1.6 |
| **Body Small** | `0.875rem (14px)` | Be Vietnam Pro | Regular (400) | 1.5 |
| **Caption / Eyebrow Tag**| `0.75rem (12px)` (Uppercase, track-wide)| Be Vietnam Pro | Bold (700) | 1.4 |

---

## 4. 📐 Thang Spacing & Bố Cục (Spatial Rhythm 8-Point Grid)

Áp dụng quy tắc khoảng cách bội số **4px / 8px** giúp mắt người xem dễ quét nội dung thực đơn và giữ nhịp điệu thị giác nhất quán:

| Token | Giá trị | Ứng dụng thực tế |
| :--- | :--- | :--- |
| `--space-1` | `4px` | Khoảng cách icon và text trong badge nhỏ |
| `--space-2` | `8px` | Khoảng cách giữa các chip lọc danh mục |
| `--space-3` | `12px` | Padding trong của nút bấm nhỏ, padding item menu |
| `--space-4` | `16px` | Padding chuẩn cho ô nhập dữ liệu (Input field), gap giữa cột |
| `--space-6` | `24px` | Padding trong thẻ món ăn (Card Content Padding) |
| `--space-8` | `32px` | Khoảng cách giữa các khối tử form đặt bàn |
| `--space-12` | `48px` | Khoảng cách giữa các bước trong Stepper |
| `--space-16` | `64px` | Padding trên/dưới của các phân đoạn vừa |
| `--space-20` | `80px` | Khoảng cách phân tách các section lớn trên trang chủ |

---

## 5. ⚪ Thang Bo Góc (Border-Radius Scale)

Các đường cong nhẹ nhàng mang lại cảm giác hiếu khách, thư thái của một nhà hàng cao cấp:

* **`radius-sm` (`6px`):** Checkbox, tooltip, badge trạng thái nhỏ.
* **`radius-md` (`10px`):** Input field, select box, nút bấm trong bảng.
* **`radius-lg` (`14px`):** Thẻ món ăn trong thực đơn, thẻ thông tin bàn.
* **`radius-xl` (`20px`):** Khối form đặt bàn chính (Form Container), Stepper card.
* **`radius-2xl` (`28px`):** Modal xem chi tiết bàn, Banner nổi, hộp thoại xác nhận.
* **`radius-full` (`9999px`):** Nút CTA chính ("Đặt bàn ngay"), chip danh mục thực đơn, badge số lượng giỏ hàng, avatar người dùng.

---

## 6. 🌤️ Hệ Thống Đổ Bóng Có Chiều Sâu (Dimensional Warm Shadows)

Để giải quyết vấn đề "giao diện trông bị phẳng", Design System này sử dụng kỹ thuật **Đổ bóng tông ấm đa tầng (Multi-layered Warm Tinted Shadows)** thay cho bóng xám tro mặc định của trình duyệt:

```css
/* Bóng đổ nhẹ cho Card món ăn ở trạng thái nghỉ */
--shadow-warm-sm: 0 2px 4px -1px rgba(28, 25, 23, 0.04), 
                  0 4px 12px -2px rgba(28, 25, 23, 0.06);

/* Bóng đổ khi rê chuột (Hover) — tạo hiệu ứng thẻ nổi lên tiếp cận khách */
--shadow-warm-md: 0 8px 20px -4px rgba(28, 25, 23, 0.08), 
                  0 4px 8px -2px rgba(28, 25, 23, 0.04);

/* Bóng đổ cho Thanh điều hướng cố định & Giỏ hàng nổi */
--shadow-warm-float: 0 12px 32px -4px rgba(20, 83, 45, 0.12), 
                     0 4px 12px -2px rgba(28, 25, 23, 0.04);

/* Hiệu ứng hào quang cho Nút Đặt Bàn (Glow Effect) */
--shadow-glow-primary: 0 8px 24px -4px rgba(20, 83, 45, 0.35);
--shadow-glow-accent:  0 8px 24px -4px rgba(217, 119, 6, 0.35);
```

### Hiệu ứng Kính Mờ Ấm Cúng (Warm Glassmorphism)
Dành riêng cho thanh **Navbar dính trên đầu (Sticky Navbar)** và **Thanh tóm tắt giỏ hàng nổi**:
```css
background: rgba(255, 255, 255, 0.88);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border-bottom: 1px solid rgba(235, 231, 223, 0.8);
```

---

## 7. 🧩 Quy Chuẩn Thành Phần Chính (Key Component Guidelines)

### 7.1. Nút Bấm (Button System)
* **Primary Button (Đặt bàn ngay / Xác nhận đặt chỗ):**
  - Màu nền: Heritage Jade (`#14532D`)
  - Chữ: Trắng (`#FFFFFF`), Be Vietnam Pro SemiBold
  - Hiệu ứng: Khi rê chuột nổi lên `translateY(-2px)`, đổ bóng `shadow-glow-primary`. Khi bấm co nhẹ `scale(0.98)`.
* **Secondary / Accent Button (Khám phá thực đơn / Món đặc biệt):**
  - Màu nền: Amber Gold (`#D97706`) hoặc Outline vàng ánh kim
  - Chữ: Trắng hoặc Amber 800
* **Ghost / Subtly Interactive Button:**
  - Nền trong suốt, hover hiện nền thảo mộc nhạt (`#F0FDF4`), chữ ngọc bích.

### 7.2. Thẻ Món Ăn (Menu Dish Card)
* Tỷ lệ khung hình: `aspect-[4/3]` cho ảnh món ăn, bo góc trên `rounded-t-lg`.
* Hiệu ứng zoom ảnh: `scale(1.05)` trong `0.4s cubic-bezier(0.16, 1, 0.3, 1)`.
* Nhãn giá: Sử dụng màu vàng hổ phách (`text-accent-600`) font SemiBold lớn, tách bạch rõ ràng với tên món.
* Badge "Món đặt trước" (Pre-order only): Bo tròn góc `rounded-full`, nền đỏ cam nhạt với viền tinh tế, có icon vector biểu thị.

### 7.3. Thanh Tiến Trình Đặt Bàn (Booking Stepper)
* 4 bước rõ ràng: `1. Thông tin bàn` → `2. Vị trí bàn` → `3. Chọn món ăn` → `4. Xác nhận`.
* Trạng thái đã hoàn tất: Vòng tròn màu Jade có icon check vector (không dùng ảnh bitmap), có vòng hào quang nhạt (`ring-4 ring-primary-100`).
* Trạng thái đang thực hiện: Màu Jade đậm, chữ SemiBold, hiệu ứng nổi bật để người dùng luôn biết mình đang ở đâu.

### 7.4. Sơ Đồ Chọn Bàn (Table Layout Map)
* Bàn ăn hiển thị dạng đảo thẻ trực quan (Visual Pods):
  - Ký hiệu rõ: Bàn 2 khách (Bàn đôi), Bàn 4 khách (Gia đình), Bàn tròn VIP 8-10 khách.
  - Phân tầng khu vực rõ rệt bằng nhãn dán: `VIP Zone`, `Sảnh Trung Tâm`, `Cửa Sổ View Phố`.
  - Không gian bàn có trạng thái tương tác rõ rệt: Bàn trống click chọn được sẽ có đường viền nhấp nháy êm dịu (smooth focus ring).

### 7.5. Icon Chuẩn Hóa
* **Tuyệt đối không dùng Emoji cho điều hướng hay chức năng hệ thống.**
* Chuẩn bị tích hợp gói vector icon chất lượng cao như `lucide-react` hoặc `@phosphor-icons/react`:
  - `ShoppingCart` thay cho `🛒`
  - `RotateCcw` thay cho `🔄`
  - `Calendar`, `Clock`, `Users`, `Check`, `ChevronRight`, `Star`, `MapPin`, `Phone`.

---

## 8. 💻 Mẫu Cấu Hình Tailwind CSS v4 (@theme Snippet)

Dưới đây là khối mã chuẩn bị để tích hợp vào file `app/globals.css` ở các bước tiếp theo (tuân thủ cú pháp Tailwind v4 mới nhất):

```css
@import "tailwindcss";

@theme {
  /* Font Pairings */
  --font-serif: var(--font-playfair), "Playfair Display", Georgia, serif;
  --font-sans: var(--font-be-vietnam-pro), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Primary: Heritage Jade */
  --color-primary-50: #f0fdf4;
  --color-primary-100: #dcfce7;
  --color-primary-200: #bbf7d0;
  --color-primary-500: #22c55e;
  --color-primary-700: #15803d;
  --color-primary-800: #14532d;
  --color-primary-900: #0f4c3a;

  /* Accent: Imperial Amber Gold */
  --color-accent-50: #fffbeb;
  --color-accent-100: #fef3c7;
  --color-accent-400: #fbbf24;
  --color-accent-600: #d97706;
  --color-accent-700: #b45309;

  /* Warm Neutrals */
  --color-canvas: #faf8f5;
  --color-surface: #ffffff;
  --color-surface-subtle: #f5f2eb;
  --color-border-subtle: #ebe7df;
  --color-border-strong: #d6d0c4;
  --color-text-main: #1c1917;
  --color-text-muted: #57534e;
  --color-text-subtle: #78716c;

  /* Shadows */
  --shadow-warm-sm: 0 2px 4px -1px rgba(28, 25, 23, 0.04), 0 4px 12px -2px rgba(28, 25, 23, 0.06);
  --shadow-warm-md: 0 8px 20px -4px rgba(28, 25, 23, 0.08), 0 4px 8px -2px rgba(28, 25, 23, 0.04);
  --shadow-warm-lg: 0 16px 32px -4px rgba(28, 25, 23, 0.10), 0 6px 12px -3px rgba(28, 25, 23, 0.05);
  --shadow-glow-primary: 0 8px 24px -4px rgba(20, 83, 45, 0.35);
  --shadow-glow-accent: 0 8px 24px -4px rgba(217, 119, 6, 0.35);

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
  --radius-2xl: 28px;
}
```

---

## 9. 📋 Lộ Trình Triển Khai Tiếp Theo (Action Plan)

Sau khi phê duyệt tài liệu này, lộ trình làm mới giao diện sẽ tiến hành qua các giai đoạn độc lập:

1. **Bước 1: Nâng cấp nền tảng Font & Global Theme**
   - Nạp Google Font `Playfair Display` vào `app/layout.tsx`.
   - Cập nhật `@theme` trong `app/globals.css` theo bảng mã phía trên.
2. **Bước 2: Chuẩn hóa Header & Footer**
   - Khắc phục sự lệch tông giữa Navbar và Footer.
   - Thay icon giỏ hàng emoji `🛒` thành vector SVG icon.
3. **Bước 3: Tinh chỉnh Trang Chủ & Banner**
   - Áp dụng font Serif cho các tiêu đề chính.
   - Thêm hiệu ứng chiều sâu cho 3 thẻ món ăn đặc trưng.
4. **Bước 4: Nâng cấp Trải nghiệm Luồng Đặt Bàn (Booking Flow & Diagram)**
   - Cập nhật màu sắc sơ đồ bàn (Trống, Đang ăn, Đang dọn dẹp, Bàn VIP).
   - Tối ưu bảng chọn giờ, số người và Stepper 4 bước.

