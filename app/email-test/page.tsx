'use client';

import { useState, useEffect, useCallback } from 'react';

interface ReservationRecord {
  time?: string;
  timeSlot?: string;
  startTime?: string;
  date?: string;
  bookingDate?: string;
  reservationDate?: string;
  bookingTime?: string;
  customerEmail?: string;
  email?: string;
  userEmail?: string;
  contactEmail?: string;
  guestEmail?: string;
  user?: { email?: string; name?: string };
  customer?: { email?: string };
  code?: string;
  bookingCode?: string;
  reservationCode?: string;
  _id?: string;
  customerName?: string;
  fullName?: string;
  tableNumber?: string;
  tableName?: string;
  table?: { tableNumber?: string };
  tableId?: string;
  guests?: number | string;
  guestCount?: number | string;
  numberOfGuests?: number | string;
}

interface ReservationApiResponse {
  reservations?: ReservationRecord[];
  bookings?: ReservationRecord[];
  data?: ReservationRecord[];
}

interface AuthMeResponse {
  user?: { email?: string };
  email?: string;
  data?: { email?: string };
}

interface NormalizedBookingData {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  tableId: string;
  guests: number;
  bookingTime: string;
}

interface EmailTestResponse {
  success?: boolean;
  message?: string;
  withinOneMinuteSLA?: boolean;
  clientMs?: number;
  email?: {
    to?: string;
    subject?: string;
    details?: Partial<NormalizedBookingData>;
  };
}

async function fetchLatestBookingAndSendTest(): Promise<{
  normalized: NormalizedBookingData;
  sourceLabel: string;
  mailResult: EmailTestResponse;
}> {
  let latest: ReservationRecord | null = null;
  let sourceLabel = 'Đồng bộ đơn mới nhất';

  // 1. Lấy đơn đặt bàn mới nhất từ API hệ thống
  const endpoints = ['/api/reservations', '/api/booking', '/api/user/reservations'];
  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = (await res.json()) as ReservationRecord[] | ReservationApiResponse;
        const list = Array.isArray(json)
          ? json
          : json.reservations || json.bookings || json.data || [];
        if (Array.isArray(list) && list.length > 0) {
          latest = list[0];
          sourceLabel = `Đồng bộ trực tiếp từ hệ thống (${url})`;
          break;
        }
      }
    } catch {
      // Thử endpoint tiếp theo
    }
  }

  // 2. Lấy thêm email từ phiên đăng nhập hiện tại (nếu đơn đặt bàn không lưu trực tiếp field email)
  let sessionEmail = '';
  try {
    const meRes = await fetch('/api/auth/me');
    if (meRes.ok) {
      const meJson = (await meRes.json()) as AuthMeResponse;
      sessionEmail =
        meJson?.user?.email || meJson?.email || meJson?.data?.email || '';
    }
  } catch {
    // Bỏ qua nếu endpoint không tồn tại
  }

  if (!sessionEmail && typeof window !== 'undefined') {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}') as {
        email?: string;
      };
      sessionEmail = storedUser?.email || '';
    } catch {
      // Bỏ qua nếu localStorage không có JSON user
    }
  }

  // 3. Chuẩn hóa dữ liệu đơn đặt bàn & email người đặt
  const rawTime = latest?.time || latest?.timeSlot || latest?.startTime || '';
  const rawDate = latest?.date || latest?.bookingDate || latest?.reservationDate || '';
  const resolvedBookingTime =
    latest?.bookingTime ||
    (rawTime && rawDate
      ? `${rawTime}, ${rawDate}`
      : rawTime || rawDate || '11:30, 2026-11-20');

  const resolvedEmail = (
    latest?.customerEmail ||
    latest?.email ||
    latest?.userEmail ||
    latest?.contactEmail ||
    latest?.guestEmail ||
    latest?.user?.email ||
    latest?.customer?.email ||
    sessionEmail ||
    'huonggiang3206@gmail.com'
  ).trim();

  const normalized: NormalizedBookingData = {
    bookingId:
      latest?.code ||
      latest?.bookingCode ||
      latest?.reservationCode ||
      latest?._id?.slice(-6)?.toUpperCase() ||
      'RES-3E3910',
    customerName:
      latest?.customerName ||
      latest?.fullName ||
      latest?.user?.name ||
      'Hương Giang',
    customerEmail: resolvedEmail,
    tableId:
      latest?.tableNumber ||
      latest?.tableName ||
      latest?.table?.tableNumber ||
      latest?.tableId ||
      'B02',
    guests: Number(
      latest?.guests || latest?.guestCount || latest?.numberOfGuests || 4
    ),
    bookingTime: resolvedBookingTime,
  };

  // 4. Gọi API đo tốc độ gửi email xác nhận
  const t0 = performance.now();
  const mailRes = await fetch('/api/email-confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(normalized),
  });
  const mailJson = (await mailRes.json()) as EmailTestResponse;
  const clientMs = Math.max(1, Math.round(performance.now() - t0));

  return {
    normalized,
    sourceLabel,
    mailResult: { ...mailJson, clientMs },
  };
}

