import { formatCountdownHhMmSs } from '@/app/lib/format';

export { formatCountdownHhMmSs };

export interface ClientTableLockState {
  lockKey: string;
  tableId: string;
  tableNumber: string;
  date: string;
  time: string;
  sessionId: string;
  expiresAt: string;
  reservationId?: string | null;
}

export interface AcquireClientLockParams {
  tableId?: string;
  tableNumber: string;
  date: string;
  time: string;
  sessionId?: string;
  reservationId?: string;
}

export interface AcquireClientLockResult {
  ok: boolean;
  status: number;
  message?: string;
  error?: string;
  lockedUntil?: string | null;
  lock?: ClientTableLockState;
}

export const LOCK_SESSION_STORAGE_KEY = 'smares_lock_session_id';
export const ACTIVE_LOCK_STORAGE_KEY = 'smares_active_table_lock';
export const SELECTED_TABLE_ID_KEY = 'smares_selected_table_id';
export const LOCK_CHANGE_EVENT = 'smares-table-lock-change';

function generateClientSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `sess_${crypto.randomUUID().replace(/-/g, '')}`;
  }
  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateLockSessionId(): string {
  if (typeof window === 'undefined') {
    return generateClientSessionId();
  }
  try {
    const existing = window.sessionStorage.getItem(LOCK_SESSION_STORAGE_KEY);
    if (existing && existing.trim()) {
      return existing.trim();
    }
    const created = generateClientSessionId();
    window.sessionStorage.setItem(LOCK_SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    return generateClientSessionId();
  }
}

export function computeRemainingLockSeconds(expiresAtIso: string, nowMs: number = Date.now()): number {
  const targetMs = Date.parse(expiresAtIso);
  if (!Number.isFinite(targetMs)) {
    return 0;
  }
  return Math.max(0, Math.ceil((targetMs - nowMs) / 1000));
}

export function formatCountdownMmSs(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function readActiveTableLock(nowMs: number = Date.now()): ClientTableLockState | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(ACTIVE_LOCK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return null;
    const rec = parsed as Partial<ClientTableLockState>;
    if (
      typeof rec.lockKey !== 'string' ||
      typeof rec.tableId !== 'string' ||
      typeof rec.tableNumber !== 'string' ||
      typeof rec.date !== 'string' ||
      typeof rec.time !== 'string' ||
      typeof rec.sessionId !== 'string' ||
      typeof rec.expiresAt !== 'string'
    ) {
      return null;
    }

    if (computeRemainingLockSeconds(rec.expiresAt, nowMs) <= 0) {
      window.sessionStorage.removeItem(ACTIVE_LOCK_STORAGE_KEY);
      return null;
    }

    return {
      lockKey: rec.lockKey,
      tableId: rec.tableId,
      tableNumber: rec.tableNumber,
      date: rec.date,
      time: rec.time,
      sessionId: rec.sessionId,
      expiresAt: rec.expiresAt,
      reservationId: typeof rec.reservationId === 'string' ? rec.reservationId : null,
    };
  } catch {
    return null;
  }
}

export function writeActiveTableLock(lock: ClientTableLockState | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (lock) {
      window.sessionStorage.setItem(ACTIVE_LOCK_STORAGE_KEY, JSON.stringify(lock));
      window.sessionStorage.setItem(SELECTED_TABLE_ID_KEY, lock.tableId);
      if (lock.sessionId) {
        window.sessionStorage.setItem(LOCK_SESSION_STORAGE_KEY, lock.sessionId);
      }
    } else {
      window.sessionStorage.removeItem(ACTIVE_LOCK_STORAGE_KEY);
    }
    window.dispatchEvent(new Event(LOCK_CHANGE_EVENT));
  } catch {
    // Bỏ qua lỗi quota của sessionStorage
  }
}

interface TableLockApiJson {
  success?: boolean;
  message?: string;
  error?: string;
  data?: {
    lockKey?: string;
    tableId?: string;
    tableNumber?: string;
    date?: string;
    time?: string;
    sessionId?: string;
    reservationId?: string | null;
    expiresAt?: string;
    lockedUntil?: string | null;
  };
}

export async function acquireClientTableLock(
  params: AcquireClientLockParams
): Promise<AcquireClientLockResult> {
  const sessionId = params.sessionId?.trim() || getOrCreateLockSessionId();

  const res = await fetch('/api/table-locks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tableId: params.tableId || undefined,
      tableNumber: params.tableNumber,
      date: params.date,
      time: params.time,
      sessionId,
      reservationId: params.reservationId || undefined,
    }),
  });

  const json = (await res.json()) as TableLockApiJson;

  if (!res.ok || !json.success || !json.data?.expiresAt || !json.data.lockKey) {
    return {
      ok: false,
      status: res.status,
      message:
        json.message ||
        'Bàn này vừa được khách hàng khác giữ chỗ. Vui lòng chọn bàn khác.',
      error: json.error,
      lockedUntil: json.data?.lockedUntil ?? null,
    };
  }

  const nextLock: ClientTableLockState = {
    lockKey: json.data.lockKey,
    tableId: json.data.tableId || params.tableId || '',
    tableNumber: json.data.tableNumber || params.tableNumber,
    date: json.data.date || params.date,
    time: json.data.time || params.time,
    sessionId: json.data.sessionId || sessionId,
    expiresAt: json.data.expiresAt,
    reservationId: json.data.reservationId ?? params.reservationId ?? null,
  };

  writeActiveTableLock(nextLock);

  return {
    ok: true,
    status: res.status,
    lock: nextLock,
  };
}

export async function releaseClientTableLock(
  lock: ClientTableLockState,
  reason: 'USER_CANCELLED' | 'EXPIRED' = 'USER_CANCELLED'
): Promise<void> {
  writeActiveTableLock(null);
  try {
    await fetch('/api/table-locks/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lockKey: lock.lockKey,
        tableId: lock.tableId,
        date: lock.date,
        time: lock.time,
        reservationId: lock.reservationId || undefined,
        sessionId: lock.sessionId,
        reason,
      }),
    });
  } catch {
    // Bỏ qua lỗi mạng khi giải phóng khóa phía client
  }
}
