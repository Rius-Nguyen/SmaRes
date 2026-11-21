import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn<() => Promise<void>>(),
  orderAggregate: vi.fn(),
}));

vi.mock('@/app/lib/db', () => ({
  default: mocks.connectDB,
  connectDB: mocks.connectDB,
}));

vi.mock('@/app/models/Order', () => ({
  OrderStatus: {
    PENDING: 'PENDING',
    COOKING: 'COOKING',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
  } as const,
  default: {
    aggregate: mocks.orderAggregate,
  },
}));

import { GET } from '@/app/api/admin/revenue/route';
import {
  RevenuePeriod,
  VIETNAM_TIMEZONE,
  buildRevenueBuckets,
  getIsoWeekKeyFromMondayUtc,
  mergeRevenueSeries,
} from '@/app/lib/adminRevenue';
import { signAuthToken } from '@/app/lib/auth';

describe('Admin Revenue Helpers & API (TK-186 Backend)', () => {
  const previousJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'vitest-smares-revenue-secret';
    mocks.connectDB.mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (previousJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousJwtSecret;
    }
  });

  it('builds continuous day/week buckets in Asia/Ho_Chi_Minh and handles ISO year crossover accurately', () => {
    // 2024-12-30 (Monday) has Thursday 2025-01-02 -> ISO week 2025-W01
    expect(getIsoWeekKeyFromMondayUtc(new Date(Date.UTC(2024, 11, 30)))).toBe('2025-W01');
    // 2026-01-05 (Monday) -> 2026-W02
    expect(getIsoWeekKeyFromMondayUtc(new Date(Date.UTC(2026, 0, 5)))).toBe('2026-W02');

    // 2026-11-21T10:00:00+07:00 = 2026-11-21T03:00:00Z
    const fixedNowMs = Date.parse('2026-11-21T03:00:00Z');
    const dayResult = buildRevenueBuckets(RevenuePeriod.DAY, 14, fixedNowMs);
    expect(dayResult.buckets).toHaveLength(14);
    expect(dayResult.buckets[0].key).toBe('2026-11-08');
    expect(dayResult.buckets[13].key).toBe('2026-11-21');
    expect(dayResult.buckets[13].label).toBe('21/11');

    const weekResult = buildRevenueBuckets(RevenuePeriod.WEEK, 8, fixedNowMs);
    expect(weekResult.buckets).toHaveLength(8);
    expect(weekResult.buckets[7].startDate).toBe('2026-11-16');
    expect(weekResult.buckets[7].endDate).toBe('2026-11-22');
    expect(weekResult.buckets[7].label).toBe('16/11–22/11');

    const merged = mergeRevenueSeries(dayResult.buckets, [
      { _id: '2026-11-19', revenue: 500000, orders: 2 },
      { _id: '2026-11-21', revenue: 1200000, orders: 3 },
    ]);
    expect(merged.series[0].revenue).toBe(0);
    expect(merged.summary.totalRevenue).toBe(1700000);
    expect(merged.summary.validOrders).toBe(5);
    expect(merged.summary.avgOrderValue).toBe(340000);
    expect(merged.summary.peakBucket?.key).toBe('2026-11-21');
  });

  it('GET /api/admin/revenue enforces admin RBAC (401/403) and rejects invalid period with 400', async () => {
    const unauthRes = await GET(new NextRequest('http://localhost/api/admin/revenue'));
    expect(unauthRes.status).toBe(401);

    for (const role of ['customer', 'staff'] as const) {
      const token = signAuthToken({
        userId: `${role}-1`,
        email: `${role}@smares.vn`,
        role,
      });
      const res = await GET(
        new NextRequest('http://localhost/api/admin/revenue', {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      expect(res.status).toBe(403);
    }

    const adminToken = signAuthToken({
      userId: 'admin-1',
      email: 'admin@smares.vn',
      role: 'admin',
    });
    const badPeriodRes = await GET(
      new NextRequest('http://localhost/api/admin/revenue?period=year', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    );
    expect(badPeriodRes.status).toBe(400);
    expect(mocks.orderAggregate).not.toHaveBeenCalled();
  });

  it('GET /api/admin/revenue?period=day aggregates orders excluding CANCELLED and zero-fills buckets', async () => {
    const adminToken = signAuthToken({
      userId: 'admin-1',
      email: 'admin@smares.vn',
      role: 'admin',
    });

    const expectedBuckets = buildRevenueBuckets(RevenuePeriod.DAY, 14);
    const todayKey = expectedBuckets.buckets[13].key;
    const yesterdayKey = expectedBuckets.buckets[12].key;

    mocks.orderAggregate.mockResolvedValueOnce([
      { _id: yesterdayKey, revenue: 450000, orders: 1 },
      { _id: todayKey, revenue: 1050000, orders: 2 },
    ]);

    const res = await GET(
      new NextRequest('http://localhost/api/admin/revenue?period=day', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    );
    const json = (await res.json()) as {
      success: boolean;
      data: {
        period: string;
        timezone: string;
        summary: {
          totalRevenue: number;
          validOrders: number;
          avgOrderValue: number;
          peakBucket: { key: string; revenue: number } | null;
        };
        series: Array<{ key: string; revenue: number; orders: number }>;
      };
    };

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.period).toBe('day');
    expect(json.data.timezone).toBe(VIETNAM_TIMEZONE);
    expect(json.data.series).toHaveLength(14);
    expect(json.data.summary.totalRevenue).toBe(1500000);
    expect(json.data.summary.validOrders).toBe(3);
    expect(json.data.summary.avgOrderValue).toBe(500000);
    expect(json.data.summary.peakBucket?.key).toBe(todayKey);

    expect(mocks.orderAggregate).toHaveBeenCalledTimes(1);
    const pipeline = mocks.orderAggregate.mock.calls[0][0] as Array<Record<string, unknown>>;
    const matchStage = pipeline[0].$match as { status: { $ne: string } };
    expect(matchStage.status.$ne).toBe('CANCELLED');
    const groupStage = pipeline[1].$group as {
      _id: { $dateToString: { format: string; timezone: string } };
    };
    expect(groupStage._id.$dateToString.format).toBe('%Y-%m-%d');
    expect(groupStage._id.$dateToString.timezone).toBe(VIETNAM_TIMEZONE);
  });

  it('GET /api/admin/revenue?period=week aggregates 8 ISO weeks excluding CANCELLED', async () => {
    const adminToken = signAuthToken({
      userId: 'admin-1',
      email: 'admin@smares.vn',
      role: 'admin',
    });

    const expectedBuckets = buildRevenueBuckets(RevenuePeriod.WEEK, 8);
    const currentWeekKey = expectedBuckets.buckets[7].key;
    const prevWeekKey = expectedBuckets.buckets[6].key;

    mocks.orderAggregate.mockResolvedValueOnce([
      { _id: prevWeekKey, revenue: 2100000, orders: 4 },
      { _id: currentWeekKey, revenue: 3500000, orders: 6 },
    ]);

    const res = await GET(
      new NextRequest('http://localhost/api/admin/revenue?period=week', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    );
    const json = (await res.json()) as {
      success: boolean;
      data: {
        period: string;
        summary: {
          totalRevenue: number;
          validOrders: number;
          avgOrderValue: number;
          peakBucket: { key: string; revenue: number } | null;
        };
        series: Array<{ key: string; revenue: number; orders: number }>;
      };
    };

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.period).toBe('week');
    expect(json.data.series).toHaveLength(8);
    expect(json.data.series[0].revenue).toBe(0);
    expect(json.data.summary.totalRevenue).toBe(5600000);
    expect(json.data.summary.validOrders).toBe(10);
    expect(json.data.summary.avgOrderValue).toBe(560000);
    expect(json.data.summary.peakBucket?.key).toBe(currentWeekKey);

    const pipeline = mocks.orderAggregate.mock.calls[0][0] as Array<Record<string, unknown>>;
    const groupStage = pipeline[1].$group as {
      _id: { $dateToString: { format: string; timezone: string } };
    };
    expect(groupStage._id.$dateToString.format).toBe('%G-W%V');
    expect(groupStage._id.$dateToString.timezone).toBe(VIETNAM_TIMEZONE);
  });

  it('returns 500 when database aggregation throws', async () => {
    const adminToken = signAuthToken({
      userId: 'admin-1',
      email: 'admin@smares.vn',
      role: 'admin',
    });

    mocks.orderAggregate.mockRejectedValueOnce(new Error('Aggregation timeout'));

    const res = await GET(
      new NextRequest('http://localhost/api/admin/revenue?period=day', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    );
    const json = (await res.json()) as { success: boolean; error: string };
    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Aggregation timeout');
  });
});
