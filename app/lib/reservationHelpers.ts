import crypto from 'node:crypto';

export const CANCELLATION_MIN_NOTICE_MINUTES = 60;
export const BOOKING_MIN_ADVANCE_MINUTES = 30; // BR-RES-13: Đặt bàn trước tối thiểu 30 phút
export const BOOKING_MIN_ADVANCE_MS = BOOKING_MIN_ADVANCE_MINUTES * 60 * 1000;
export const RESERVATION_HOLD_GRACE_MINUTES = 15; // BR-RES-09: giữ bàn tối đa 15 phút sau giờ hẹn
export const RESERVATION_HOLD_GRACE_MS = RESERVATION_HOLD_GRACE_MINUTES * 60 * 1000;
export const DINING_DURATION_MINUTES = 150; // BR-RES-11: Thời lượng dùng bữa tối đa 2 giờ 30 phút (150 phút)
export const DINING_DURATION_MS = DINING_DURATION_MINUTES * 60 * 1000;
export const CLEANING_BUFFER_MINUTES = 30; // Thời gian dọn bàn & du di sau bữa ăn (30 phút)
export const CLEANING_BUFFER_MS = CLEANING_BUFFER_MINUTES * 60 * 1000;
export const URGENT_CLEANING_MINUTES = 15; // Thời gian dọn bàn khẩn cấp khi có khách đặt sau (15 phút)
export const URGENT_CLEANING_MS = URGENT_CLEANING_MINUTES * 60 * 1000;
export const SLOT_BLOCK_DURATION_MINUTES = DINING_DURATION_MINUTES + CLEANING_BUFFER_MINUTES; // 180 phút (3 giờ) chống trùng lịch
export const SLOT_BLOCK_DURATION_MS = SLOT_BLOCK_DURATION_MINUTES * 60 * 1000;
export const BOOKING_TIME_STEP_MINUTES = 15;
export const WEEKDAY_OPEN_TIME = '10:00';
export const WEEKDAY_CLOSE_TIME = '22:30';
export const WEEKDAY_HARD_CLOSING_TIME = '00:00';
export const WEEKDAY_HARD_CLOSING_MINUTES = 24 * 60; // 00:00 (12h đêm)
export const WEEKEND_OPEN_TIME = '09:00';
export const WEEKEND_CLOSE_TIME = '23:00';
export const WEEKEND_HARD_CLOSING_TIME = '01:00';
export const WEEKEND_HARD_CLOSING_MINUTES = 25 * 60; // 01:00 sáng hôm sau
export const BOOKING_OPEN_TIME = WEEKEND_OPEN_TIME;
export const BOOKING_CLOSE_TIME = WEEKEND_CLOSE_TIME;

export type LateNightNoticeSeverity = 'NONE' | 'SHORT_DINING' | 'LAST_CALL';

export interface LateNightDiningNotice {
  severity: LateNightNoticeSeverity;
  remainingMinutes: number;
  closingTimeLabel: string;
  effectiveEndHm: string;
  isCappedByClosing: boolean;
}

export interface OperatingHoursWindow {
  isWeekend: boolean;
  openTime: string;
  closeTime: string;
  openMinutes: number;
  closeMinutes: number;
  hardClosingTime: string;
  hardClosingMinutes: number;
  label: string;
}

export const TableCleaningType = {
  EARLY_BONUS: 'EARLY_BONUS',
  URGENT_15M: 'URGENT_15M',
  RELAXED_30M: 'RELAXED_30M',
} as const;

export type TableCleaningType = (typeof TableCleaningType)[keyof typeof TableCleaningType];

export interface CleaningScheduleResult {
  cleaningStartedAt: Date;
  cleaningDeadlineAt: Date;
  cleaningType: TableCleaningType;
  durationMs: number;
}

export const VIETNAM_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
export const VIETNAM_TIME_REGEX = /^(\d{2}):(\d{2})$/;

export interface CancellationWindowResult {
  allowed: boolean;
  diffInMinutes: number;
  reason?: string;
}

export interface DiningInterval {
  startTime: Date;
  endTime: Date;
}

export interface TableTimingMeta {
  startTime: string | null;
  endTime: string | null;
  diningStartAt: string | null;
  diningEndAt: string | null;
  graceExpiresAt: string | null;
}

/**
 * Parses an HH:mm time string into minutes since midnight (0..1439).
 * Returns NaN if invalid.
 */
