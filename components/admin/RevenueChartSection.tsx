"use client";

import React, { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  RevenuePeriod,
  type RevenueApiPayload,
  type RevenueSeriesPoint,
} from '@/app/lib/adminRevenue';
import { formatMoney } from '@/app/lib/format';

interface RevenueApiResponse {
  success?: boolean;
  message?: string;
  data?: RevenueApiPayload;
}

export interface RevenueChartSectionProps {
  refreshNonce?: number;
  onAuthError?: (status: 401 | 403, message: string) => void;
}

interface TooltipPayloadEntryLike {
  payload?: unknown;
}

interface RevenueTooltipContentProps {
  active?: boolean;
  payload?: ReadonlyArray<TooltipPayloadEntryLike>;
  period: RevenuePeriod;
}

const PERIOD_SWITCH_OPTIONS: ReadonlyArray<{ value: RevenuePeriod; label: string }> = [
  { value: RevenuePeriod.DAY, label: 'Theo ngày' },
  { value: RevenuePeriod.WEEK, label: 'Theo tuần' },
];

function formatCompactAxisMoney(val: number): string {
  if (val <= 0) return '0';
  if (val >= 1_000_000) {
    const millions = val / 1_000_000;
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}tr`;
  }
  if (val >= 1_000) {
    return `${Math.round(val / 1_000)}k`;
  }
  return String(Math.round(val));
}

function formatVietnameseDate(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function isRevenueSeriesPoint(value: unknown): value is RevenueSeriesPoint {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.key === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.startDate === 'string' &&
    typeof candidate.endDate === 'string' &&
    typeof candidate.revenue === 'number' &&
    typeof candidate.orders === 'number'
  );
}

function RevenueTooltipContent({
  active,
  payload,
  period,
}: RevenueTooltipContentProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const rawPoint = payload[0]?.payload;
  if (!isRevenueSeriesPoint(rawPoint)) {
    return null;
  }

  const rangeDisplay =
    period === RevenuePeriod.WEEK
      ? `Tuần ${formatVietnameseDate(rawPoint.startDate)} – ${formatVietnameseDate(rawPoint.endDate)}`
      : formatVietnameseDate(rawPoint.startDate);

  return (
    <div className="rounded-xl border border-[#EBE7DF] bg-white px-3.5 py-2.5 shadow-[0_12px_28px_-4px_rgba(28,25,23,0.14)] text-xs space-y-1">
      <p className="font-serif font-bold text-[#1C1917]">{rangeDisplay}</p>
      <p className="font-bold text-[#14532D]">
        Doanh thu: {formatMoney(rawPoint.revenue)}
      </p>
      <p className="text-[#57534E]">
        Đơn hợp lệ: <strong className="text-[#1C1917]">{rawPoint.orders}</strong> đơn
      </p>
    </div>
  );
}

export default function RevenueChartSection({
  refreshNonce = 0,
  onAuthError,
}: RevenueChartSectionProps) {
  const [period, setPeriod] = useState<RevenuePeriod>(RevenuePeriod.DAY);
  const [localRetryNonce, setLocalRetryNonce] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [revenueData, setRevenueData] = useState<RevenueApiPayload | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadRevenue = async () => {
      try {
        const res = await fetch(
          `/api/admin/revenue?period=${encodeURIComponent(period)}`,
          {
            method: 'GET',
            cache: 'no-store',
          }
        );

        if (isCancelled) return;

        const json = (await res.json().catch(() => ({}))) as RevenueApiResponse;

        if (res.status === 401 || res.status === 403) {
          const authMsg =
            json.message ||
            'Chỉ Quản trị viên (Admin) mới được phép truy cập biểu đồ doanh thu.';
          setErrorMessage(authMsg);
          onAuthError?.(res.status, authMsg);
          return;
        }

        if (!res.ok || !json.success || !json.data) {
          setErrorMessage(json.message || 'Không thể tải dữ liệu biểu đồ doanh thu.');
          return;
        }

        setErrorMessage('');
        setRevenueData(json.data);
      } catch (err) {
        console.error('Lỗi tải biểu đồ doanh thu:', err);
        if (!isCancelled) {
          setErrorMessage('Lỗi kết nối máy chủ khi tải dữ liệu doanh thu.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    void loadRevenue();

    return () => {
      isCancelled = true;
    };
  }, [period, refreshNonce, localRetryNonce, onAuthError]);

  const handleSelectPeriod = (nextPeriod: RevenuePeriod) => {
    if (nextPeriod === period) return;
    setIsRefreshing(true);
    setPeriod(nextPeriod);
  };

  const handleRetry = () => {
    setIsRefreshing(true);
    setLocalRetryNonce((n) => n + 1);
  };

  const series = revenueData?.series ?? [];
  const summary = revenueData?.summary ?? {
    totalRevenue: 0,
    validOrders: 0,
    avgOrderValue: 0,
    peakBucket: null,
  };
  const peakKey = summary.peakBucket?.key ?? null;

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#EBE7DF] shadow-[0_4px_20px_-2px_rgba(28,25,23,0.06)] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-serif font-bold text-[#1C1917]">
              Biểu đồ doanh thu theo {period === RevenuePeriod.WEEK ? 'tuần' : 'ngày'}
            </h2>
            {isRefreshing && !isLoading && (
              <span className="px-2 py-0.5 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] text-[10px] font-semibold text-[#15803D]">
                Đang cập nhật...
              </span>
            )}
          </div>
          <p className="text-xs text-[#57534E] mt-0.5">
            {revenueData?.rangeLabel ??
              (period === RevenuePeriod.WEEK ? '8 tuần gần nhất' : '14 ngày gần nhất')}{' '}
            • Múi giờ Asia/Ho_Chi_Minh (+07:00) • Không tính đơn hủy
          </p>
        </div>

        <div
          className="inline-flex items-center bg-[#F5F2EB] p-1 rounded-xl border border-[#EBE7DF] self-start sm:self-auto"
          role="group"
          aria-label="Chuyển đổi chu kỳ biểu đồ doanh thu"
        >
          {PERIOD_SWITCH_OPTIONS.map((opt) => {
            const isActive = period === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelectPeriod(opt.value)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#14532D] text-white shadow-xs'
                    : 'text-[#57534E] hover:text-[#1C1917] hover:bg-white/70'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3 mini KPI summary pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#15803D]">
            Tổng doanh thu kỳ
          </p>
          <p className="text-base font-serif font-bold text-[#14532D] mt-0.5">
            {formatMoney(summary.totalRevenue)}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EBE7DF]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#78716C]">
            Đơn hợp lệ &amp; TB đơn
          </p>
          <p className="text-sm font-serif font-bold text-[#1C1917] mt-1">
            {summary.validOrders.toLocaleString('vi-VN')} đơn •{' '}
            <span className="text-[#14532D]">{formatMoney(summary.avgOrderValue)}</span>
          </p>
        </div>

        <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#B45309]">
            Mốc cao nhất
          </p>
          {summary.peakBucket ? (
            <p className="text-sm font-serif font-bold text-[#92400E] mt-1">
              {summary.peakBucket.label}: {formatMoney(summary.peakBucket.revenue)}
            </p>
          ) : (
            <p className="text-xs text-[#78716C] mt-1">Chưa phát sinh doanh thu</p>
          )}
        </div>
      </div>

      {/* Error alert if fetch failed */}
      {errorMessage && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 text-xs text-rose-800"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={handleRetry}
            className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-semibold shrink-0 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Recharts BarChart */}
      {isLoading ? (
        <div className="h-[300px] w-full rounded-xl bg-[#FAF8F5] border border-[#EBE7DF] animate-pulse" />
      ) : (
        <div className="w-full h-[300px] min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart
              data={series}
              margin={{ top: 12, right: 12, left: 4, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="4 4" stroke="#EBE7DF" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#78716C', fontSize: 11 }}
                axisLine={{ stroke: '#EBE7DF' }}
                tickLine={false}
                interval={period === RevenuePeriod.DAY && series.length > 10 ? 1 : 0}
              />
              <YAxis
                tickFormatter={formatCompactAxisMoney}
                tick={{ fill: '#78716C', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={54}
              />
              <Tooltip
                cursor={{ fill: 'rgba(20, 83, 45, 0.06)' }}
                content={(tooltipProps) => (
                  <RevenueTooltipContent
                    active={tooltipProps.active}
                    payload={tooltipProps.payload}
                    period={period}
                  />
                )}
              />
              <Bar
                dataKey="revenue"
                name="Doanh thu"
                radius={[8, 8, 0, 0]}
                maxBarSize={44}
              >
                {series.map((point) => {
                  const isPeak = peakKey !== null && point.key === peakKey;
                  const fill =
                    point.revenue <= 0
                      ? '#EBE7DF'
                      : isPeak
                        ? '#D97706'
                        : '#14532D';
                  return <Cell key={point.key} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#57534E] pt-1 border-t border-[#EBE7DF]">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#14532D]" />
            Doanh thu định kỳ
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#D97706]" />
            Mốc cao nhất kỳ
          </span>
        </div>
        <span>Thư viện biểu đồ: Recharts</span>
      </div>
    </div>
  );
}
