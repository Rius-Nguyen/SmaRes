import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/db';
import { requireRole } from '@/app/lib/auth';
import Order, { OrderStatus } from '@/app/models/Order';
import Reservation, { ReservationStatus } from '@/app/models/Reservation';

export const dynamic = 'force-dynamic';

const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const ALLOWED_RANGE_DAYS = [7, 14, 30] as const;

type RangeDays = (typeof ALLOWED_RANGE_DAYS)[number];

/**
 * Recommended MongoDB Indexes (derived from sqlcoder:7b index analysis & ESR rule):
 * - orders collection:
 *   1) db.orders.createIndex({ createdAt: -1, status: 1 }, { name: 'idx_orders_createdAt_status' })
 *      Supports time-window analytics ($match createdAt >= startDate) and status facet grouping.
 *   2) db.orders.createIndex({ status: 1, createdAt: -1 }, { name: 'idx_orders_status_createdAt' })
 *      Supports status-filtered revenue pipelines excluding OrderStatus.CANCELLED.
 *   3) db.orders.createIndex({ 'items.menuItemId': 1, createdAt: -1 }, { name: 'idx_orders_items_menuItemId_createdAt' })
 *      Speeds up top-selling dish rollups and item-level trend lookups.
 * - reservations collection:
 *   1) db.reservations.createIndex({ createdAt: -1, status: 1 }, { name: 'idx_reservations_createdAt_status' })
 *      Supports time-window reservation counts and guest totals grouped by ReservationStatus.
 *   2) db.reservations.createIndex({ status: 1, createdAt: -1 }, { name: 'idx_reservations_status_createdAt' })
 *      Complements existing status/slot indexes for reception & executive reporting.
 */

export interface AnalyticsKpis {
  totalRevenue: number;
  validOrders: number;
  avgOrderValue: number;
  totalOrders: number;
  cancelledOrders: number;
}

export interface OrderStatusBreakdownItem {
  status: OrderStatus;
  count: number;
  revenue: number;
}

export interface DailyRevenuePoint {
  date: string;
  label: string;
  revenue: number;
  orders: number;
}

export interface HourlyDistributionPoint {
  hour: number;
  label: string;
  revenue: number;
  orders: number;
}

export interface TopDishItem {
  menuItemId: string;
  name: string;
  quantity: number;
  revenue: number;
  orderCount: number;
}

export interface ReservationSummary {
  totalReservations: number;
  activeReservations: number;
  totalGuests: number;
  byStatus: Record<ReservationStatus, number>;
}

interface KpiAggRow {
  _id: null;
  totalRevenue: number;
  validOrders: number;
  avgOrderValue: number;
}

interface StatusBreakdownAggRow {
  _id: OrderStatus;
  count: number;
  revenue: number;
}

interface DailyRevenueAggRow {
  _id: string;
  revenue: number;
  orders: number;
}

interface HourlyDistributionAggRow {
  _id: number;
  revenue: number;
  orders: number;
}

interface TopDishAggRow {
  menuItemId: string;
  name: string;
  quantity: number;
  revenue: number;
  orderCount: number;
}

interface OrderAnalyticsFacetResult {
  kpis: KpiAggRow[];
  statusBreakdown: StatusBreakdownAggRow[];
  dailyRevenue: DailyRevenueAggRow[];
  hourlyDistribution: HourlyDistributionAggRow[];
  topDishes: TopDishAggRow[];
}

interface ReservationStatusAggRow {
  _id: ReservationStatus;
  count: number;
  guests: number;
}

function parseRangeDays(rawDays: string | null): RangeDays {
  if (!rawDays) return 30;
  const parsed = Number.parseInt(rawDays.trim(), 10);
  const matched = ALLOWED_RANGE_DAYS.find((allowed) => allowed === parsed);
  return matched ?? 30;
}

