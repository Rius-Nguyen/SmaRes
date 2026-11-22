"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ALLOWED_TABLE_TRANSITIONS,
  TABLE_STATUS,
  type TableStatusValue,
  canTransitionTableStatus,
} from '@/app/lib/tableStateMachine';
import { formatCountdownHhMmSs, formatVietnamTimeHm } from '@/app/lib/format';
import { useToast } from '@/components/ui/Toast';

type TableFilter = 'ALL' | TableStatusValue;
type AuthState = 'ok' | 'unauthorized' | 'forbidden';

interface ReservationSummary {
  _id: string;
  bookingCode: string;
  customerName: string;
  phone: string;
  date: string;
  time: string;
  startTime?: string | null;
  endTime?: string | null;
  guests: number;
  note: string;
  status: string;
  checkInTime?: string | null;
}

type TableCleaningTypeValue = 'EARLY_BONUS' | 'URGENT_15M' | 'RELAXED_30M';

interface StaffTableItem {
  _id: string;
  tableNumber: string;
  capacity: number;
  zoneName: string;
  status: TableStatusValue;
  qrToken: string | null;
  activeReservation: ReservationSummary | null;
  nextReservation?: ReservationSummary | null;
  reservations: ReservationSummary[];
  startTime?: string | null;
  endTime?: string | null;
  diningStartAt?: string | null;
  diningEndAt?: string | null;
  graceExpiresAt?: string | null;
  cleaningStartedAt?: string | null;
  cleaningDeadlineAt?: string | null;
  cleaningType?: TableCleaningTypeValue | null;
  updatedAt?: string | null;
}

interface TableCounts {
  total: number;
  AVAILABLE: number;
  RESERVED: number;
  SEATED: number;
  CLEANING: number;
}

interface TablesGetResponse {
  success?: boolean;
  message?: string;
  todayDate?: string;
  counts?: TableCounts;
  tables?: StaffTableItem[];
}

interface TablesPatchResponse {
  success?: boolean;
  message?: string;
  data?: {
    table?: StaffTableItem;
    updatedReservation?: ReservationSummary | null;
    walkInCustomer?: {
      customerName: string;
      phone: string;
    } | null;
  };
}

interface CheckInModalState {
  table: StaffTableItem;
  selectedReservationId: string;
  customerName: string;
  phone: string;
}

const EMPTY_COUNTS: TableCounts = {
  total: 0,
  AVAILABLE: 0,
  RESERVED: 0,
  SEATED: 0,
  CLEANING: 0,
};

const TABLE_STATUS_META: Record<
  TableStatusValue,
  {
    label: string;
    cardClass: string;
    badgeClass: string;
    dotClass: string;
  }
> = {
  AVAILABLE: {
    label: 'Sẵn sàng',
    cardClass: 'border-[#86efac]/70 bg-white',
    badgeClass: 'bg-[#dcfce7] text-[#15803d] border-[#86efac]',
    dotClass: 'bg-[#15803d]',
  },
  RESERVED: {
    label: 'Đã đặt trước',
    cardClass: 'border-[#fde68a] bg-white ring-1 ring-[#fef3c7]',
    badgeClass: 'bg-[#fef3c7] text-[#b45309] border-[#fde68a]',
    dotClass: 'bg-[#d97706]',
  },
  SEATED: {
    label: 'Đang có khách',
    cardClass: 'border-[#fca5a5] bg-white ring-1 ring-[#fee2e2]',
    badgeClass: 'bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5]',
    dotClass: 'bg-[#b91c1c]',
  },
  CLEANING: {
    label: 'Đang dọn dẹp',
    cardClass: 'border-[#fde68a] bg-[#fffbeb]/35',
    badgeClass: 'bg-[#fffbeb] text-[#92400e] border-[#fde68a]',
    dotClass: 'bg-[#d97706]',
  },
};

const FILTER_OPTIONS: ReadonlyArray<{ id: TableFilter; label: string }> = [
  { id: 'ALL', label: 'Tất cả' },
  { id: TABLE_STATUS.AVAILABLE, label: 'Sẵn sàng' },
  { id: TABLE_STATUS.RESERVED, label: 'Đã đặt trước' },
  { id: TABLE_STATUS.SEATED, label: 'Đang có khách' },
  { id: TABLE_STATUS.CLEANING, label: 'Đang dọn dẹp' },
];

function computeCounts(tables: readonly StaffTableItem[]): TableCounts {
  const counts: TableCounts = { ...EMPTY_COUNTS, total: tables.length };
  for (const table of tables) {
    counts[table.status] += 1;
  }
  return counts;
}

