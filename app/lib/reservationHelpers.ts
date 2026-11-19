import crypto from 'node:crypto';

export const CANCELLATION_MIN_NOTICE_MINUTES = 60;

export const VIETNAM_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
export const VIETNAM_TIME_REGEX = /^(\d{2}):(\d{2})$/;

export interface CancellationWindowResult {
  allowed: boolean;
  diffInMinutes: number;
  reason?: string;
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