function buildVietnamWindow(rangeDays: RangeDays): {
  startDate: Date;
  dateKeys: Array<{ date: string; label: string }>;
} {
  const nowUtcMs = Date.now();
  const vnNow = new Date(nowUtcMs + VIETNAM_OFFSET_MS);
  const year = vnNow.getUTCFullYear();
  const month = vnNow.getUTCMonth();
  const day = vnNow.getUTCDate();

  const startDayUtcMidnightMs =
    Date.UTC(year, month, day - (rangeDays - 1), 0, 0, 0, 0) - VIETNAM_OFFSET_MS;
  const startDate = new Date(startDayUtcMidnightMs);

  const dateKeys: Array<{ date: string; label: string }> = [];
  for (let offset = 0; offset < rangeDays; offset += 1) {
    const slotVnDate = new Date(
      Date.UTC(year, month, day - (rangeDays - 1) + offset, 0, 0, 0, 0)
    );
    const yyyy = slotVnDate.getUTCFullYear();
    const mm = String(slotVnDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(slotVnDate.getUTCDate()).padStart(2, '0');
    dateKeys.push({
      date: `${yyyy}-${mm}-${dd}`,
      label: `${dd}/${mm}`,
    });
  }

  return { startDate, dateKeys };
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin']);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

    await connectDB();

    const rangeDays = parseRangeDays(request.nextUrl.searchParams.get('days'));
    const { startDate, dateKeys } = buildVietnamWindow(rangeDays);

    const [orderFacetList, reservationAgg] = await Promise.all([
      Order.aggregate<OrderAnalyticsFacetResult>([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $facet: {
            kpis: [
              {
                $match: {
                  status: { $ne: OrderStatus.CANCELLED },
                },
              },
              {
                $group: {
                  _id: null,
                  totalRevenue: { $sum: { $ifNull: ['$totalAmount', 0] } },
                  validOrders: { $sum: 1 },
                  avgOrderValue: { $avg: { $ifNull: ['$totalAmount', 0] } },
                },
              },
            ],
            statusBreakdown: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 },
                  revenue: { $sum: { $ifNull: ['$totalAmount', 0] } },
                },
              },
            ],
            dailyRevenue: [
              {
                $match: {
                  status: { $ne: OrderStatus.CANCELLED },
                },
              },
              {
                $group: {
                  _id: {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$createdAt',
                      timezone: VIETNAM_TIMEZONE,
                    },
                  },
                  revenue: { $sum: { $ifNull: ['$totalAmount', 0] } },
                  orders: { $sum: 1 },
                },
              },
              { $sort: { _id: 1 } },
            ],
            hourlyDistribution: [
              {
                $match: {
                  status: { $ne: OrderStatus.CANCELLED },
                },
              },
              {
                $group: {
                  _id: {
                    $hour: {
                      date: '$createdAt',
                      timezone: VIETNAM_TIMEZONE,
                    },
                  },
                  revenue: { $sum: { $ifNull: ['$totalAmount', 0] } },
                  orders: { $sum: 1 },
                },
              },
              { $sort: { _id: 1 } },
            ],
            topDishes: [
              {
                $match: {
                  status: { $ne: OrderStatus.CANCELLED },
                },
              },
              { $unwind: '$items' },
              {
                $group: {
                  _id: {
                    $toString: {
                      $ifNull: ['$items.menuItemId', '$items.name'],
                    },
                  },
                  name: { $last: '$items.name' },
                  quantity: { $sum: { $ifNull: ['$items.quantity', 0] } },
                  revenue: {
                    $sum: {
                      $multiply: [
                        { $ifNull: ['$items.price', 0] },
                        { $ifNull: ['$items.quantity', 0] },
                      ],
                    },
                  },
                  orderIds: { $addToSet: '$_id' },
                },
              },
              {
                $project: {
                  _id: 0,
                  menuItemId: '$_id',
                  name: { $ifNull: ['$name', 'Món ăn'] },
                  quantity: 1,
                  revenue: 1,
                  orderCount: { $size: '$orderIds' },
                },
              },
              { $sort: { quantity: -1, revenue: -1, name: 1 } },
              { $limit: 10 },
            ],
          },
        },
      ]),
      Reservation.aggregate<ReservationStatusAggRow>([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            guests: { $sum: { $ifNull: ['$guests', 0] } },
          },
        },
      ]),
    ]);

    const facetResult = orderFacetList[0] ?? {
      kpis: [],
      statusBreakdown: [],
      dailyRevenue: [],
      hourlyDistribution: [],
      topDishes: [],
    };

    const statusMap = new Map<OrderStatus, { count: number; revenue: number }>();
    for (const row of facetResult.statusBreakdown) {
      statusMap.set(row._id, {
        count: row.count ?? 0,
        revenue: row.revenue ?? 0,
      });
    }

    const orderedStatuses: readonly OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.COOKING,
      OrderStatus.COMPLETED,
      OrderStatus.CANCELLED,
    ];

    const statusBreakdown: OrderStatusBreakdownItem[] = orderedStatuses.map((status) => {
      const entry = statusMap.get(status);
      return {
        status,
        count: entry?.count ?? 0,
        revenue: entry?.revenue ?? 0,
      };
    });

    const totalOrders = statusBreakdown.reduce((sum, item) => sum + item.count, 0);
    const cancelledOrders = statusMap.get(OrderStatus.CANCELLED)?.count ?? 0;

    const kpiRow = facetResult.kpis[0];
    const kpis: AnalyticsKpis = {
      totalRevenue: Math.round(kpiRow?.totalRevenue ?? 0),
      validOrders: kpiRow?.validOrders ?? 0,
      avgOrderValue: Math.round(kpiRow?.avgOrderValue ?? 0),
      totalOrders,
      cancelledOrders,
    };

    const dailyMap = new Map<string, { revenue: number; orders: number }>();
    for (const row of facetResult.dailyRevenue) {
      dailyMap.set(row._id, {
        revenue: Math.round(row.revenue ?? 0),
        orders: row.orders ?? 0,
      });
    }

    const dailyRevenue: DailyRevenuePoint[] = dateKeys.map(({ date, label }) => {
      const point = dailyMap.get(date);
      return {
        date,
        label,
        revenue: point?.revenue ?? 0,
        orders: point?.orders ?? 0,
      };
    });

    const hourlyMap = new Map<number, { revenue: number; orders: number }>();
    for (const row of facetResult.hourlyDistribution) {
      if (typeof row._id === 'number' && row._id >= 0 && row._id <= 23) {
        hourlyMap.set(row._id, {
          revenue: Math.round(row.revenue ?? 0),
          orders: row.orders ?? 0,
        });
      }
    }

    const hourlyDistribution: HourlyDistributionPoint[] = Array.from({ length: 24 }, (_, hour) => {
      const point = hourlyMap.get(hour);
      return {
        hour,
        label: `${String(hour).padStart(2, '0')}h`,
        revenue: point?.revenue ?? 0,
        orders: point?.orders ?? 0,
      };
    });

    const topDishes: TopDishItem[] = facetResult.topDishes.map((dish) => ({
      menuItemId: String(dish.menuItemId || dish.name || ''),
      name: String(dish.name || 'Món ăn'),
      quantity: dish.quantity ?? 0,
      revenue: Math.round(dish.revenue ?? 0),
      orderCount: dish.orderCount ?? 0,
    }));

    const reservationByStatus: Record<ReservationStatus, number> = {
      [ReservationStatus.CONFIRMED]: 0,
      [ReservationStatus.CHECKED_IN]: 0,
      [ReservationStatus.COMPLETED]: 0,
      [ReservationStatus.CANCELLED]: 0,
    };

    let totalReservations = 0;
    let totalGuests = 0;

    for (const row of reservationAgg) {
      const count = row.count ?? 0;
      const guests = row.guests ?? 0;
      totalReservations += count;
      if (row._id !== ReservationStatus.CANCELLED) {
        totalGuests += guests;
      }
      if (row._id in reservationByStatus) {
        reservationByStatus[row._id] = count;
      }
    }

    const reservationSummary: ReservationSummary = {
      totalReservations,
      activeReservations: totalReservations - reservationByStatus[ReservationStatus.CANCELLED],
      totalGuests,
      byStatus: reservationByStatus,
    };

    return NextResponse.json(
      {
        success: true,
        rangeDays,
        kpis,
        statusBreakdown,
        dailyRevenue,
        hourlyDistribution,
        topDishes,
        reservationSummary,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Lỗi API GET /api/admin/analytics:', error);
    const message = error instanceof Error ? error.message : 'Lỗi máy chủ khi tải thống kê.';
    return NextResponse.json(
      {
        success: false,
        message: 'Không thể tổng hợp dữ liệu thống kê quản trị.',
        error: message,
      },
      { status: 500 }
    );
  }
}
