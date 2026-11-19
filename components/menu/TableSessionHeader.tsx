"use client";

import React from "react";
import Link from "next/link";

export type TableSessionStatus =
  | "CHECKING"
  | "SEATED"
  | "AVAILABLE"
  | "RESERVED"
  | "CLEANING"
  | "LOCKED";

interface TableSessionHeaderProps {
  tableNumber: string;
  zoneName?: string;
  customerName?: string;
  sessionStatus: TableSessionStatus;
  canOrder: boolean;
  totalItems: number;
  onRefresh?: () => void;
  onOpenCallWaiter?: () => void;
}

function getStatusBadge(sessionStatus: TableSessionStatus, canOrder: boolean) {
  if (sessionStatus === "CHECKING") {
    return {
      label: "Đang kiểm tra bàn",
      className: "bg-stone-100 text-stone-700 border-stone-200",
    };
  }
  if (canOrder || sessionStatus === "SEATED") {
    return {
      label: "Đang phục vụ",
      className: "bg-emerald-100 text-[#14532D] border-emerald-200",
    };
  }
  if (sessionStatus === "RESERVED") {
    return {
      label: "Đã đặt trước",
      className: "bg-amber-100 text-[#B45309] border-amber-200",
    };
  }
  if (sessionStatus === "CLEANING") {
    return {
      label: "Đang dọn bàn",
      className: "bg-stone-100 text-stone-700 border-stone-200",
    };
  }
  return {
    label: "Chưa mở phiên",
    className: "bg-amber-50 text-[#B45309] border-amber-200",
  };
}

export default function TableSessionHeader({
  tableNumber,
  zoneName,
  customerName,
  sessionStatus,
  canOrder,
  totalItems,
  onRefresh,
  onOpenCallWaiter,
}: TableSessionHeaderProps) {
  const badge = getStatusBadge(sessionStatus, canOrder);

  return (
    <header className="sticky top-0 z-30 border-b border-[#EBE7DF] bg-[#FAF8F5]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        {/* Khối nhận diện bàn đang ngồi (BR-ORD-01) */}
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            href="/"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#14532D] font-serif text-sm font-bold text-white shadow-2xs transition hover:bg-[#0F4C3A]"
            aria-label="Trang chủ SmaRes"
          >
            S
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-serif text-base font-bold text-[#1C1917] sm:text-lg">
                Bàn {tableNumber || "—"}
              </span>
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    canOrder || sessionStatus === "SEATED"
                      ? "bg-emerald-600"
                      : "bg-amber-500"
                  }`}
                />
                {badge.label}
              </span>
            </div>

            <p className="truncate text-[11px] text-stone-500">
              {zoneName || "Khu vực nhà hàng"}
              {customerName ? ` • Khách: ${customerName}` : ""}
            </p>
          </div>
        </div>

        {/* Các hành động nhanh gọn ở góc phải */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              aria-label="Làm mới trạng thái bàn"
              className="rounded-xl border border-[#D6D0C4] bg-white p-2 text-stone-700 transition hover:bg-stone-100 cursor-pointer"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}

          {onOpenCallWaiter && (
            <button
              type="button"
              onClick={onOpenCallWaiter}
              className="inline-flex items-center gap-1 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-xs font-semibold text-[#92400E] transition hover:bg-[#FEF3C7] cursor-pointer"
            >
              <svg
                className="h-3.5 w-3.5 text-[#D97706]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span className="hidden sm:inline">Gọi nhân viên</span>
            </button>
          )}

          <Link
            href={`/cart?table=${encodeURIComponent(tableNumber)}`}
            aria-label="Xem giỏ hàng"
            className="relative inline-flex items-center gap-1 rounded-xl bg-[#14532D] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0F4C3A]"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <span>Giỏ ({totalItems})</span>
          </Link>
        </div>
      </div>

      {/* Thông báo gọn khi bàn chưa mở phiên gọi món (BR-ORD-09) */}
      {sessionStatus !== "CHECKING" && !canOrder && (
        <div className="border-t border-amber-200 bg-amber-50 px-4 py-1.5 text-xs text-amber-900">
          <div className="mx-auto max-w-5xl">
            Bàn {tableNumber || "—"} hiện chưa ở trạng thái đang phục vụ. Bạn vẫn có thể xem thực đơn thu gọn nhưng thao tác gọi món đang tạm khóa.
          </div>
        </div>
      )}
    </header>
  );
}