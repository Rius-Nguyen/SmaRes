"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface ReservationRecord {
  id: string;
  _id?: string;
  bookingCode: string;
  date: string;
  time: string;
  tableNumber: string;
  guests: number | string;
  phone?: string;
  note?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | string;
  depositAmount?: number;
  paymentStatus?: 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED' | string;
  createdAt?: string;
}

export default function HistoryPage() {
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('Tất cả');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Quản lý Modal hủy đơn
  const [cancelTarget, setCancelTarget] = useState<ReservationRecord | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelFeedback, setCancelFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 1. Tải danh sách đơn đặt bàn thực tế từ MongoDB qua GET /api/reservations (TK-125)
  const fetchReservations = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const queryParam =
        selectedFilter !== 'Tất cả' ? `?status=${encodeURIComponent(selectedFilter)}` : '';
      const res = await fetch(`/api/reservations${queryParam}`, {
        cache: 'no-store',
      });
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        setReservations(json.data);
      } else {
        setReservations([]);
      }
    } catch (err: any) {
      console.error('Lỗi khi tải lịch sử đặt bàn:', err);
      setErrorMessage('Không thể kết nối đến máy chủ. Vui lòng tải lại trang.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedFilter]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // 2. Xác nhận hủy đặt bàn qua PATCH /api/reservations/[id]/cancel
  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;

    setIsCancelling(true);
    setCancelFeedback(null);

    try {
      const targetId = cancelTarget.id || cancelTarget._id || cancelTarget.bookingCode;
      const res = await fetch(`/api/reservations/${targetId}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setCancelFeedback({
          type: 'success',
          message: `Đã hủy thành công đơn đặt bàn ${cancelTarget.bookingCode}.`,
        });
        setCancelTarget(null);
        await fetchReservations(); // Tự động reload lại danh sách từ MongoDB
      } else {
        setCancelFeedback({
          type: 'error',
          message: json.message || 'Không thể hủy đơn đặt bàn. Vui lòng thử lại.',
        });
      }
    } catch (err: any) {
      setCancelFeedback({
        type: 'error',
        message: err?.message || 'Lỗi hệ thống khi hủy đơn.',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const formatMoney = (val: number) => {
    return val.toLocaleString('vi-VN') + 'đ';
  };

  return (
    <main className="flex-1 bg-[#faf8f5] text-[#1c1917] py-12 px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white rounded-3xl shadow-[0_4px_25px_-2px_rgba(28,25,23,0.06)] border border-[#ebe7df] p-6 md:p-10 relative">
        {/* Header Trang */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-5 border-b border-[#ebe7df] gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#15803d] bg-[#f0fdf4] px-3.5 py-1.5 rounded-full border border-[#bbf7d0] inline-block mb-2">
              Quản lý đặt bàn SmaRes
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#14532d]">
              Lịch Sử Đặt Bàn &amp; Trạng Thái Cọc
            </h1>
          </div>

          {/* Bộ lọc trạng thái */}
          <div className="flex items-center space-x-2.5">
            <span className="text-xs sm:text-sm text-stone-600 font-medium">Lọc trạng thái:</span>
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="border border-[#d6d0c4] rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#14532d] outline-none px-3.5 py-2 bg-white text-stone-800 font-medium cursor-pointer shadow-xs"
            >
              <option value="Tất cả">Tất cả đơn</option>
              <option value="Sắp tới">Sắp tới</option>
              <option value="Đã hoàn thành">Đã hoàn thành</option>
              <option value="Đã hủy">Đã hủy</option>
            </select>
          </div>
        </div>

        {/* Thông báo phản hồi sau khi hủy */}
        {cancelFeedback && (
          <div
            className={`p-4 mb-6 rounded-2xl text-xs sm:text-sm flex items-center justify-between gap-3 animate-fade-in border ${
              cancelFeedback.type === 'success'
                ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#14532d]'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            <span>{cancelFeedback.message}</span>
            <button
              onClick={() => setCancelFeedback(null)}
              className="font-bold underline text-xs cursor-pointer ml-auto"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Bảng dữ liệu */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-3 border-[#14532d] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-stone-500 text-sm">Đang tải lịch sử đặt bàn từ hệ thống...</p>
            </div>
          ) : errorMessage ? (
            <div className="py-16 text-center text-rose-600 text-sm">
              <p className="font-semibold mb-2">{errorMessage}</p>
              <button
                onClick={fetchReservations}
                className="px-4 py-2 bg-[#14532d] text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Tải lại
              </button>
            </div>
          ) : reservations.length === 0 ? (
            <div className="py-20 text-center text-stone-500">
              <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3 text-stone-400">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <p className="text-base font-serif font-bold text-stone-700 mb-1">Chưa có đơn đặt bàn nào</p>
              <p className="text-xs text-stone-500 mb-6">
                Quý khách chưa có đơn đặt bàn nào ở mục này.
              </p>
              <Link
                href="/booking"
                className="inline-flex items-center gap-2 bg-[#14532d] hover:bg-[#15803d] text-white font-semibold px-6 py-2.5 rounded-xl shadow-xs text-xs sm:text-sm transition-all"
              >
                <span>+ Đặt bàn mới ngay</span>
              </Link>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[860px]">
              <thead>
                <tr className="text-xs font-bold text-stone-500 uppercase tracking-wider border-b border-[#ebe7df]">
                  <th className="pb-4 pl-4">Mã đặt chỗ</th>
                  <th className="pb-4">Ngày hẹn</th>
                  <th className="pb-4">Giờ</th>
                  <th className="pb-4">Bàn</th>
                  <th className="pb-4">Số khách</th>
                  <th className="pb-4">Trạng thái bàn</th>
                  <th className="pb-4">Trạng thái cọc</th>
                  <th className="pb-4 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="text-sm text-stone-600 divide-y divide-[#ebe7df]">
                {reservations.map((item) => {
                  const isUpcoming =
                    item.status === 'confirmed' || item.status === 'pending';
                  const isCancelled = item.status === 'cancelled';
                  const isCompleted = item.status === 'completed';

                  return (
                    <tr key={item.id} className="hover:bg-[#faf8f5] transition-colors">
                      {/* Mã đặt chỗ */}
                      <td className="py-4 pl-4 font-mono font-bold text-[#14532d]">
                        {item.bookingCode}
                      </td>

                      {/* Ngày hẹn */}
                      <td className="py-4 text-stone-800 font-medium">
                        {item.date}
                      </td>

                      {/* Giờ hẹn */}
                      <td className="py-4 text-stone-800 font-medium">
                        {item.time}
                      </td>

                      {/* Số bàn */}
                      <td className="py-4 font-bold text-stone-900">
                        Bàn {item.tableNumber}
                      </td>

                      {/* Số khách */}
                      <td className="py-4 text-stone-700">
                        {item.guests} người
                      </td>

                      {/* Trạng thái đặt bàn */}
                      <td className="py-4">
                        {isUpcoming ? (
                          <span className="px-3 py-1 text-xs font-semibold text-[#15803d] bg-[#f0fdf4] rounded-full border border-[#bbf7d0] inline-block">
                            Sắp tới
                          </span>
                        ) : isCompleted ? (
                          <span className="px-3 py-1 text-xs font-semibold text-stone-600 bg-stone-100 rounded-full border border-[#ebe7df] inline-block">
                            Đã hoàn thành
                          </span>
                        ) : (
                          <span className="px-3 py-1 text-xs font-semibold text-[#b91c1c] bg-[#fee2e2] rounded-full border border-[#fca5a5] inline-block">
                            Đã hủy
                          </span>
                        )}
                      </td>

                      {/* Trạng thái cọc (TK-125) */}
                      <td className="py-4">
                        {item.paymentStatus === 'PAID' ? (
                          <span className="text-[11px] font-semibold text-[#15803d] bg-[#f0fdf4] px-2.5 py-1 rounded-full border border-[#bbf7d0] inline-flex items-center gap-1">
                            <span>✓ Đã cọc</span>
                            {item.depositAmount ? <span>({formatMoney(item.depositAmount)})</span> : null}
                          </span>
                        ) : item.paymentStatus === 'PENDING' ? (
                          <span className="text-[11px] font-semibold text-[#b45309] bg-[#fffbeb] px-2.5 py-1 rounded-full border border-[#fde68a] inline-flex items-center gap-1">
                            <span>⏱ Chờ cọc</span>
                            {item.depositAmount ? <span>({formatMoney(item.depositAmount)})</span> : null}
                          </span>
                        ) : (
                          <span className="text-[11px] text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full border border-stone-200 inline-block">
                            Chưa cọc
                          </span>
                        )}
                      </td>

                      {/* Nút hành động */}
                      <td className="py-4 text-center">
                        {isUpcoming ? (
                          <button
                            type="button"
                            onClick={() => {
                              setCancelFeedback(null);
                              setCancelTarget(item);
                            }}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-800 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer border border-rose-200"
                          >
                            Hủy bàn
                          </button>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal xác nhận hủy đặt bàn */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border border-[#ebe7df]">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-200">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            </div>

            <h3 className="text-xl font-serif font-bold text-[#1c1917] mb-2">
              Xác nhận hủy đặt bàn?
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn hủy đặt bàn <strong className="font-mono font-bold text-stone-800">{cancelTarget.bookingCode}</strong> (Bàn {cancelTarget.tableNumber})? Hành động này sẽ giải phóng vị trí bàn cho khách hàng khác.
            </p>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                disabled={isCancelling}
                className="w-1/2 py-2.5 border border-[#d6d0c4] rounded-xl text-xs sm:text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                Không, giữ lại
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="w-1/2 py-2.5 bg-rose-600 rounded-xl text-xs sm:text-sm font-semibold text-white hover:bg-rose-700 shadow-sm transition-colors cursor-pointer disabled:opacity-60"
              >
                {isCancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
