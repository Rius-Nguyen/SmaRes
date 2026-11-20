"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { useAuthSession } from '@/app/lib/useAuthSession';

/**
 * Hero CTA buttons on the About page; hides table-booking CTA for admin accounts.
 */
export function AboutHeroActions() {
  const { isAdmin } = useAuthSession();

  return (
    <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
      {!isAdmin && (
        <Link
          href="/booking"
          className="interactive-btn inline-flex items-center justify-center gap-2 bg-[#14532d] hover:bg-[#15803d] text-white px-8 py-3.5 rounded-full font-semibold text-sm border border-[#22c55e]/30 shadow-[0_8px_24px_-4px_rgba(20,83,45,0.45)] w-full sm:w-auto"
        >
          <span>Đặt bàn trải nghiệm</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7l7 7-7 7" />
          </svg>
        </Link>
      )}
      <Link
        href="/menu"
        className="interactive-btn inline-flex items-center justify-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white px-8 py-3.5 rounded-full font-semibold text-sm shadow-[0_8px_20px_-4px_rgba(217,119,6,0.35)] w-full sm:w-auto"
      >
        <span>Khám phá thực đơn</span>
      </Link>
      <Link
        href="#contact"
        className="interactive-btn inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-8 py-3.5 rounded-full font-semibold text-sm border border-white/25 backdrop-blur-sm w-full sm:w-auto"
      >
        <span>Địa chỉ &amp; Liên hệ</span>
      </Link>
    </div>
  );
}

/**
 * Merged Contact & Support section on the About page (Da Nang address, masked hotline, smares@gmail.com).
 */