export function parseTimeToMinutes(time: string): number {
  if (typeof time !== 'string') {
    return Number.NaN;
  }
  const match = VIETNAM_TIME_REGEX.exec(time.trim());
  if (!match) {
    return Number.NaN;
  }
  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return Number.NaN;
  }
  return hour * 60 + minute;
}

/**
 * Returns the restaurant's operating hours for a given YYYY-MM-DD date (Vietnam calendar):
 * - Mon–Fri: 10:00 – 22:30
 * - Sat–Sun: 09:00 – 23:00
 */
export function getOperatingHoursForDate(date: string): OperatingHoursWindow {
  const match = VIETNAM_DATE_REGEX.exec(typeof date === 'string' ? date.trim() : '');
  let isWeekend = false;

  if (match) {
    const year = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    const day = Number.parseInt(match[3], 10);
    const utcDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    isWeekend = utcDay === 0 || utcDay === 6;
  }

  const openTime = isWeekend ? WEEKEND_OPEN_TIME : WEEKDAY_OPEN_TIME;
  const closeTime = isWeekend ? WEEKEND_CLOSE_TIME : WEEKDAY_CLOSE_TIME;
  const hardClosingTime = isWeekend
    ? WEEKEND_HARD_CLOSING_TIME
    : WEEKDAY_HARD_CLOSING_TIME;
  const hardClosingMinutes = isWeekend
    ? WEEKEND_HARD_CLOSING_MINUTES
    : WEEKDAY_HARD_CLOSING_MINUTES;

  return {
    isWeekend,
    openTime,
    closeTime,
    openMinutes: parseTimeToMinutes(openTime),
    closeMinutes: parseTimeToMinutes(closeTime),
    hardClosingTime,
    hardClosingMinutes,
    label: isWeekend
      ? `Thứ 7 – Chủ Nhật (${openTime} – ${closeTime})`
      : `Thứ 2 – Thứ 6 (${openTime} – ${closeTime})`,
  };
}

/**
 * Checks whether a (date, time) slot falls within the restaurant's operating hours for that day
 * and aligns with the 15-minute step.
 */
export function isWithinOperatingHoursForDate(date: string, time: string): boolean {
  const total = parseTimeToMinutes(time);
  if (Number.isNaN(total) || total % BOOKING_TIME_STEP_MINUTES !== 0) {
    return false;
  }
  const hours = getOperatingHoursForDate(date);
  return total >= hours.openMinutes && total <= hours.closeMinutes;
}

/**
 * Returns the restaurant hard-closing timestamp in +07:00 for a YYYY-MM-DD date:
 * - Mon–Fri: 00:00 (24:00)
 * - Sat–Sun: 01:00 (25:00)
 */
export function getClosingTimestampForDate(date: string): number {
  const midnightStartMs = parseVietnamDateTime(date, '00:00');
  if (Number.isNaN(midnightStartMs)) {
    return Number.NaN;
  }
  const hours = getOperatingHoursForDate(date);
  return midnightStartMs + hours.hardClosingMinutes * 60 * 1000;
}

/**
 * Evaluates late-night dining notice for bookings approaching hard closing time
 * (00:00 Mon–Fri, 01:00 Sat–Sun):
 * - Capped (< 150m remaining) and before last-seating boundary: 'SHORT_DINING'
 * - At/after last-seating boundary (22:30 Mon–Fri / 23:00 Sat–Sun) or <= 90m left: 'LAST_CALL'
 */
export function evaluateLateNightDiningNotice(
  date: string,
  time: string
): LateNightDiningNotice {
  const hours = getOperatingHoursForDate(date);
  const startMin = parseTimeToMinutes(time);
  if (Number.isNaN(startMin)) {
    return {
      severity: 'NONE',
      remainingMinutes: DINING_DURATION_MINUTES,
      closingTimeLabel: hours.hardClosingTime,
      effectiveEndHm: '',
      isCappedByClosing: false,
    };
  }

  const remainingUntilClose = Math.max(0, hours.hardClosingMinutes - startMin);
  if (remainingUntilClose >= DINING_DURATION_MINUTES) {
    const endTotalMin = startMin + DINING_DURATION_MINUTES;
    const hh = String(Math.floor(endTotalMin / 60) % 24).padStart(2, '0');
    const mm = String(endTotalMin % 60).padStart(2, '0');
    return {
      severity: 'NONE',
      remainingMinutes: DINING_DURATION_MINUTES,
      closingTimeLabel: hours.hardClosingTime,
      effectiveEndHm: `${hh}:${mm}`,
      isCappedByClosing: false,
    };
  }

  const severity: LateNightNoticeSeverity =
    remainingUntilClose <= 90 || startMin >= hours.closeMinutes
      ? 'LAST_CALL'
      : 'SHORT_DINING';

  return {
    severity,
    remainingMinutes: remainingUntilClose,
    closingTimeLabel: hours.hardClosingTime,
    effectiveEndHm: hours.hardClosingTime,
    isCappedByClosing: true,
  };
}

