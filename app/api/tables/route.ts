import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/app/lib/db';
import Table from '@/app/models/Table';
import Reservation, { ReservationStatus, type IReservation } from '@/app/models/Reservation';
import { requireRole } from '@/app/lib/auth';
import {
  DINING_DURATION_MS,
  RESERVATION_HOLD_GRACE_MS,
  computeCleaningSchedule,
  computeDiningInterval,
  computeTableTimingMeta,
  findDueConfirmedReservationForAutoHold,
} from '@/app/lib/reservationHelpers';
import {
  TABLE_STATUS,
  type TableStatusValue,
  canTransitionTableStatus,
  getReservationStatusForTransition,
  normalizeTableStatus,
} from '@/app/lib/tableStateMachine';

export const dynamic = 'force-dynamic';

interface TableStatusCounts {
  total: number;
  AVAILABLE: number;
  RESERVED: number;
  SEATED: number;
  CLEANING: number;
}

interface ActiveReservationSummary {
  _id: string;
  bookingCode: string;
  customerName: string;
  phone: string;
  date: string;
  time: string;
  startTime: string | null;
  endTime: string | null;
  guests: number;
  note: string;
  status: ReservationStatus;
  checkInTime: Date | string | null;
}

function getVietnamTodayDate(): string {
  const vnTimeMs = Date.now() + 7 * 60 * 60 * 1000;
  return new Date(vnTimeMs).toISOString().slice(0, 10);
}

function generateTableQrToken(tableNumber: string): string {
  const timeCode = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `SMARES-${tableNumber}-${timeCode}-${rand}`;
}

function toReservationSummary(
  res: IReservation & { _id?: unknown }
): ActiveReservationSummary {
  const fallbackInterval = computeDiningInterval(res.date, res.time);
  const startIso =
    res.startTime instanceof Date
      ? res.startTime.toISOString()
      : typeof res.startTime === 'string'
        ? res.startTime
        : fallbackInterval
          ? fallbackInterval.startTime.toISOString()
          : null;
  const endIso =
    res.endTime instanceof Date
      ? res.endTime.toISOString()
      : typeof res.endTime === 'string'
        ? res.endTime
        : fallbackInterval
          ? fallbackInterval.endTime.toISOString()
          : null;

  return {
    _id: String(res._id ?? ''),
    bookingCode: res.bookingCode,
    customerName: res.customerName || 'Khách tại bàn',
    phone: res.phone,
    date: res.date,
    time: res.time,
    startTime: startIso,
    endTime: endIso,
    guests: res.guests,
    note: res.note ?? '',
    status: res.status,
    checkInTime: res.checkInTime ?? null,
  };
}

function pickPrimaryReservation(
  reservations: readonly ActiveReservationSummary[],
  todayDate: string,
  tableStatus?: TableStatusValue
): ActiveReservationSummary | null {
  const checkedIn = reservations.find((r) => r.status === ReservationStatus.CHECKED_IN);
  if (checkedIn) {
    return checkedIn;
  }

  // Bàn đang SEATED mà không có đơn CHECKED_IN là phiên Walk-in -> không gắn nhầm đơn CONFIRMED giờ sau
  if (tableStatus === TABLE_STATUS.SEATED) {
    return null;
  }

  const upcomingConfirmed = reservations.filter(
    (r) => r.status === ReservationStatus.CONFIRMED && r.date >= todayDate
  );
  const todayConfirmed = upcomingConfirmed.find((r) => r.date === todayDate);
  if (todayConfirmed) {
    return todayConfirmed;
  }

  return upcomingConfirmed[0] ?? null;
}

function pickNextReservation(
  reservations: readonly ActiveReservationSummary[],
  activeReservation: ActiveReservationSummary | null,
  todayDate: string
): ActiveReservationSummary | null {
  const candidates = reservations.filter(
    (r) =>
      r.status === ReservationStatus.CONFIRMED &&
      r.date >= todayDate &&
      (!activeReservation || r._id !== activeReservation._id)
  );
  if (candidates.length === 0) return null;

  const todayCandidates = candidates.filter((r) => r.date === todayDate);
  const pool = todayCandidates.length > 0 ? todayCandidates : candidates;

  return [...pool].sort((a, b) => {
    const aMs = a.startTime ? Date.parse(a.startTime) : Number.POSITIVE_INFINITY;
    const bMs = b.startTime ? Date.parse(b.startTime) : Number.POSITIVE_INFINITY;
    return aMs - bMs;
  })[0] ?? null;
}

