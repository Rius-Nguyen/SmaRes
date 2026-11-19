"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

type ReservationStatus = 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED';
type StatusFilter = 'ALL' | ReservationStatus;

interface ReservationRecord {
  _id: string;
  bookingCode: string;
  tableNumber: string;
  customerName: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  note?: string;
  status: ReservationStatus;
  createdAt?: string;
}

interface ReservationsApiResponse {
  success: boolean;
  message?: string;
  reservations?: ReservationRecord[];
}

interface CancelReservationApiResponse {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    bookingCode: string;
    status: ReservationStatus;
    cancelledAt: string;
  };
}

const STATUS_META: Record<
  ReservationStatus,
  { label: string; badgeClass: string }
> = {
  CONFIRMED: {
    label: 'Đã xác nhận',
    badgeClass: 'text-[#15803d] bg-[#f0fdf4] border-[#bbf7d0]',
  },
  CHECKED_IN: {
    label: 'Đã nhận bàn',
    badgeClass: 'text-[#b45309] bg-[#fef3c7] border-[#fde68a]',
  },
  COMPLETED: {
    label: 'Đã hoàn thành',
    badgeClass: 'text-[#57534e] bg-stone-100 border-[#ebe7df]',
  },
  CANCELLED: {
    label: 'Đã hủy',
    badgeClass: 'text-[#b91c1c] bg-[#fee2e2] border-[#fca5a5]',
  },
};

