"use client";

import React, {
  Suspense,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import { TABLE_STATUS, type TableStatusValue } from '@/app/lib/tableStateMachine';
import {
  buildPrintableTableQrUrl,
  getTableQrActivityMeta,
  isTableQrActive,
} from '@/app/lib/tableQrHelpers';
import { useToast } from '@/components/ui/Toast';

type ActivityFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type AuthState = 'ok' | 'unauthorized' | 'forbidden';

interface ReservationSummary {
  _id: string;
  bookingCode: string;
  customerName: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  status: string;
}

interface StaffQrTableItem {
  _id: string;
  tableNumber: string;
  capacity: number;
  zoneName: string;
  status: TableStatusValue;
  activeReservation: ReservationSummary | null;
}

interface TablesApiResponse {
  success?: boolean;
  message?: string;
  tables?: StaffQrTableItem[];
}

const EMPTY_SUBSCRIBE = () => () => {};

function getFilterLabel(filter: ActivityFilter): string {
  switch (filter) {
    case 'ACTIVE':
      return 'Đang hoạt động';
    case 'INACTIVE':
      return 'Không hoạt động';
    case 'ALL':
    default:
      return 'Tất cả';
  }
}

function StaffTableQrContent() {
  const searchParams = useSearchParams();
  const initialQuery = (searchParams.get('table') ?? '').trim();
  const { showToast } = useToast();

  const browserOrigin = useSyncExternalStore(
    EMPTY_SUBSCRIBE,
    () => window.location.origin,
    () => (process.env.NEXT_PUBLIC_APP_URL || '').trim()
  );

  const [tables, setTables] = useState<StaffQrTableItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [authState, setAuthState] = useState<AuthState>('ok');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [reloadNonce, setReloadNonce] = useState<number>(0);

  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);
  const [customBaseUrl, setCustomBaseUrl] = useState<string | null>(null);
  const [showUrlConfig, setShowUrlConfig] = useState<boolean>(false);
  const [printingTableId, setPrintingTableId] = useState<string | null>(null);
  const [qrDataUrlByTableId, setQrDataUrlByTableId] = useState<Record<string, string>>({});

  const effectiveBaseUrl = customBaseUrl !== null ? customBaseUrl : browserOrigin;

  useEffect(() => {
    let cancelled = false;

    const loadTables = async () => {
      try {
        const res = await fetch('/api/tables', { method: 'GET', cache: 'no-store' });
        if (cancelled) return;

        if (res.status === 401) {
          setAuthState('unauthorized');
          setErrorMessage(
            'Vui lòng đăng nhập tài khoản Nhân viên (Staff) hoặc Quản trị viên (Admin) để xem mã QR từng bàn.'
          );
          return;
        }

        if (res.status === 403) {
          setAuthState('forbidden');
          setErrorMessage('Chỉ Nhân viên (Staff) và Quản trị viên (Admin) mới được truy cập trang Mã QR bàn.');
          return;
        }

        const json = (await res.json().catch(() => ({}))) as TablesApiResponse;
        if (cancelled) return;

        if (!res.ok || !json.success || !Array.isArray(json.tables)) {
          setErrorMessage(json.message || 'Không thể tải danh sách bàn từ máy chủ.');
          return;
        }

        setAuthState('ok');
        setErrorMessage('');
        setTables(json.tables);
      } catch {
        if (!cancelled) {
          setErrorMessage('Lỗi kết nối máy chủ khi tải danh sách bàn.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    void loadTables();
    const interval = window.setInterval(() => {
      void loadTables();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [reloadNonce]);

  useEffect(() => {
    if (tables.length === 0) return;
    let cancelled = false;

    const generateAllQrImages = async () => {
      const entries = await Promise.all(
        tables.map(async (table) => {
          const url = buildPrintableTableQrUrl(table.tableNumber, effectiveBaseUrl);
          try {
            const dataUrl = await QRCode.toDataURL(url, {
              width: 280,
              margin: 4,
              errorCorrectionLevel: 'M',
              color: {
                dark: '#000000',
                light: '#FFFFFF',
              },
            });
            return [table._id, dataUrl] as const;
          } catch {
            return [table._id, ''] as const;
          }
        })
      );

      if (cancelled) return;
      const nextMap: Record<string, string> = {};
      for (const [id, dataUrl] of entries) {
        if (dataUrl) {
          nextMap[id] = dataUrl;
        }
      }
      setQrDataUrlByTableId(nextMap);
    };

    void generateAllQrImages();

    return () => {
      cancelled = true;
    };
  }, [tables, effectiveBaseUrl]);

  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintingTableId(null);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setReloadNonce((prev) => prev + 1);
  };

  const handleCopyQrLink = async (tableNumber: string) => {
    const qrUrl = buildPrintableTableQrUrl(tableNumber, effectiveBaseUrl);
    try {
      await navigator.clipboard.writeText(qrUrl);
      showToast(`Đã sao chép link gọi món không cần đăng nhập cho Bàn ${tableNumber}.`, 'success');
    } catch {
      showToast(`Link Bàn ${tableNumber}: ${qrUrl}`, 'info');
    }
  };

  const handlePrintAll = () => {
    setPrintingTableId(null);
    window.setTimeout(() => {
      window.print();
    }, 80);
  };

  const handlePrintSingleTable = (tableId: string) => {
    setPrintingTableId(tableId);
    window.setTimeout(() => {
      window.print();
    }, 80);
  };

  const summary = useMemo(() => {
    let activeCount = 0;
    let availableCount = 0;
    let reservedCount = 0;
    let cleaningCount = 0;

    for (const table of tables) {
      if (isTableQrActive(table.status)) {
        activeCount += 1;
      } else if (table.status === TABLE_STATUS.RESERVED) {
        reservedCount += 1;
      } else if (table.status === TABLE_STATUS.CLEANING) {
        cleaningCount += 1;
      } else {
        availableCount += 1;
      }
    }

    return {
      total: tables.length,
      activeCount,
      inactiveCount: tables.length - activeCount,
      availableCount,
      reservedCount,
      cleaningCount,
    };
  }, [tables]);

  const filteredTables = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tables.filter((table) => {
      const isActive = isTableQrActive(table.status);
      if (activityFilter === 'ACTIVE' && !isActive) return false;
      if (activityFilter === 'INACTIVE' && isActive) return false;
      if (!q) return true;
      return (
        table.tableNumber.toLowerCase().includes(q) ||
        table.zoneName.toLowerCase().includes(q) ||
        (table.activeReservation?.customerName ?? '').toLowerCase().includes(q) ||
        (table.activeReservation?.bookingCode ?? '').toLowerCase().includes(q)
      );
    });
  }, [tables, activityFilter, searchQuery]);

  if (authState === 'unauthorized' || authState === 'forbidden') {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl border border-[#ebe7df] shadow-[0_10px_30px_-5px_rgba(28,25,23,0.08)] p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 text-[#d97706] flex items-center justify-center mx-auto">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#14532d]">
            {authState === 'unauthorized' ? 'Yêu cầu đăng nhập Staff / Admin' : 'Không có quyền truy cập'}
          </h1>
          <p className="text-sm text-[#57534e]">{errorMessage}</p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {authState === 'unauthorized' ? (
              <Link
                href="/login?redirect=/staff/qr"
                className="px-6 py-2.5 rounded-xl bg-[#14532d] hover:bg-[#15803d] text-white text-sm font-semibold transition-colors"
              >
                Đăng nhập ngay
              </Link>
            ) : (
              <Link
                href="/"
                className="px-6 py-2.5 rounded-xl bg-[#14532d] hover:bg-[#15803d] text-white text-sm font-semibold transition-colors"
              >
                Về trang chủ
              </Link>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16 print:p-0 print:max-w-none">
      {/* Header điều hướng Staff/Admin — ẩn khi in */}
      <div className="print:hidden flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#15803d] bg-[#f0fdf4] px-3.5 py-1 rounded-full border border-[#bbf7d0] inline-block mb-1.5">
            Chỉ dành cho Staff &amp; Admin
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#14532d]">
            Mã QR Cho Từng Bàn
          </h1>
          <p className="text-xs sm:text-sm text-[#57534e] mt-1 max-w-2xl">
            Kiểm tra bàn đang hoạt động hay không hoạt động, bấm vào bàn để mở thực đơn bàn đó, hoặc in mã QR dán trực tiếp lên từng bàn cho khách quét gọi món không cần đăng nhập.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/staff/tables"
            className="min-h-[42px] px-4 py-2 bg-white hover:bg-[#f5f2eb] text-[#14532d] border border-[#d6d0c4] rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="4" width="18" height="6" rx="2" />
              <rect x="3" y="14" width="8" height="6" rx="2" />
              <rect x="13" y="14" width="8" height="6" rx="2" />
            </svg>
            <span>Quản lý bàn</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowUrlConfig((prev) => !prev)}
            className="min-h-[42px] px-3.5 py-2 bg-white hover:bg-[#f5f2eb] text-[#57534e] border border-[#d6d0c4] rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 text-[#d97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span>URL QR</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="min-h-[42px] px-4 py-2 bg-[#f0fdf4] hover:bg-[#dcfce7] text-[#14532d] border border-[#bbf7d0] rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
          >
            <svg
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
            <span>{isRefreshing ? 'Đang đồng bộ...' : 'Làm mới'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrintAll}
            disabled={filteredTables.length === 0}
            className="min-h-[42px] px-4 py-2 bg-[#14532d] hover:bg-[#15803d] text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4 text-[#fde68a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>In tất cả mã QR ({filteredTables.length})</span>
          </button>
        </div>
      </div>

      {/* Cấu hình URL gốc cho mã QR khi in dán bàn */}
      {showUrlConfig && (
        <div className="print:hidden mb-6 bg-[#fffbeb] border border-[#fde68a] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5 text-xs text-[#92400e]">
            <p className="font-bold">Đường dẫn gốc được mã hóa vào QR khi in dán bàn</p>
            <p>
              Mặc định tự nhận diện theo địa chỉ hiện tại. Nếu đang chạy trên máy tính (localhost) và muốn điện thoại quét qua Wi-Fi nội bộ, hãy nhập IP LAN (ví dụ: <code className="font-mono font-semibold">http://192.168.1.10:3000</code>).
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={effectiveBaseUrl}
              onChange={(e) => setCustomBaseUrl(e.target.value)}
              placeholder="https://ten-mien-cua-ban.com"
              className="w-60 sm:w-72 px-3 py-2 rounded-xl border border-[#fde68a] bg-white text-xs text-[#1c1917] font-mono"
            />
            <button
              type="button"
              onClick={() => setCustomBaseUrl(null)}
              className="px-3 py-2 rounded-xl bg-white hover:bg-[#fef3c7] border border-[#fde68a] text-xs font-semibold text-[#92400e] cursor-pointer"
            >
              Mặc định
            </button>
          </div>
        </div>
      )}

      {/* KPI tổng quan Hoạt động / Không hoạt động — ẩn khi in */}
      <div className="print:hidden grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-[#ebe7df] shadow-[0_4px_20px_-2px_rgba(28,25,23,0.05)]">
          <p className="text-xs text-[#57534e] font-medium">Tổng số bàn</p>
          <p className="text-2xl font-serif font-bold text-[#1c1917] mt-1">{summary.total}</p>
          <p className="text-[11px] text-[#78716c] mt-0.5">
            Mỗi bàn có 1 mã QR in cố định dán trực tiếp tại bàn
          </p>
        </div>

        <div className="bg-[#f0fdf4] p-4 rounded-2xl border border-[#bbf7d0] shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#15803d] font-bold">Đang hoạt động (SEATED)</p>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-2xl font-serif font-bold text-[#14532d] mt-1">{summary.activeCount}</p>
          <p className="text-[11px] text-[#15803d] mt-0.5">
            Khách quét QR vào thẳng thực đơn đặt món không cần đăng nhập
          </p>
        </div>

        <div className="bg-stone-50 p-4 rounded-2xl border border-[#d6d0c4] shadow-xs">
          <p className="text-xs text-[#57534e] font-bold">Không hoạt động</p>
          <p className="text-2xl font-serif font-bold text-[#1c1917] mt-1">{summary.inactiveCount}</p>
          <p className="text-[11px] text-[#78716c] mt-0.5">
            Trống: {summary.availableCount} · Đã đặt: {summary.reservedCount} · Đang dọn: {summary.cleaningCount}
          </p>
        </div>
      </div>

      {/* Lỗi tải dữ liệu */}
      {errorMessage && (
        <div
          role="alert"
          className="print:hidden mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm"
        >
          {errorMessage}
        </div>
      )}

      {/* Thanh tìm kiếm & bộ lọc Hoạt động / Không hoạt động — ẩn khi in */}
      <div className="print:hidden bg-white p-4 rounded-2xl border border-[#ebe7df] shadow-[0_4px_20px_-2px_rgba(28,25,23,0.05)] mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative w-full lg:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm số bàn, khu vực, tên khách..."
            className="w-full pl-9 pr-8 py-2.5 rounded-xl text-xs sm:text-sm bg-white border border-[#d6d0c4] text-[#1c1917]"
          />
          <svg className="w-4 h-4 absolute left-3 top-3 text-[#78716c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Xóa từ khóa tìm bàn"
              className="absolute right-2.5 top-2.5 text-[#78716c] hover:text-[#1c1917] p-0.5 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((filterId) => {
            const isSelected = activityFilter === filterId;
            const count =
              filterId === 'ALL'
                ? summary.total
                : filterId === 'ACTIVE'
                  ? summary.activeCount
                  : summary.inactiveCount;
            return (
              <button
                key={filterId}
                type="button"
                onClick={() => setActivityFilter(filterId)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#14532d] text-white border-[#14532d] shadow-xs'
                    : 'bg-[#faf8f5] text-[#57534e] border-[#ebe7df] hover:bg-[#f5f2eb]'
                }`}
              >
                {getFilterLabel(filterId)} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Danh sách Mã QR cho từng bàn (hiển thị đẹp trên màn hình & gọn chuẩn thẻ dán khi In) */}
      {loading ? (
        <div className="flex justify-center items-center py-20 bg-white rounded-2xl border border-[#ebe7df]">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-[#14532d]/20 border-t-[#14532d]" />
          <span className="ml-3 text-[#57534e] font-medium text-sm">
            Đang tạo danh sách mã QR từng bàn...
          </span>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#ebe7df] p-12 text-center space-y-3">
          <p className="font-serif font-bold text-base text-[#1c1917]">
            Không có bàn nào phù hợp với bộ lọc
          </p>
          <button
            type="button"
            onClick={() => {
              setActivityFilter('ALL');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-[#14532d] hover:bg-[#15803d] text-white text-xs font-semibold cursor-pointer"
          >
            Xem tất cả bàn
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 print:grid-cols-2 print:gap-4">
          {filteredTables.map((table) => {
            const activity = getTableQrActivityMeta(table.status);
            const tableMenuHref = `/table-menu?table=${encodeURIComponent(table.tableNumber)}`;
            const qrDataUrl = qrDataUrlByTableId[table._id] ?? '';
            const hideInPrint = printingTableId !== null && printingTableId !== table._id;

            return (
              <article
                key={table._id}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition-all shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] break-inside-avoid print:shadow-none print:border-2 print:border-stone-800 print:rounded-xl print:bg-white ${
                  hideInPrint ? 'print:hidden' : ''
                } ${
                  activity.isActive
                    ? 'bg-white border-[#86efac] ring-1 ring-[#dcfce7]'
                    : 'bg-white border-[#ebe7df]'
                }`}
              >
                <div>
                  {/* Nhãn chỉ in trên giấy (Logo + lời mời quét tại bàn) */}
                  <div className="hidden print:flex items-center justify-between border-b border-stone-300 pb-2 mb-3">
                    <span className="font-serif font-bold text-sm text-[#14532d]">
                      SmaRes Gastronomy
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-600">
                      Quét QR gọi món tại bàn
                    </span>
                  </div>

                  {/* Header thẻ bàn */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#ebe7df] print:border-none print:pb-1 print:justify-center print:text-center">
                    <div>
                      <h2 className="font-serif text-xl font-bold text-[#1c1917] print:text-2xl">
                        Bàn {table.tableNumber}
                      </h2>
                      <p className="text-xs text-[#57534e] mt-0.5">
                        {table.zoneName} · {table.capacity} chỗ
                      </p>
                    </div>

                    <div className="print:hidden flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          activity.isActive
                            ? 'bg-[#dcfce7] text-[#15803d] border-[#86efac]'
                            : 'bg-stone-100 text-stone-700 border-stone-300'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            activity.isActive ? 'bg-emerald-600 animate-pulse' : 'bg-stone-400'
                          }`}
                        />
                        <span>{activity.activityLabel}</span>
                      </span>
                      <span className="text-[10px] font-semibold text-[#78716c]">
                        {activity.statusLabel}
                      </span>
                    </div>
                  </div>

                  {/* Khung QR chính — bấm vào ảnh QR sẽ mở Menu bàn tương ứng */}
                  <div className="my-4 flex flex-col items-center">
                    <Link
                      href={tableMenuHref}
                      title={`Bấm để mở Menu cho Bàn ${table.tableNumber}`}
                      className="group relative rounded-2xl border border-[#ebe7df] bg-[#faf8f5] p-3 hover:border-[#14532d] hover:bg-[#f0fdf4]/40 transition-all print:bg-white print:border-none print:p-1"
                    >
                      {qrDataUrl ? (
                        <Image
                          src={qrDataUrl}
                          alt={`Mã QR Menu Bàn ${table.tableNumber}`}
                          width={200}
                          height={200}
                          unoptimized
                          className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-xl bg-white p-1.5 border border-[#ebe7df] print:w-52 print:h-52 print:border-none"
                        />
                      ) : (
                        <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-xl bg-stone-100 animate-pulse flex items-center justify-center text-xs text-stone-400">
                          Đang tạo QR...
                        </div>
                      )}
                      <span className="print:hidden mt-2 block text-center text-[11px] font-semibold text-[#14532d] group-hover:underline">
                        Bấm vào để xem Menu Bàn {table.tableNumber} →
                      </span>
                    </Link>

                    {/* Lời dẫn hiển thị khi in ra và dán lên bàn */}
                    <div className="hidden print:block mt-2 text-center space-y-1">
                      <p className="text-xs font-bold text-[#14532d]">
                        Quét mã để xem Thực đơn &amp; Đặt món trực tiếp
                      </p>
                      <p className="text-[10px] text-stone-600">
                        Không cần đăng nhập tài khoản · Gửi thẳng xuống Bếp SmaRes
                      </p>
                    </div>
                  </div>

                  {/* Thông tin phiên hoạt động trên màn hình */}
                  <div
                    className={`print:hidden rounded-xl border px-3 py-2.5 text-xs mb-4 ${
                      activity.isActive
                        ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#14532d]'
                        : 'bg-[#faf8f5] border-[#ebe7df] text-[#57534e]'
                    }`}
                  >
                    {activity.isActive ? (
                      <>
                        <p className="font-bold">
                          {table.activeReservation?.customerName
                            ? `Đang phục vụ: ${table.activeReservation.customerName}`
                            : 'Đang phục vụ (Khách tại bàn)'}
                        </p>
                        <p className="text-[11px] opacity-90 mt-0.5">{activity.hint}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-[#1c1917]">Trạng thái: Chưa mở gọi món</p>
                        <p className="text-[11px] mt-0.5">{activity.hint}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Nút thao tác Staff/Admin — ẩn khi in */}
                <div className="print:hidden space-y-2 pt-3 border-t border-[#ebe7df]">
                  <Link
                    href={tableMenuHref}
                    className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#14532d] hover:bg-[#15803d] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <svg className="w-4 h-4 text-[#fde68a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M3 12h18M3 6h18M3 18h18" />
                    </svg>
                    <span>Mở Menu Bàn {table.tableNumber}</span>
                  </Link>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handlePrintSingleTable(table._id)}
                      className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-[#fffbeb] hover:bg-[#fef3c7] text-[#92400e] border border-[#fde68a] text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                      </svg>
                      <span>In QR</span>
                    </button>

                    {qrDataUrl ? (
                      <a
                        href={qrDataUrl}
                        download={`QR-Ban-${table.tableNumber}.png`}
                        className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-[#faf8f5] hover:bg-[#f5f2eb] text-[#1c1917] border border-[#d6d0c4] text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5 text-[#14532d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span>Tải PNG</span>
                      </a>
                    ) : (
                      <span className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-stone-100 text-stone-400 text-[11px] font-semibold flex items-center justify-center">
                        Tải PNG
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => void handleCopyQrLink(table.tableNumber)}
                      className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-[#faf8f5] hover:bg-[#f5f2eb] text-[#1c1917] border border-[#d6d0c4] text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 text-[#14532d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      <span>Copy</span>
                    </button>
                  </div>

                  {!activity.isActive && (
                    <div className="text-center pt-1">
                      <Link
                        href="/staff/tables"
                        className="text-[11px] font-semibold text-[#b45309] hover:text-[#92400e] hover:underline"
                      >
                        Mở bàn / Check-in tại Quản lý bàn →
                      </Link>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default function StaffQrPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-7xl mx-auto px-4 py-20 text-center text-sm text-[#57534e]">
          Đang tải danh sách mã QR theo bàn...
        </main>
      }
    >
      <StaffTableQrContent />
    </Suspense>
  );
}