/**
 * Computes the dining interval { startTime, endTime } in Vietnam timezone (+07:00)
 * per BR-RES-11 (endTime = min(startTime + 150 minutes, hard closing 00:00)).
 */
export function computeDiningInterval(
  date: string,
  time: string,
  durationMinutes: number = DINING_DURATION_MINUTES
): DiningInterval | null {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return null;
  }
  const startMs = parseVietnamDateTime(date, time);
  if (Number.isNaN(startMs)) {
    return null;
  }
  let endMs = startMs + durationMinutes * 60 * 1000;
  if (durationMinutes === DINING_DURATION_MINUTES) {
    const closingMs = getClosingTimestampForDate(date);
    if (Number.isFinite(closingMs) && closingMs > startMs) {
      endMs = Math.min(endMs, closingMs);
    }
  }
  return {
    startTime: new Date(startMs),
    endTime: new Date(endMs),
  };
}

/**
 * Computes the total slot-blocking interval { startTime, endTime } in Vietnam timezone (+07:00)
 * including 150m dining + 30m cleaning/turnaround buffer = 180 minutes (3 hours).
 */
export function computeSlotBlockInterval(
  date: string,
  time: string,
  durationMinutes: number = SLOT_BLOCK_DURATION_MINUTES
): DiningInterval | null {
  return computeDiningInterval(date, time, durationMinutes);
}

/**
 * Extends a reservation's dining endTime by the cleaning/turnaround buffer (+30 minutes).
 */
export function extendEndTimeWithCleaningBuffer(
  endTime: Date | string | number,
  bufferMinutes: number = CLEANING_BUFFER_MINUTES
): Date | null {
  const baseMs =
    endTime instanceof Date ? endTime.getTime() : typeof endTime === 'number' ? endTime : Date.parse(endTime);
  if (!Number.isFinite(baseMs) || !Number.isFinite(bufferMinutes) || bufferMinutes < 0) {
    return null;
  }
  return new Date(baseMs + bufferMinutes * 60 * 1000);
}

/**
 * Checks whether two Date/ISO/epoch intervals [startA, endA) and [startB, endB) overlap:
 * startA < endB && endA > startB (BR-RES-12).
 */
export function doDateIntervalsOverlap(
  startA: Date | string | number,
  endA: Date | string | number,
  startB: Date | string | number,
  endB: Date | string | number
): boolean {
  const aStart = startA instanceof Date ? startA.getTime() : typeof startA === 'number' ? startA : Date.parse(startA);
  const aEnd = endA instanceof Date ? endA.getTime() : typeof endA === 'number' ? endA : Date.parse(endA);
  const bStart = startB instanceof Date ? startB.getTime() : typeof startB === 'number' ? startB : Date.parse(startB);
  const bEnd = endB instanceof Date ? endB.getTime() : typeof endB === 'number' ? endB : Date.parse(endB);

  if (
    !Number.isFinite(aStart) ||
    !Number.isFinite(aEnd) ||
    !Number.isFinite(bStart) ||
    !Number.isFinite(bEnd)
  ) {
    return false;
  }

  return aStart < bEnd && aEnd > bStart;
}

/**
 * Checks whether two bookings/locks on the same table and date overlap
 * given the total slot-blocking interval [start, start + 180 minutes) (150m dining + 30m cleaning buffer).
 * E.g. 19:00 and 21:45 overlap (diff 165 < 180); 19:00 and 22:00 do NOT overlap (diff 180).
 */
export function doTimeSlotsOverlap(
  timeA: string,
  timeB: string,
  durationMinutes: number = SLOT_BLOCK_DURATION_MINUTES
): boolean {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return false;
  }
  const startA = parseTimeToMinutes(timeA);
  const startB = parseTimeToMinutes(timeB);
  if (Number.isNaN(startA) || Number.isNaN(startB)) {
    return false;
  }
  return startA < startB + durationMinutes && startB < startA + durationMinutes;
}