async function expireStalePastReservations(todayDate: string, now: Date): Promise<void> {
  const pastConfirmed = await Reservation.find({
    date: { $lt: todayDate },
    status: ReservationStatus.CONFIRMED,
  })
    .select('_id tableId date time startTime endTime')
    .lean();

  if (pastConfirmed.length === 0) {
    return;
  }

  const nowMs = now.getTime();
  const expiredIds: string[] = [];
  const affectedTableIds = new Set<string>();

  for (const r of pastConfirmed) {
    const fallback = computeDiningInterval(r.date, r.time);
    const startMs =
      r.startTime instanceof Date
        ? r.startTime.getTime()
        : fallback?.startTime.getTime() ?? Number.NaN;
    const endMs =
      r.endTime instanceof Date
        ? r.endTime.getTime()
        : fallback?.endTime.getTime() ?? Number.NaN;

    const graceMs = Number.isFinite(startMs) ? startMs + RESERVATION_HOLD_GRACE_MS : 0;
    const effectiveEndMs = Number.isFinite(endMs) ? Math.max(graceMs, endMs) : graceMs;

    if (nowMs > effectiveEndMs && r._id) {
      expiredIds.push(String(r._id));
      if (r.tableId) {
        affectedTableIds.add(String(r.tableId));
      }
    }
  }

  if (expiredIds.length === 0) {
    return;
  }

  await Reservation.updateMany(
    { _id: { $in: expiredIds }, status: ReservationStatus.CONFIRMED },
    { $set: { status: ReservationStatus.CANCELLED } }
  );

  for (const tblId of affectedTableIds) {
    const remainingUpcoming = await Reservation.countDocuments({
      tableId: tblId,
      date: { $gte: todayDate },
      status: { $in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN] },
    });
    if (remainingUpcoming === 0) {
      await Table.findOneAndUpdate(
        {
          _id: tblId,
          status: TABLE_STATUS.RESERVED,
          $or: [{ holdExpiresAt: null }, { holdExpiresAt: { $lte: now } }],
        },
        { $set: { status: TABLE_STATUS.AVAILABLE, holdExpiresAt: null } }
      );
    }
  }
}

