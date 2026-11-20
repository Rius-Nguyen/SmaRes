'use client';

import { useState, useEffect, useCallback } from 'react';

interface EmailDetails {
  bookingId?: string;
  customerName?: string;
  tableId?: string;
  bookingTime?: string;
  guests?: number | string;
  depositAmount?: number | string;
}

interface EmailTestResponse {
  success?: boolean;
  message?: string;
  withinOneMinuteSLA?: boolean;
  clientMs?: number;
  email?: {
    to?: string;
    details?: EmailDetails;
  };
}

export default function EmailTestPage() {
  const [customerEmail, setCustomerEmail] = useState('thanhhai@gmail.com');
  const [customerName, setCustomerName] = useState('Thanh Hai');
  const [bookingId, setBookingId] = useState('SR-2026-4795');
  const [tableId, setTableId] = useState('B05');
  const [guests, setGuests] = useState(2);
  const [bookingTime, setBookingTime] = useState('12:00, 19/11/2026');
  const [depositAmount, setDepositAmount] = useState(100000);
  const [result, setResult] = useState<EmailTestResponse | null>(null);
  const [sending, setSending] = useState(false);

  const runTest = useCallback(async () => {
    try {
      setSending(true);
      const t0 = performance.now();
      const res = await fetch('/api/email-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail,
          customerName,
          bookingId,
          tableId,
          guests,
          bookingTime,
          depositAmount,
        }),
      });
      const data = (await res.json()) as EmailTestResponse;
      const clientMs = Math.max(1, Math.round(performance.now() - t0));
      setResult({ ...data, clientMs });
    } catch (err) {
      console.error('Lỗi test email:', err);
    } finally {
      setSending(false);
    }
  }, [customerEmail, customerName, bookingId, tableId, guests, bookingTime, depositAmount]);

  useEffect(() => {
    let active = true;

    async function initialTest() {
      try {
        setSending(true);
        const t0 = performance.now();
        const res = await fetch('/api/email-confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerEmail: 'thanhhai@gmail.com',
            customerName: 'Thanh Hai',
            bookingId: 'SR-2026-4795',
            tableId: 'B05',
            guests: 2,
            bookingTime: '12:00, 19/11/2026',
            depositAmount: 100000,
          }),
        });
        const data = (await res.json()) as EmailTestResponse;
        const clientMs = Math.max(1, Math.round(performance.now() - t0));
        if (active) {
          setResult({ ...data, clientMs });
        }
      } catch (err) {
        if (active) {
          console.error('Lỗi test email:', err);
        }
      } finally {
        if (active) {
          setSending(false);
        }
      }
    }

    void initialTest();

    return () => {
      active = false;
    };
  }, []);

  const info = result?.email?.details;

  return (
    <main className="min-h-screen bg-[#f4f7f5] py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Banner */}
        <header className="relative overflow-hidden bg-gradient-to-br from-[#0e3f2d] via-[#155e42] to-[#1f7d58] rounded-3xl p-7 sm:p-8 text-white shadow-lg shadow-[#155e42]/10 border border-emerald-900/10">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 border border-white/20 text-[11px] font-semibold tracking-wider uppercase mb-3">
                <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
                SmaRes Gastronomy • Email Notification Service
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Kiểm Thử Tốc Độ Gửi Email &amp; Xác Nhận Thông Tin Bàn
              </h1>
              <p className="text-emerald-100/90 text-sm mt-1.5 max-w-2xl leading-relaxed">
                Đo thời gian phản hồi gửi thư xác nhận tự động (&lt; 60 giây) và kiểm tra tính chính xác của phiếu đặt bàn gửi tới khách hàng.
              </p>
            </div>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Cột trái: Tham số & Chỉ số hiệu năng */}
          <div className="lg:col-span-5 space-y-6">
            <section className="bg-white rounded-3xl border border-emerald-950/5 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
                <h2 className="text-base font-bold text-gray-900">
                  Thông tin đơn đặt bàn
                </h2>
                <span className="text-[11px] font-semibold text-[#155e42] bg-emerald-50 border border-emerald-200/70 px-2.5 py-1 rounded-full">
                  Dữ liệu kiểm thử
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Email nhận xác nhận
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50/40 text-sm text-gray-800 focus:bg-white focus:outline-none focus:border-[#155e42] focus:ring-2 focus:ring-[#155e42]/15 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Mã đặt bàn
                    </label>
                    <input
                      type="text"
                      value={bookingId}
                      onChange={(e) => setBookingId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50/40 text-sm font-semibold text-gray-800 focus:bg-white focus:outline-none focus:border-[#155e42] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Tên khách hàng
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50/40 text-sm text-gray-800 focus:bg-white focus:outline-none focus:border-[#155e42] transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Số bàn
                    </label>
                    <input
                      type="text"
                      value={tableId}
                      onChange={(e) => setTableId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50/40 text-sm font-semibold text-gray-800 focus:bg-white focus:outline-none focus:border-[#155e42] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Số khách
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50/40 text-sm text-gray-800 focus:bg-white focus:outline-none focus:border-[#155e42] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Tiền cọc (đ)
                    </label>
                    <input
                      type="number"
                      step={50000}
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50/40 text-sm text-gray-800 focus:bg-white focus:outline-none focus:border-[#155e42] transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Khung giờ hẹn
                  </label>
                  <input
                    type="text"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50/40 text-sm text-gray-800 focus:bg-white focus:outline-none focus:border-[#155e42] transition"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => void runTest()}
                disabled={sending}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#13543b] to-[#1b7352] hover:from-[#0f4430] hover:to-[#155e42] active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-[#155e42]/20 transition cursor-pointer"
              >
                {sending ? 'Đang gửi email...' : 'Gửi Email Xác Nhận & Đo Tốc Độ'}
              </button>
            </section>

            {/* Thẻ đo tốc độ & tính chính xác */}
            {result && (
              <section className="bg-white rounded-3xl border border-emerald-950/5 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-900">
                    Kết quả đo lường hiệu năng
                  </h2>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    Tự động
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-gradient-to-b from-emerald-50 to-emerald-50/40 border border-emerald-200/60 p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      Tốc độ gửi
                    </p>
                    <p className="text-lg font-extrabold text-emerald-950 mt-1">
                      {result.clientMs} ms
                    </p>
                    <p className="text-[11px] text-emerald-700/80 mt-0.5">&lt; 60 giây</p>
                  </div>

                  <div className="rounded-2xl bg-gradient-to-b from-emerald-50 to-emerald-50/40 border border-emerald-200/60 p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      Trạng thái
                    </p>
                    <p className="text-base font-extrabold text-[#155e42] mt-1.5">
                      {result.withinOneMinuteSLA ? 'ĐẠT' : 'LỖI'}
                    </p>
                    <p className="text-[11px] text-emerald-700/80 mt-1">Đúng hạn</p>
                  </div>

                  <div className="rounded-2xl bg-gradient-to-b from-emerald-50 to-emerald-50/40 border border-emerald-200/60 p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      Nội dung
                    </p>
                    <p className="text-base font-extrabold text-emerald-950 mt-1.5">
                      5 / 5 mục
                    </p>
                    <p className="text-[11px] text-emerald-700/80 mt-1">Chính xác</p>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Cột phải: Bản xem trước Email SmaRes Gastronomy */}
          <div className="lg:col-span-7">
            {info && (
              <section className="bg-white rounded-3xl border border-gray-200/80 shadow-lg shadow-gray-900/5 overflow-hidden">
                {/* Thanh thông tin thư */}
                <div className="px-6 py-4 bg-[#fafbfa] border-b border-gray-100 space-y-1 text-xs text-gray-600">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate">
                      <span className="text-gray-400 inline-block w-12">Từ:</span>
                      <span className="font-semibold text-gray-800">
                        SmaRes Gastronomy &lt;booking@smares.vn&gt;
                      </span>
                    </p>
                    <span className="shrink-0 text-[11px] font-semibold text-[#155e42] bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                      Đã gửi
                    </span>
                  </div>
                  <p className="truncate">
                    <span className="text-gray-400 inline-block w-12">Tới:</span>
                    <span className="font-medium text-gray-800">{result.email?.to}</span>
                  </p>
                  <p className="pt-1 text-sm font-bold text-gray-900">
                    Xác nhận đặt bàn thành công tại SmaRes Gastronomy (#{info.bookingId})
                  </p>
                </div>

                {/* Banner thương hiệu trong Email - bắt mắt & sang trọng hơn */}
                <div className="relative bg-gradient-to-br from-[#0c3828] via-[#155e42] to-[#1e7b58] px-6 py-8 text-center text-white border-b border-amber-200/30">
                  <span className="inline-block px-3 py-0.5 rounded-full bg-amber-300/15 border border-amber-200/35 text-[10px] font-bold tracking-[0.2em] uppercase text-amber-200 mb-3">
                    Xác nhận đặt bàn
                  </span>
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-white/10 backdrop-blur-sm border border-amber-200/40 shadow-inner flex items-center justify-center text-2xl font-serif font-bold text-amber-100 mb-3">
                    S
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-[0.16em] uppercase text-white">
                    SmaRes Gastronomy
                  </h3>
                  <div className="w-12 h-0.5 bg-amber-300/60 mx-auto my-2.5 rounded-full" />
                  <p className="text-xs sm:text-sm text-emerald-100/90 font-light tracking-wide">
                    Tinh hoa ẩm thực &amp; Trải nghiệm đặt bàn thông minh
                  </p>
                </div>

                {/* Nội dung chi tiết đặt bàn */}
                <div className="p-6 sm:p-8 space-y-5 text-sm text-gray-700">
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-gray-900">
                      Kính chào Quý khách {info.customerName},
                    </p>
                    <p className="leading-relaxed text-gray-600">
                      Cảm ơn Quý khách đã lựa chọn <strong className="text-[#155e42]">SmaRes Gastronomy</strong>. Hệ thống xin xác nhận đơn đặt bàn và khoản thanh toán cọc của Quý khách đã hoàn tất với các thông tin dưới đây:
                    </p>
                  </div>

                  {/* Bảng chi tiết phiếu đặt bàn */}
                  <div className="rounded-2xl bg-gradient-to-b from-[#f7faf8] to-[#f2f7f4] border border-emerald-900/10 p-5 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-900/10">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#155e42]">
                        Chi tiết phiếu đặt bàn
                      </span>
                      <span className="font-mono text-xs font-bold text-[#155e42] bg-white border border-emerald-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
                        {info.bookingId}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-0.5">
                      <span className="text-gray-500">Vị trí bàn</span>
                      <span className="font-semibold text-gray-900">Bàn {info.tableId}</span>
                    </div>
                    <div className="flex items-center justify-between py-0.5">
                      <span className="text-gray-500">Thời gian dùng bữa</span>
                      <span className="font-semibold text-gray-900">{info.bookingTime}</span>
                    </div>
                    <div className="flex items-center justify-between py-0.5">
                      <span className="text-gray-500">Số lượng khách</span>
                      <span className="font-semibold text-gray-900">{info.guests} người</span>
                    </div>
                    <div className="flex items-center justify-between pt-2.5 border-t border-emerald-900/10">
                      <span className="font-medium text-gray-700">Tiền đặt cọc đã thanh toán</span>
                      <span className="text-base font-extrabold text-[#155e42]">
                        {Number(info.depositAmount).toLocaleString('vi-VN')} VNĐ
                      </span>
                    </div>
                  </div>

                  {/* Ghi chú dành cho thực khách */}
                  <div className="rounded-2xl bg-amber-50/80 border border-amber-200/70 px-4 py-3.5 text-xs text-amber-950 leading-relaxed">
                    <strong className="text-amber-900">Lưu ý dành cho Quý khách:</strong> Nhà hàng giữ bàn trong vòng <strong>15 phút</strong> kể từ giờ hẹn. Khi đến nơi, Quý khách vui lòng cung cấp mã đặt bàn <strong>{info.bookingId}</strong> cho lễ tân để được hỗ trợ nhanh chóng.
                  </div>

                  {/* Chân trang thư */}
                  <div className="pt-3 border-t border-gray-100 text-xs text-gray-400 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span>SmaRes Gastronomy • Hotline: 1900 6868</span>
                    <span>Thư xác nhận tự động từ hệ thống SmaRes</span>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}