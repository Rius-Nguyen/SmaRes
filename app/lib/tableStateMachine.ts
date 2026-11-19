export const TABLE_STATUS = {
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  SEATED: 'SEATED',
  CLEANING: 'CLEANING',
} as const;

export type TableStatusValue = (typeof TABLE_STATUS)[keyof typeof TABLE_STATUS];
export type TableStatus = TableStatusValue;

export type SyncedReservationStatus = 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED';

export const ALLOWED_TABLE_TRANSITIONS: Record<TableStatusValue, readonly TableStatusValue[]> = {
  AVAILABLE: ['RESERVED', 'SEATED'],
  RESERVED: ['AVAILABLE', 'SEATED'],
  SEATED: ['CLEANING'],
  CLEANING: ['AVAILABLE'],
};

const VALID_TABLE_STATUSES: ReadonlySet<string> = new Set<TableStatusValue>([
  TABLE_STATUS.AVAILABLE,
  TABLE_STATUS.RESERVED,
  TABLE_STATUS.SEATED,
  TABLE_STATUS.CLEANING,
]);

export function isTableStatus(value: unknown): value is TableStatusValue {
  return typeof value === 'string' && VALID_TABLE_STATUSES.has(value);
}

export function normalizeTableStatus(value: unknown): TableStatusValue | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  return isTableStatus(normalized) ? normalized : null;
}

export function canTransitionTableStatus(
  from: TableStatusValue | string,
  to: TableStatusValue | string
): boolean {
  if (!isTableStatus(from) || !isTableStatus(to)) {
    return false;
  }
  return ALLOWED_TABLE_TRANSITIONS[from].includes(to);
}

export function getAllowedNextTableStatuses(
  from: TableStatusValue | string
): readonly TableStatusValue[] {
  if (!isTableStatus(from)) {
    return [];
  }
  return ALLOWED_TABLE_TRANSITIONS[from];
}

export function getReservationStatusForTransition(
  nextTableStatus: TableStatusValue,
  fromTableStatus?: TableStatusValue
): SyncedReservationStatus | null {
  switch (nextTableStatus) {
    case TABLE_STATUS.SEATED:
      return 'CHECKED_IN';
    case TABLE_STATUS.CLEANING:
      return 'COMPLETED';
    case TABLE_STATUS.AVAILABLE:
      return fromTableStatus === TABLE_STATUS.RESERVED ? 'CANCELLED' : null;
    case TABLE_STATUS.RESERVED:
      return null;
  }
}
