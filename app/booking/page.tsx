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
    <main className="flex-1 bg-gray-50 flex flex-col min-h-screen">
      {/* Banner */}
      <div className="relative h-[32vh] md:h-[36vh] bg-cover bg-center flex items-center justify-center" style={{ backgroundImage: "url('/foods/hero-bg3.jpg')" }}>
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="relative z-10 text-center text-white px-4 mt-6">
          <span className="text-sm uppercase tracking-widest text-green-400 font-bold mb-2 inline-block">SmaRes Gastronomy</span>
          <h1 className="text-3xl md:text-5xl font-bold font-sans mb-3">Đặt Bàn Trực Tuyến</h1>
          <p className="text-base md:text-lg text-gray-200 font-normal max-w-2xl mx-auto">
            Hãy để chúng tôi chuẩn bị sẵn sàng cho trải nghiệm ẩm thực thượng hạng của bạn
          </p>
        </div>
      </div>

      {/* Workflow Stepper: Bước 1 */}
      <BookingStepper currentStep={1} />

      {/* Nội dung Form */}
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-20">
        
        {/* Cột trái: Form điền thông tin (chiếm 2 phần) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-8 md:p-10 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl md:text-3xl font-bold text-green-800">1. Thông tin đặt bàn</h2>
            <span className="text-sm sm:text-base font-semibold px-4 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-200">
              Bước 1 / 4
            </span>
          </div>
          <p className="text-gray-600 text-base md:text-lg mb-8 pb-4 border-b">
            Vui lòng điền đầy đủ thông tin bên dưới để SmaRes phục vụ bạn chu đáo nhất
          </p>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-base flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-2">Họ và tên *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ví dụ: Nguyễn Văn A"
                className="w-full px-4 py-3.5 rounded-xl border border-gray-300 text-base focus:ring-2 focus:ring-green-700 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-2">Số điện thoại *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="09xx xxx xxx"
                className="w-full px-4 py-3.5 rounded-xl border border-gray-300 text-base focus:ring-2 focus:ring-green-700 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-2">Địa chỉ Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="nguyenvana@gmail.com"
                className="w-full px-4 py-3.5 rounded-xl border border-gray-300 text-base focus:ring-2 focus:ring-green-700 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-2">Ngày đặt bàn *</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full px-4 py-3.5 rounded-xl border border-gray-300 text-base focus:ring-2 focus:ring-green-700 outline-none transition-all text-gray-800"
                required
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-2">Giờ đến *</label>
              <select
                name="time"
                value={formData.time}
                onChange={handleChange}
                className="w-full px-4 py-3.5 rounded-xl border border-gray-300 text-base focus:ring-2 focus:ring-green-700 outline-none transition-all text-gray-800 bg-white"
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
              <label className="block text-base font-semibold text-gray-800 mb-2">Số lượng khách *</label>
              <select
                name="guests"
                value={formData.guests}
                onChange={handleChange}
                className="w-full px-4 py-3.5 rounded-xl border border-gray-300 text-base focus:ring-2 focus:ring-green-700 outline-none transition-all text-gray-800 bg-white"
              >
                <option value="2 người">2 người (Cặp đôi / Bạn bè)</option>
                <option value="4 người">4 người (Gia đình nhỏ)</option>
                <option value="6 người">6 người (Tiệc thân mật)</option>
                <option value="8-10 người">8 - 10 người (Khu VIP)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-base font-semibold text-gray-800 mb-2">Yêu cầu đặc biệt (Ghi chú thêm)</label>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleChange}
                rows={3}
                placeholder="Ví dụ: Ghế trẻ em, dị ứng hải sản, tổ chức sinh nhật, bàn yên tĩnh..."
                className="w-full px-4 py-3.5 rounded-xl border border-gray-300 text-base focus:ring-2 focus:ring-green-700 outline-none transition-all"
              ></textarea>
            </div>
            <div className="md:col-span-2 mt-2">
              <button
                type="submit"
                className="interactive-btn w-full flex items-center justify-center gap-2 bg-green-800 text-white font-bold py-4 rounded-xl hover:bg-green-900 shadow-md transition-all text-lg sm:text-xl"
              >
                <span>Tiếp tục: Chọn vị trí bàn trên sơ đồ</span>
                <span>→</span>
              </button>
            </div>
          </form>
        </div>

        {/* Cột phải: Thông tin thêm (chiếm 1 phần) */}
        <div className="space-y-6">
          {/* Box SmaRes Gastronomy */}
          <div className="bg-zinc-900 rounded-2xl p-8 text-white shadow-sm border border-zinc-800">
            <h3 className="text-2xl md:text-3xl font-bold text-orange-400 mb-4">SmaRes Gastronomy</h3>
            <p className="text-base text-gray-300 mb-6 leading-relaxed font-normal">
              Hương vị truyền thống được chế tác thông minh và chuẩn mực cao cấp. Khám phá ẩm thực mới lạ trong không gian mang hơi thở Á Đông hiện đại.
            </p>
            <ul className="space-y-4 text-base text-gray-200">
              <li className="flex items-start">
                <span className="text-orange-400 mr-3 font-bold text-xl">📍</span> Quận 1, Thành phố Hồ Chí Minh
              </li>
              <li className="flex items-start">
                <span className="text-orange-400 mr-3 font-bold text-xl">📞</span> Hotline: 1900 1234
              </li>
              <li className="flex items-start">
                <span className="text-orange-400 mr-3 font-bold text-xl">⏰</span> Giờ mở cửa: 09:00 AM - 23:00 PM
              </li>
            </ul>
          </div>

          {/* Quy trình đặt chỗ */}
          <div className="bg-white rounded-2xl p-7 border border-gray-200 shadow-sm">
            <h3 className="text-green-800 font-bold mb-4 text-xl">Quy trình 4 bước tiện lợi</h3>
            <ol className="text-base text-gray-700 space-y-3.5 list-decimal pl-5 leading-relaxed">
              <li><strong className="text-gray-900 font-bold">Đặt thông tin bàn:</strong> Điền thời gian và số lượng khách.</li>
              <li><strong className="text-gray-900 font-bold">Chọn vị trí:</strong> Chọn bàn ưng ý trực quan trên sơ đồ 3D.</li>
              <li><strong className="text-gray-900 font-bold">Đặt món trước (Tùy chọn):</strong> Chọn các món ăn độc quyền mở riêng cho khách đặt bàn.</li>
              <li><strong className="text-gray-900 font-bold">Xác nhận:</strong> Nhận mã đặt chỗ & QR Code check-in tức thì.</li>
            </ol>
          </div>
        </div>

      </div>
    </main>
  );
}