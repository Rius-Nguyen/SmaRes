import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/db';
import { requireRole } from '@/app/lib/auth';
import Order, { OrderStatus } from '@/app/models/Order';
import {
  RevenuePeriod,
  VIETNAM_TIMEZONE,
  buildRevenueBuckets,
  mergeRevenueSeries,
  parseBucketCount,
  parseRevenuePeriod,
  type RevenueAggRow,
  type RevenueApiPayload,
} from '@/app/lib/adminRevenue';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin']);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

    const { searchParams } = request.nextUrl;
    const period = parseRevenuePeriod(searchParams.get('period'));
    if (!period) {
      return NextResponse.json(
        {
          success: false,
          message: 'Tham số period không hợp lệ. Chỉ chấp nhận "day" hoặc "week".',
        },
        { status: 400 }
      );
    }

    const rawCount =
      searchParams.get('count') ?? searchParams.get('days') ?? searchParams.get('weeks');
    const bucketCount = parseBucketCount(period, rawCount);
    const { startDate, buckets } = buildRevenueBuckets(period, bucketCount);

    await connectDB();

    const dateFormat = period === RevenuePeriod.WEEK ? '%G-W%V' : '%Y-%m-%d';

    const aggRows = await Order.aggregate<RevenueAggRow>([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $ne: OrderStatus.CANCELLED },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: dateFormat,
              date: '$createdAt',
              timezone: VIETNAM_TIMEZONE,
            },
          },
          revenue: { $sum: { $ifNull: ['$totalAmount', 0] } },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const { series, summary } = mergeRevenueSeries(buckets, aggRows);
    const rangeLabel =
      period === RevenuePeriod.WEEK
        ? `${bucketCount} tuần gần nhất (Thứ 2 – Chủ nhật)`
        : `${bucketCount} ngày gần nhất`;

    const data: RevenueApiPayload = {
      period,
      timezone: VIETNAM_TIMEZONE,
      rangeLabel,
      summary,
      series,
    };

    return NextResponse.json(
      {
        success: true,
        message: 'Tổng hợp doanh thu thành công.',
        data,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Lỗi API GET /api/admin/revenue:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi máy chủ khi tổng hợp thống kê doanh thu.',
        error: message,
      },
      { status: 500 }
    );
  }
}
