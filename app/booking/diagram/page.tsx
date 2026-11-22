"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import BookingStepper from '@/components/BookingStepper';
import LockCountdownBanner from '@/components/booking/LockCountdownBanner';
import {
  acquireClientTableLock,
  computeRemainingLockSeconds,
  formatCountdownHhMmSs,
  getOrCreateLockSessionId,
  readActiveTableLock,
  releaseClientTableLock,
  writeActiveTableLock,
  type ClientTableLockState,
} from '@/app/lib/bookingLockClient';
import { useCart } from '@/app/context/CartContext';
import { useToast } from '@/components/ui/Toast';

type ZoneCategory = 'VIP' | 'Trung tâm' | 'Cửa sổ';

interface AvailabilityTable {
  id: string;
  tableNumber: string;
  capacity: number;
  zoneName: string;
  status: string;
  isBooked?: boolean;
  isLocked?: boolean;
  isLockedByCurrentSession?: boolean;
  lockedUntil?: string | null;
  unavailableReason?: 'SEATED' | 'CLEANING' | 'RESERVED_HOLD' | 'BOOKED' | 'LOCKED' | null;
  isAvailable: boolean;
}

interface AvailabilityApiResponse {
  success: boolean;
  message?: string;
  tables?: AvailabilityTable[];
}

interface ZoneMeta {
  category: ZoneCategory;
  image: string;
  viewDescription: string;
  features: string[];
}

function getVietnamDateString(offsetDays = 0): string {
  const vnTimeMs = Date.now() + 7 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000;
  return new Date(vnTimeMs).toISOString().slice(0, 10);
}

function normalizeGuests(value: string | number | undefined, fallback = 2): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 1) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const match = value.match(/\d+/);
    if (match) {
      const parsed = Number.parseInt(match[0], 10);
      if (Number.isFinite(parsed) && parsed >= 1) {
        return parsed;
      }
    }
  }
  return fallback;
}

function resolveZoneMeta(table: AvailabilityTable): ZoneMeta {
  const zoneLower = (table.zoneName ?? '').toLowerCase();
  const numUpper = (table.tableNumber ?? '').toUpperCase();

  if (zoneLower.includes('vip') || numUpper.startsWith('V')) {
    return {
      category: 'VIP',
      image: '/foods/table_vip.jpg',
      viewDescription:
        'Phòng VIP riêng tư cách âm, nội thất gỗ trầm và ánh sáng ấm sang trọng, phù hợp tiếp đãi đối tác hoặc gia đình.',
      features: [
        'Không gian riêng tư',
        `Sức chứa ${table.capacity} chỗ`,
        'Ánh sáng ấm áp',
        'Phục vụ ưu tiên',
      ],
    };
  }

  if (
    zoneLower.includes('cửa sổ') ||
    zoneLower.includes('cua so') ||
    zoneLower.includes('ban công') ||
    zoneLower.includes('ban cong') ||
    zoneLower.includes('window') ||
    numUpper.startsWith('W')
  ) {
    return {
      category: 'Cửa sổ',
      image: '/foods/table_window.jpg',
      viewDescription:
        'Vị trí cạnh vách kính hoặc ban công thoáng đãng, ôm trọn khung cảnh phố đêm lung linh và góc check-in lãng mạn.',
      features: [
        'View cửa kính / ban công',
        `Sức chứa ${table.capacity} chỗ`,
        'Không gian lãng mạn',
        'Thoáng đãng tự nhiên',
      ],
    };
  }

  return {
    category: 'Trung tâm',
    image: '/foods/table_center.jpg',
    viewDescription:
      'Khu vực sảnh chính ấm cúng mang hơi thở Á Đông đương đại, gần quầy pha chế và thuận tiện di chuyển.',
    features: [
      'Không gian thoáng đãng',
      `Sức chứa ${table.capacity} chỗ`,
      'Bàn gỗ bọc nệm êm ái',
      'Âm nhạc thư giãn',
    ],
  };
}