function toValidDate(input: Date | string | number | null | undefined): Date | null {
  if (input === null || input === undefined) return null;
  const date = input instanceof Date ? input : new Date(input);
  return Number.isFinite(date.getTime()) ? date : null;
}

/**
 * Computes diningEndAt (150m per BR-RES-11) and graceExpiresAt (15m per BR-RES-09)
 * for staff table management cards (/staff/tables).
 */
export function computeTableTimingMeta(params: {
  tableStatus: string;
  tableUpdatedAt?: Date | string | null;
  activeReservation?: {
    date?: string;
    time?: string;
    startTime?: Date | string | null;
    endTime?: Date | string | null;
    checkInTime?: Date | string | null;
  } | null;
}): TableTimingMeta {
  const { tableStatus, tableUpdatedAt, activeReservation } = params;

  const fallbackInterval =
    activeReservation?.date && activeReservation?.time
      ? computeDiningInterval(activeReservation.date, activeReservation.time)
      : null;

  const resolvedStart =
    toValidDate(activeReservation?.startTime) ?? fallbackInterval?.startTime ?? null;
  const resolvedEnd =
    toValidDate(activeReservation?.endTime) ??
    (resolvedStart ? new Date(resolvedStart.getTime() + DINING_DURATION_MS) : null);

  let diningStartDate: Date | null = null;
  let diningEndDate: Date | null = null;
  let graceExpiresDate: Date | null = null;

  if (tableStatus === 'SEATED') {
    if (activeReservation) {
      diningStartDate = toValidDate(activeReservation.checkInTime) ?? resolvedStart ?? toValidDate(tableUpdatedAt);
      diningEndDate =
        resolvedEnd ??
        (diningStartDate ? new Date(diningStartDate.getTime() + DINING_DURATION_MS) : null);
    } else {
      // Walk-in không có reservation
      diningStartDate = toValidDate(tableUpdatedAt);
      diningEndDate = diningStartDate
        ? new Date(diningStartDate.getTime() + DINING_DURATION_MS)
        : null;
    }
  } else if (tableStatus === 'RESERVED' && resolvedStart) {
    graceExpiresDate = new Date(resolvedStart.getTime() + RESERVATION_HOLD_GRACE_MS);
  }

  return {
    startTime: resolvedStart ? resolvedStart.toISOString() : null,
    endTime: resolvedEnd ? resolvedEnd.toISOString() : null,
    diningStartAt: diningStartDate ? diningStartDate.toISOString() : null,
    diningEndAt: diningEndDate ? diningEndDate.toISOString() : null,
    graceExpiresAt: graceExpiresDate ? graceExpiresDate.toISOString() : null,
  };
}

/**
 * Returns whether a (date, time) slot in Vietnam timezone (+07:00) is in the past relative to nowMs.
 */
export function isVietnamSlotInPast(
  date: string,
  time: string,
  nowMs: number = Date.now()
): boolean {
  const slotMs = parseVietnamDateTime(date, time);
  if (Number.isNaN(slotMs) || !Number.isFinite(nowMs)) {
    return true;
  }
  return slotMs <= nowMs;
}

/**
 * BR-RES-13: Checks whether a (date, time) slot in Vietnam timezone (+07:00)
 * violates the minimum advance booking lead time (default: 30 minutes).
 */
export function isSlotBeforeMinAdvance(
  date: string,
  time: string,
  nowMs: number = Date.now(),
  minAdvanceMinutes: number = BOOKING_MIN_ADVANCE_MINUTES
): boolean {
  const slotMs = parseVietnamDateTime(date, time);
  if (
    Number.isNaN(slotMs) ||
    !Number.isFinite(nowMs) ||
    !Number.isFinite(minAdvanceMinutes)
  ) {
    return true;
  }
  return slotMs < nowMs + minAdvanceMinutes * 60 * 1000;
}

/**
 * Computes cleaning schedule & deadline when transitioning a table SEATED -> CLEANING:
 * 1) Returned BEFORE 150m dining end (nowMs <= diningEndMs):
 *    - 30m + early bonus (diningEndMs - nowMs), capped at max(nowMs + 15m, nextStartMs - 15m) if next booking exists.
 *    - cleaningType = 'EARLY_BONUS'
 * 2) Returned AFTER 150m dining end (nowMs > diningEndMs):
 *    - If table has a next CONFIRMED reservation: 15m ('URGENT_15M')
 *    - Otherwise: 30m ('RELAXED_30M')
 */