function formatDateVi(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

export default function HistoryPage() {
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [isUnauthorized, setIsUnauthorized] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState<number>(0);

  const [selectedReservation, setSelectedReservation] = useState<ReservationRecord | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadReservations = async () => {
      try {
        const res = await fetch('/api/reservations', {
          method: 'GET',
          cache: 'no-store',
        });

        if (cancelled) return;

        if (res.status === 401) {
          setIsUnauthorized(true);
          setReservations([]);
          setFetchError(null);
          return;
        }

        const json = (await res.json()) as ReservationsApiResponse;
        if (!res.ok || !json.success) {
          setFetchError(json.message || 'Không thể tải lịch sử đặt bàn.');
          return;
        }

        setIsUnauthorized(false);
        setFetchError(null);
        setReservations(Array.isArray(json.reservations) ? json.reservations : []);
      } catch {
        if (!cancelled) {
          setFetchError('Không thể kết nối máy chủ để tải lịch sử đặt bàn.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadReservations();

    return () => {
      cancelled = true;
    };
  }, [reloadNonce]);

  const handleRetry = () => {
    setLoading(true);
    setFetchError(null);
    setReloadNonce((prev) => prev + 1);
  };

  const handleConfirmCancel = async () => {
    if (!selectedReservation) return;

    setIsCancelling(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/reservations/${selectedReservation._id}/cancel`, {
        method: 'PATCH',
      });
      const json = (await res.json()) as CancelReservationApiResponse;

      if (res.ok && json.success) {
        const targetId = selectedReservation._id;
        setReservations((prev) =>
          prev.map((item) =>
            item._id === targetId ? { ...item, status: 'CANCELLED' } : item
          )
        );
        setActionSuccess(
          json.message || `Đã hủy đặt bàn ${selectedReservation.bookingCode} thành công.`
        );
        setSelectedReservation(null);

        // Đồng bộ lại dữ liệu mới nhất từ server
        const refreshRes = await fetch('/api/reservations', {
          method: 'GET',
          cache: 'no-store',
        });
        if (refreshRes.ok) {
          const refreshJson = (await refreshRes.json()) as ReservationsApiResponse;
          if (refreshJson.success && Array.isArray(refreshJson.reservations)) {
            setReservations(refreshJson.reservations);
          }
        }
      } else {
        setActionError(json.message || 'Không thể hủy đơn đặt bàn này.');
        setSelectedReservation(null);
      }
    } catch {
      setActionError('Lỗi kết nối máy chủ khi hủy đặt bàn. Vui lòng thử lại.');
      setSelectedReservation(null);
    } finally {
      setIsCancelling(false);
    }
  };

  const filteredReservations =
    statusFilter === 'ALL'
      ? reservations
      : reservations.filter((item) => item.status === statusFilter);

  if (loading) {
    return (
      <main className="flex-1 bg-[#faf8f5] text-[#1c1917] min-h-screen flex items-center justify-center py-16 px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="w-10 h-10 rounded-full border-3 border-[#14532d]/20 border-t-[#14532d] animate-spin" />
          <p className="text-sm font-medium text-[#57534e]">Đang tải lịch sử đặt bàn...</p>
        </div>
      </main>
    );
  }

  if (isUnauthorized) {
    return (
      <main className="flex-1 bg-[#faf8f5] text-[#1c1917] min-h-screen flex items-center justify-center py-16 px-4">
        <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-[0_8px_20px_-4px_rgba(28,25,23,0.08)] border border-[#ebe7df] text-center max-w-md w-full">
          <div className="w-16 h-16 rounded-full bg-[#fef3c7] text-[#d97706] flex items-center justify-center mx-auto mb-4 border border-[#fde68a]">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-2xl font-serif font-bold text-[#1c1917] mb-2">
            Vui lòng đăng nhập
          </h1>
          <p className="text-sm text-[#57534e] mb-7 leading-relaxed">
            Đăng nhập tài khoản SmaRes để xem toàn bộ lịch sử đặt bàn và quản lý hủy lịch hẹn của bạn.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/login?redirect=/history"
              className="bg-[#14532d] hover:bg-[#15803d] text-white px-5 py-3.5 rounded-xl font-semibold text-sm transition-colors shadow-[0_8px_24px_-4px_rgba(20,83,45,0.35)]"
            >
              Đăng nhập ngay
            </Link>
            <Link
              href="/booking"
              className="bg-[#faf8f5] hover:bg-[#f5f2eb] text-[#1c1917] border border-[#d6d0c4] px-5 py-3 rounded-xl font-semibold text-sm transition-colors"
            >
              Đặt bàn mới
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-[#faf8f5] text-[#1c1917] py-10 sm:py-12 px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] border border-[#ebe7df] p-6 md:p-10">
          {/* Header & Bộ lọc trạng thái */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-5 border-b border-[#ebe7df] gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#15803d] bg-[#f0fdf4] px-3.5 py-1.5 rounded-full border border-[#bbf7d0] inline-block mb-2">
                Quản lý đặt bàn
              </span>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#14532d]">
                Lịch Sử Đặt Bàn
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="reservation-status-filter"
                  className="text-xs sm:text-sm text-[#57534e] font-medium"
                >
                  Trạng thái:
                </label>
                <select
                  id="reservation-status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="border border-[#d6d0c4] rounded-xl text-xs sm:text-sm px-3.5 py-2 bg-white text-[#1c1917] font-medium"
                >
                  <option value="ALL">Tất cả</option>
                  <option value="CONFIRMED">Đã xác nhận</option>
                  <option value="CHECKED_IN">Đã nhận bàn</option>
                  <option value="COMPLETED">Đã hoàn thành</option>
                  <option value="CANCELLED">Đã hủy</option>
                </select>
              </div>

              <Link
                href="/booking"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#14532d] hover:bg-[#15803d] text-white text-xs sm:text-sm font-semibold transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
                <span>Đặt bàn mới</span>
              </Link>
            </div>
          </div>

          {/* Chính sách hủy bàn 60 phút (+07:00) */}
          <div className="mb-6 bg-[#fffbeb] border border-[#fde68a] rounded-xl px-4 py-3 flex items-start gap-3 text-xs sm:text-sm text-[#92400e]">
            <svg className="w-5 h-5 text-[#d97706] shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <p>
              <strong>Chính sách hủy đặt bàn:</strong> Quý khách chỉ có thể hủy đặt bàn trực tuyến trước giờ hẹn tối thiểu <strong>60 phút</strong> (tính theo múi giờ Việt Nam <strong>+07:00</strong>).
            </p>
          </div>

          {/* Thông báo kết quả / lỗi */}
          {actionSuccess && (
            <div className="mb-6 bg-[#f0fdf4] border border-[#bbf7d0] text-[#15803d] px-4 py-3.5 rounded-xl flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="font-medium">{actionSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionSuccess(null)}
                aria-label="Đóng thông báo thành công"
                className="text-[#15803d] hover:opacity-75 p-1"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          {actionError && (
            <div className="mb-6 bg-[#fee2e2] border border-[#fca5a5] text-[#b91c1c] px-4 py-3.5 rounded-xl flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span className="font-medium">{actionError}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionError(null)}
                aria-label="Đóng thông báo lỗi"
                className="text-[#b91c1c] hover:opacity-75 p-1"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          {fetchError ? (
            <div className="bg-[#fee2e2] border border-[#fca5a5] text-[#b91c1c] rounded-2xl p-6 text-center space-y-3">
              <p className="text-sm font-semibold">{fetchError}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#b91c1c] hover:bg-rose-800 text-white text-xs sm:text-sm font-semibold transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                <span>Thử lại</span>
              </button>
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="text-center py-14 px-4">
              <div className="w-16 h-16 rounded-full bg-[#f5f2eb] border border-[#ebe7df] text-[#78716c] flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <h2 className="font-serif font-bold text-xl text-[#1c1917] mb-1.5">
                {reservations.length === 0
                  ? 'Bạn chưa có lịch đặt bàn nào'
                  : 'Không có đơn đặt bàn nào khớp bộ lọc'}
              </h2>
              <p className="text-sm text-[#78716c] mb-6 max-w-md mx-auto">
                {reservations.length === 0
                  ? 'Hãy đặt bàn trước để SmaRes chuẩn bị vị trí đẹp và thực đơn tươi ngon nhất cho bạn.'
                  : 'Thử chọn trạng thái khác để xem các đơn đặt bàn của bạn.'}
              </p>
              {reservations.length === 0 ? (
                <Link
                  href="/booking"
                  className="inline-flex items-center gap-2 bg-[#14532d] hover:bg-[#15803d] text-white px-6 py-3 rounded-xl text-sm font-semibold transition-colors shadow-[0_8px_24px_-4px_rgba(20,83,45,0.35)]"
                >
                  <span>Đặt bàn ngay</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className="inline-flex items-center gap-2 bg-[#f5f2eb] hover:bg-[#ebe7df] text-[#1c1917] px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  <span>Xem tất cả đặt bàn</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[780px]">
                <thead>
                  <tr className="text-xs font-bold text-[#78716c] uppercase tracking-wider border-b border-[#ebe7df]">
                    <th className="pb-4 pl-4">Mã đặt chỗ</th>
                    <th className="pb-4">Ngày đặt</th>
                    <th className="pb-4">Giờ hẹn</th>
                    <th className="pb-4">Bàn</th>
                    <th className="pb-4">Số người</th>
                    <th className="pb-4">Trạng thái</th>
                    <th className="pb-4 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-[#57534e] divide-y divide-[#ebe7df]">
                  {filteredReservations.map((reservation) => {
                    const meta = STATUS_META[reservation.status] ?? {
                      label: reservation.status,
                      badgeClass: 'text-[#57534e] bg-stone-100 border-[#ebe7df]',
                    };
                    const isCancelled = reservation.status === 'CANCELLED';

                    return (
                      <tr
                        key={reservation._id}
                        className="hover:bg-[#faf8f5] transition-colors"
                      >
                        <td className="py-4 pl-4">
                          <span
                            className={`font-mono font-bold ${
                              isCancelled ? 'text-[#78716c]' : 'text-[#14532d]'
                            }`}
                          >
                            {reservation.bookingCode}
                          </span>
                          {reservation.note && (
                            <p className="text-xs text-[#78716c] mt-0.5 line-clamp-1">
                              Ghi chú: {reservation.note}
                            </p>
                          )}
                        </td>
                        <td className="py-4 text-[#1c1917] font-medium">
                          {formatDateVi(reservation.date)}
                        </td>
                        <td className="py-4 text-[#1c1917] font-medium">
                          {reservation.time}
                        </td>
                        <td className="py-4 font-semibold text-[#1c1917]">
                          {reservation.tableNumber ? `Bàn ${reservation.tableNumber}` : '—'}
                        </td>
                        <td className="py-4">{reservation.guests} người</td>
                        <td className="py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${meta.badgeClass}`}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className="py-4 text-center">
                          {reservation.status === 'CONFIRMED' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setActionError(null);
                                setSelectedReservation(reservation);
                              }}
                              className="text-xs font-semibold text-rose-600 hover:text-rose-800 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors border border-rose-200"
                            >
                              Hủy bàn
                            </button>
                          ) : (
                            <span className="text-[#d6d0c4]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal xác nhận hủy bàn */}
      {selectedReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4">
          <div className="bg-white rounded-3xl p-7 sm:p-8 max-w-md w-full text-center shadow-2xl border border-[#ebe7df]">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-200">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h2 className="text-xl font-serif font-bold text-[#1c1917] mb-2">
              Xác nhận hủy đặt bàn?
            </h2>
            <p className="text-xs sm:text-sm text-[#57534e] mb-4 leading-relaxed">
              Bạn có chắc chắn muốn hủy đặt bàn{' '}
              <span className="font-mono font-bold text-[#1c1917]">
                {selectedReservation.bookingCode}
              </span>{' '}
              (Bàn {selectedReservation.tableNumber} • {formatDateVi(selectedReservation.date)} lúc{' '}
              {selectedReservation.time})? Hành động này không thể hoàn tác.
            </p>

            <div className="bg-[#fffbeb] border border-[#fde68a] rounded-xl px-3.5 py-2.5 text-xs text-[#92400e] mb-6 text-left">
              Lưu ý: Chỉ chấp nhận hủy trước giờ hẹn tối thiểu <strong>60 phút</strong> theo múi giờ Việt Nam (<strong>+07:00</strong>).
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setSelectedReservation(null)}
                className="w-1/2 py-2.5 border border-[#d6d0c4] rounded-xl text-xs sm:text-sm font-semibold text-[#1c1917] hover:bg-[#f5f2eb] disabled:opacity-60 transition-colors"
              >
                Không, giữ lại
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancel}
                className="w-1/2 py-2.5 bg-rose-600 rounded-xl text-xs sm:text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60 shadow-sm transition-colors inline-flex items-center justify-center gap-2"
              >
                {isCancelling ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    <span>Đang hủy...</span>
                  </>
                ) : (
                  <span>Xác nhận hủy</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