export function AboutContactSection() {
  const { showToast } = useToast();
  const { isAdmin } = useAuthSession();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    topic: 'Đặt tiệc & Sự kiện riêng',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim() || !formData.message.trim()) {
      showToast('Vui lòng điền đầy đủ Họ tên, Số điện thoại và Nội dung liên hệ.', 'error');
      return;
    }

    setIsSubmitting(true);
    showToast(
      `Đã ghi nhận yêu cầu "${formData.topic}". Đội ngũ CSKH SmaRes sẽ liên hệ lại với bạn qua SĐT ${formData.phone} trong ít phút.`,
      'success'
    );
    setFormData({
      name: '',
      email: '',
      phone: '',
      topic: 'Đặt tiệc & Sự kiện riêng',
      message: '',
    });
    setIsSubmitting(false);
  };

  return (
    <section id="contact" className="bg-[#f5f2eb] border-y border-[#ebe7df] py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-[#f0fdf4] border border-[#bbf7d0] text-[#14532d] text-xs font-bold uppercase tracking-widest mb-3">
            Kết nối cùng SmaRes Gastronomy
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#1c1917] tracking-tight">
            Địa Chỉ Liên Hệ &amp; Hỗ Trợ Khách Hàng
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#57534e]">
            Từ yêu cầu đặt tiệc phòng riêng, tư vấn thực đơn đến hỗ trợ tài khoản thành viên tại Đà Nẵng, chúng tôi luôn sẵn sàng lắng nghe.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Cột trái: Thẻ thông tin nhà hàng */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white rounded-2xl border border-[#ebe7df] p-6 sm:p-7 shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] space-y-5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#d97706]">
                  Địa điểm &amp; Đường dây nóng
                </span>
                <h3 className="text-2xl font-serif font-bold text-[#14532d] mt-1">
                  SmaRes Gastronomy Đà Nẵng
                </h3>
              </div>

              <ul className="space-y-4 text-sm text-[#57534e]">
                <li className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center text-[#14532d] shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-[#1c1917]">Địa chỉ nhà hàng</p>
                    <p>TP. Đà Nẵng</p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#fffbeb] border border-[#fde68a] flex items-center justify-center text-[#d97706] shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-[#1c1917]">Hotline đặt tiệc &amp; hỗ trợ tài khoản</p>
                    <p className="text-[#14532d] font-bold">**** ****</p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center text-[#14532d] shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-[#1c1917]">Email tiếp nhận</p>
                    <p className="font-medium text-[#1c1917]">smares@gmail.com</p>
                  </div>
                </li>
              </ul>

              <div className="pt-4 border-t border-[#ebe7df] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#faf8f5] border border-[#ebe7df]">
                  <p className="font-semibold text-[#1c1917]">Thứ Hai — Thứ Sáu</p>
                  <p className="text-[#d97706] font-semibold mt-0.5">10:00 AM — 22:30 PM</p>
                </div>
                <div className="p-3 rounded-xl bg-[#faf8f5] border border-[#ebe7df]">
                  <p className="font-semibold text-[#1c1917]">Thứ Bảy — Chủ Nhật &amp; Lễ</p>
                  <p className="text-[#d97706] font-semibold mt-0.5">09:00 AM — 23:00 PM</p>
                </div>
              </div>
            </div>

            {/* Khung nhắc đặt bàn trực tuyến (ẩn đối với Admin) */}
            {!isAdmin && (
              <div className="bg-[#14532d] text-white rounded-2xl p-6 shadow-[0_8px_24px_-4px_rgba(20,83,45,0.28)] space-y-3">
                <h3 className="font-serif text-lg font-bold">
                  Muốn chọn bàn ngay theo thời gian thực?
                </h3>
                <p className="text-xs sm:text-sm text-[#dcfce7] leading-relaxed">
                  Hệ thống đặt bàn SmaRes cập nhật trạng thái bàn trống trực tiếp và hỗ trợ đặt cọc giữ chỗ nhanh chóng chỉ trong 30 giây.
                </p>
                <Link
                  href="/booking"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#d97706] hover:bg-[#b45309] text-white text-xs font-semibold transition-colors shadow-xs"
                >
                  <span>Đi tới Đặt bàn trực tuyến</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            )}
          </div>

          {/* Cột phải: Biểu mẫu gửi lời nhắn */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#ebe7df] p-6 sm:p-8 shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)]">
            <h3 className="text-2xl font-serif font-bold text-[#1c1917] mb-2">
              Gửi Yêu Cầu Tư Vấn Hoặc Hỗ Trợ
            </h3>
            <p className="text-sm text-[#57534e] mb-6">
              Điền thông tin bên dưới để bộ phận chăm sóc khách hàng SmaRes hỗ trợ đặt tiệc đoàn, thực đơn theo yêu cầu hoặc khôi phục tài khoản.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-name" className="block text-xs sm:text-sm font-semibold text-[#1c1917] mb-1.5">
                    Họ và tên <span className="text-[#d97706]">*</span>
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Nguyễn Minh Anh"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#faf8f5] border border-[#d6d0c4] text-sm text-[#1c1917] focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="contact-phone" className="block text-xs sm:text-sm font-semibold text-[#1c1917] mb-1.5">
                    Số điện thoại <span className="text-[#d97706]">*</span>
                  </label>
                  <input
                    id="contact-phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="09xx xxx xxx"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#faf8f5] border border-[#d6d0c4] text-sm text-[#1c1917] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-email" className="block text-xs sm:text-sm font-semibold text-[#1c1917] mb-1.5">
                    Email liên hệ
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="ban@example.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#faf8f5] border border-[#d6d0c4] text-sm text-[#1c1917] focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="contact-topic" className="block text-xs sm:text-sm font-semibold text-[#1c1917] mb-1.5">
                    Chủ đề cần hỗ trợ
                  </label>
                  <select
                    id="contact-topic"
                    name="topic"
                    value={formData.topic}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#faf8f5] border border-[#d6d0c4] text-sm text-[#1c1917] focus:bg-white transition-all"
                  >
                    <option value="Đặt tiệc & Sự kiện riêng">Đặt tiệc &amp; Sự kiện riêng</option>
                    <option value="Hỗ trợ tài khoản & Mật khẩu">Hỗ trợ tài khoản &amp; Mật khẩu</option>
                    <option value="Thay đổi hoặc hủy đặt bàn">Thay đổi hoặc hủy đặt bàn</option>
                    <option value="Góp ý chất lượng phục vụ">Góp ý chất lượng phục vụ</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-xs sm:text-sm font-semibold text-[#1c1917] mb-1.5">
                  Nội dung chi tiết <span className="text-[#d97706]">*</span>
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={4}
                  required
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Vui lòng mô tả số lượng khách, khung giờ dự kiến hoặc vấn đề tài khoản cần hỗ trợ..."
                  className="w-full px-4 py-3 rounded-xl bg-[#faf8f5] border border-[#d6d0c4] text-sm text-[#1c1917] focus:bg-white transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="interactive-btn w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-[#14532d] hover:bg-[#0f3d21] text-white text-sm font-semibold shadow-[0_8px_20px_-4px_rgba(20,83,45,0.28)] disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>Gửi yêu cầu cho SmaRes</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Terms footer actions on the About page; hides booking link for admin accounts.
 */
export function AboutTermsActions() {
  const { isAdmin } = useAuthSession();

  return (
    <div className="flex items-center gap-3">
      <Link
        href="#contact"
        className="px-5 py-2.5 rounded-full border border-[#d6d0c4] bg-white hover:bg-[#f5f2eb] text-xs font-semibold text-[#1c1917] transition-colors"
      >
        Liên hệ tư vấn
      </Link>
      {!isAdmin && (
        <Link
          href="/booking"
          className="px-5 py-2.5 rounded-full bg-[#14532d] hover:bg-[#0f3d21] text-white text-xs font-semibold transition-colors"
        >
          Đặt bàn ngay
        </Link>
      )}
    </div>
  );
}
