import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  BOOKING_MIN_ADVANCE_MINUTES,
  CANCELLATION_MIN_NOTICE_MINUTES,
  CLEANING_BUFFER_MINUTES,
  DINING_DURATION_MINUTES,
  RESERVATION_HOLD_GRACE_MINUTES,
  SLOT_BLOCK_DURATION_MINUTES,
  TableCleaningType,
  VIETNAM_DATE_REGEX,
  VIETNAM_TIME_REGEX,
  computeCleaningSchedule,
  computeDiningInterval,
  computeSlotBlockInterval,
  computeTableTimingMeta,
  doDateIntervalsOverlap,
  doTimeSlotsOverlap,
  evaluateLateNightDiningNotice,
  extendEndTimeWithCleaningBuffer,
  getOperatingHoursForDate,
  isSlotBeforeMinAdvance,
  isVietnamSlotInPast,
  isWithinOperatingHoursForDate,
  parseTimeToMinutes,
  parseVietnamDateTime,
  evaluateCancellationWindow,
  generateBookingCode,
} from '@/app/lib/reservationHelpers';
import { formatCountdownHhMmSs, formatVietnamTimeHm } from '@/app/lib/format';

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn<() => Promise<void>>(),
  tableFindById: vi.fn<(id: string) => Promise<unknown>>(),
  tableFindOne: vi.fn<(query: Record<string, unknown>) => Promise<unknown>>(),
  reservationFind: vi.fn(),
  reservationFindOne: vi.fn(),
  reservationFindById: vi.fn(),
  reservationCreate: vi.fn(),
  getAuthUser: vi.fn(),
  requireAuth: vi.fn(),
}));

vi.mock('@/app/lib/db', () => ({
  default: mocks.connectDB,
  connectDB: mocks.connectDB,
}));

vi.mock('@/app/models/Table', () => ({
  default: {
    findById: mocks.tableFindById,
    findOne: mocks.tableFindOne,
  },
}));

vi.mock('@/app/models/Reservation', () => ({
  ReservationStatus: {
    CONFIRMED: 'CONFIRMED',
    CHECKED_IN: 'CHECKED_IN',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
  } as const,
  default: {
    find: mocks.reservationFind,
    findOne: mocks.reservationFindOne,
    findById: mocks.reservationFindById,
    create: mocks.reservationCreate,
  },
}));

vi.mock('@/app/lib/auth', () => ({
  getAuthUser: mocks.getAuthUser,
  requireAuth: mocks.requireAuth,
}));

import { GET, POST } from '@/app/api/reservations/route';
import { PATCH as cancelReservationPatch } from '@/app/api/reservations/[id]/cancel/route';

const VALID_TABLE_ID = '6717a01a1e0011a100000101';
const VALID_RESERVATION_ID = '6717a01a1e0011a100000201';
const OWNER_USER_ID = '6717a01a1e0011a100000301';
const OTHER_USER_ID = '6717a01a1e0011a100000302';

function setupFindSelectLean(docs: unknown[]) {
  const lean = vi.fn().mockResolvedValue(docs);
  const select = vi.fn().mockReturnValue({ lean });
  mocks.reservationFind.mockReturnValue({ select });
  return { select, lean };
}

function setupFindSortLean(docs: unknown[]) {
  const lean = vi.fn().mockResolvedValue(docs);
  const sort = vi.fn().mockReturnValue({ lean });
  mocks.reservationFind.mockReturnValue({ sort });
  return { sort, lean };
}