function formatDateVi(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function buildTableMenuPath(table: StaffTableItem): string {
  const params = new URLSearchParams({ table: table.tableNumber });
  if (table.qrToken) {
    params.set('token', table.qrToken);
  }
  return `/table-menu?${params.toString()}`;
}

export default function StaffTablesPage() {
  const [tables, setTables] = useState<StaffTableItem[]>([]);
  const [counts, setCounts] = useState<TableCounts>(EMPTY_COUNTS);
  const [todayDate, setTodayDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<TableFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [authState, setAuthState] = useState<AuthState>('ok');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [mutatingIds, setMutatingIds] = useState<string[]>([]);
  const [walkInNamesByTable, setWalkInNamesByTable] = useState<Record<string, string>>({});
  const [checkInModal, setCheckInModal] = useState<CheckInModalState | null>(null);
  const [releaseConfirmTarget, setReleaseConfirmTarget] = useState<StaffTableItem | null>(null);
  const [reloadNonce, setReloadNonce] = useState<number>(0);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const { showToast } = useToast();

  // Ticker 1 giây dùng chung cho đồng hồ đếm ngược HH:mm:ss trên tất cả thẻ bàn
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadTables = async () => {
      try {
        const res = await fetch('/api/tables', { method: 'GET', cache: 'no-store' });
        if (cancelled) return;

        if (res.status === 401) {
          setAuthState('unauthorized');
          setErrorMessage('Vui lòng đăng nhập tài khoản Nhân viên / Quản lý để điều phối bàn.');
          return;
        }

        if (res.status === 403) {
          setAuthState('forbidden');
          setErrorMessage('Tài khoản hiện tại không có quyền Nhân viên để quản lý sơ đồ bàn.');
          return;
        }

        const json = (await res.json().catch(() => ({}))) as TablesGetResponse;
        if (cancelled) return;

        if (!res.ok || !json.success || !Array.isArray(json.tables)) {
          setErrorMessage(json.message || 'Không thể tải danh sách bàn từ máy chủ.');
          return;
        }

        setAuthState('ok');
        setErrorMessage('');
        setTables(json.tables);
        setCounts(json.counts ?? computeCounts(json.tables));
        setTodayDate(json.todayDate ?? '');
      } catch {
        if (!cancelled) {
          setErrorMessage('Lỗi kết nối máy chủ khi tải trạng thái bàn.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    void loadTables();

    const interval = setInterval(() => {
      void loadTables();
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [reloadNonce]);

  // Tự động đồng bộ ngay khi tới giờ hẹn của một bàn AVAILABLE hôm nay để chuyển sang Giữ bàn (RESERVED)
  useEffect(() => {
    if (!todayDate || tables.length === 0) return;

    const nowSnapshotMs = Date.now();
    let earliestDueMs = Number.POSITIVE_INFINITY;

    for (const table of tables) {
      if (table.status !== TABLE_STATUS.AVAILABLE) continue;
      for (const res of table.reservations) {
        if (res.status !== 'CONFIRMED' || res.date !== todayDate) continue;
        const startMs = res.startTime ? Date.parse(res.startTime) : Number.NaN;
        const endMs = res.endTime ? Date.parse(res.endTime) : Number.NaN;
        if (!Number.isFinite(startMs)) continue;
        if (Number.isFinite(endMs) && nowSnapshotMs >= endMs) continue;
        if (startMs < earliestDueMs) {
          earliestDueMs = startMs;
        }
      }
    }

    if (!Number.isFinite(earliestDueMs)) return;
    const rawDelayMs = earliestDueMs - nowSnapshotMs + 500;
    if (rawDelayMs > 24 * 60 * 60 * 1000) return;

    const timer = window.setTimeout(() => {
      setReloadNonce((prev) => prev + 1);
    }, Math.max(300, rawDelayMs));

    return () => window.clearTimeout(timer);
  }, [tables, todayDate]);

  useEffect(() => {
    if (!checkInModal) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !mutatingIds.includes(checkInModal.table._id)) {
        setCheckInModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [checkInModal, mutatingIds]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setReloadNonce((prev) => prev + 1);
  };

  const executeTransition = async (params: {
    table: StaffTableItem;
    nextStatus: TableStatusValue;
    reservationId?: string;
    isWalkIn?: boolean;
    customerName?: string;
    phone?: string;
  }): Promise<boolean> => {
    const { table, nextStatus, reservationId, isWalkIn, customerName, phone } = params;

    if (!canTransitionTableStatus(table.status, nextStatus)) {
      showToast(
        `Không thể chuyển Bàn ${table.tableNumber} từ ${table.status} sang ${nextStatus}.`,
        'warning'
      );
      return false;
    }

    setMutatingIds((prev) => (prev.includes(table._id) ? prev : [...prev, table._id]));

    try {
      const res = await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: table._id,
          nextStatus,
          ...(reservationId ? { reservationId } : {}),
          ...(isWalkIn ? { isWalkIn: true } : {}),
          ...(customerName ? { customerName } : {}),
          ...(phone ? { phone } : {}),
        }),
      });

      const json = (await res.json().catch(() => ({}))) as TablesPatchResponse;

      if (res.status === 401 || res.status === 403) {
        setAuthState(res.status === 401 ? 'unauthorized' : 'forbidden');
        showToast(json.message || 'Bạn không có quyền cập nhật trạng thái bàn.', 'error');
        return false;
      }

      if (!res.ok || !json.success || !json.data?.table) {
        showToast(json.message || 'Không thể cập nhật trạng thái bàn.', 'error');
        return false;
      }

      const updatedTable = json.data.table;
      setTables((prev) => {
        const nextList = prev.map((item) =>
          item._id === updatedTable._id ? updatedTable : item
        );
        setCounts(computeCounts(nextList));
        return nextList;
      });

      if (nextStatus === TABLE_STATUS.SEATED && json.data.walkInCustomer?.customerName) {
        const walkInName = json.data.walkInCustomer.customerName;
        setWalkInNamesByTable((prev) => ({
          ...prev,
          [updatedTable._id]: walkInName,
        }));
      } else if (nextStatus !== TABLE_STATUS.SEATED) {
        setWalkInNamesByTable((prev) => {
          const nextMap = { ...prev };
          delete nextMap[updatedTable._id];
          return nextMap;
        });
      }

      showToast(
        json.message || `Đã cập nhật Bàn ${updatedTable.tableNumber} sang ${nextStatus}.`,
        'success'
      );
      return true;
    } catch {
      showToast('Mất kết nối máy chủ khi cập nhật trạng thái bàn.', 'error');
      return false;
    } finally {
      setMutatingIds((prev) => prev.filter((id) => id !== table._id));
    }
  };

  const openCheckInModal = (table: StaffTableItem) => {
    const confirmedList = table.reservations.filter((r) => r.status === 'CONFIRMED');
    const preferredRes =
      confirmedList.find((r) => r.date === todayDate) ?? confirmedList[0] ?? null;

    setCheckInModal({
      table,
      selectedReservationId: preferredRes?._id ?? '',
      customerName: preferredRes?.customerName ?? '',
      phone: preferredRes?.phone ?? '',
    });
  };

  const handleConfirmCheckIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!checkInModal) return;

    const ok = await executeTransition({
      table: checkInModal.table,
      nextStatus: TABLE_STATUS.SEATED,
      reservationId: checkInModal.selectedReservationId || undefined,
      isWalkIn: !checkInModal.selectedReservationId,
      customerName: checkInModal.selectedReservationId
        ? undefined
        : checkInModal.customerName.trim(),
      phone: checkInModal.selectedReservationId ? undefined : checkInModal.phone.trim(),
    });

    if (ok) {
      setCheckInModal(null);
    }
  };

  const handleCopyQrUrl = async (table: StaffTableItem) => {
    const path = buildTableMenuPath(table);
    const fullUrl =
      typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullUrl);
        showToast(`Đã sao chép link Menu QR Bàn ${table.tableNumber}.`, 'success');
      } else {
        showToast(`Link Menu QR Bàn ${table.tableNumber}: ${path}`, 'info');
      }
    } catch {
      showToast(`Không thể tự động sao chép. Link bàn: ${path}`, 'warning');
    }
  };

  const filteredTables = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tables.filter((table) => {
      const matchesStatus = statusFilter === 'ALL' || table.status === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;

      const walkInName = walkInNamesByTable[table._id] ?? '';
      return (
        (table.tableNumber ?? '').toLowerCase().includes(q) ||
        (table.zoneName ?? '').toLowerCase().includes(q) ||
        (table.activeReservation?.customerName ?? '').toLowerCase().includes(q) ||
        (table.activeReservation?.bookingCode ?? '').toLowerCase().includes(q) ||
        walkInName.toLowerCase().includes(q)
      );
    });
  }, [tables, statusFilter, searchQuery, walkInNamesByTable]);

  if (authState === 'unauthorized' && !loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#faf8f5] text-[#1c1917] py-16 px-4">
        <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-[0_8px_20px_-4px_rgba(28,25,23,0.08)] border border-[#ebe7df] text-center max-w-md w-full">
          <div className="w-16 h-16 rounded-full bg-[#fef3c7] text-[#d97706] flex items-center justify-center mx-auto mb-4 border border-[#fde68a]">
            <svg
              className="w-8 h-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-2xl font-serif font-bold text-[#14532d] mb-2">
            Yêu cầu đăng nhập Lễ tân / Nhân viên
          </h1>
          <p className="text-sm text-[#57534e] mb-7 leading-relaxed">
            {errorMessage || 'Vui lòng đăng nhập tài khoản Nhân viên hoặc Quản lý để check-in bàn.'}
          </p>
          <Link
            href="/login?redirect=/staff/tables"
            className="inline-block w-full bg-[#14532d] hover:bg-[#15803d] text-white px-5 py-3.5 rounded-xl font-semibold text-sm transition-colors shadow-[0_8px_24px_-4px_rgba(20,83,45,0.35)]"
          >
            Đăng nhập ngay
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-screen bg-[#faf8f5] text-[#1c1917] pb-20">
      {/* Tiêu đề trang sạch gọn (AppShell đã hiển thị Navbar toàn cục trên /staff/*) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#15803d] bg-[#f0fdf4] px-3.5 py-1 rounded-full border border-[#bbf7d0] inline-block mb-1.5">
            Lễ tân &amp; Sơ đồ bàn
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#14532d]">
            Check-in Bàn &amp; Kích Hoạt QR (Staff)
          </h1>
          <p className="text-xs sm:text-sm text-[#57534e] mt-1">
            Mở bàn khách đặt trước hoặc khách vãng lai, kích hoạt QR gọi món và đồng bộ trạng thái dọn bàn
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/staff/qr"
            className="min-h-[42px] px-4 py-2 bg-[#fffbeb] hover:bg-[#fef3c7] text-[#92400e] border border-[#fde68a] rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4 text-[#d97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <path d="M14 14h3v3h-3z" />
              <path d="M17 17h4v4" />
            </svg>
            <span>Mã QR các bàn</span>
          </Link>

          <Link
            href="/staff/orders"
            className="min-h-[42px] px-4 py-2 bg-white hover:bg-[#f5f2eb] text-[#1c1917] border border-[#d6d0c4] rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4 text-[#14532d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
            </svg>
            <span>Đơn hàng &amp; Phục vụ</span>
          </Link>

          <Link
            href="/kds"
            className="min-h-[42px] px-4 py-2 bg-[#d97706] hover:bg-[#b45309] text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span>Bếp KDS</span>
          </Link>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="min-h-[42px] px-4 py-2 bg-[#14532d] hover:bg-[#15803d] text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
          >
            <svg
              className={`w-4 h-4 text-emerald-200 ${isRefreshing ? 'animate-spin' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
            <span>{isRefreshing ? 'Đang đồng bộ...' : 'Làm mới'}</span>
          </button>
        </div>
      </div>

      {/* Thẻ KPI trạng thái bàn */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-[#ebe7df] shadow-[0_4px_20px_-2px_rgba(28,25,23,0.05)]">
          <p className="text-xs text-[#57534e] font-medium">Tổng số bàn</p>
          <p className="text-2xl font-serif font-bold text-[#1c1917] mt-1">{counts.total}</p>
        </div>
        <div className="bg-[#f0fdf4] p-4 rounded-2xl border border-[#bbf7d0] shadow-xs">
          <p className="text-xs text-[#15803d] font-bold">Sẵn sàng (AVAILABLE)</p>
          <p className="text-2xl font-serif font-bold text-[#14532d] mt-1">{counts.AVAILABLE}</p>
        </div>
        <div className="bg-[#fffbeb] p-4 rounded-2xl border border-[#fde68a] shadow-xs">
          <p className="text-xs text-[#b45309] font-bold">Đã đặt (RESERVED)</p>
          <p className="text-2xl font-serif font-bold text-[#92400e] mt-1">{counts.RESERVED}</p>
        </div>
        <div className="bg-[#fee2e2]/70 p-4 rounded-2xl border border-[#fca5a5] shadow-xs">
          <p className="text-xs text-[#b91c1c] font-bold">Đang ngồi (SEATED)</p>
          <p className="text-2xl font-serif font-bold text-[#991b1b] mt-1">{counts.SEATED}</p>
        </div>
        <div className="bg-[#f5f2eb] p-4 rounded-2xl border border-[#d6d0c4] shadow-xs col-span-2 sm:col-span-1">
          <p className="text-xs text-[#57534e] font-bold">Chờ dọn (CLEANING)</p>
          <p className="text-2xl font-serif font-bold text-[#1c1917] mt-1">{counts.CLEANING}</p>
        </div>
      </div>

      {/* Thông báo lỗi */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-5 p-4 text-xs sm:text-sm text-rose-800 bg-rose-50 rounded-2xl border border-rose-200 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-rose-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
          {authState === 'forbidden' && (
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg bg-rose-700 text-white text-xs font-semibold shrink-0"
            >
              Về trang chủ
            </Link>
          )}
        </div>
      )}

      {/* Bộ lọc tìm kiếm & trạng thái */}
      <div className="bg-white p-4 rounded-2xl border border-[#ebe7df] shadow-[0_4px_20px_-2px_rgba(28,25,23,0.05)] mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative w-full lg:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm số bàn, khu vực, tên khách, mã đặt bàn..."
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

        <div className="flex flex-wrap items-center gap-1.5">
          {FILTER_OPTIONS.map((opt) => {
            const isActive = statusFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStatusFilter(opt.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#14532d] text-white border-[#14532d] shadow-xs'
                    : 'bg-[#faf8f5] text-[#57534e] border-[#ebe7df] hover:bg-[#f5f2eb]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Danh sách thẻ bàn ăn */}
      {loading ? (
        <div className="flex justify-center items-center py-20 bg-white rounded-2xl border border-[#ebe7df]">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-[#14532d]/20 border-t-[#14532d]" />
          <span className="ml-3 text-[#57534e] font-medium text-sm">
            Đang tải sơ đồ bàn từ hệ thống...
          </span>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#ebe7df] p-12 text-center space-y-3 shadow-[0_4px_20px_-2px_rgba(28,25,23,0.05)]">
          <p className="font-serif font-bold text-base text-[#1c1917]">
            Không có bàn nào phù hợp với bộ lọc hiện tại
          </p>
          <p className="text-xs text-[#57534e]">
            Hãy thử xóa từ khóa tìm kiếm hoặc chọn bộ lọc &ldquo;Tất cả&rdquo;.
          </p>
          {(statusFilter !== 'ALL' || searchQuery !== '') && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-[#14532d] hover:bg-[#15803d] text-white text-xs font-semibold cursor-pointer"
            >
              Xem tất cả bàn
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredTables.map((table) => {
            const meta = TABLE_STATUS_META[table.status];
            const allowedTransitions = ALLOWED_TABLE_TRANSITIONS[table.status];
            const isMutating = mutatingIds.includes(table._id);
            const activeRes = table.activeReservation;
            const nextRes = table.nextReservation ?? null;
            const walkInName = walkInNamesByTable[table._id];
            const tableMenuHref = buildTableMenuPath(table);

            const diningEndMs = table.diningEndAt ? Date.parse(table.diningEndAt) : Number.NaN;
            const hasDiningEnd = table.status === TABLE_STATUS.SEATED && Number.isFinite(diningEndMs);
            const diningRemainingSec = hasDiningEnd
              ? Math.ceil((diningEndMs - nowMs) / 1000)
              : 0;
            const diningOverdueSec = hasDiningEnd && diningRemainingSec <= 0
              ? Math.max(0, Math.floor((nowMs - diningEndMs) / 1000))
              : 0;
            const diningEndHm = hasDiningEnd ? formatVietnamTimeHm(diningEndMs) : '';
            const isUrgentCheckoutRequired = Boolean(
              hasDiningEnd && diningRemainingSec <= 0 && nextRes && diningOverdueSec >= 900
            );

            const reservedStartMs = table.startTime ? Date.parse(table.startTime) : Number.NaN;
            const graceEndMs = table.graceExpiresAt ? Date.parse(table.graceExpiresAt) : Number.NaN;
            const hasReservedTiming =
              table.status === TABLE_STATUS.RESERVED &&
              Number.isFinite(reservedStartMs) &&
              Number.isFinite(graceEndMs);

            const cleaningDeadlineMs = table.cleaningDeadlineAt
              ? Date.parse(table.cleaningDeadlineAt)
              : Number.NaN;
            const hasCleaningTimer =
              table.status === TABLE_STATUS.CLEANING && Number.isFinite(cleaningDeadlineMs);
            const cleaningRemainingSec = hasCleaningTimer
              ? Math.ceil((cleaningDeadlineMs - nowMs) / 1000)
              : 0;
            const cleaningOverdueSec = hasCleaningTimer && cleaningRemainingSec <= 0
              ? Math.max(0, Math.floor((nowMs - cleaningDeadlineMs) / 1000))
              : 0;
            const cleaningDeadlineHm = hasCleaningTimer
              ? formatVietnamTimeHm(cleaningDeadlineMs)
              : '';

            return (
              <article
                key={table._id}
                className={`rounded-2xl border p-5 flex flex-col justify-between shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] transition-all ${meta.cardClass}`}
              >
                <div>
                  {/* Header thẻ bàn */}
                  <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-[#ebe7df]">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-serif font-bold text-[#1c1917]">
                          Bàn {table.tableNumber}
                        </h2>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#f5f2eb] text-[#57534e] border border-[#ebe7df]">
                          <svg className="w-3 h-3 text-[#14532d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          <span>{table.capacity} chỗ</span>
                        </span>
                      </div>
                      <p className="text-xs text-[#57534e] mt-1">{table.zoneName}</p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${meta.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                      <span>{table.status}</span>
                      <span className="font-medium opacity-80">· {meta.label}</span>
                    </span>
                  </div>

                  {/* Thông tin đặt bàn / khách đang ngồi */}
                  <div className="py-4 space-y-2.5">
                    {activeRes ? (
                      <div className="rounded-xl bg-[#faf8f5] border border-[#ebe7df] p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#14532d] font-mono">
                            {activeRes.bookingCode}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              activeRes.status === 'CHECKED_IN'
                                ? 'bg-[#dcfce7] text-[#15803d] border-[#86efac]'
                                : 'bg-[#fef3c7] text-[#b45309] border-[#fde68a]'
                            }`}
                          >
                            {activeRes.status}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-[#1c1917]">
                          {activeRes.customerName}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#57534e]">
                          <span>SĐT: {activeRes.phone}</span>
                          <span>
                            {activeRes.time} · {formatDateVi(activeRes.date)}
                          </span>
                          <span>{activeRes.guests} khách</span>
                        </div>
                        {activeRes.note && (
                          <p className="text-[11px] text-[#92400e] bg-[#fffbeb] border border-[#fde68a] rounded-lg px-2.5 py-1">
                            Ghi chú: {activeRes.note}
                          </p>
                        )}
                        {table.status === TABLE_STATUS.AVAILABLE &&
                          activeRes.status === 'CONFIRMED' &&
                          activeRes.date === todayDate && (
                            <p className="text-[11px] text-[#14532d] bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg px-2.5 py-1">
                              Tự động chuyển sang <strong>Giữ bàn (RESERVED)</strong> lúc{' '}
                              <strong>{activeRes.time}</strong> nếu khách chưa Check-in.
                            </p>
                          )}
                      </div>
                    ) : table.status === TABLE_STATUS.SEATED ? (
                      <div className="space-y-2">
                        <div className="rounded-xl bg-[#faf8f5] border border-[#ebe7df] p-3.5 space-y-1">
                          <p className="text-xs font-bold text-[#14532d]">
                            Phiên phục vụ tại bàn (Walk-in)
                          </p>
                          <p className="text-sm font-semibold text-[#1c1917]">
                            {walkInName || 'Khách tại bàn'}
                          </p>
                          <p className="text-[11px] text-[#57534e]">
                            QR gọi món đang được kích hoạt cho bàn {table.tableNumber}.
                          </p>
                        </div>
                        {nextRes && (
                          <div className="rounded-xl bg-[#fffbeb] border border-[#fde68a] px-3 py-2 text-[11px] text-[#92400e]">
                            <strong>Lịch đặt kế tiếp:</strong> {nextRes.customerName} lúc{' '}
                            <strong>{nextRes.time}</strong> ({formatDateVi(nextRes.date)})
                          </div>
                        )}
                      </div>
                    ) : table.status === TABLE_STATUS.RESERVED ? (
                      <div className="rounded-xl bg-[#fffbeb]/70 border border-[#fde68a] p-3.5 space-y-1">
                        <p className="text-xs font-bold text-[#b45309]">
                          Đang giữ bàn chờ khách Check-in
                        </p>
                        <p className="text-[11px] text-[#92400e]">
                          Bàn đang ở trạng thái giữ chỗ tự động. Khi khách đến bàn, vui lòng bấm Check-in (Mở bàn).
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-[#faf8f5] border border-dashed border-[#d6d0c4] p-3.5 text-xs text-[#78716c]">
                        {table.status === TABLE_STATUS.CLEANING
                          ? 'Bàn vừa trả khách, đang chờ nhân viên thu dọn sạch sẽ.'
                          : 'Chưa có lịch đặt bàn đang hoạt động.'}
                      </div>
                    )}

                    {table.reservations.length > 1 && (
                      <p className="text-[11px] text-[#57534e] font-medium">
                        Còn {table.reservations.length - 1} lịch đặt bàn khác đang chờ trên bàn này.
                      </p>
                    )}
                  </div>
                </div>

                {/* Hành động chuyển trạng thái theo ALLOWED_TABLE_TRANSITIONS */}
                <div className="pt-3 border-t border-[#ebe7df] space-y-2.5">
                  {/* Đồng hồ đếm ngược 150 phút dùng bữa (BR-RES-11) cho bàn SEATED */}
                  {hasDiningEnd && (
                    <div
                      className={`rounded-xl border px-3 py-2.5 flex items-center justify-between gap-2 ${
                        diningRemainingSec <= 0
                          ? nextRes
                            ? diningOverdueSec >= 900
                              ? 'bg-red-100 border-red-400 text-red-900 animate-pulse'
                              : 'bg-red-50 border-red-300 text-red-800'
                            : 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]'
                          : diningRemainingSec <= 1800
                            ? 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]'
                            : 'bg-[#f0fdf4] border-[#bbf7d0] text-[#14532d]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold leading-snug">
                            {diningRemainingSec <= 0
                              ? nextRes
                                ? diningOverdueSec >= 900
                                  ? 'BẮT BUỘC TRẢ & DỌN BÀN NGAY (Đã trễ >= 15p)'
                                  : `Quá giờ trả bàn · Có khách sau lúc ${nextRes.time}`
                                : 'Đã dùng bữa quá 150p · Chưa có lịch sau, có thể phục vụ thêm'
                              : diningRemainingSec <= 1800
                                ? 'Sắp hết giờ dùng bữa'
                                : 'Thời gian dùng bữa (150p)'}
                          </span>
                        </div>
                        <p className="text-[10px] opacity-85 mt-0.5">
                          {diningRemainingSec <= 0
                            ? nextRes
                              ? `Khách kế tiếp: ${nextRes.customerName} (${nextRes.time}) • Quá hạn từ ${diningEndHm}`
                              : `Mốc 150p lúc: ${diningEndHm}`
                            : `Trả bàn dự kiến: ${diningEndHm}${nextRes ? ` • Khách sau: ${nextRes.time}` : ''}`}
                        </p>
                      </div>
                      <span
                        className={`font-mono font-bold text-xs sm:text-sm px-2.5 py-1 rounded-lg border shrink-0 ${
                          diningRemainingSec <= 0
                            ? nextRes
                              ? 'bg-white text-red-700 border-red-300'
                              : 'bg-white text-[#b45309] border-[#fde68a]'
                            : diningRemainingSec <= 1800
                              ? 'bg-white text-[#b45309] border-[#fde68a]'
                              : 'bg-white text-[#14532d] border-[#86efac]'
                        }`}
                      >
                        {diningRemainingSec <= 0
                          ? `+${formatCountdownHhMmSs(diningOverdueSec)}`
                          : formatCountdownHhMmSs(diningRemainingSec)}
                      </span>
                    </div>
                  )}

                  {/* Đồng hồ đếm giờ dọn bàn (CLEANING) lưu bền vững theo cleaningDeadlineAt */}
                  {hasCleaningTimer && (
                    <div
                      className={`rounded-xl border px-3 py-2.5 flex items-center justify-between gap-2 ${
                        cleaningRemainingSec <= 0
                          ? 'bg-red-50 border-red-300 text-red-800 animate-pulse'
                          : table.cleaningType === 'URGENT_15M'
                            ? 'bg-red-50 border-red-300 text-red-800'
                            : table.cleaningType === 'EARLY_BONUS'
                              ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#14532d]'
                              : 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold leading-snug">
                          {cleaningRemainingSec <= 0
                            ? 'Quá giờ dọn bàn dự kiến'
                            : table.cleaningType === 'URGENT_15M'
                              ? 'Dọn bàn khẩn cấp (15p)'
                              : table.cleaningType === 'EARLY_BONUS'
                                ? 'Đang dọn bàn (30p + thời gian sớm)'
                                : 'Đang dọn bàn (30p)'}
                        </p>
                        <p className="text-[10px] opacity-85 mt-0.5">
                          {nextRes
                            ? `Khách kế tiếp: ${nextRes.customerName} (${nextRes.time}) • Hạn dọn: ${cleaningDeadlineHm}`
                            : `Hoàn tất dọn dự kiến: ${cleaningDeadlineHm}`}
                        </p>
                      </div>
                      <span
                        className={`font-mono font-bold text-xs sm:text-sm px-2.5 py-1 rounded-lg border shrink-0 ${
                          cleaningRemainingSec <= 0 || table.cleaningType === 'URGENT_15M'
                            ? 'bg-white text-red-700 border-red-300'
                            : table.cleaningType === 'EARLY_BONUS'
                              ? 'bg-white text-[#14532d] border-[#86efac]'
                              : 'bg-white text-[#b45309] border-[#fde68a]'
                        }`}
                      >
                        {cleaningRemainingSec <= 0
                          ? `+${formatCountdownHhMmSs(cleaningOverdueSec)}`
                          : formatCountdownHhMmSs(cleaningRemainingSec)}
                      </span>
                    </div>
                  )}

                  {/* Đồng hồ đếm ngược giờ hẹn / giữ chỗ 15 phút (BR-RES-09) cho bàn RESERVED */}
                  {hasReservedTiming && (
                    <div
                      className={`rounded-xl border px-3 py-2.5 flex items-center justify-between gap-2 ${
                        nowMs > graceEndMs
                          ? 'bg-red-50 border-red-300 text-red-800'
                          : nowMs >= reservedStartMs
                            ? 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]'
                            : 'bg-[#faf8f5] border-[#ebe7df] text-[#14532d]'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold leading-snug">
                          {nowMs > graceEndMs
                            ? 'Quá hạn giữ chỗ 15 phút (No-show)'
                            : nowMs >= reservedStartMs
                              ? activeRes
                                ? 'Đang giữ chỗ 15p'
                                : 'Đang giữ bàn 15p tại quầy'
                              : 'Đếm ngược tới giờ hẹn'}
                        </p>
                        <p className="text-[10px] opacity-85 mt-0.5">
                          {nowMs > graceEndMs
                            ? activeRes
                              ? `Hẹn ${activeRes.time} (${formatDateVi(activeRes.date)}) · Hết giữ lúc ${formatVietnamTimeHm(graceEndMs)}`
                              : `Hết hạn giữ lúc ${formatVietnamTimeHm(graceEndMs)} — Có thể Nhả bàn`
                            : activeRes
                              ? `Giờ hẹn: ${formatVietnamTimeHm(reservedStartMs)} • Hạn giữ: ${formatVietnamTimeHm(graceEndMs)}`
                              : `Giữ bàn đến: ${formatVietnamTimeHm(graceEndMs)}`}
                        </p>
                      </div>
                      <span
                        className={`font-mono font-bold text-xs sm:text-sm px-2.5 py-1 rounded-lg border shrink-0 ${
                          nowMs > graceEndMs
                            ? 'bg-white text-red-700 border-red-300'
                            : nowMs >= reservedStartMs
                              ? 'bg-white text-[#b45309] border-[#fde68a]'
                              : 'bg-white text-[#14532d] border-[#bbf7d0]'
                        }`}
                      >
                        {nowMs > graceEndMs
                          ? `Quá hạn ${formatCountdownHhMmSs(Math.floor((nowMs - graceEndMs) / 1000))}`
                          : nowMs >= reservedStartMs
                            ? formatCountdownHhMmSs(Math.ceil((graceEndMs - nowMs) / 1000))
                            : formatCountdownHhMmSs(Math.ceil((reservedStartMs - nowMs) / 1000))}
                      </span>
                    </div>
                  )}

                  {table.status === TABLE_STATUS.SEATED && (
                    <div className="flex items-center gap-2">
                      <Link
                        href={tableMenuHref}
                        className="flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-[#fffbeb] hover:bg-[#fef3c7] text-[#92400e] border border-[#fde68a] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <svg className="w-4 h-4 text-[#d97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <rect x="3" y="3" width="7" height="7" />
                          <rect x="14" y="3" width="7" height="7" />
                          <rect x="3" y="14" width="7" height="7" />
                          <path d="M14 14h3v3h-3z" />
                          <path d="M17 17h4v4" />
                        </svg>
                        <span>Xem Menu QR bàn</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleCopyQrUrl(table)}
                        title="Sao chép link Menu QR bàn"
                        aria-label={`Sao chép link Menu QR Bàn ${table.tableNumber}`}
                        className="min-h-[40px] px-3 py-2 rounded-xl bg-[#f5f2eb] hover:bg-[#ebe7df] text-[#1c1917] border border-[#d6d0c4] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5 text-[#14532d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        <span>Copy QR</span>
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    {allowedTransitions.includes(TABLE_STATUS.SEATED) && (
                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={() => openCheckInModal(table)}
                        className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl bg-[#14532d] hover:bg-[#15803d] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Check-in (Mở bàn)</span>
                      </button>
                    )}

                    {table.status === TABLE_STATUS.RESERVED &&
                      allowedTransitions.includes(TABLE_STATUS.AVAILABLE) && (
                        <button
                          type="button"
                          disabled={isMutating}
                          onClick={() => setReleaseConfirmTarget(table)}
                          className="min-h-[42px] px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
                        >
                          Nhả bàn
                        </button>
                      )}

                    {allowedTransitions.includes(TABLE_STATUS.CLEANING) && (
                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={() =>
                          void executeTransition({
                            table,
                            nextStatus: TABLE_STATUS.CLEANING,
                          })
                        }
                        className={`w-full min-h-[42px] px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 ${
                          isUrgentCheckoutRequired
                            ? 'bg-red-600 hover:bg-red-700 ring-2 ring-red-300 shadow-md animate-pulse'
                            : 'bg-[#d97706] hover:bg-[#b45309]'
                        }`}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span>{isMutating ? 'Đang xử lý...' : 'Trả bàn / Chờ dọn'}</span>
                      </button>
                    )}

                    {table.status === TABLE_STATUS.CLEANING &&
                      allowedTransitions.includes(TABLE_STATUS.AVAILABLE) && (
                        <button
                          type="button"
                          disabled={isMutating}
                          onClick={() =>
                            void executeTransition({
                              table,
                              nextStatus: TABLE_STATUS.AVAILABLE,
                            })
                          }
                          className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#14532d] hover:bg-[#15803d] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>
                            {isMutating ? 'Đang lưu...' : 'Hoàn tất dọn (Sẵn sàng)'}
                          </span>
                        </button>
                      )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* =============================================================== */}
      {/* MODAL CHECK-IN KHÁCH ĐẶT TRƯỚC HOẶC KHÁCH VÃNG LAI (WALK-IN)     */}
      {/* =============================================================== */}
      {checkInModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkin-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1c1917]/60 backdrop-blur-xs animate-fadeIn"
        >
          <div className="bg-white w-full max-w-lg rounded-3xl border border-[#ebe7df] shadow-2xl overflow-hidden animate-scaleUp">
            <div className="px-6 py-4 bg-[#faf8f5] border-b border-[#ebe7df] flex items-center justify-between">
              <div>
                <h2
                  id="checkin-modal-title"
                  className="text-lg font-serif font-bold text-[#14532d]"
                >
                  Check-in &amp; Mở Bàn {checkInModal.table.tableNumber}
                </h2>
                <p className="text-xs text-[#57534e]">
                  {checkInModal.table.zoneName} · Sức chứa {checkInModal.table.capacity} chỗ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCheckInModal(null)}
                disabled={mutatingIds.includes(checkInModal.table._id)}
                aria-label="Đóng hộp thoại check-in"
                className="w-9 h-9 rounded-xl text-[#57534e] hover:text-[#1c1917] hover:bg-[#ebe7df]/70 flex items-center justify-center transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleConfirmCheckIn} className="p-6 space-y-4">
              {checkInModal.table.reservations.some((r) => r.status === 'CONFIRMED') && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#1c1917]">
                    Chọn đơn đặt bàn trước (hoặc mở bàn vãng lai)
                  </label>
                  <select
                    value={checkInModal.selectedReservationId}
                    onChange={(e) => {
                      const chosenId = e.target.value;
                      const chosen = checkInModal.table.reservations.find(
                        (r) => r._id === chosenId
                      );
                      setCheckInModal((prev) =>
                        prev
                          ? {
                              ...prev,
                              selectedReservationId: chosenId,
                              customerName: chosen?.customerName ?? '',
                              phone: chosen?.phone ?? '',
                            }
                          : null
                      );
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white border border-[#d6d0c4] text-[#1c1917]"
                  >
                    {checkInModal.table.reservations
                      .filter((r) => r.status === 'CONFIRMED')
                      .map((res) => (
                        <option key={res._id} value={res._id}>
                          {res.bookingCode} — {res.customerName} ({res.time}, {formatDateVi(res.date)})
                        </option>
                      ))}
                    <option value="">Khách vãng lai (Walk-in không đặt trước)</option>
                  </select>
                </div>
              )}

              {!checkInModal.selectedReservationId ? (
                <div className="space-y-3 bg-[#faf8f5] p-4 rounded-2xl border border-[#ebe7df]">
                  <p className="text-xs font-semibold text-[#14532d]">
                    Thông tin khách vãng lai (Walk-in — tùy chọn)
                  </p>
                  {checkInModal.table.reservations.some(
                    (r) => r.status === 'CONFIRMED' && r.date === todayDate
                  ) && (
                    <div className="rounded-xl bg-[#fffbeb] border border-[#fde68a] px-3 py-2 text-[11px] text-[#92400e]">
                      <strong>Lưu ý:</strong> Bàn này đã có lịch đặt trước hôm nay (
                      {checkInModal.table.reservations
                        .filter((r) => r.status === 'CONFIRMED' && r.date === todayDate)
                        .map((r) => `${r.time} - ${r.customerName}`)
                        .join(', ')}
                      ). Hãy nhắc khách vãng lai trả bàn trước giờ hẹn.
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-[#57534e] mb-1">
                      Tên khách hàng
                    </label>
                    <input
                      type="text"
                      value={checkInModal.customerName}
                      onChange={(e) =>
                        setCheckInModal((prev) =>
                          prev ? { ...prev, customerName: e.target.value } : null
                        )
                      }
                      placeholder="Mặc định: Khách tại bàn"
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white border border-[#d6d0c4] text-[#1c1917]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#57534e] mb-1">
                      Số điện thoại liên hệ
                    </label>
                    <input
                      type="tel"
                      value={checkInModal.phone}
                      onChange={(e) =>
                        setCheckInModal((prev) =>
                          prev ? { ...prev, phone: e.target.value } : null
                        )
                      }
                      placeholder="Tùy chọn (ví dụ: 0901234567)"
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white border border-[#d6d0c4] text-[#1c1917]"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-[#f0fdf4] border border-[#bbf7d0] p-4 text-xs text-[#14532d] space-y-1">
                  <p className="font-bold">
                    Đồng bộ đơn đặt bàn sang trạng thái CHECKED_IN
                  </p>
                  <p>
                    Hệ thống sẽ ghi nhận giờ nhận bàn, tạo mã QR cho bàn{' '}
                    <strong>{checkInModal.table.tableNumber}</strong> và mở khóa gọi món QR.
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-[#ebe7df] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCheckInModal(null)}
                  disabled={mutatingIds.includes(checkInModal.table._id)}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-white hover:bg-[#f5f2eb] text-[#57534e] border border-[#d6d0c4] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={mutatingIds.includes(checkInModal.table._id)}
                  className="min-h-[42px] px-5 py-2 rounded-xl bg-[#14532d] hover:bg-[#15803d] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  {mutatingIds.includes(checkInModal.table._id)
                    ? 'Đang mở bàn...'
                    : 'Xác nhận Check-in & Mở bàn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal xác nhận Nhả bàn (tránh bấm nhầm hủy lịch đặt của khách) */}
      {releaseConfirmTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="release-table-modal-title"
        >
          <div className="bg-white rounded-3xl border border-[#ebe7df] shadow-2xl max-w-md w-full p-6 space-y-4">
            <h2 id="release-table-modal-title" className="font-serif text-xl font-bold text-[#1c1917]">
              Xác nhận nhả Bàn {releaseConfirmTarget.tableNumber}?
            </h2>
            <p className="text-xs sm:text-sm text-[#57534e] leading-relaxed">
              {releaseConfirmTarget.activeReservation ? (
                <>
                  Thao tác này sẽ đưa bàn về trạng thái <strong>AVAILABLE (Sẵn sàng)</strong> và{' '}
                  <strong className="text-rose-700">hủy đơn đặt bàn</strong>{' '}
                  <span className="font-mono font-bold text-[#14532d]">
                    {releaseConfirmTarget.activeReservation.bookingCode}
                  </span>{' '}
                  ({releaseConfirmTarget.activeReservation.customerName}).
                </>
              ) : (
                <>
                  Thao tác này sẽ kết thúc phiên giữ bàn tạm thời và đưa Bàn{' '}
                  <strong>{releaseConfirmTarget.tableNumber}</strong> về trạng thái{' '}
                  <strong>AVAILABLE (Sẵn sàng)</strong>.
                </>
              )}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReleaseConfirmTarget(null)}
                className="w-1/2 py-2.5 rounded-xl border border-[#d6d0c4] bg-white hover:bg-[#f5f2eb] text-xs font-semibold text-[#1c1917] cursor-pointer"
              >
                Không, giữ nguyên
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = releaseConfirmTarget;
                  setReleaseConfirmTarget(null);
                  void executeTransition({
                    table: target,
                    nextStatus: TABLE_STATUS.AVAILABLE,
                    reservationId: target.activeReservation?._id,
                  });
                }}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Xác nhận nhả bàn
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