export default function BookingDiagramPage() {
  const router = useRouter();
  const { bookingInfo, setBookingInfo, isLoaded } = useCart();
  const { showToast } = useToast();

  const queryDate = bookingInfo?.date || getVietnamDateString(1);
  const queryTime = bookingInfo?.time || '19:00';
  const queryGuests = normalizeGuests(bookingInfo?.guests, 2);
  const hasContactInfo = Boolean(bookingInfo?.name?.trim() && bookingInfo?.phone?.trim());

  const [lockSessionId] = useState<string>(() => getOrCreateLockSessionId());
  const [activeLock, setActiveLock] = useState<ClientTableLockState | null>(() =>
    readActiveTableLock()
  );
  const [tables, setTables] = useState<AvailabilityTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [loadedQueryKey, setLoadedQueryKey] = useState<string>('');
  const [fetchError, setFetchError] = useState<string>('');
  const [actionWarning, setActionWarning] = useState<string>('');
  const [lockingTableId, setLockingTableId] = useState<string>('');
  const [isContinuing, setIsContinuing] = useState<boolean>(false);
  const [isReleasingLock, setIsReleasingLock] = useState<boolean>(false);
  const [previewImageModal, setPreviewImageModal] = useState<boolean>(false);
  const [reloadNonce, setReloadNonce] = useState<number>(0);
  const [nowTickMs, setNowTickMs] = useState<number>(() => Date.now());

  const currentQueryKey = `${queryDate}|${queryTime}|${queryGuests}|${reloadNonce}`;
  const isFetching = !isLoaded || loadedQueryKey !== currentQueryKey;

  const hasOtherLockedTables = tables.some((t) => Boolean(t.isLocked && t.lockedUntil));

  // Cập nhật đếm ngược trực tiếp trên các bàn đang bị khách khác giữ chỗ
  useEffect(() => {
    if (!hasOtherLockedTables) return;
    const timer = window.setInterval(() => {
      setNowTickMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [hasOtherLockedTables]);

  const pickDefaultTableId = useCallback(
    (list: AvailabilityTable[]): string => {
      const ownLocked = list.find(
        (t) => t.isLockedByCurrentSession && t.isAvailable && t.capacity >= queryGuests
      );
      if (ownLocked) return ownLocked.id;

      const savedTableNumber = bookingInfo?.tableNumber?.toUpperCase();
      if (savedTableNumber) {
        const matched = list.find(
          (t) =>
            t.tableNumber.toUpperCase() === savedTableNumber &&
            t.isAvailable &&
            t.capacity >= queryGuests
        );
        if (matched) return matched.id;
      }

      const firstEligible = list.find((t) => t.isAvailable && t.capacity >= queryGuests);
      return firstEligible?.id ?? '';
    },
    [bookingInfo?.tableNumber, queryGuests]
  );

  useEffect(() => {
    if (!isLoaded) return;
    let isCancelled = false;

    const url = `/api/tables/availability?date=${encodeURIComponent(queryDate)}&time=${encodeURIComponent(queryTime)}&guests=${encodeURIComponent(String(queryGuests))}&sessionId=${encodeURIComponent(lockSessionId)}`;

    fetch(url, { cache: 'no-store' })
      .then(async (res) => {
        const data = (await res.json()) as AvailabilityApiResponse;
        if (isCancelled) return;

        if (!res.ok || !data.success || !Array.isArray(data.tables)) {
          setFetchError(data.message || 'Không thể tải danh sách bàn trống từ hệ thống.');
          setTables([]);
          setSelectedTableId('');
          setLoadedQueryKey(currentQueryKey);
          return;
        }

        const fetchedTables: AvailabilityTable[] = data.tables.map((table) => ({
          ...table,
          tableNumber: table.tableNumber ?? '',
          zoneName: table.zoneName || 'Khu vực chính',
          capacity:
            typeof table.capacity === 'number' && Number.isFinite(table.capacity)
              ? table.capacity
              : 4,
        }));
        setTables(fetchedTables);
        setFetchError('');
        setSelectedTableId(pickDefaultTableId(fetchedTables));

        // Đồng bộ trạng thái lock từ server (nếu phiên này đang giữ 1 bàn trên slot hiện tại)
        const ownLockedTable = fetchedTables.find(
          (t) => t.isLockedByCurrentSession && t.lockedUntil
        );
        if (ownLockedTable && ownLockedTable.lockedUntil) {
          const syncedLock: ClientTableLockState = {
            lockKey: `${ownLockedTable.id}:${queryDate}:${queryTime}`,
            tableId: ownLockedTable.id,
            tableNumber: ownLockedTable.tableNumber,
            date: queryDate,
            time: queryTime,
            sessionId: lockSessionId,
            expiresAt: ownLockedTable.lockedUntil,
          };
          writeActiveTableLock(syncedLock);
          setActiveLock(syncedLock);
        } else {
          const existingLocal = readActiveTableLock();
          if (
            existingLocal &&
            existingLocal.date === queryDate &&
            existingLocal.time === queryTime
          ) {
            writeActiveTableLock(null);
            setActiveLock(null);
          }
        }

        setLoadedQueryKey(currentQueryKey);
      })
      .catch(() => {
        if (isCancelled) return;
        setFetchError('Kết nối máy chủ bị gián đoạn. Vui lòng thử lại.');
        setTables([]);
        setSelectedTableId('');
        setLoadedQueryKey(currentQueryKey);
      });

    return () => {
      isCancelled = true;
    };
  }, [isLoaded, queryDate, queryTime, queryGuests, lockSessionId, currentQueryKey, pickDefaultTableId]);

  const handleRetry = () => {
    setFetchError('');
    setActionWarning('');
    setReloadNonce((n) => n + 1);
  };

  const acquireLockForTable = useCallback(
    async (table: AvailabilityTable): Promise<ClientTableLockState | null> => {
      // Nếu chính session này đang giữ khóa bàn khác (hoặc slot khác), giải phóng bàn cũ trước
      const existingLock = readActiveTableLock();
      if (
        existingLock &&
        (existingLock.tableId !== table.id ||
          existingLock.date !== queryDate ||
          existingLock.time !== queryTime)
      ) {
        await releaseClientTableLock(existingLock, 'USER_CANCELLED');
        setActiveLock(null);
      }

      const result = await acquireClientTableLock({
        tableId: table.id,
        tableNumber: table.tableNumber,
        date: queryDate,
        time: queryTime,
        sessionId: lockSessionId,
      });

      if (!result.ok || !result.lock) {
        const msg =
          result.message ||
          `Bàn ${table.tableNumber} vừa được khách hàng khác giữ chỗ. Vui lòng chọn bàn khác.`;
        setActionWarning(msg);
        setReloadNonce((n) => n + 1);
        return null;
      }

      setActiveLock(result.lock);
      setActionWarning('');
      setTables((prev) =>
        prev.map((item) => {
          if (item.id === table.id) {
            return {
              ...item,
              isLocked: false,
              isLockedByCurrentSession: true,
              lockedUntil: result.lock?.expiresAt ?? null,
              isAvailable: true,
            };
          }
          if (item.isLockedByCurrentSession) {
            return {
              ...item,
              isLockedByCurrentSession: false,
              lockedUntil: null,
            };
          }
          return item;
        })
      );

      return result.lock;
    },
    [queryDate, queryTime, lockSessionId]
  );

  const handleSelectTable = async (table: AvailabilityTable) => {
    if (!table.isAvailable || table.capacity < queryGuests || lockingTableId) {
      return;
    }

    // Nếu bàn đã được chính phiên hiện tại giữ khóa trên đúng slot này thì chỉ chọn lại UI
    if (
      activeLock &&
      activeLock.tableId === table.id &&
      activeLock.date === queryDate &&
      activeLock.time === queryTime &&
      computeRemainingLockSeconds(activeLock.expiresAt) > 0
    ) {
      setSelectedTableId(table.id);
      setActionWarning('');
      return;
    }

    setLockingTableId(table.id);
    setActionWarning('');
    try {
      const acquired = await acquireLockForTable(table);
      if (acquired) {
        setSelectedTableId(table.id);
        showToast(`Đã giữ khóa Bàn ${table.tableNumber} trong 10 phút.`, 'success');
      }
    } catch {
      const errText = 'Mất kết nối máy chủ khi giữ khóa bàn. Vui lòng thử lại.';
      setActionWarning(errText);
    } finally {
      setLockingTableId('');
    }
  };

  const handleReleaseActiveLock = useCallback(
    async (lock: ClientTableLockState, reason: 'USER_CANCELLED' | 'EXPIRED' = 'USER_CANCELLED') => {
      setIsReleasingLock(true);
      try {
        await releaseClientTableLock(lock, reason);
        setActiveLock(null);
        setSelectedTableId('');
        if (reason === 'EXPIRED') {
          showToast(
            `Thời gian giữ khóa Bàn ${lock.tableNumber} đã hết hạn. Vui lòng chọn lại bàn.`,
            'warning'
          );
        } else {
          showToast(`Đã hủy giữ khóa Bàn ${lock.tableNumber}.`, 'info');
        }
        setReloadNonce((n) => n + 1);
      } finally {
        setIsReleasingLock(false);
      }
    },
    [showToast]
  );

  const selectedTable =
    tables.find((t) => t.id === selectedTableId) ||
    tables.find((t) => t.isLockedByCurrentSession && t.isAvailable && t.capacity >= queryGuests) ||
    tables.find((t) => t.isAvailable && t.capacity >= queryGuests) ||
    tables[0] ||
    null;

  const isSelectedTableEligible = Boolean(
    selectedTable && selectedTable.isAvailable && selectedTable.capacity >= queryGuests
  );

  const selectedMeta = selectedTable ? resolveZoneMeta(selectedTable) : null;

  const vipTables = tables.filter((t) => resolveZoneMeta(t).category === 'VIP');
  const centerTables = tables.filter((t) => resolveZoneMeta(t).category === 'Trung tâm');
  const windowTables = tables.filter((t) => resolveZoneMeta(t).category === 'Cửa sổ');

  const eligibleTablesCount = tables.filter(
    (t) => t.isAvailable && t.capacity >= queryGuests
  ).length;
  const bookedCount = tables.filter((t) => Boolean(t.isBooked)).length;
  const otherLockedCount = tables.filter((t) => Boolean(t.isLocked && !t.isBooked)).length;
  const unavailableCount = tables.filter((t) => !t.isAvailable).length;
  const undersizedCount = tables.filter((t) => t.capacity < queryGuests).length;

  const savedTableLostAvailability = Boolean(
    !isFetching &&
      !fetchError &&
      bookingInfo?.tableNumber &&
      tables.some(
        (t) =>
          t.tableNumber.toUpperCase() === bookingInfo.tableNumber?.toUpperCase() &&
          (!t.isAvailable || t.capacity < queryGuests)
      )
  );

  const handleContinue = async () => {
    if (!hasContactInfo) {
      setActionWarning(
        'Vui lòng hoàn tất Họ tên và Số điện thoại ở Bước 1 trước khi chuyển sang chọn món.'
      );
      return;
    }
    if (!selectedTable || !isSelectedTableEligible) {
      setActionWarning('Vui lòng chọn một bàn còn trống và đủ sức chứa cho đoàn của bạn.');
      return;
    }

    setIsContinuing(true);
    try {
      // Đảm bảo bàn đang chọn đã được khóa thành công bằng lockSessionId trước khi qua Bước 3
      const currentLock = readActiveTableLock();
      const alreadyLockedSameTable = Boolean(
        currentLock &&
          currentLock.tableId === selectedTable.id &&
          currentLock.date === queryDate &&
          currentLock.time === queryTime &&
          computeRemainingLockSeconds(currentLock.expiresAt) > 0
      );

      if (!alreadyLockedSameTable) {
        const acquired = await acquireLockForTable(selectedTable);
        if (!acquired) {
          return;
        }
      }

      setBookingInfo((prev) => ({
        name: prev?.name || '',
        phone: prev?.phone || '',
        email: prev?.email || '',
        date: queryDate,
        time: queryTime,
        guests: queryGuests,
        note: prev?.note || '',
        tableId: selectedTable.id,
        tableNumber: selectedTable.tableNumber,
        tableType: selectedTable.zoneName,
        tableCapacity: selectedTable.capacity,
      }));

      router.push('/booking/menu');
    } finally {
      setIsContinuing(false);
    }
  };

  const renderTableButton = (table: AvailabilityTable, shapeClass: string) => {
    const isBooked = Boolean(table.isBooked ?? (!table.isAvailable && !table.isLocked));
    const isLockedByOther = Boolean(table.isLocked && !isBooked);
    const isLockedByMe = Boolean(
      table.isLockedByCurrentSession ||
        (activeLock &&
          activeLock.tableId === table.id &&
          activeLock.date === queryDate &&
          activeLock.time === queryTime)
    );
    const isUndersized = table.capacity < queryGuests;
    const isDisabled = isBooked || isLockedByOther || isUndersized || Boolean(lockingTableId);
    const isSelected = selectedTable?.id === table.id && !isBooked && !isLockedByOther && !isUndersized;
    const isCurrentlyLocking = lockingTableId === table.id;

    let colorClasses =
      'bg-[#dcfce7] text-[#15803d] border-[#86efac] hover:bg-[#bbf7d0] hover:scale-105 cursor-pointer shadow-xs';
    let subLabel = `${table.capacity} chỗ`;
    let titleText = `Bàn ${table.tableNumber} - ${table.zoneName} (${table.capacity} chỗ)`;

    if (isBooked) {
      colorClasses =
        'bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5] opacity-75 cursor-not-allowed';
      if (table.unavailableReason === 'SEATED') {
        subLabel = 'Đang có khách';
        titleText = `Bàn ${table.tableNumber} đang có khách dùng bữa trong khung giờ trùng lặp với ${queryTime}`;
      } else if (table.unavailableReason === 'CLEANING') {
        subLabel = 'Đang dọn bàn';
        titleText = `Bàn ${table.tableNumber} đang dọn dẹp, chưa sẵn sàng vào lúc ${queryTime}`;
      } else if (table.unavailableReason === 'RESERVED_HOLD') {
        subLabel = 'Đang giữ chỗ';
        titleText = `Bàn ${table.tableNumber} đang được giữ chỗ tại quầy trong khung giờ trùng lặp với ${queryTime}`;
      } else {
        subLabel = 'Đã đặt';
        titleText = `Bàn ${table.tableNumber} đã có khách đặt trong khung giờ trùng lặp với ${queryTime}`;
      }
    } else if (isLockedByOther) {
      const rem = table.lockedUntil
        ? computeRemainingLockSeconds(table.lockedUntil, nowTickMs)
        : 0;
      const countdownStr = rem > 0 ? formatCountdownHhMmSs(rem) : '00:00:00';
      colorClasses =
        'bg-[#fff7ed] text-[#c2410c] border-[#fdba74] opacity-90 cursor-not-allowed';
      subLabel = `Đang giữ chỗ • ${countdownStr}`;
      titleText = `Đang có khách giữ chỗ Bàn ${table.tableNumber} (còn ${countdownStr})`;
    } else if (isUndersized) {
      colorClasses =
        'bg-[#fef3c7] text-[#b45309] border-[#fde68a] opacity-85 cursor-not-allowed';
      subLabel = `Chỉ ${table.capacity} chỗ`;
      titleText = `Bàn ${table.tableNumber} (${table.capacity} chỗ) nhỏ hơn ${queryGuests} khách`;
    } else if (isCurrentlyLocking) {
      colorClasses =
        'bg-[#14532d]/80 text-white border-[#22c55e] animate-pulse cursor-wait';
      subLabel = 'Đang khóa...';
    } else if (isSelected) {
      colorClasses =
        'bg-[#14532d] text-white border-[#22c55e] ring-4 ring-[#bbf7d0] scale-105 shadow-lg cursor-pointer';
      subLabel = isLockedByMe ? 'Bạn đang giữ' : `${table.capacity} chỗ`;
    }

    return (
      <button
        key={table.id}
        type="button"
        onClick={() => void handleSelectTable(table)}
        disabled={isDisabled}
        title={titleText}
        className={`${shapeClass} flex flex-col items-center justify-center font-bold transition-all relative border px-2 ${colorClasses}`}
      >
        {isSelected && (
          <span className="absolute -top-1 -right-1 bg-[#fbbf24] text-[#1c1917] rounded-full w-6 h-6 flex items-center justify-center text-xs font-black shadow-sm">
            ✓
          </span>
        )}
        <span className="text-base sm:text-lg font-serif font-bold">{table.tableNumber}</span>
        <span className="text-[10px] sm:text-[11px] font-medium opacity-90 text-center leading-tight">
          {subLabel}
        </span>
      </button>
    );
  };

  return (
    <main className="flex-1 bg-[#faf8f5] text-[#1c1917] flex flex-col min-h-screen pb-20">
      {/* Header */}
      <div className="bg-[#0a1f14] py-14 text-center px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#fbbf24]/5 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#14532d]/70 border border-[#fbbf24]/40 text-[#fde68a] text-xs font-semibold uppercase tracking-widest mb-3 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" />
            Sơ đồ vị trí trực quan
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white mb-3 tracking-tight">
            2. Chọn Vị Trí Bàn Trên Sơ Đồ
          </h1>
          <p className="text-stone-300 text-sm md:text-base max-w-xl mx-auto font-light leading-relaxed">
            Kiểm tra bàn trống theo thời gian thực cho {queryGuests} khách vào lúc {queryTime}, ngày {queryDate}.
          </p>
        </div>
      </div>

      {/* Workflow Stepper: Bước 2 */}
      <BookingStepper currentStep={2} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 w-full">
        {activeLock && (
          <LockCountdownBanner
            lock={activeLock}
            isReleasing={isReleasingLock}
            onExpired={(expired) => void handleReleaseActiveLock(expired, 'EXPIRED')}
            onRelease={(lock) => void handleReleaseActiveLock(lock, 'USER_CANCELLED')}
            className="mb-6"
          />
        )}

        {!isFetching && !hasContactInfo && (
          <div className="mb-6 bg-[#fffbeb] border border-[#fde68a] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3 text-sm text-[#92400e]">
              <svg className="w-5 h-5 shrink-0 mt-0.5 text-[#d97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>
                Bạn đang xem sơ đồ mặc định ({queryDate}, {queryTime}, {queryGuests} khách). Vui lòng điền thông tin liên hệ ở Bước 1 trước khi đặt bàn.
              </span>
            </div>
            <Link
              href="/booking"
              className="text-xs sm:text-sm font-semibold bg-[#d97706] hover:bg-[#b45309] text-white px-4 py-2 rounded-xl whitespace-nowrap text-center transition-colors"
            >
              ← Điền Bước 1
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Cột Trái: Sơ đồ bàn ăn (7/12 cột) */}
          <div className="lg:col-span-7 bg-white rounded-2xl shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] border border-[#ebe7df] p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between border-b border-[#ebe7df] pb-6 mb-8 gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#14532d]">
                  Không gian nhà hàng SmaRes
                </h2>
                <p className="text-xs sm:text-sm text-stone-500 mt-1">
                  Nhấp vào bàn màu xanh để xem ảnh thực tế &amp; chọn vị trí
                </p>
              </div>
              <div className="flex flex-wrap gap-4 text-xs sm:text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 bg-[#dcfce7] border border-[#86efac] rounded-md shadow-xs" />
                  <span className="text-stone-700">Trống (Đủ chỗ)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 bg-[#fee2e2] border border-[#fca5a5] rounded-md shadow-xs" />
                  <span className="text-stone-700">Đã đặt</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 bg-[#fff7ed] border border-[#fdba74] rounded-md shadow-xs" />
                  <span className="text-stone-700">Đang có khách giữ chỗ</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 bg-[#fef3c7] border border-[#fde68a] rounded-md shadow-xs" />
                  <span className="text-stone-700">Không đủ chỗ</span>
                </div>
              </div>
            </div>

            {savedTableLostAvailability && (
              <div className="mb-6 p-4 rounded-xl bg-[#fffbeb] border border-[#fde68a] text-xs sm:text-sm text-[#92400e]">
                Bàn <strong>{bookingInfo?.tableNumber}</strong> đã có người đặt hoặc không đủ chỗ cho {queryGuests} khách ở khung giờ mới. Hệ thống đã gợi ý bàn phù hợp khác cho bạn.
              </div>
            )}

            {isFetching ? (
              <div className="space-y-6 animate-pulse">
                <div className="h-36 bg-[#f5f2eb] rounded-2xl border border-[#ebe7df]" />
                <div className="h-44 bg-[#f5f2eb] rounded-2xl border border-[#ebe7df]" />
                <div className="h-32 bg-[#f5f2eb] rounded-2xl border border-[#ebe7df]" />
              </div>
            ) : fetchError ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h3 className="font-serif font-bold text-lg text-red-900 mb-1">
                  Không tải được sơ đồ bàn
                </h3>
                <p className="text-sm text-red-700 mb-5">{fetchError}</p>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex items-center gap-2 bg-[#14532d] hover:bg-[#15803d] text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Thử lại
                </button>
              </div>
            ) : tables.length === 0 ? (
              <div className="bg-[#fffbeb] border border-[#fde68a] rounded-2xl p-8 text-center">
                <h3 className="font-serif font-bold text-lg text-[#92400e] mb-2">
                  Không tìm thấy bàn phù hợp cho {queryGuests} khách
                </h3>
                <p className="text-sm text-stone-600 mb-5">
                  Hiện không có bàn nào đủ sức chứa cho đoàn {queryGuests} người vào khung giờ {queryTime} ngày {queryDate}.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/booking"
                    className="bg-[#14532d] hover:bg-[#15803d] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
                  >
                    ← Đổi ngày / giờ / số khách
                  </Link>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="border border-[#d6d0c4] bg-white hover:bg-stone-50 text-stone-700 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
                  >
                    Tải lại sơ đồ
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {eligibleTablesCount === 0 && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span>
                      Tất cả bàn phù hợp đều đã được đặt kín vào lúc {queryTime} ngày {queryDate}. Vui lòng chọn giờ khác.
                    </span>
                    <Link
                      href="/booking"
                      className="font-semibold underline text-red-900 whitespace-nowrap"
                    >
                      Đổi khung giờ →
                    </Link>
                  </div>
                )}

                {(unavailableCount > 0 || undersizedCount > 0) && eligibleTablesCount > 0 && (
                  <div className="p-3.5 rounded-xl bg-[#faf8f5] border border-[#ebe7df] text-xs text-stone-600 flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      Có <strong className="text-[#14532d]">{eligibleTablesCount} bàn</strong> sẵn sàng cho {queryGuests} khách.
                    </span>
                    {bookedCount > 0 && (
                      <span>• {bookedCount} bàn đã có lịch đặt trong khung giờ này.</span>
                    )}
                    {otherLockedCount > 0 && (
                      <span>• {otherLockedCount} bàn đang có khách giữ chỗ thanh toán.</span>
                    )}
                    {undersizedCount > 0 && (
                      <span>• {undersizedCount} bàn không đủ sức chứa ({queryGuests} khách).</span>
                    )}
                  </div>
                )}

                {/* Khu vực VIP */}
                {vipTables.length > 0 && (
                  <div className="bg-[#fffbeb] p-5 rounded-2xl border border-[#fde68a]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs sm:text-sm font-bold text-[#92400e] uppercase tracking-wider flex items-center gap-2">
                        <svg className="w-4 h-4 text-[#d97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
                        </svg>
                        <span>Khu vực Phòng VIP (Không gian riêng tư cao cấp)</span>
                      </h3>
                      <span className="text-xs font-semibold text-[#92400e] bg-[#fef3c7] px-3 py-1 rounded-full border border-[#fcd34d]">
                        {vipTables.length} bàn
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-5">
                      {vipTables.map((table) => renderTableButton(table, 'w-24 h-24 rounded-full'))}
                    </div>
                  </div>
                )}

                {/* Khu Trung tâm / Khu vực chính */}
                {centerTables.length > 0 && (
                  <div className="bg-[#faf8f5] p-5 rounded-2xl border border-[#ebe7df]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs sm:text-sm font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2">
                        <svg className="w-4 h-4 text-[#14532d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                          <path d="M7 2v20" />
                          <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
                        </svg>
                        <span>Khu Trung tâm &amp; Khu vực chính</span>
                      </h3>
                      <span className="text-xs font-semibold text-stone-700 bg-stone-200 px-3 py-1 rounded-full">
                        {centerTables.length} bàn
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {centerTables.map((table) =>
                        renderTableButton(
                          table,
                          table.capacity >= 8 ? 'h-20 rounded-xl col-span-2' : 'h-20 rounded-xl'
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Cạnh cửa sổ / Ban công */}
                {windowTables.length > 0 && (
                  <div className="bg-[#f0f9ff] p-5 rounded-2xl border border-[#bae6fd]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs sm:text-sm font-bold text-[#0369a1] uppercase tracking-wider flex items-center gap-2">
                        <svg className="w-4 h-4 text-[#0284c7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect width="18" height="18" x="3" y="3" rx="2" />
                          <path d="M3 12h18" />
                          <path d="M12 3v18" />
                        </svg>
                        <span>Cạnh cửa sổ &amp; Ban công (View phố lung linh)</span>
                      </h3>
                      <span className="text-xs font-semibold text-[#0369a1] bg-[#e0f2fe] px-3 py-1 rounded-full border border-[#7dd3fc]">
                        {windowTables.length} bàn
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {windowTables.map((table) => renderTableButton(table, 'w-28 h-20 rounded-xl'))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cột Phải: Hình ảnh thực tế của bàn, view và form xác nhận (5/12 cột) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Card Hình ảnh thực tế và View của bàn ăn */}
            {isFetching ? (
              <div className="bg-white rounded-2xl border border-[#ebe7df] p-6 space-y-4 animate-pulse">
                <div className="h-56 bg-[#f5f2eb] rounded-xl" />
                <div className="h-20 bg-[#f5f2eb] rounded-xl" />
                <div className="h-24 bg-[#f5f2eb] rounded-xl" />
              </div>
            ) : selectedTable && selectedMeta ? (
              <div className="bg-white rounded-2xl shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] border border-[#ebe7df] overflow-hidden">
                <div
                  className="relative h-60 bg-stone-900 group cursor-pointer"
                  onClick={() => setPreviewImageModal(true)}
                >
                  <Image
                    src={selectedMeta.image}
                    alt={`Hình ảnh thực tế bàn ${selectedTable.tableNumber}`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 42vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  <div className="absolute top-3 left-3 bg-white/95 text-[#14532d] text-xs font-bold px-3 py-1 rounded-full shadow-md backdrop-blur-xs flex items-center gap-1.5 border border-[#ebe7df]">
                    <svg className="w-3.5 h-3.5 text-[#14532d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                      <circle cx="12" cy="13" r="3" />
                    </svg>
                    <span>Ảnh thực tế bàn ăn</span>
                  </div>

                  <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-medium px-3 py-1 rounded-full backdrop-blur-xs flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <span>Phóng to</span>
                  </div>

                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#fbbf24]">
                      {selectedTable.zoneName} • {selectedTable.capacity} chỗ ngồi
                    </span>
                    <h3 className="text-2xl font-serif font-bold leading-tight mt-1">
                      Bàn {selectedTable.tableNumber} — Không gian thực tế
                    </h3>
                  </div>
                </div>

                {/* Chi tiết View & Đặc điểm */}
                <div className="p-6 space-y-5">
                  <div>
                    <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-[#d97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                      </svg>
                      <span>Tầm nhìn &amp; Cảm quan (View)</span>
                    </h4>
                    <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-normal bg-[#faf8f5] p-4 rounded-xl border border-[#ebe7df]">
                      {selectedMeta.viewDescription}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-[#14532d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      <span>Tiện ích &amp; Điểm nổi bật</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedMeta.features.map((feat) => (
                        <span
                          key={feat}
                          className="text-xs bg-[#f0fdf4] text-[#15803d] font-semibold px-3 py-1.5 rounded-lg border border-[#bbf7d0] flex items-center gap-1"
                        >
                          <svg className="w-3 h-3 text-[#15803d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>{feat}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Box Xác nhận bàn và chuyển tiếp sang Bước 3 */}
            <div className="bg-white rounded-2xl shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] border border-[#ebe7df] p-6 sm:p-7">
              <div className="border-b border-[#ebe7df] pb-4 mb-4">
                <span className="text-xs font-bold text-[#14532d] uppercase tracking-wider">
                  Thông tin đặt bàn
                </span>
                <h2 className="text-2xl font-serif font-bold text-stone-900 mt-1">
                  {selectedTable && isSelectedTableEligible
                    ? `Bàn ${selectedTable.tableNumber} — ${selectedTable.capacity} người`
                    : 'Chưa chọn bàn khả dụng'}
                </h2>
              </div>

              <div className="space-y-3.5 text-xs sm:text-sm mb-6">
                <div className="flex justify-between items-center py-1.5 border-b border-stone-100">
                  <span className="text-stone-500">Khách hàng:</span>
                  <span className="font-semibold text-stone-900">
                    {bookingInfo?.name ? `${bookingInfo.name} (${bookingInfo.phone})` : 'Chưa nhập (Bước 1)'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-stone-100">
                  <span className="text-stone-500">Ngày dùng bữa:</span>
                  <span className="font-semibold text-stone-900">{queryDate}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-stone-100">
                  <span className="text-stone-500">Giờ đến &amp; số khách:</span>
                  <span className="font-bold text-[#14532d] bg-[#f0fdf4] px-2.5 py-1 rounded-md border border-[#bbf7d0]">
                    {queryTime} • {queryGuests} khách
                  </span>
                </div>
              </div>

              {actionWarning && (
                <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700">
                  {actionWarning}
                </div>
              )}

              {selectedTable && selectedTable.isAvailable && selectedTable.status === 'SEATED' && (
                <div className="mb-4 p-3 rounded-xl bg-[#fffbeb] border border-[#fde68a] text-xs text-[#92400e]">
                  Lưu ý: Bàn <strong>{selectedTable.tableNumber}</strong> hiện đang phục vụ lượt khách khác ở thời điểm hiện tại, nhưng hoàn toàn trống vào khung giờ bạn chọn (<strong>{queryTime}</strong> ngày <strong>{queryDate}</strong>).
                </div>
              )}

              <div className="bg-[#f0fdf4] p-4 rounded-xl mb-6 border border-[#bbf7d0] text-xs sm:text-sm text-[#14532d]">
                <p className="font-bold mb-1 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[#15803d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                    <path d="M7 2v20" />
                    <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
                  </svg>
                  <span>Bước tiếp theo: Chọn món ăn (Tùy chọn)</span>
                </p>
                <p className="text-stone-600 leading-relaxed text-xs">
                  Bạn có thể chọn đặt trước các món đặc quyền hoặc chọn bỏ qua để tới bước xác nhận.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleContinue()}
                disabled={isFetching || !isSelectedTableEligible || isContinuing || Boolean(lockingTableId)}
                className="w-full flex items-center justify-center gap-2 bg-[#14532d] hover:bg-[#15803d] disabled:bg-stone-300 disabled:text-stone-500 text-white font-semibold py-4 rounded-xl shadow-[0_8px_24px_-4px_rgba(20,83,45,0.45)] hover:shadow-[0_12px_28px_-4px_rgba(20,83,45,0.6)] disabled:shadow-none transition-all text-sm sm:text-base mb-3 cursor-pointer"
              >
                <span>
                  {isContinuing
                    ? 'Đang xác nhận khóa bàn...'
                    : 'Tiếp tục: Chọn món ăn vào Giỏ hàng'}
                </span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>

              <Link
                href="/booking"
                className="block w-full text-center text-stone-500 font-semibold py-2.5 hover:text-[#14532d] hover:bg-stone-100 rounded-lg text-xs sm:text-sm transition-colors"
              >
                ← Quay lại sửa thông tin bàn
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modal phóng to ảnh thực tế bàn ăn */}
      {previewImageModal && selectedTable && selectedMeta && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImageModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-96 bg-stone-950">
              <Image
                src={selectedMeta.image}
                alt={`Bàn ${selectedTable.tableNumber}`}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => setPreviewImageModal(false)}
                className="absolute top-4 right-4 bg-black/60 text-white w-9 h-9 rounded-full flex items-center justify-center text-sm hover:bg-black transition-colors cursor-pointer"
                aria-label="Đóng xem ảnh"
              >
                ✕
              </button>
              <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-xs p-4 rounded-2xl text-white">
                <span className="text-xs font-bold text-[#fbbf24] uppercase">
                  {selectedTable.zoneName} • Bàn {selectedTable.tableNumber} ({selectedTable.capacity} chỗ)
                </span>
                <p className="text-xs text-stone-200 mt-1">{selectedMeta.viewDescription}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