export function computeCleaningSchedule(params: {
  nowMs?: number;
  diningEndMs?: number | null;
  nextReservationStartMs?: number | null;
  hasNextReservation?: boolean;
}): CleaningScheduleResult {
  const nowMs = params.nowMs ?? Date.now();
  const hasNextStart =
    typeof params.nextReservationStartMs === 'number' &&
    Number.isFinite(params.nextReservationStartMs);
  const hasNext = Boolean(params.hasNextReservation ?? hasNextStart);

  const hasValidDiningEnd =
    typeof params.diningEndMs === 'number' && Number.isFinite(params.diningEndMs);

  let deadlineMs: number;
  let cleaningType: TableCleaningType;

  if (hasValidDiningEnd && nowMs <= (params.diningEndMs as number)) {
    const earlyMs = Math.max(0, (params.diningEndMs as number) - nowMs);
    deadlineMs = nowMs + CLEANING_BUFFER_MS + earlyMs;
    if (hasNextStart) {
      const safeCapMs = Math.max(
        nowMs + URGENT_CLEANING_MS,
        (params.nextReservationStartMs as number) - URGENT_CLEANING_MS
      );
      deadlineMs = Math.min(deadlineMs, safeCapMs);
    }
    cleaningType = TableCleaningType.EARLY_BONUS;
  } else if (hasNext) {
    deadlineMs = nowMs + URGENT_CLEANING_MS;
    cleaningType = TableCleaningType.URGENT_15M;
  } else {
    deadlineMs = nowMs + CLEANING_BUFFER_MS;
    cleaningType = TableCleaningType.RELAXED_30M;
  }

  return {
    cleaningStartedAt: new Date(nowMs),
    cleaningDeadlineAt: new Date(deadlineMs),
    cleaningType,
    durationMs: Math.max(0, deadlineMs - nowMs),
  };
}

/**
 * Parses a YYYY-MM-DD date and HH:mm time in Vietnam timezone (+07:00).
 * Validates calendar integrity (e.g. rejects 2026-02-30) and returns epoch ms or NaN.
 */
export function parseVietnamDateTime(date: string, time: string): number {
  if (typeof date !== 'string' || typeof time !== 'string') {
    return Number.NaN;
  }

  const normalizedDate = date.trim();
  const normalizedTime = time.trim();

  const dateMatch = VIETNAM_DATE_REGEX.exec(normalizedDate);
  const timeMatch = VIETNAM_TIME_REGEX.exec(normalizedTime);
  if (!dateMatch || !timeMatch) {
    return Number.NaN;
  }

  const year = Number.parseInt(dateMatch[1], 10);
  const month = Number.parseInt(dateMatch[2], 10);
  const day = Number.parseInt(dateMatch[3], 10);
  const hour = Number.parseInt(timeMatch[1], 10);
  const minute = Number.parseInt(timeMatch[2], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return Number.NaN;
  }

  const calendarCheck = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarCheck.getUTCFullYear() !== year ||
    calendarCheck.getUTCMonth() !== month - 1 ||
    calendarCheck.getUTCDate() !== day
  ) {
    return Number.NaN;
  }

  const timestamp = Date.parse(`${normalizedDate}T${normalizedTime}:00+07:00`);
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
}

/**
 * Evaluates whether a reservation can still be cancelled (> 60 minutes before booking time in +07:00).
 */
export function evaluateCancellationWindow(
  date: string,
  time: string,
  nowMs: number = Date.now()
): CancellationWindowResult {
  const bookingTime = parseVietnamDateTime(date, time);
  if (Number.isNaN(bookingTime) || !Number.isFinite(nowMs)) {
    return {
      allowed: false,
      diffInMinutes: Number.NaN,
      reason: 'Thời gian đặt bàn không hợp lệ.',
    };
  }

  const diffInMinutes = (bookingTime - nowMs) / (1000 * 60);

  if (diffInMinutes <= 0) {
    return {
      allowed: false,
      diffInMinutes,
      reason: 'Không thể hủy đơn đặt bàn đã qua thời gian hẹn.',
    };
  }

  if (diffInMinutes <= CANCELLATION_MIN_NOTICE_MINUTES) {
    return {
      allowed: false,
      diffInMinutes,
      reason: 'Chỉ được phép hủy đơn trước giờ hẹn ít nhất 60 phút.',
    };
  }

  return {
    allowed: true,
    diffInMinutes,
  };
}

/**
 * Generates a reservation booking code in the format RES-XXXXXX (6 uppercase hex chars).
 */
export function generateBookingCode(): string {
  return `RES-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}