describe('reservationHelpers', () => {
  it('exposes expected constants and regex patterns', () => {
    expect(CANCELLATION_MIN_NOTICE_MINUTES).toBe(60);
    expect(VIETNAM_DATE_REGEX.test('2026-11-20')).toBe(true);
    expect(VIETNAM_DATE_REGEX.test('2026-1-20')).toBe(false);
    expect(VIETNAM_TIME_REGEX.test('08:30')).toBe(true);
    expect(VIETNAM_TIME_REGEX.test('8:30')).toBe(false);
  });

  it('parseVietnamDateTime parses +07:00 date/time and trims surrounding whitespace', () => {
    const eveningMs = parseVietnamDateTime('2026-11-20', '19:30');
    expect(eveningMs).toBe(Date.UTC(2026, 10, 20, 12, 30, 0));

    // 02:15 in +07:00 maps back to 19:15 UTC on the previous calendar day
    const earlyMorningMs = parseVietnamDateTime('  2026-11-20 ', ' 02:15  ');
    expect(earlyMorningMs).toBe(Date.UTC(2026, 10, 19, 19, 15, 0));

    // Boundary times within a day
    expect(parseVietnamDateTime('2026-11-20', '00:00')).toBe(Date.UTC(2026, 10, 19, 17, 0, 0));
    expect(parseVietnamDateTime('2026-11-20', '23:59')).toBe(Date.UTC(2026, 10, 20, 16, 59, 0));
  });

  it('parseVietnamDateTime rejects invalid calendar dates including Feb 30 and non-leap Feb 29', () => {
    expect(Number.isNaN(parseVietnamDateTime('2026-02-30', '18:00'))).toBe(true);
    expect(Number.isNaN(parseVietnamDateTime('2026-02-29', '18:00'))).toBe(true);
    expect(Number.isNaN(parseVietnamDateTime('2026-04-31', '18:00'))).toBe(true);
    expect(Number.isNaN(parseVietnamDateTime('2026-13-01', '18:00'))).toBe(true);
    expect(Number.isNaN(parseVietnamDateTime('2026-00-10', '18:00'))).toBe(true);
    expect(Number.isNaN(parseVietnamDateTime('2026-01-00', '18:00'))).toBe(true);

    // Leap years accept Feb 29
    expect(parseVietnamDateTime('2024-02-29', '12:00')).toBe(Date.UTC(2024, 1, 29, 5, 0, 0));
    expect(parseVietnamDateTime('2028-02-29', '12:00')).toBe(Date.UTC(2028, 1, 29, 5, 0, 0));
  });

  it('parseVietnamDateTime rejects invalid formats and out-of-range times', () => {
    expect(Number.isNaN(parseVietnamDateTime('2026-11-20', '24:00'))).toBe(true);
    expect(Number.isNaN(parseVietnamDateTime('2026-11-20', '12:60'))).toBe(true);
    expect(Number.isNaN(parseVietnamDateTime('2026-11-20', '9:30'))).toBe(true);
    expect(Number.isNaN(parseVietnamDateTime('2026/11/20', '19:00'))).toBe(true);
    expect(Number.isNaN(parseVietnamDateTime('', '19:00'))).toBe(true);
    expect(Number.isNaN(parseVietnamDateTime('2026-11-20', ''))).toBe(true);
  });

  it('evaluateCancellationWindow enforces exact > 60 minute cutoff in +07:00', () => {
    const bookingDate = '2026-11-20';
    const bookingTime = '19:00';
    const bookingMs = parseVietnamDateTime(bookingDate, bookingTime);
    expect(bookingMs).toBe(Date.UTC(2026, 10, 20, 12, 0, 0));

    // > 60 minutes (60m + 1ms before) -> allowed
    const justOver60 = evaluateCancellationWindow(bookingDate, bookingTime, bookingMs - (60 * 60_000 + 1));
    expect(justOver60.allowed).toBe(true);
    expect(justOver60.diffInMinutes).toBeGreaterThan(60);
    expect(justOver60.reason).toBeUndefined();

    // 61 minutes before -> allowed
    const at61Min = evaluateCancellationWindow(bookingDate, bookingTime, bookingMs - 61 * 60_000);
    expect(at61Min.allowed).toBe(true);
    expect(at61Min.diffInMinutes).toBe(61);

    // Exactly 60 minutes before -> rejected (<= 60)
    const exact60 = evaluateCancellationWindow(bookingDate, bookingTime, bookingMs - 60 * 60_000);
    expect(exact60.allowed).toBe(false);
    expect(exact60.diffInMinutes).toBe(60);
    expect(exact60.reason).toBe('Chỉ được phép hủy đơn trước giờ hẹn ít nhất 60 phút.');

    // 59 minutes before -> rejected
    const at59Min = evaluateCancellationWindow(bookingDate, bookingTime, bookingMs - 59 * 60_000);
    expect(at59Min.allowed).toBe(false);
    expect(at59Min.diffInMinutes).toBe(59);
    expect(at59Min.reason).toBe('Chỉ được phép hủy đơn trước giờ hẹn ít nhất 60 phút.');

    // Exact booking time (0 minutes) -> rejected as past/elapsed
    const atZero = evaluateCancellationWindow(bookingDate, bookingTime, bookingMs);
    expect(atZero.allowed).toBe(false);
    expect(atZero.diffInMinutes).toBe(0);
    expect(atZero.reason).toBe('Không thể hủy đơn đặt bàn đã qua thời gian hẹn.');

    // Past booking time (< 0 minutes) -> rejected
    const pastTime = evaluateCancellationWindow(bookingDate, bookingTime, bookingMs + 15 * 60_000);
    expect(pastTime.allowed).toBe(false);
    expect(pastTime.diffInMinutes).toBe(-15);
    expect(pastTime.reason).toBe('Không thể hủy đơn đặt bàn đã qua thời gian hẹn.');
  });

  it('evaluateCancellationWindow rejects invalid dates and non-finite nowMs', () => {
    const invalidCalendar = evaluateCancellationWindow('2026-02-30', '19:00', Date.UTC(2026, 1, 1));
    expect(invalidCalendar.allowed).toBe(false);
    expect(Number.isNaN(invalidCalendar.diffInMinutes)).toBe(true);
    expect(invalidCalendar.reason).toBe('Thời gian đặt bàn không hợp lệ.');

    const invalidNow = evaluateCancellationWindow('2026-11-20', '19:00', Number.NaN);
    expect(invalidNow.allowed).toBe(false);
    expect(Number.isNaN(invalidNow.diffInMinutes)).toBe(true);
    expect(invalidNow.reason).toBe('Thời gian đặt bàn không hợp lệ.');
  });

  it('generateBookingCode returns RES-XXXXXX with 6 uppercase hex characters', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      const code = generateBookingCode();
      expect(code).toMatch(/^RES-[0-9A-F]{6}$/);
      codes.add(code);
    }
    expect(codes.size).toBeGreaterThan(40);
  });

  it('enforces 180-minute slot block overlap (150m dining + 30m cleaning buffer) and formats HH:mm:ss + staff timing meta', () => {
    expect(DINING_DURATION_MINUTES).toBe(150);
    expect(CLEANING_BUFFER_MINUTES).toBe(30);
    expect(SLOT_BLOCK_DURATION_MINUTES).toBe(180);
    expect(RESERVATION_HOLD_GRACE_MINUTES).toBe(15);
    expect(parseTimeToMinutes('19:15')).toBe(1155);
    expect(Number.isNaN(parseTimeToMinutes('25:00'))).toBe(true);

    // Offsets < 180m overlap (e.g. 19:00 vs 21:30 -> diff 150m < 180m; 19:00 vs 21:45 -> diff 165m < 180m)
    expect(doTimeSlotsOverlap('19:00', '19:00')).toBe(true);
    expect(doTimeSlotsOverlap('19:00', '19:15')).toBe(true);
    expect(doTimeSlotsOverlap('19:00', '21:30')).toBe(true);
    expect(doTimeSlotsOverlap('19:00', '21:45')).toBe(true);
    expect(doTimeSlotsOverlap('21:45', '19:00')).toBe(true);
    expect(doTimeSlotsOverlap('19:00', '16:15')).toBe(true);

    // Exact 180-minute (3-hour) boundary does NOT overlap: [19:00, 22:00) and [22:00, 01:00)
    expect(doTimeSlotsOverlap('19:00', '22:00')).toBe(false);
    expect(doTimeSlotsOverlap('19:00', '16:00')).toBe(false);

    // computeDiningInterval (150m) & computeSlotBlockInterval (180m) (+07:00)
    const diningA = computeDiningInterval('2026-11-20', '19:00');
    const blockA = computeSlotBlockInterval('2026-11-20', '19:00');
    const blockB = computeSlotBlockInterval('2026-11-20', '21:45');
    const blockC = computeSlotBlockInterval('2026-11-20', '22:00');
    expect(diningA).not.toBeNull();
    expect(blockA).not.toBeNull();
    expect(blockB).not.toBeNull();
    expect(blockC).not.toBeNull();
    if (diningA && blockA && blockB && blockC) {
      expect(diningA.endTime.getTime() - diningA.startTime.getTime()).toBe(150 * 60 * 1000);
      expect(blockA.endTime.getTime() - blockA.startTime.getTime()).toBe(180 * 60 * 1000);
      expect(extendEndTimeWithCleaningBuffer(diningA.endTime)?.toISOString()).toBe(blockA.endTime.toISOString());
      expect(formatVietnamTimeHm(diningA.startTime)).toBe('19:00');
      expect(formatVietnamTimeHm(diningA.endTime)).toBe('21:30');
      expect(formatVietnamTimeHm(blockA.endTime)).toBe('22:00');
      expect(doDateIntervalsOverlap(blockA.startTime, blockA.endTime, blockB.startTime, blockB.endTime)).toBe(true);
      expect(doDateIntervalsOverlap(blockA.startTime, blockA.endTime, blockC.startTime, blockC.endTime)).toBe(false);
    }

    // formatCountdownHhMmSs formatting
    expect(formatCountdownHhMmSs(0)).toBe('00:00:00');
    expect(formatCountdownHhMmSs(-10)).toBe('00:00:00');
    expect(formatCountdownHhMmSs(599)).toBe('00:09:59');
    expect(formatCountdownHhMmSs(9000)).toBe('02:30:00');
    expect(formatCountdownHhMmSs(3661)).toBe('01:01:01');

    // computeTableTimingMeta for SEATED (walk-in & reservation) and RESERVED (grace 15m)
    const walkInUpdatedAt = new Date('2026-11-20T12:00:00.000Z'); // 19:00 VN
    const walkInMeta = computeTableTimingMeta({
      tableStatus: 'SEATED',
      tableUpdatedAt: walkInUpdatedAt,
      activeReservation: null,
    });
    expect(walkInMeta.diningStartAt).toBe('2026-11-20T12:00:00.000Z');
    expect(walkInMeta.diningEndAt).toBe('2026-11-20T14:30:00.000Z');
    expect(walkInMeta.graceExpiresAt).toBeNull();

    const reservedMeta = computeTableTimingMeta({
      tableStatus: 'RESERVED',
      activeReservation: { date: '2026-11-20', time: '19:00' },
    });
    expect(reservedMeta.startTime).toBe('2026-11-20T12:00:00.000Z');
    expect(reservedMeta.endTime).toBe('2026-11-20T14:30:00.000Z');
    expect(reservedMeta.graceExpiresAt).toBe('2026-11-20T12:15:00.000Z');
    expect(reservedMeta.diningEndAt).toBeNull();

    // Past-slot check in Vietnam GMT+7 & BR-RES-13 (>= 30 minutes lead time)
    const slotMs = parseVietnamDateTime('2026-12-20', '19:15');
    expect(BOOKING_MIN_ADVANCE_MINUTES).toBe(30);
    expect(isVietnamSlotInPast('2026-12-20', '19:15', slotMs - 1000)).toBe(false);
    expect(isVietnamSlotInPast('2026-12-20', '19:15', slotMs)).toBe(true);
    expect(isSlotBeforeMinAdvance('2026-12-20', '19:15', slotMs - 29 * 60_000)).toBe(true);
    expect(isSlotBeforeMinAdvance('2026-12-20', '19:15', slotMs - 30 * 60_000)).toBe(false);
  });

  it('computes cleaning schedule accurately across EARLY_BONUS, URGENT_15M, and RELAXED_30M branches', () => {
    const diningEndMs = Date.parse('2026-12-20T14:30:00.000Z'); // 21:30 VN

    // 1a. Returned 20m early (21:10 VN), no next booking -> 30m + 20m = 50m (EARLY_BONUS)
    const earlyNoNext = computeCleaningSchedule({
      nowMs: diningEndMs - 20 * 60_000,
      diningEndMs,
      hasNextReservation: false,
    });
    expect(earlyNoNext.cleaningType).toBe(TableCleaningType.EARLY_BONUS);
    expect(earlyNoNext.durationMs).toBe(50 * 60_000);

    // 1b. Returned 20m early (21:10 VN), next booking at 21:50 VN -> capped at 21:35 VN (25m)
    const earlyWithNext = computeCleaningSchedule({
      nowMs: diningEndMs - 20 * 60_000,
      diningEndMs,
      nextReservationStartMs: diningEndMs + 20 * 60_000, // 21:50 VN
      hasNextReservation: true,
    });
    expect(earlyWithNext.cleaningType).toBe(TableCleaningType.EARLY_BONUS);
    expect(earlyWithNext.durationMs).toBe(25 * 60_000);

    // 2. Returned 10m AFTER 150m end, WITH next booking -> fixed 15m (URGENT_15M)
    const urgentSchedule = computeCleaningSchedule({
      nowMs: diningEndMs + 10 * 60_000,
      diningEndMs,
      nextReservationStartMs: diningEndMs + 30 * 60_000,
      hasNextReservation: true,
    });
    expect(urgentSchedule.cleaningType).toBe(TableCleaningType.URGENT_15M);
    expect(urgentSchedule.durationMs).toBe(15 * 60_000);

    // 3. Returned 10m AFTER 150m end, WITHOUT next booking -> relaxed 30m (RELAXED_30M)
    const relaxedSchedule = computeCleaningSchedule({
      nowMs: diningEndMs + 10 * 60_000,
      diningEndMs,
      hasNextReservation: false,
    });
    expect(relaxedSchedule.cleaningType).toBe(TableCleaningType.RELAXED_30M);
    expect(relaxedSchedule.durationMs).toBe(30 * 60_000);
  });

  it('enforces operating hours by day of week (Mon–Fri 10:00–22:30, Sat–Sun 09:00–23:00)', () => {
    // 2026-11-23 is Monday
    const mondayHours = getOperatingHoursForDate('2026-11-23');
    expect(mondayHours.isWeekend).toBe(false);
    expect(mondayHours.openTime).toBe('10:00');
    expect(mondayHours.closeTime).toBe('22:30');
    expect(isWithinOperatingHoursForDate('2026-11-23', '09:00')).toBe(false);
    expect(isWithinOperatingHoursForDate('2026-11-23', '09:45')).toBe(false);
    expect(isWithinOperatingHoursForDate('2026-11-23', '10:00')).toBe(true);
    expect(isWithinOperatingHoursForDate('2026-11-23', '22:30')).toBe(true);
    expect(isWithinOperatingHoursForDate('2026-11-23', '22:45')).toBe(false);

    // 2026-11-21 is Saturday, 2026-11-22 is Sunday
    const saturdayHours = getOperatingHoursForDate('2026-11-21');
    expect(saturdayHours.isWeekend).toBe(true);
    expect(saturdayHours.openTime).toBe('09:00');
    expect(saturdayHours.closeTime).toBe('23:00');
    expect(isWithinOperatingHoursForDate('2026-11-21', '09:00')).toBe(true);
    expect(isWithinOperatingHoursForDate('2026-11-22', '23:00')).toBe(true);
    expect(isWithinOperatingHoursForDate('2026-11-22', '23:15')).toBe(false);
  });

  it('evaluates 2-tier late-night dining notices and caps endTime at 00:00 (Mon–Fri) or 01:00 (Sat–Sun)', () => {
    // Weekday 2026-11-23 (Monday, hard closing 00:00)
    const weekdayNormal = evaluateLateNightDiningNotice('2026-11-23', '21:30');
    expect(weekdayNormal.severity).toBe('NONE');
    expect(weekdayNormal.remainingMinutes).toBe(150);
    expect(weekdayNormal.closingTimeLabel).toBe('00:00');
    expect(weekdayNormal.isCappedByClosing).toBe(false);

    const weekdayShort = evaluateLateNightDiningNotice('2026-11-23', '22:00');
    expect(weekdayShort.severity).toBe('SHORT_DINING');
    expect(weekdayShort.remainingMinutes).toBe(120);
    expect(weekdayShort.effectiveEndHm).toBe('00:00');
    expect(weekdayShort.isCappedByClosing).toBe(true);

    const weekdayLastCall = evaluateLateNightDiningNotice('2026-11-23', '22:30');
    expect(weekdayLastCall.severity).toBe('LAST_CALL');
    expect(weekdayLastCall.remainingMinutes).toBe(90);
    expect(weekdayLastCall.effectiveEndHm).toBe('00:00');
    expect(weekdayLastCall.isCappedByClosing).toBe(true);

    const weekdayCappedInterval = computeDiningInterval('2026-11-23', '22:30');
    expect(weekdayCappedInterval).not.toBeNull();
    if (weekdayCappedInterval) {
      expect(
        weekdayCappedInterval.endTime.getTime() - weekdayCappedInterval.startTime.getTime()
      ).toBe(90 * 60 * 1000);
      expect(formatVietnamTimeHm(weekdayCappedInterval.endTime)).toBe('00:00');
    }

    // Weekend 2026-11-21 (Saturday, hard closing 01:00)
    const weekendFull = evaluateLateNightDiningNotice('2026-11-21', '22:30');
    expect(weekendFull.severity).toBe('NONE');
    expect(weekendFull.remainingMinutes).toBe(150);
    expect(weekendFull.closingTimeLabel).toBe('01:00');
    expect(weekendFull.effectiveEndHm).toBe('01:00');
    expect(weekendFull.isCappedByClosing).toBe(false);

    const weekendShort = evaluateLateNightDiningNotice('2026-11-21', '22:45');
    expect(weekendShort.severity).toBe('SHORT_DINING');
    expect(weekendShort.remainingMinutes).toBe(135);
    expect(weekendShort.effectiveEndHm).toBe('01:00');
    expect(weekendShort.isCappedByClosing).toBe(true);

    const weekendLastCall = evaluateLateNightDiningNotice('2026-11-21', '23:00');
    expect(weekendLastCall.severity).toBe('LAST_CALL');
    expect(weekendLastCall.remainingMinutes).toBe(120);
    expect(weekendLastCall.effectiveEndHm).toBe('01:00');
    expect(weekendLastCall.isCappedByClosing).toBe(true);

    const weekendCappedInterval = computeDiningInterval('2026-11-21', '23:00');
    expect(weekendCappedInterval).not.toBeNull();
    if (weekendCappedInterval) {
      expect(
        weekendCappedInterval.endTime.getTime() - weekendCappedInterval.startTime.getTime()
      ).toBe(120 * 60 * 1000);
      expect(formatVietnamTimeHm(weekendCappedInterval.endTime)).toBe('01:00');
    }
  });
});

