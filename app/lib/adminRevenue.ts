export const RevenuePeriod = {
  DAY: 'day',
  WEEK: 'week',
} as const;

export type RevenuePeriod = (typeof RevenuePeriod)[keyof typeof RevenuePeriod];

export const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';
export const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
export const DEFAULT_DAY_COUNT = 14;
export const DEFAULT_WEEK_COUNT = 8;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

export interface RevenueBucketMeta {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
}

export interface RevenueAggRow {
  _id: string;
  revenue: number;
  orders: number;
}

export interface RevenueSeriesPoint extends RevenueBucketMeta {
  revenue: number;
  orders: number;
}

export interface RevenueSummary {
  totalRevenue: number;
  validOrders: number;
  avgOrderValue: number;
  peakBucket: RevenueSeriesPoint | null;
}

export interface RevenueApiPayload {
  period: RevenuePeriod;
  timezone: string;
  rangeLabel: string;
  summary: RevenueSummary;
  series: RevenueSeriesPoint[];
}

export function parseRevenuePeriod(raw: string | null): RevenuePeriod | null {
  if (raw === null) return RevenuePeriod.DAY;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return RevenuePeriod.DAY;
  if (normalized === RevenuePeriod.DAY) return RevenuePeriod.DAY;
  if (normalized === RevenuePeriod.WEEK) return RevenuePeriod.WEEK;
  return null;
}

export function parseBucketCount(period: RevenuePeriod, rawCount: string | null): number {
  const defaultCount = period === RevenuePeriod.WEEK ? DEFAULT_WEEK_COUNT : DEFAULT_DAY_COUNT;
  if (!rawCount || !rawCount.trim()) {
    return defaultCount;
  }

  const parsed = Number.parseInt(rawCount.trim(), 10);
  if (!Number.isFinite(parsed)) {
    return defaultCount;
  }

  if (period === RevenuePeriod.WEEK) {
    return Math.min(12, Math.max(4, parsed));
  }
  return Math.min(30, Math.max(7, parsed));
}

function formatUtcIsoDate(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatUtcShortDayMonth(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

/**
 * Computes ISO-8601 week key (`YYYY-Www`, matching MongoDB `$dateToString` format `%G-W%V`)
 * from a UTC Date anchored at `00:00:00Z` on that week's Monday.
 */
export function getIsoWeekKeyFromMondayUtc(mondayUtc: Date): string {
  const thursday = new Date(
    Date.UTC(mondayUtc.getUTCFullYear(), mondayUtc.getUTCMonth(), mondayUtc.getUTCDate() + 3)
  );
  const isoYear = thursday.getUTCFullYear();

  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4IsoDay = jan4.getUTCDay() || 7;
  const week1MondayMs = Date.UTC(isoYear, 0, 4 - (jan4IsoDay - 1));

  const mondayMidnightMs = Date.UTC(
    mondayUtc.getUTCFullYear(),
    mondayUtc.getUTCMonth(),
    mondayUtc.getUTCDate()
  );
  const isoWeek = Math.round((mondayMidnightMs - week1MondayMs) / MS_PER_WEEK) + 1;

  return `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
}

export function buildRevenueBuckets(
  period: RevenuePeriod,
  count: number,
  nowMs: number = Date.now()
): { startDate: Date; buckets: RevenueBucketMeta[] } {
  const vnNow = new Date(nowMs + VIETNAM_OFFSET_MS);
  const vnYear = vnNow.getUTCFullYear();
  const vnMonth = vnNow.getUTCMonth();
  const vnDate = vnNow.getUTCDate();

  if (period === RevenuePeriod.DAY) {
    const startUtcMidnightMs =
      Date.UTC(vnYear, vnMonth, vnDate - (count - 1), 0, 0, 0, 0) - VIETNAM_OFFSET_MS;
    const buckets: RevenueBucketMeta[] = [];

    for (let offset = 0; offset < count; offset += 1) {
      const slotDate = new Date(
        Date.UTC(vnYear, vnMonth, vnDate - (count - 1) + offset, 0, 0, 0, 0)
      );
      const isoDate = formatUtcIsoDate(slotDate);
      buckets.push({
        key: isoDate,
        label: formatUtcShortDayMonth(slotDate),
        startDate: isoDate,
        endDate: isoDate,
      });
    }

    return {
      startDate: new Date(startUtcMidnightMs),
      buckets,
    };
  }

  // period === RevenuePeriod.WEEK (ISO week: Monday -> Sunday in Asia/Ho_Chi_Minh)
  const vnIsoDay = vnNow.getUTCDay() || 7; // 1 = Monday ... 7 = Sunday
  const currentMondayDate = vnDate - (vnIsoDay - 1);
  const firstMondayDate = currentMondayDate - (count - 1) * 7;

  const startUtcMidnightMs =
    Date.UTC(vnYear, vnMonth, firstMondayDate, 0, 0, 0, 0) - VIETNAM_OFFSET_MS;
  const buckets: RevenueBucketMeta[] = [];

  for (let weekIdx = 0; weekIdx < count; weekIdx += 1) {
    const mondayCal = new Date(
      Date.UTC(vnYear, vnMonth, firstMondayDate + weekIdx * 7, 0, 0, 0, 0)
    );
    const sundayCal = new Date(
      Date.UTC(vnYear, vnMonth, firstMondayDate + weekIdx * 7 + 6, 0, 0, 0, 0)
    );
    buckets.push({
      key: getIsoWeekKeyFromMondayUtc(mondayCal),
      label: `${formatUtcShortDayMonth(mondayCal)}–${formatUtcShortDayMonth(sundayCal)}`,
      startDate: formatUtcIsoDate(mondayCal),
      endDate: formatUtcIsoDate(sundayCal),
    });
  }

  return {
    startDate: new Date(startUtcMidnightMs),
    buckets,
  };
}

export function mergeRevenueSeries(
  buckets: readonly RevenueBucketMeta[],
  aggRows: readonly RevenueAggRow[]
): { series: RevenueSeriesPoint[]; summary: RevenueSummary } {
  const rowMap = new Map<string, { revenue: number; orders: number }>();

  for (const row of aggRows) {
    if (!row._id) continue;
    rowMap.set(row._id, {
      revenue: Math.round(row.revenue ?? 0),
      orders: row.orders ?? 0,
    });
  }

  let totalRevenue = 0;
  let validOrders = 0;
  let peakBucket: RevenueSeriesPoint | null = null;

  const series: RevenueSeriesPoint[] = buckets.map((bucket) => {
    const matched = rowMap.get(bucket.key);
    const revenue = matched?.revenue ?? 0;
    const orders = matched?.orders ?? 0;
    const point: RevenueSeriesPoint = {
      ...bucket,
      revenue,
      orders,
    };

    totalRevenue += revenue;
    validOrders += orders;
    if (revenue > 0 && (peakBucket === null || revenue > peakBucket.revenue)) {
      peakBucket = point;
    }

    return point;
  });

  const avgOrderValue = validOrders > 0 ? Math.round(totalRevenue / validOrders) : 0;

  return {
    series,
    summary: {
      totalRevenue,
      validOrders,
      avgOrderValue,
      peakBucket,
    },
  };
}