function toIsoOrNull(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireRole(request, ['staff', 'admin']);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

    await connectDB();

    const now = new Date();
    const todayDate = getVietnamTodayDate();

    await expireStalePastReservations(todayDate, now);

    const [tables, activeReservations] = await Promise.all([
      Table.find({}).sort({ tableNumber: 1 }).lean(),
      Reservation.find({
        status: {
          $in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN],
        },
        $or: [{ status: ReservationStatus.CHECKED_IN }, { date: { $gte: todayDate } }],
      })
        .sort({ date: 1, time: 1, updatedAt: -1, createdAt: -1 })
        .lean(),
    ]);

    const reservationsByTableId = new Map<string, ActiveReservationSummary[]>();
    for (const res of activeReservations) {
      const key = String(res.tableId);
      const list = reservationsByTableId.get(key) ?? [];
      list.push(toReservationSummary(res));
      reservationsByTableId.set(key, list);
    }

    const counts: TableStatusCounts = {
      total: tables.length,
      AVAILABLE: 0,
      RESERVED: 0,
      SEATED: 0,
      CLEANING: 0,
    };

    const nowMs = now.getTime();
    const enrichedTables = await Promise.all(
      tables.map(async (table) => {
        let normalizedStatus: TableStatusValue =
          normalizeTableStatus(table.status) ?? TABLE_STATUS.AVAILABLE;
        const tableReservations = reservationsByTableId.get(String(table._id)) ?? [];

        // Chỉ tự động chuyển bàn AVAILABLE -> RESERVED khi tới giờ khách đặt hôm nay mà chưa Check-in;
        // không tự động động vào các trạng thái khác (SEATED, CLEANING, AVAILABLE).
        if (normalizedStatus === TABLE_STATUS.AVAILABLE) {
          const dueReservation = findDueConfirmedReservationForAutoHold(
            tableReservations,
            todayDate,
            nowMs
          );
          if (dueReservation) {
            const autoReservedTable = await Table.findOneAndUpdate(
              { _id: table._id, status: TABLE_STATUS.AVAILABLE },
              { $set: { status: TABLE_STATUS.RESERVED, holdExpiresAt: null } },
              { new: true }
            ).lean();
            if (autoReservedTable) {
              normalizedStatus = TABLE_STATUS.RESERVED;
            }
          }
        }

        counts[normalizedStatus] += 1;

        const activeReservation = pickPrimaryReservation(
          tableReservations,
          todayDate,
          normalizedStatus
        );
        const nextReservation =
          normalizedStatus === TABLE_STATUS.SEATED || normalizedStatus === TABLE_STATUS.CLEANING
            ? pickNextReservation(tableReservations, activeReservation, todayDate)
            : null;
        const timingMeta = computeTableTimingMeta({
          tableStatus: normalizedStatus,
          tableUpdatedAt: table.updatedAt ?? null,
          tableSeatedAt: (table as { seatedAt?: Date | null }).seatedAt ?? null,
          tableHoldExpiresAt:
            normalizedStatus === TABLE_STATUS.RESERVED
              ? ((table as { holdExpiresAt?: Date | null }).holdExpiresAt ?? null)
              : null,
          activeReservation,
        });

        return {
          _id: String(table._id),
          tableNumber: table.tableNumber || '',
          capacity: table.capacity,
          zoneName: table.zoneName || 'Khu vực chính',
          status: normalizedStatus,
          qrToken: table.qrToken ?? null,
          seatedAt: toIsoOrNull((table as { seatedAt?: Date | null }).seatedAt),
          holdExpiresAt:
            normalizedStatus === TABLE_STATUS.RESERVED
              ? toIsoOrNull((table as { holdExpiresAt?: Date | null }).holdExpiresAt)
              : null,
          activeReservation,
          nextReservation,
          reservations: tableReservations,
          startTime: timingMeta.startTime,
          endTime: timingMeta.endTime,
          diningStartAt: timingMeta.diningStartAt,
          diningEndAt: timingMeta.diningEndAt,
          graceExpiresAt: timingMeta.graceExpiresAt,
          cleaningStartedAt: toIsoOrNull(table.cleaningStartedAt),
          cleaningDeadlineAt: toIsoOrNull(table.cleaningDeadlineAt),
          cleaningType: table.cleaningType ?? null,
          createdAt: table.createdAt ?? null,
          updatedAt: table.updatedAt ?? null,
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        todayDate,
        counts,
        tables: enrichedTables,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Lỗi API GET /api/tables:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi máy chủ khi tải danh sách bàn.',
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = requireRole(request, ['staff', 'admin']);
    if (auth.errorResponse) {
      return auth.errorResponse;
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'Dữ liệu JSON không hợp lệ.' },
        { status: 400 }
      );
    }

    if (typeof rawBody !== 'object' || rawBody === null) {
      return NextResponse.json(
        { success: false, message: 'Dữ liệu cập nhật bàn không hợp lệ.' },
        { status: 400 }
      );
    }

    const body = rawBody as Record<string, unknown>;
    const tableId = typeof body.tableId === 'string' ? body.tableId.trim() : '';
    const nextStatus = normalizeTableStatus(body.nextStatus ?? body.status);
    const reservationId =
      typeof body.reservationId === 'string' ? body.reservationId.trim() : '';
    const isWalkIn = body.isWalkIn === true;
    const customerName =
      typeof body.customerName === 'string' ? body.customerName.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';

    if (!tableId || !mongoose.Types.ObjectId.isValid(tableId)) {
      return NextResponse.json(
        { success: false, message: 'Mã bàn (tableId) không hợp lệ.' },
        { status: 400 }
      );
    }

    if (!nextStatus) {
      return NextResponse.json(
        {
          success: false,
          message: 'Trạng thái bàn tiếp theo (nextStatus) phải là AVAILABLE, RESERVED, SEATED hoặc CLEANING.',
        },
        { status: 400 }
      );
    }

    if (reservationId && !mongoose.Types.ObjectId.isValid(reservationId)) {
      return NextResponse.json(
        { success: false, message: 'Mã đặt bàn (reservationId) không hợp lệ.' },
        { status: 400 }
      );
    }

    await connectDB();

    const table = await Table.findById(tableId);
    if (!table) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy bàn ăn được yêu cầu.' },
        { status: 404 }
      );
    }

    const previousStatus: TableStatusValue =
      normalizeTableStatus(table.status) ?? TABLE_STATUS.AVAILABLE;

    if (!canTransitionTableStatus(previousStatus, nextStatus)) {
      return NextResponse.json(
        {
          success: false,
          message: `Không thể chuyển trạng thái bàn ${table.tableNumber} từ ${previousStatus} sang ${nextStatus}.`,
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const todayDate = getVietnamTodayDate();
    await expireStalePastReservations(todayDate, now);

    const targetReservationStatus = getReservationStatusForTransition(
      nextStatus,
      previousStatus
    );

    let updatedReservation: ActiveReservationSummary | null = null;
    let walkInCustomer: { customerName: string; phone: string } | null = null;

    if (nextStatus === TABLE_STATUS.RESERVED) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Trạng thái giữ bàn (RESERVED) được hệ thống tự động chuyển khi tới giờ hẹn mà khách chưa Check-in; nhân viên chỉ bấm Check-in khi khách tới.',
        },
        { status: 400 }
      );
    } else if (nextStatus === TABLE_STATUS.SEATED) {
      if (!table.qrToken || !table.qrToken.trim()) {
        table.qrToken = generateTableQrToken(table.tableNumber);
      }

      table.seatedAt = now;
      table.holdExpiresAt = null;
      table.cleaningStartedAt = null;
      table.cleaningDeadlineAt = null;
      table.cleaningType = null;

      if (reservationId) {
        const matchedReservation = await Reservation.findOne({
          _id: reservationId,
          tableId: table._id,
          status: ReservationStatus.CONFIRMED,
        });

        if (!matchedReservation) {
          return NextResponse.json(
            {
              success: false,
              message: 'Không tìm thấy đơn đặt bàn CONFIRMED phù hợp cho bàn này.',
            },
            { status: 404 }
          );
        }

        matchedReservation.status = ReservationStatus.CHECKED_IN;
        matchedReservation.checkInTime = now;
        await matchedReservation.save();
        updatedReservation = toReservationSummary(matchedReservation);
      } else if (!isWalkIn) {
        // Chỉ tự ghép đơn CONFIRMED hôm nay nếu giờ hẹn nằm gần hiện tại (-60p .. +60p), tránh cướp lịch buổi tối (VD 20:00)
        const todayConfirmedList = await Reservation.find({
          tableId: table._id,
          date: todayDate,
          status: ReservationStatus.CONFIRMED,
        }).sort({ startTime: 1, time: 1 });

        const nowMs = now.getTime();
        const dueTodayConfirmed = todayConfirmedList.find((res) => {
          const fallback = computeDiningInterval(res.date, res.time);
          const startMs =
            res.startTime instanceof Date
              ? res.startTime.getTime()
              : fallback?.startTime.getTime() ?? Number.NaN;
          if (!Number.isFinite(startMs)) return false;
          return nowMs >= startMs - 60 * 60 * 1000 && nowMs <= startMs + 60 * 60 * 1000;
        });

        if (dueTodayConfirmed) {
          dueTodayConfirmed.status = ReservationStatus.CHECKED_IN;
          dueTodayConfirmed.checkInTime = now;
          await dueTodayConfirmed.save();
          updatedReservation = toReservationSummary(dueTodayConfirmed);
        } else {
          walkInCustomer = {
            customerName: customerName || 'Khách tại bàn',
            phone,
          };
        }
      } else {
        walkInCustomer = {
          customerName: customerName || 'Khách tại bàn',
          phone,
        };
      }
    } else if (
      previousStatus === TABLE_STATUS.SEATED &&
      nextStatus === TABLE_STATUS.CLEANING &&
      targetReservationStatus === ReservationStatus.COMPLETED
    ) {
      const [checkedInReservation, upcomingConfirmed] = await Promise.all([
        Reservation.findOne({
          tableId: table._id,
          status: ReservationStatus.CHECKED_IN,
        })
          .sort({ updatedAt: -1, createdAt: -1 })
          .lean(),
        Reservation.find({
          tableId: table._id,
          date: todayDate,
          status: ReservationStatus.CONFIRMED,
        })
          .sort({ startTime: 1, time: 1 })
          .lean(),
      ]);

      let diningEndMs: number | null = null;
      if (checkedInReservation) {
        const summary = toReservationSummary(checkedInReservation);
        const timing = computeTableTimingMeta({
          tableStatus: TABLE_STATUS.SEATED,
          tableUpdatedAt: table.updatedAt ?? null,
          tableSeatedAt: table.seatedAt ?? null,
          activeReservation: summary,
        });
        diningEndMs = timing.diningEndAt ? Date.parse(timing.diningEndAt) : null;
      } else {
        const walkInAnchor = table.seatedAt ?? table.updatedAt;
        if (walkInAnchor instanceof Date) {
          diningEndMs = walkInAnchor.getTime() + DINING_DURATION_MS;
        }
      }

      const nextConfirmed = upcomingConfirmed[0]
        ? toReservationSummary(upcomingConfirmed[0])
        : null;
      const nextStartMs =
        nextConfirmed?.startTime && Number.isFinite(Date.parse(nextConfirmed.startTime))
          ? Date.parse(nextConfirmed.startTime)
          : null;

      const schedule = computeCleaningSchedule({
        nowMs: now.getTime(),
        diningEndMs,
        nextReservationStartMs: nextStartMs,
        hasNextReservation: Boolean(nextConfirmed),
      });

      table.cleaningStartedAt = schedule.cleaningStartedAt;
      table.cleaningDeadlineAt = schedule.cleaningDeadlineAt;
      table.cleaningType = schedule.cleaningType;
      table.seatedAt = null;
      table.holdExpiresAt = null;

      await Reservation.updateMany(
        {
          tableId: table._id,
          status: ReservationStatus.CHECKED_IN,
        },
        {
          $set: {
            status: ReservationStatus.COMPLETED,
            actualEndTime: now,
          },
        }
      );
    } else if (nextStatus === TABLE_STATUS.AVAILABLE) {
      table.seatedAt = null;
      table.holdExpiresAt = null;
      table.cleaningStartedAt = null;
      table.cleaningDeadlineAt = null;
      table.cleaningType = null;

      if (
        previousStatus === TABLE_STATUS.RESERVED &&
        targetReservationStatus === ReservationStatus.CANCELLED &&
        reservationId
      ) {
        const cancelledReservation = await Reservation.findOneAndUpdate(
          {
            _id: reservationId,
            tableId: table._id,
            status: ReservationStatus.CONFIRMED,
          },
          {
            $set: { status: ReservationStatus.CANCELLED },
          },
          { new: true }
        );
        if (cancelledReservation) {
          updatedReservation = toReservationSummary(cancelledReservation);
        }
      }
    }

    table.status = nextStatus;
    await table.save();

    const activeTableReservations = await Reservation.find({
      tableId: table._id,
      status: {
        $in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN],
      },
      $or: [{ status: ReservationStatus.CHECKED_IN }, { date: { $gte: todayDate } }],
    })
      .sort({ date: 1, time: 1, updatedAt: -1, createdAt: -1 })
      .lean();

    const reservationSummaries = activeTableReservations.map((res) =>
      toReservationSummary(res)
    );
    const activeReservation = pickPrimaryReservation(
      reservationSummaries,
      todayDate,
      nextStatus
    );
    const nextReservation =
      nextStatus === TABLE_STATUS.SEATED || nextStatus === TABLE_STATUS.CLEANING
        ? pickNextReservation(reservationSummaries, activeReservation, todayDate)
        : null;
    const timingMeta = computeTableTimingMeta({
      tableStatus: nextStatus,
      tableUpdatedAt: table.updatedAt ?? new Date(),
      tableSeatedAt: table.seatedAt ?? null,
      tableHoldExpiresAt: table.holdExpiresAt ?? null,
      activeReservation,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Đã cập nhật Bàn ${table.tableNumber}: ${previousStatus} → ${nextStatus}.`,
        data: {
          table: {
            _id: String(table._id),
            tableNumber: table.tableNumber || '',
            capacity: table.capacity,
            zoneName: table.zoneName || 'Khu vực chính',
            status: nextStatus,
            qrToken: table.qrToken ?? null,
            seatedAt: toIsoOrNull(table.seatedAt),
            holdExpiresAt: toIsoOrNull(table.holdExpiresAt),
            activeReservation,
            nextReservation,
            reservations: reservationSummaries,
            startTime: timingMeta.startTime,
            endTime: timingMeta.endTime,
            diningStartAt: timingMeta.diningStartAt,
            diningEndAt: timingMeta.diningEndAt,
            graceExpiresAt: timingMeta.graceExpiresAt,
            cleaningStartedAt: toIsoOrNull(table.cleaningStartedAt),
            cleaningDeadlineAt: toIsoOrNull(table.cleaningDeadlineAt),
            cleaningType: table.cleaningType ?? null,
            updatedAt: table.updatedAt ?? null,
          },
          updatedReservation,
          walkInCustomer,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Lỗi API PATCH /api/tables:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi máy chủ khi cập nhật trạng thái bàn.',
        error: message,
      },
      { status: 500 }
    );
  }
}
