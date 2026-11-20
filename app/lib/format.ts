/**
 * Format a numeric VND amount into Vietnamese locale currency string (e.g. `380.000đ`).
 */
export function formatMoney(val: number): string {
  const numericVal = Number(val || 0);
  const safeVal = Number.isFinite(numericVal) ? numericVal : 0;
  return `${safeVal.toLocaleString('vi-VN')}đ`;
}

/**
 * Formats a non-negative duration in seconds as fixed-width `HH:mm:ss`
 * (e.g. `00:09:59`, `02:30:00`, `00:00:00`).
 */
export function formatCountdownHhMmSs(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Formats a Date / ISO string / epoch ms into `HH:mm` in Vietnam timezone (+07:00).
 */
export function formatVietnamTimeHm(input: Date | string | number | null | undefined): string {
  if (input === null || input === undefined) return '';
  const ms = input instanceof Date ? input.getTime() : typeof input === 'number' ? input : Date.parse(input);
  if (!Number.isFinite(ms)) return '';
  const vnDate = new Date(ms + 7 * 60 * 60 * 1000);
  const hh = String(vnDate.getUTCHours()).padStart(2, '0');
  const mm = String(vnDate.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