describe('Reservations API route handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connectDB.mockResolvedValue(undefined);
    mocks.getAuthUser.mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('GET /api/reservations enforces auth and scopes customer queries to own userId', async () => {
    mocks.requireAuth.mockReturnValueOnce({
      errorResponse: NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      ),
    });

    const unauthReq = new NextRequest('http://localhost/api/reservations');
    const unauthRes = await GET(unauthReq);
    expect(unauthRes.status).toBe(401);

    mocks.requireAuth.mockReturnValueOnce({
      user: { userId: OWNER_USER_ID, email: 'guest@smares.vn', role: 'customer' },
    });
    setupFindSortLean([{ _id: VALID_RESERVATION_ID, bookingCode: 'RES-ABC123' }]);

    const customerReq = new NextRequest(
      'http://localhost/api/reservations?bookingCode=res-abc123&status=confirmed'
    );
    const customerRes = await GET(customerReq);
    const customerJson = (await customerRes.json()) as {
      success: boolean;
      reservations: Array<{ bookingCode: string }>;
    };

    expect(customerRes.status).toBe(200);
    expect(customerJson.success).toBe(true);
    expect(mocks.reservationFind).toHaveBeenCalledWith({
      userId: OWNER_USER_ID,
      bookingCode: 'RES-ABC123',
      status: 'CONFIRMED',
    });

    mocks.requireAuth.mockReturnValueOnce({
      user: { userId: 'staff-1', email: 'staff@smares.vn', role: 'staff' },
    });
    setupFindSortLean([]);

    const staffReq = new NextRequest('http://localhost/api/reservations?status=CHECKED_IN');
    const staffRes = await GET(staffReq);
    expect(staffRes.status).toBe(200);
    expect(mocks.reservationFind).toHaveBeenLastCalledWith({ status: 'CHECKED_IN' });

    mocks.requireAuth.mockReturnValueOnce({
      user: { userId: 'staff-1', email: 'staff@smares.vn', role: 'staff' },
    });
    const badStatusReq = new NextRequest('http://localhost/api/reservations?status=INVALID');
    const badStatusRes = await GET(badStatusReq);
    expect(badStatusRes.status).toBe(400);
  });

  it('POST /api/reservations creates CONFIRMED booking (201) and returns 409 on existing slot conflict', async () => {
    mocks.getAuthUser.mockReturnValue({
      userId: OWNER_USER_ID,
      email: 'guest@smares.vn',
      role: 'customer',
    });
    mocks.tableFindById.mockResolvedValue({
      _id: VALID_TABLE_ID,
      tableNumber: 'B01',
      capacity: 4,
    });
    setupFindSelectLean([]);
    mocks.reservationCreate.mockResolvedValue({
      _id: VALID_RESERVATION_ID,
      bookingCode: 'RES-1A2B3C',
      tableId: VALID_TABLE_ID,
      tableNumber: 'B01',
      customerName: 'Nguyễn Văn A',
      date: '2026-12-20',
      time: '19:00',
      guests: 4,
      phone: '0901234567',
      note: 'Gần cửa sổ',
      status: 'CONFIRMED',
      createdAt: new Date('2026-12-19T12:00:00.000Z'),
    });

    const createReq = new NextRequest('http://localhost/api/reservations', {
      method: 'POST',
      body: JSON.stringify({
        tableId: VALID_TABLE_ID,
        customerName: 'Nguyễn Văn A',
        date: '2026-12-20',
        time: '19:00',
        guests: 4,
        phone: '0901234567',
        note: 'Gần cửa sổ',
      }),
    });

    const createRes = await POST(createReq);
    const createBody = (await createRes.json()) as {
      success: boolean;
      data: {
        bookingCode: string;
        status: string;
        tableNumber: string;
        startTime: string;
        endTime: string;
      };
    };

    expect(createRes.status).toBe(201);
    expect(createBody.success).toBe(true);
    expect(createBody.data.bookingCode).toBe('RES-1A2B3C');
    expect(createBody.data.status).toBe('CONFIRMED');
    expect(createBody.data.tableNumber).toBe('B01');
    expect(createBody.data.startTime).toBe('2026-12-20T12:00:00.000Z');
    expect(createBody.data.endTime).toBe('2026-12-20T14:30:00.000Z');
    // Chỉ query các đơn hiệu lực CONFIRMED / CHECKED_IN (bỏ qua COMPLETED và CANCELLED)
    expect(mocks.reservationFind).toHaveBeenCalledWith({
      tableId: VALID_TABLE_ID,
      date: '2026-12-20',
      status: { $in: ['CONFIRMED', 'CHECKED_IN'] },
    });

    // Existing active reservation at 19:00 (dining ends 21:30, cleaning ends 22:00) overlaps 21:45 -> 409 Conflict
    setupFindSelectLean([
      {
        _id: VALID_RESERVATION_ID,
        time: '19:00',
        startTime: new Date('2026-12-20T12:00:00.000Z'),
        endTime: new Date('2026-12-20T14:30:00.000Z'),
      },
    ]);
    const conflictReq = new NextRequest('http://localhost/api/reservations', {
      method: 'POST',
      body: JSON.stringify({
        tableId: VALID_TABLE_ID,
        date: '2026-12-20',
        time: '21:45',
        guests: 2,
        phone: '0909998888',
      }),
    });

    const conflictRes = await POST(conflictReq);
    expect(conflictRes.status).toBe(409);
    expect(mocks.reservationCreate).toHaveBeenCalledTimes(1);

    // 22:00 (exactly 180m = 150m dining + 30m cleaning after 19:00) does NOT overlap -> 201 Created
    setupFindSelectLean([
      {
        _id: VALID_RESERVATION_ID,
        time: '19:00',
        startTime: new Date('2026-12-20T12:00:00.000Z'),
        endTime: new Date('2026-12-20T14:30:00.000Z'),
      },
    ]);
    const nonOverlapReq = new NextRequest('http://localhost/api/reservations', {
      method: 'POST',
      body: JSON.stringify({
        tableId: VALID_TABLE_ID,
        date: '2026-12-20',
        time: '22:00',
        guests: 2,
        phone: '0909998888',
      }),
    });
    const nonOverlapRes = await POST(nonOverlapReq);
    expect(nonOverlapRes.status).toBe(201);
    expect(mocks.reservationCreate).toHaveBeenCalledTimes(2);
  });

  it('POST /api/reservations rejects bookings less than 30 minutes in advance (BR-RES-13 -> 400 BOOKING_LEAD_TIME_TOO_SHORT)', async () => {
    vi.useFakeTimers();
    // 18:45 VN = 11:45 UTC; booking for 19:00 VN is only 15m ahead (< 30m)
    vi.setSystemTime(new Date('2026-12-20T11:45:00.000Z'));

    const tooSoonReq = new NextRequest('http://localhost/api/reservations', {
      method: 'POST',
      body: JSON.stringify({
        tableId: VALID_TABLE_ID,
        date: '2026-12-20',
        time: '19:00',
        guests: 2,
        phone: '0901234567',
      }),
    });
    const tooSoonRes = await POST(tooSoonReq);
    const tooSoonBody = (await tooSoonRes.json()) as {
      success: boolean;
      error?: string;
      message?: string;
    };

    expect(tooSoonRes.status).toBe(400);
    expect(tooSoonBody.success).toBe(false);
    expect(tooSoonBody.error).toBe('BOOKING_LEAD_TIME_TOO_SHORT');

    // Monday 2026-12-21 at 09:00 is outside Mon–Fri operating hours (10:00–22:30) -> 400 OUTSIDE_OPERATING_HOURS
    const weekdayEarlyReq = new NextRequest('http://localhost/api/reservations', {
      method: 'POST',
      body: JSON.stringify({
        tableId: VALID_TABLE_ID,
        date: '2026-12-21',
        time: '09:00',
        guests: 2,
        phone: '0901234567',
      }),
    });
    const weekdayEarlyRes = await POST(weekdayEarlyReq);
    const weekdayEarlyBody = (await weekdayEarlyRes.json()) as {
      success: boolean;
      error?: string;
    };
    expect(weekdayEarlyRes.status).toBe(400);
    expect(weekdayEarlyBody.error).toBe('OUTSIDE_OPERATING_HOURS');
  });

  it('POST /api/reservations returns 409 on Mongo duplicate key error (code === 11000) for double booking', async () => {
    mocks.tableFindOne.mockResolvedValue({
      _id: VALID_TABLE_ID,
      tableNumber: 'B02',
      capacity: 6,
    });
    setupFindSelectLean([]);

    const mongoDuplicateError = Object.assign(
      new Error('E11000 duplicate key error collection: smares.reservations index: uniq_active_table_slot'),
      {
        code: 11000,
        keyPattern: { tableId: 1, date: 1, time: 1 },
      }
    );
    mocks.reservationCreate.mockRejectedValueOnce(mongoDuplicateError);

    const req = new NextRequest('http://localhost/api/reservations', {
      method: 'POST',
      body: JSON.stringify({
        tableNumber: 'b02',
        date: '2026-12-20',
        time: '19:30',
        guests: 4,
        phone: '0912345678',
      }),
    });

    const res = await POST(req);
    const body = (await res.json()) as { success: boolean; message: string };

    expect(res.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.message).toContain('đã có người đặt');
  });

  it('POST /api/reservations retries once when bookingCode collides (code === 11000 on bookingCode) and rejects excess guests (400)', async () => {
    mocks.tableFindById.mockResolvedValue({
      _id: VALID_TABLE_ID,
      tableNumber: 'B01',
      capacity: 4,
    });

    const overCapReq = new NextRequest('http://localhost/api/reservations', {
      method: 'POST',
      body: JSON.stringify({
        tableId: VALID_TABLE_ID,
        date: '2026-12-20',
        time: '19:00',
        guests: 8,
        phone: '0912345678',
      }),
    });
    const overCapRes = await POST(overCapReq);
    expect(overCapRes.status).toBe(400);

    setupFindSelectLean([]);
    mocks.reservationCreate
      .mockRejectedValueOnce(
        Object.assign(new Error('E11000 duplicate key bookingCode'), {
          code: 11000,
          keyPattern: { bookingCode: 1 },
        })
      )
      .mockResolvedValueOnce({
        _id: VALID_RESERVATION_ID,
        bookingCode: 'RES-RETRY1',
        tableId: VALID_TABLE_ID,
        tableNumber: 'B01',
        customerName: 'Khách tại bàn',
        date: '2026-12-20',
        time: '20:00',
        guests: 2,
        phone: '0912345678',
        note: '',
        status: 'CONFIRMED',
        createdAt: new Date('2026-12-19T12:00:00.000Z'),
      });

    const retryReq = new NextRequest('http://localhost/api/reservations', {
      method: 'POST',
      body: JSON.stringify({
        tableId: VALID_TABLE_ID,
        date: '2026-12-20',
        time: '20:00',
        guests: 2,
        phone: '0912345678',
      }),
    });
    const retryRes = await POST(retryReq);
    expect(retryRes.status).toBe(201);
    expect(mocks.reservationCreate).toHaveBeenCalledTimes(2);
  });

  it('PATCH /api/reservations/[id]/cancel enforces 403 ownership check for non-owner customers', async () => {
    mocks.requireAuth.mockReturnValue({
      user: { userId: OTHER_USER_ID, email: 'other@smares.vn', role: 'customer' },
    });

    const save = vi.fn();
    mocks.reservationFindById.mockResolvedValue({
      _id: VALID_RESERVATION_ID,
      userId: OWNER_USER_ID,
      bookingCode: 'RES-OWN001',
      date: '2026-11-25',
      time: '19:00',
      status: 'CONFIRMED',
      save,
    });

    const req = new NextRequest(`http://localhost/api/reservations/${VALID_RESERVATION_ID}/cancel`, {
      method: 'PATCH',
    });
    const res = await cancelReservationPatch(req, {
      params: Promise.resolve({ id: VALID_RESERVATION_ID }),
    });
    const body = (await res.json()) as { success: boolean; message: string };

    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.message).toBe('Bạn không có quyền hủy đơn đặt bàn này.');
    expect(save).not.toHaveBeenCalled();
  });

  it('PATCH /api/reservations/[id]/cancel enforces 60-minute +07:00 window (400 at <= 60m, 200 at > 60m)', async () => {
    vi.useFakeTimers();

    // Booking: 2026-11-20 19:00 +07:00 === 2026-11-20T12:00:00.000Z
    const save = vi.fn().mockResolvedValue(undefined);
    const reservationDoc = {
      _id: VALID_RESERVATION_ID,
      userId: OWNER_USER_ID,
      bookingCode: 'RES-TIME60',
      date: '2026-11-20',
      time: '19:00',
      status: 'CONFIRMED',
      save,
    };

    mocks.requireAuth.mockReturnValue({
      user: { userId: OWNER_USER_ID, email: 'owner@smares.vn', role: 'customer' },
    });
    mocks.reservationFindById.mockResolvedValue(reservationDoc);

    // Exactly 60 minutes before booking (11:00 UTC = 18:00 +07:00) -> 400
    vi.setSystemTime(new Date('2026-11-20T11:00:00.000Z'));
    const tooLateReq = new NextRequest(
      `http://localhost/api/reservations/${VALID_RESERVATION_ID}/cancel`,
      { method: 'PATCH' }
    );
    const tooLateRes = await cancelReservationPatch(tooLateReq, {
      params: Promise.resolve({ id: VALID_RESERVATION_ID }),
    });
    const tooLateBody = (await tooLateRes.json()) as { success: boolean; message: string };

    expect(tooLateRes.status).toBe(400);
    expect(tooLateBody.success).toBe(false);
    expect(tooLateBody.message).toBe('Chỉ được phép hủy đơn trước giờ hẹn ít nhất 60 phút.');
    expect(save).not.toHaveBeenCalled();
    expect(reservationDoc.status).toBe('CONFIRMED');

    // 61 minutes before booking (10:59 UTC = 17:59 +07:00) -> 200 CANCELLED
    vi.setSystemTime(new Date('2026-11-20T10:59:00.000Z'));
    const validReq = new NextRequest(
      `http://localhost/api/reservations/${VALID_RESERVATION_ID}/cancel`,
      { method: 'PATCH' }
    );
    const validRes = await cancelReservationPatch(validReq, {
      params: Promise.resolve({ id: VALID_RESERVATION_ID }),
    });
    const validBody = (await validRes.json()) as {
      success: boolean;
      data: { bookingCode: string; status: string };
    };

    expect(validRes.status).toBe(200);
    expect(validBody.success).toBe(true);
    expect(validBody.data.bookingCode).toBe('RES-TIME60');
    expect(validBody.data.status).toBe('CANCELLED');
    expect(reservationDoc.status).toBe('CANCELLED');
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('PATCH /api/reservations/[id]/cancel rejects invalid id (400), CHECKED_IN (400), and allows staff override (200)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-20T10:00:00.000Z'));

    mocks.requireAuth.mockReturnValue({
      user: { userId: 'staff-1', email: 'staff@smares.vn', role: 'staff' },
    });

    const invalidIdReq = new NextRequest('http://localhost/api/reservations/not-an-objectid/cancel', {
      method: 'PATCH',
    });
    const invalidIdRes = await cancelReservationPatch(invalidIdReq, {
      params: Promise.resolve({ id: 'not-an-objectid' }),
    });
    expect(invalidIdRes.status).toBe(400);

    const save = vi.fn().mockResolvedValue(undefined);
    mocks.reservationFindById.mockResolvedValueOnce({
      _id: VALID_RESERVATION_ID,
      userId: OWNER_USER_ID,
      bookingCode: 'RES-CHK01',
      date: '2026-11-20',
      time: '19:00',
      status: 'CHECKED_IN',
      save,
    });
    const checkedInReq = new NextRequest(
      `http://localhost/api/reservations/${VALID_RESERVATION_ID}/cancel`,
      { method: 'PATCH' }
    );
    const checkedInRes = await cancelReservationPatch(checkedInReq, {
      params: Promise.resolve({ id: VALID_RESERVATION_ID }),
    });
    expect(checkedInRes.status).toBe(400);
    expect(save).not.toHaveBeenCalled();

    const staffDoc = {
      _id: VALID_RESERVATION_ID,
      userId: OWNER_USER_ID,
      bookingCode: 'RES-STF01',
      date: '2026-11-20',
      time: '19:00',
      status: 'CONFIRMED',
      save,
    };
    mocks.reservationFindById.mockResolvedValueOnce(staffDoc);
    const staffCancelReq = new NextRequest(
      `http://localhost/api/reservations/${VALID_RESERVATION_ID}/cancel`,
      { method: 'PATCH' }
    );
    const staffCancelRes = await cancelReservationPatch(staffCancelReq, {
      params: Promise.resolve({ id: VALID_RESERVATION_ID }),
    });
    expect(staffCancelRes.status).toBe(200);
    expect(staffDoc.status).toBe('CANCELLED');
    expect(save).toHaveBeenCalledTimes(1);
  });
});
