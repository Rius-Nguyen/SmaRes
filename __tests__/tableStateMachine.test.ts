import { describe, it, expect } from 'vitest';
import {
  TABLE_STATUS,
  ALLOWED_TABLE_TRANSITIONS,
  isTableStatus,
  normalizeTableStatus,
  canTransitionTableStatus,
  getAllowedNextTableStatuses,
  getReservationStatusForTransition,
} from '@/app/lib/tableStateMachine';

describe('tableStateMachine', () => {
  it('validates and normalizes table statuses safely', () => {
    expect(isTableStatus(TABLE_STATUS.AVAILABLE)).toBe(true);
    expect(isTableStatus(TABLE_STATUS.RESERVED)).toBe(true);
    expect(isTableStatus(TABLE_STATUS.SEATED)).toBe(true);
    expect(isTableStatus(TABLE_STATUS.CLEANING)).toBe(true);
    expect(isTableStatus('available')).toBe(false);
    expect(isTableStatus('OCCUPIED')).toBe(false);
    expect(isTableStatus(123)).toBe(false);

    expect(normalizeTableStatus('  seated  ')).toBe('SEATED');
    expect(normalizeTableStatus('cleaning')).toBe('CLEANING');
    expect(normalizeTableStatus('invalid')).toBeNull();
    expect(normalizeTableStatus(null)).toBeNull();
  });

  it('enforces valid table state transitions', () => {
    expect(canTransitionTableStatus('AVAILABLE', 'RESERVED')).toBe(true);
    expect(canTransitionTableStatus('AVAILABLE', 'SEATED')).toBe(true);
    expect(canTransitionTableStatus('RESERVED', 'AVAILABLE')).toBe(true);
    expect(canTransitionTableStatus('RESERVED', 'SEATED')).toBe(true);
    expect(canTransitionTableStatus('SEATED', 'CLEANING')).toBe(true);
    expect(canTransitionTableStatus('CLEANING', 'AVAILABLE')).toBe(true);
  });

  it('rejects invalid, self, and unknown table state transitions', () => {
    expect(canTransitionTableStatus('AVAILABLE', 'CLEANING')).toBe(false);
    expect(canTransitionTableStatus('AVAILABLE', 'AVAILABLE')).toBe(false);
    expect(canTransitionTableStatus('RESERVED', 'CLEANING')).toBe(false);
    expect(canTransitionTableStatus('RESERVED', 'RESERVED')).toBe(false);
    expect(canTransitionTableStatus('SEATED', 'AVAILABLE')).toBe(false);
    expect(canTransitionTableStatus('SEATED', 'RESERVED')).toBe(false);
    expect(canTransitionTableStatus('SEATED', 'SEATED')).toBe(false);
    expect(canTransitionTableStatus('CLEANING', 'RESERVED')).toBe(false);
    expect(canTransitionTableStatus('CLEANING', 'SEATED')).toBe(false);
    expect(canTransitionTableStatus('CLEANING', 'CLEANING')).toBe(false);
    expect(canTransitionTableStatus('UNKNOWN', 'AVAILABLE')).toBe(false);
    expect(canTransitionTableStatus('AVAILABLE', 'UNKNOWN')).toBe(false);
  });

  it('returns allowed next statuses for valid states and empty array for invalid states', () => {
    expect(getAllowedNextTableStatuses('AVAILABLE')).toEqual(ALLOWED_TABLE_TRANSITIONS.AVAILABLE);
    expect(getAllowedNextTableStatuses('RESERVED')).toEqual(['AVAILABLE', 'SEATED']);
    expect(getAllowedNextTableStatuses('SEATED')).toEqual(['CLEANING']);
    expect(getAllowedNextTableStatuses('CLEANING')).toEqual(['AVAILABLE']);
    expect(getAllowedNextTableStatuses('UNKNOWN')).toEqual([]);
    expect(getAllowedNextTableStatuses('')).toEqual([]);
  });

  it('maps table transitions to corresponding reservation statuses', () => {
    expect(getReservationStatusForTransition('SEATED', 'RESERVED')).toBe('CHECKED_IN');
    expect(getReservationStatusForTransition('SEATED', 'AVAILABLE')).toBe('CHECKED_IN');
    expect(getReservationStatusForTransition('CLEANING', 'SEATED')).toBe('COMPLETED');
    expect(getReservationStatusForTransition('AVAILABLE', 'RESERVED')).toBe('CANCELLED');
    expect(getReservationStatusForTransition('AVAILABLE', 'CLEANING')).toBeNull();
    expect(getReservationStatusForTransition('AVAILABLE')).toBeNull();
    expect(getReservationStatusForTransition('RESERVED', 'AVAILABLE')).toBeNull();
  });
});