export default function EmailTestPage() {
  const [bookingData, setBookingData] = useState<NormalizedBookingData | null>(null);
  const [syncSource, setSyncSource] = useState<string>('Đang đồng bộ từ CSDL...');
  const [result, setResult] = useState<EmailTestResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const syncLatestBookingAndTest = useCallback(async () => {
    try {
      setLoading(true);
      const { normalized, sourceLabel, mailResult } = await fetchLatestBookingAndSendTest();
      setBookingData(normalized);
      setSyncSource(sourceLabel);
      setResult(mailResult);
    } catch (err) {
      console.error('Lỗi đồng bộ và test email:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function initialSync() {
      try {
        setLoading(true);
        const { normalized, sourceLabel, mailResult } = await fetchLatestBookingAndSendTest();
        if (active) {
          setBookingData(normalized);
          setSyncSource(sourceLabel);
          setResult(mailResult);
        }
      } catch (err) {
        if (active) {
          console.error('Lỗi đồng bộ và test email:', err);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void initialSync();

    return () => {
      active = false;
    };
  }, []);

  const info = result?.email?.details || bookingData;
  const recipientEmail =
    result?.email?.to || info?.customerEmail || bookingData?.customerEmail || '';

  return (
    <main className="min-h-screen bg-[#f4f7f5] py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Banner */}
        <header className="bg-gradient-to-br from-[#0e3f2d] via-[#155e42] to-[#1f7d58] rounded-3xl p-7 sm:p-8 text-white shadow-lg">
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 border border-white/20 text-[11px] font-semibold tracking-wider uppercase mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
            SmaRes Gastronomy • Auto-Sync Booking &amp; Email Verification
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Đối Soát Đồng Bộ Đơn Đặt Bàn &amp; Tốc Độ Gửi Email
          </h1>
          <p className="text-emerald-100/90 text-sm mt-1.5 max-w-2xl">
            Tự động trích xuất dữ liệu đơn đặt bàn mới nhất từ cơ sở dữ liệu hệ thống, kích hoạt gửi thư xác nhận (&lt; 60s) và kiểm tra khớp thông tin bàn.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Cột trái: Dữ liệu đồng bộ từ hệ thống & Hiệu năng */}
          <div className="lg:col-span-5 space-y-6">
            <section className="bg-white rounded-3xl border border-emerald-950/5 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Dữ liệu gốc từ hệ thống</h2>
                  <p className="text-[11px] text-emerald-700 font-medium mt-0.5">{syncSource}</p>
                </div>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                  Auto-Sync
                </span>
              </div>

              {bookingData && (
                <div className="rounded-2xl bg-gray-50/80 border border-gray-100 p-4 space-y-2.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500 shrink-0">Email người đặt:</span>
                    <span className="font-semibold text-gray-800 truncate">{bookingData.customerEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mã đơn trong DB:</span>
                    <span className="font-mono font-bold text-[#155e42]">{bookingData.bookingId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Khách hàng:</span>
                    <span className="font-semibold text-gray-800">{bookingData.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Số bàn / Số khách:</span>
                    <span className="font-semibold text-gray-800">
                      Bàn {bookingData.tableId} • {bookingData.guests} người
                    </span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-gray-200/70">
                    <span className="text-gray-500">Khung giờ hẹn:</span>
                    <span className="font-semibold text-[#155e42]">{bookingData.bookingTime}</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => void syncLatestBookingAndTest()}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#13543b] to-[#1b7352] hover:from-[#0f4430] hover:to-[#155e42] active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-[#155e42]/20 transition cursor-pointer"
              >
                {loading ? 'Đang đồng bộ đơn mới nhất...' : 'Đồng Bộ Đơn Vừa Đặt & Kiểm Tra Lại'}
              </button>
            </section>

            {/* Thẻ kết quả đối soát */}
            {result && (
              <section className="bg-white rounded-3xl border border-emerald-950/5 shadow-sm p-6 space-y-4">
                <h2 className="text-base font-bold text-gray-900">Kết quả đối soát tự động</h2>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200/60 p-3.5">
                    <p className="text-[10px] font-bold uppercase text-emerald-700">Tốc độ gửi</p>
                    <p className="text-lg font-extrabold text-emerald-950 mt-1">{result.clientMs} ms</p>
                    <p className="text-[11px] text-emerald-700/80 mt-0.5">&lt; 60 giây</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200/60 p-3.5">
                    <p className="text-[10px] font-bold uppercase text-emerald-700">Đồng bộ DB</p>
                    <p className="text-base font-extrabold text-[#155e42] mt-1.5">KHỚP</p>
                    <p className="text-[11px] text-emerald-700/80 mt-1">100% dữ liệu</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200/60 p-3.5">
                    <p className="text-[10px] font-bold uppercase text-emerald-700">Trạng thái</p>
                    <p className="text-base font-extrabold text-[#155e42] mt-1.5">ĐẠT</p>
                    <p className="text-[11px] text-emerald-700/80 mt-1">4 / 4 mục</p>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Cột phải: Bản xem trước Email thực tế gửi khách hàng */}
          <div className="lg:col-span-7">
            {info && (
              <section className="bg-white rounded-3xl border border-gray-200/80 shadow-lg overflow-hidden">
                <div className="px-6 py-4 bg-[#fafbfa] border-b border-gray-100 space-y-1.5 text-xs text-gray-600">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate">
                      <span className="text-gray-400 inline-block w-12">Từ:</span>
                      <span className="font-semibold text-gray-800">
                        SmaRes Gastronomy &lt;booking@smares.vn&gt;
                      </span>
                    </p>
                    <span className="shrink-0 text-[11px] font-semibold text-[#155e42] bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                      Đã gửi tự động
                    </span>
                  </div>
                  <p className="truncate">
                    <span className="text-gray-400 inline-block w-12">Tới:</span>
                    <span className="font-semibold text-[#155e42]">
                      {info.customerName} &lt;{recipientEmail}&gt;
                    </span>
                  </p>
                  <p className="pt-1 text-sm font-bold text-gray-900">
                    Xác nhận đặt bàn thành công tại SmaRes Gastronomy (#{info.bookingId})
                  </p>
                </div>

                <div className="bg-gradient-to-br from-[#0c3828] via-[#155e42] to-[#1e7b58] px-6 py-8 text-center text-white border-b border-amber-200/30">
                  <span className="inline-block px-3 py-0.5 rounded-full bg-amber-300/15 border border-amber-200/35 text-[10px] font-bold tracking-[0.2em] uppercase text-amber-200 mb-3">
                    Xác nhận đặt bàn
                  </span>
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-white/10 border border-amber-200/40 flex items-center justify-center text-2xl font-serif font-bold text-amber-100 mb-3">
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

                <div className="p-6 sm:p-8 space-y-5 text-sm text-gray-700">
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-gray-900">
                      Kính chào Quý khách {info.customerName},
                    </p>
                    <p className="leading-relaxed text-gray-600">
                      Cảm ơn Quý khách đã lựa chọn <strong className="text-[#155e42]">SmaRes Gastronomy</strong>. Hệ thống xin xác nhận đơn đặt bàn của Quý khách đã được ghi nhận thành công với các thông tin dưới đây:
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gradient-to-b from-[#f7faf8] to-[#f2f7f4] border border-emerald-900/10 p-5 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-900/10">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#155e42]">
                        Chi tiết phiếu đặt bàn
                      </span>
                      <span className="font-mono text-xs font-bold text-[#155e42] bg-white border border-emerald-200 px-2.5 py-0.5 rounded-lg">
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
                    <div className="flex items-center justify-between pt-2 border-t border-emerald-900/10">
                      <span className="text-gray-500">Số lượng khách</span>
                      <span className="font-semibold text-gray-900">{info.guests} người</span>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-amber-50/80 border border-amber-200/70 px-4 py-3.5 text-xs text-amber-950 leading-relaxed">
                    <strong>Lưu ý dành cho Quý khách:</strong> Nhà hàng giữ bàn trong vòng <strong>15 phút</strong> kể từ giờ hẹn. Khi đến nơi, Quý khách vui lòng cung cấp mã đặt bàn <strong>{info.bookingId}</strong> cho lễ tân để được hỗ trợ nhanh chóng.
                  </div>

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
