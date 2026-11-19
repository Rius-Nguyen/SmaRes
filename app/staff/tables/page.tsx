"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ALLOWED_TABLE_TRANSITIONS,
  TABLE_STATUS,
  type TableStatusValue,
  canTransitionTableStatus,
} from '@/app/lib/tableStateMachine';
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
  guests: number;
  note: string;
  status: string;
  checkInTime?: string | null;
}

interface StaffTableItem {
  _id: string;
  tableNumber: string;
  capacity: number;
  zoneName: string;
  status: TableStatusValue;
  qrToken: string | null;
  activeReservation: ReservationSummary | null;
  reservations: ReservationSummary[];
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
  const [reloadNonce, setReloadNonce] = useState<number>(0);

  const { showToast } = useToast();

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
    customerName?: string;
    phone?: string;
  }): Promise<boolean> => {
    const { table, nextStatus, reservationId, customerName, phone } = params;

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
            Đang tải sơ đồ bàn từ MongoDB...
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
            const walkInName = walkInNamesByTable[table._id];
            const tableMenuHref = buildTableMenuPath(table);

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
                      </div>
                    ) : table.status === TABLE_STATUS.SEATED ? (
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
                <div className="pt-3 border-t border-[#ebe7df] space-y-2">
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

                    {allowedTransitions.includes(TABLE_STATUS.RESERVED) && (
                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={() =>
                          void executeTransition({
                            table,
                            nextStatus: TABLE_STATUS.RESERVED,
                          })
                        }
                        className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#fffbeb] hover:bg-[#fef3c7] text-[#92400e] border border-[#fde68a] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
                      >
                        Giữ bàn
                      </button>
                    )}

                    {table.status === TABLE_STATUS.RESERVED &&
                      allowedTransitions.includes(TABLE_STATUS.AVAILABLE) && (
                        <button
                          type="button"
                          disabled={isMutating}
                          onClick={() =>
                            void executeTransition({
                              table,
                              nextStatus: TABLE_STATUS.AVAILABLE,
                              reservationId: activeRes?._id,
                            })
                          }
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
                        className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#d97706] hover:bg-[#b45309] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
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
    </main>
  );
}
