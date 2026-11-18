"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BookingStepper from '@/components/BookingStepper';
import { useCart } from '@/app/context/CartContext';

export default function BookingPage() {
  const router = useRouter();
  const { bookingInfo, setBookingInfo } = useCart();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    date: '',
    time: '19:00',
    guests: '4 người',
    note: '',
  });

  const [errorMsg, setErrorMsg] = useState('');

  // Tự động load thông tin đã lưu hoặc thông tin user nếu có
  useEffect(() => {
    // Ngày mặc định là ngày mai
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDateStr = tomorrow.toISOString().split('T')[0];

    // Lấy thông tin user đăng nhập nếu có
    let userName = '';
    let userEmail = '';
    let userPhone = '';
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        userName = u.name || '';
        userEmail = u.email || '';
        userPhone = u.phone || '';
      }
    } catch (e) {
      console.error(e);
    }

    if (bookingInfo) {
      setFormData({
        name: bookingInfo.name || userName,
        phone: bookingInfo.phone || userPhone,
        email: bookingInfo.email || userEmail,
        date: bookingInfo.date || defaultDateStr,
        time: bookingInfo.time || '19:00',
        guests: String(bookingInfo.guests || '4 người'),
        note: bookingInfo.note || '',
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        name: userName || prev.name,
        email: userEmail || prev.email,
        phone: userPhone || prev.phone,
        date: defaultDateStr,
      }));
    }
  }, [bookingInfo]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên của bạn.');
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMsg('Vui lòng nhập số điện thoại liên hệ.');
      return;
    }
    if (!formData.date) {
      setErrorMsg('Vui lòng chọn ngày đặt bàn.');
      return;
    }
    if (!formData.time || formData.time === 'Chọn khung giờ') {
      setErrorMsg('Vui lòng chọn khung giờ đến.');
      return;
    }

    // Cập nhật thông tin vào context & localStorage
    setBookingInfo((prev) => ({
      ...prev,
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      date: formData.date,
      time: formData.time,
      guests: formData.guests,
      note: formData.note.trim(),
    }));

    // Chuyển sang bước 2: Chọn vị trí bàn trên sơ đồ
    router.push('/booking/diagram');
  };

  return (
    <main className="flex-1 bg-[#faf8f5] text-[#1c1917] flex flex-col min-h-screen">
      {/* Banner */}
      <div className="relative h-[34vh] md:h-[38vh] bg-cover bg-center flex items-center justify-center overflow-hidden" style={{ backgroundImage: "url('/foods/hero-bg3.jpg')" }}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-[#0a1f14]/85"></div>
        <div className="relative z-10 text-center text-white px-4 mt-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#14532d]/70 border border-[#fbbf24]/40 text-[#fde68a] text-xs font-semibold uppercase tracking-widest mb-3 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]"></span>
            SmaRes Gastronomy
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white mb-3 tracking-tight">
            Đặt Bàn Trực Tuyến
          </h1>
          <p className="text-sm md:text-base text-stone-200 font-light max-w-xl mx-auto leading-relaxed">
            Hãy để chúng tôi chuẩn bị sẵn sàng cho trải nghiệm ẩm thực thượng hạng của bạn.
          </p>
        </div>
      </div>

      {/* Workflow Stepper: Bước 1 */}
      <BookingStepper currentStep={1} />

      {/* Nội dung Form */}
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-20">
        
        {/* Cột trái: Form điền thông tin (chiếm 2 phần) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] p-8 md:p-10 border border-[#ebe7df]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#14532d]">1. Thông tin đặt bàn</h2>
            <span className="text-xs sm:text-sm font-semibold px-3.5 py-1 bg-[#f0fdf4] text-[#15803d] rounded-full border border-[#bbf7d0]">
              Bước 1 / 4
            </span>
          </div>
          <p className="text-stone-600 text-sm md:text-base mb-8 pb-4 border-b border-[#ebe7df]">
            Vui lòng điền đầy đủ thông tin bên dưới để SmaRes phục vụ bạn chu đáo nhất
          </p>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-2">Họ và tên *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ví dụ: Nguyễn Văn A"
                className="w-full px-4 py-3 rounded-xl border border-[#d6d0c4] text-sm focus:ring-2 focus:ring-[#14532d] focus:border-[#14532d] outline-none transition-all bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-2">Số điện thoại *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="09xx xxx xxx"
                className="w-full px-4 py-3 rounded-xl border border-[#d6d0c4] text-sm focus:ring-2 focus:ring-[#14532d] focus:border-[#14532d] outline-none transition-all bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-2">Địa chỉ Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="nguyenvana@gmail.com"
                className="w-full px-4 py-3 rounded-xl border border-[#d6d0c4] text-sm focus:ring-2 focus:ring-[#14532d] focus:border-[#14532d] outline-none transition-all bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-2">Ngày đặt bàn *</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-[#d6d0c4] text-sm focus:ring-2 focus:ring-[#14532d] focus:border-[#14532d] outline-none transition-all text-stone-800 bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-2">Giờ đến *</label>
              <select
                name="time"
                value={formData.time}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-[#d6d0c4] text-sm focus:ring-2 focus:ring-[#14532d] focus:border-[#14532d] outline-none transition-all text-stone-800 bg-white"
              >
                <option value="11:30">11:30 (Trưa)</option>
                <option value="12:00">12:00 (Trưa)</option>
                <option value="12:30">12:30 (Trưa)</option>
                <option value="18:00">18:00 (Tối)</option>
                <option value="18:30">18:30 (Tối)</option>
                <option value="19:00">19:00 (Tối)</option>
                <option value="19:30">19:30 (Tối)</option>
                <option value="20:00">20:00 (Tối)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-stone-800 mb-2">Số lượng khách *</label>
              <select
                name="guests"
                value={formData.guests}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-[#d6d0c4] text-sm focus:ring-2 focus:ring-[#14532d] focus:border-[#14532d] outline-none transition-all text-stone-800 bg-white"
              >
                <option value="2 người">2 người (Cặp đôi / Bạn bè)</option>
                <option value="4 người">4 người (Gia đình nhỏ)</option>
                <option value="6 người">6 người (Tiệc thân mật)</option>
                <option value="8-10 người">8 - 10 người (Khu VIP)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-stone-800 mb-2">Yêu cầu đặc biệt (Ghi chú thêm)</label>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleChange}
                rows={3}
                placeholder="Ví dụ: Ghế trẻ em, dị ứng hải sản, tổ chức sinh nhật, bàn yên tĩnh..."
                className="w-full px-4 py-3 rounded-xl border border-[#d6d0c4] text-sm focus:ring-2 focus:ring-[#14532d] focus:border-[#14532d] outline-none transition-all bg-white"
              ></textarea>
            </div>
            <div className="md:col-span-2 mt-2">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-[#14532d] hover:bg-[#15803d] text-white font-semibold py-4 rounded-xl shadow-[0_8px_24px_-4px_rgba(20,83,45,0.45)] hover:shadow-[0_12px_28px_-4px_rgba(20,83,45,0.6)] transition-all text-base sm:text-lg cursor-pointer"
              >
                <span>Tiếp tục: Chọn vị trí bàn trên sơ đồ</span>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14"></path>
                  <path d="m12 5 7 7-7 7"></path>
                </svg>
              </button>
            </div>
          </form>
        </div>

        {/* Cột phải: Thông tin thêm (chiếm 1 phần) */}
        <div className="space-y-6">
          {/* Box SmaRes Gastronomy */}
          <div className="bg-[#0a1f14] rounded-2xl p-8 text-white shadow-md border border-[#14532d]/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#fbbf24]/5 rounded-full blur-2xl"></div>
            <h3 className="text-2xl font-serif font-bold text-[#fbbf24] mb-4">SmaRes Gastronomy</h3>
            <p className="text-sm text-stone-300 mb-6 leading-relaxed font-light">
              Hương vị truyền thống được chế tác thông minh và chuẩn mực cao cấp. Khám phá ẩm thực mới lạ trong không gian mang hơi thở Á Đông hiện đại.
            </p>
            <ul className="space-y-4 text-sm text-stone-300">
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#14532d] text-[#fbbf24] shrink-0 border border-[#22c55e]/20">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </span>
                <span>Quận 1, Thành phố Hồ Chí Minh</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#14532d] text-[#fbbf24] shrink-0 border border-[#22c55e]/20">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                </span>
                <span>Hotline: 1900 1234</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#14532d] text-[#fbbf24] shrink-0 border border-[#22c55e]/20">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </span>
                <span>Giờ mở cửa: 09:00 AM - 23:00 PM</span>
              </li>
            </ul>
          </div>

          {/* Quy trình đặt chỗ */}
          <div className="bg-white rounded-2xl p-7 border border-[#ebe7df] shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)]">
            <h3 className="text-[#14532d] font-serif font-bold mb-4 text-xl">Quy trình 4 bước tiện lợi</h3>
            <ol className="text-sm text-stone-700 space-y-3.5 list-decimal pl-5 leading-relaxed">
              <li><strong className="text-stone-900 font-semibold">Đặt thông tin bàn:</strong> Điền thời gian và số lượng khách.</li>
              <li><strong className="text-stone-900 font-semibold">Chọn vị trí:</strong> Chọn bàn ưng ý trực quan trên sơ đồ 3D.</li>
              <li><strong className="text-stone-900 font-semibold">Đặt món trước (Tùy chọn):</strong> Chọn các món ăn độc quyền mở riêng cho khách đặt bàn.</li>
              <li><strong className="text-stone-900 font-semibold">Xác nhận:</strong> Nhận mã đặt chỗ &amp; QR Code check-in tức thì.</li>
            </ol>
          </div>
        </div>

      </div>
    </main>
  );
}