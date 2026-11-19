import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Về Chúng Tôi | SmaRes Gastronomy',
  description:
    'Khám phá câu chuyện di sản ẩm thực Việt Nam đương đại, triết lý thảo mộc bản địa và không gian phòng tiệc tinh tế tại SmaRes.',
};

const CULINARY_PILLARS = [
  {
    title: '100% Thảo Mộc & Nguyên Liệu Bản Địa',
    description:
      'Tuyển chọn mỗi sáng từ các vùng nguyên liệu đặc sản Tây Bắc, Huế và Đồng bằng sông Cửu Long để giữ trọn độ tươi ngon nguyên bản.',
    badge: 'Nguồn gốc minh bạch',
    icon: (
      <svg className="w-6 h-6 text-[#14532d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 3v18m0-18c-4.5 2-7 6-7 10a7 7 0 0014 0c0-4-2.5-8-7-10z" />
      </svg>
    ),
  },
  {
    title: 'Kỹ Nghệ Bếp Trưởng Đương Đại',
    description:
      'Giao thoa giữa bí quyết hầm nước dùng 24 giờ cổ truyền và kỹ thuật trình bày Fine Dining tinh giản, đánh thức mọi giác quan.',
    badge: 'Tinh hoa ba miền',
    icon: (
      <svg className="w-6 h-6 text-[#d97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    title: 'Trải Nghiệm Đặt Bàn & Phục Vụ Thông Minh',
    description:
      'Chọn chính xác vị trí bàn trên sơ đồ trực quan, đặt trước món Signature và gọi phục vụ tại bàn qua mã QR chỉ với một chạm.',
    badge: 'Công nghệ SmaRes',
    icon: (
      <svg className="w-6 h-6 text-[#14532d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
      </svg>
    ),
  },
] as const;

const DINING_ZONES = [
  {
    name: 'Khu Vực VIP Sang Trọng',
    capacity: '8 – 10 khách / bàn tròn riêng tư',
    description:
      'Không gian tách biệt với ánh sáng vàng ấm áp, cách âm chuẩn mực dành cho tiệc gia đình thân mật và tiếp đãi đối tác quan trọng.',
    imageUrl: '/foods/table_vip.jpg',
    tag: 'VIP Zone',
  },
  {
    name: 'Sảnh Trung Tâm Ấm Cúng',
    capacity: '4 khách / bàn tiêu chuẩn',
    description:
      'Thiết kế mở hài hòa giữa chất liệu gỗ trầm và sắc ngọc lục bảo, mang lại bầu không khí sum vầy sôi nổi nhưng vẫn thư thái.',
    imageUrl: '/foods/table_center.jpg',
    tag: 'Sảnh Chính',
  },
  {
    name: 'Cửa Sổ View Phố Lãng Mạn',
    capacity: '2 khách / bàn đôi riêng tư',
    description:
      'Ô cửa kính toàn cảnh hướng về nhịp sống trung tâm Sài Gòn rực rỡ ánh đèn về đêm, lý tưởng cho những buổi hẹn hò đáng nhớ.',
    imageUrl: '/foods/table_window.jpg',
    tag: 'View Phố',
  },
] as const;

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#faf8f5] text-[#1c1917]">
      {/* 1. Hero Story */}
      <section className="relative overflow-hidden bg-[#0a1f14] text-white">
        <Image
          src="/foods/hero-bg2.jpg"
          alt="Không gian nhà hàng SmaRes Gastronomy"
          fill
          preload
          sizes="100vw"
          className="object-cover object-center opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1f14]/85 via-[#0a1f14]/75 to-[#0a1f14]/95" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#14532d]/70 border border-[#fbbf24]/40 text-[#fde68a] text-xs font-bold uppercase tracking-[0.2em] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" />
            Câu chuyện thương hiệu SmaRes
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight leading-tight max-w-4xl mx-auto">
            Nơi Di Sản Ẩm Thực Việt Giao Hòa Cùng Nhịp Sống Đương Đại
          </h1>
          <p className="mt-6 text-base sm:text-lg text-[#e7e5e4] max-w-2xl mx-auto leading-relaxed font-light">
            Tại SmaRes Gastronomy, mỗi món ăn là một tác phẩm kể câu chuyện vùng miền bằng nguyên liệu thảo mộc tinh tuyển, kết hợp trải nghiệm đặt bàn và phục vụ thông minh không gián đoạn.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/booking"
              className="interactive-btn inline-flex items-center justify-center gap-2 bg-[#14532d] hover:bg-[#15803d] text-white px-8 py-3.5 rounded-full font-semibold text-sm border border-[#22c55e]/30 shadow-[0_8px_24px_-4px_rgba(20,83,45,0.45)] w-full sm:w-auto"
            >
              <span>Đặt bàn trải nghiệm</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/menu"
              className="interactive-btn inline-flex items-center justify-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white px-8 py-3.5 rounded-full font-semibold text-sm shadow-[0_8px_20px_-4px_rgba(217,119,6,0.35)] w-full sm:w-auto"
            >
              <span>Khám phá thực đơn</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Triết lý ẩm thực */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-block px-3 py-1 rounded-full bg-[#fef3c7] border border-[#fde68a] text-[#92400e] text-xs font-bold uppercase tracking-widest mb-3">
            Triết lý cốt lõi
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#1c1917] tracking-tight">
            Ba Trụ Cột Làm Nên Bản Sắc SmaRes
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#57534e]">
            Từ khu bếp chuẩn mực đến từng thao tác đặt bàn trên đầu ngón tay, mọi chi tiết đều hướng đến sự hiếu khách trọn vẹn.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {CULINARY_PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className="bg-white rounded-2xl border border-[#ebe7df] p-7 shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#f5f2eb] border border-[#ebe7df] flex items-center justify-center mb-5">
                  {pillar.icon}
                </div>
                <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-[#d97706] mb-2">
                  {pillar.badge}
                </span>
                <h3 className="text-xl font-serif font-bold text-[#1c1917] mb-3 leading-snug">
                  {pillar.title}
                </h3>
                <p className="text-sm text-[#57534e] leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Không gian các phân khu bàn ăn */}
      <section className="bg-[#f5f2eb] border-y border-[#ebe7df] py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-[#f0fdf4] border border-[#bbf7d0] text-[#14532d] text-xs font-bold uppercase tracking-widest mb-3">
                Không gian kiến trúc
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#1c1917] tracking-tight">
                Ba Phân Khu Trải Nghiệm Độc Bản
              </h2>
            </div>
            <Link
              href="/booking/diagram"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#14532d] hover:text-[#15803d] transition-colors"
            >
              <span>Xem sơ đồ bàn trực tiếp</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {DINING_ZONES.map((zone) => (
              <article
                key={zone.name}
                className="group bg-white rounded-2xl border border-[#ebe7df] overflow-hidden shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] hover:shadow-[0_16px_32px_-4px_rgba(28,25,23,0.12)] transition-all duration-300"
              >
                <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
                  <Image
                    src={zone.imageUrl}
                    alt={zone.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold bg-[#14532d]/90 text-white backdrop-blur-sm">
                    {zone.tag}
                  </span>
                </div>
                <div className="p-6 space-y-2">
                  <h3 className="text-xl font-serif font-bold text-[#1c1917]">
                    {zone.name}
                  </h3>
                  <p className="text-xs font-semibold text-[#d97706]">
                    {zone.capacity}
                  </p>
                  <p className="text-sm text-[#57534e] leading-relaxed pt-1">
                    {zone.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Điều khoản sử dụng & Cam kết dịch vụ */}
      <section id="terms" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl border border-[#ebe7df] p-6 sm:p-10 shadow-[0_4px_20px_-2px_rgba(28,25,23,0.05)] space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] flex items-center justify-center text-[#14532d] shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-[#1c1917]">
                Điều Khoản Sử Dụng &amp; Quy Định Đặt Bàn
              </h2>
              <p className="text-xs text-[#78716c]">
                Cập nhật chuẩn phục vụ tại SmaRes Gastronomy
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-[#57534e] leading-relaxed">
            <div className="p-4 rounded-xl bg-[#faf8f5] border border-[#ebe7df] space-y-1.5">
              <h3 className="font-semibold text-[#14532d]">1. Chính sách giữ bàn &amp; hủy lịch</h3>
              <p>
                Quý khách có thể hủy đặt bàn trực tuyến miễn phí trước giờ hẹn tối thiểu <strong>60 phút</strong> (theo múi giờ Việt Nam GMT+7) tại mục Lịch sử đặt bàn.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#faf8f5] border border-[#ebe7df] space-y-1.5">
              <h3 className="font-semibold text-[#14532d]">2. Món Signature đặt trước</h3>
              <p>
                Các món đặc trưng như Phở Bò Wagyu A5 hoặc Vịt Quay Mật Ong Rừng cần thời gian chuẩn bị riêng và chỉ nhận khi đi kèm đặt bàn xác nhận.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-[#ebe7df]">
            <p className="text-xs text-[#78716c]">
              Cần tư vấn tổ chức tiệc riêng hoặc thực đơn đoàn? Đội ngũ SmaRes luôn sẵn sàng hỗ trợ.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/contact"
                className="px-5 py-2.5 rounded-full border border-[#d6d0c4] bg-white hover:bg-[#f5f2eb] text-xs font-semibold text-[#1c1917] transition-colors"
              >
                Liên hệ tư vấn
              </Link>
              <Link
                href="/booking"
                className="px-5 py-2.5 rounded-full bg-[#14532d] hover:bg-[#0f3d21] text-white text-xs font-semibold transition-colors"
              >
                Đặt bàn ngay
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
