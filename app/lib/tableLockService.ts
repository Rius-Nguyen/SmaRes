import crypto from 'node:crypto';
import { Types } from 'mongoose';
import TableLock, {
  TABLE_LOCK_TTL_SECONDS,
  TableLockReleaseReason,
  type ITableLock,
} from '@/app/models/TableLock';
import Reservation, {
  PaymentStatus,
  ReservationStatus,
} from '@/app/models/Reservation';
import Transaction from '@/app/models/Transaction';
import Table, { TableStatus } from '@/app/models/Table';

export interface SerializedTableLock {
  lockId: string;
  lockKey: string;
  tableId: string;
  tableNumber: string;
  date: string;
  time: string;
  sessionId: string;
  reservationId: string | null;
  expiresAt: string;
  ttlSeconds: number;
}

export interface AcquireTableLockInput {
  tableId: string;
  tableNumber?: string;
  date: string;
  time: string;
  sessionId?: string;
  userId?: string | null;
  reservationId?: string | null;
  ttlSeconds?: number;
  now?: Date;
}

export type TableLockConflictReason = 'TABLE_LOCKED' | 'ALREADY_RESERVED';

export type AcquireTableLockResult =
  | {
      acquired: true;
      renewed: boolean;
      lock: SerializedTableLock;
    }
  | {
      acquired: false;
      conflictReason: TableLockConflictReason;
      lockedUntil?: Date | null;
      message: string;
    };

export interface ReleaseTableLockInput {
  lockKey?: string;
  tableId?: string;
  date?: string;
  time?: string;
  reservationId?: string;
  sessionId?: string;
  force?: boolean;
  reason?: TableLockReleaseReason;
  now?: Date;
}

export interface ReleaseTableLockResult {
  released: boolean;
  forbidden: boolean;
  message?: string;
  lockKey: string | null;
  reservationId: string | null;
  updatedPaymentStatus: string | null;
  updatedReservationStatus: string | null;
}

export interface ReleaseExpiredResult {
  expiredLocksCount: number;
  expiredTransactionsCount: number;
  expiredReservationsCount: number;
}

export function buildTableLockKey(tableId: string, date: string, time: string): string {
  return `${tableId.trim()}:${date.trim()}:${time.trim()}`;
}

export function generateLockSessionId(): string {
  return `lock_${crypto.randomBytes(12).toString('hex')}`;
}

export function isDuplicateKeyError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  if ('code' in error && (error as { code?: unknown }).code === 11000) {
    return true;
  }

  if ('cause' in error) {
    return isDuplicateKeyError((error as { cause?: unknown }).cause);
  }

  return false;
}

function serializeLock(doc: ITableLock, ttlSeconds: number): SerializedTableLock {
  return {
    lockId: doc._id ? String(doc._id) : '',
    lockKey: doc.lockKey,
    tableId: String(doc.tableId),
    tableNumber: doc.tableNumber || '',
    date: doc.date,
    time: doc.time,
    sessionId: doc.sessionId,
    reservationId: doc.reservationId ? String(doc.reservationId) : null,
    expiresAt:
      doc.expiresAt instanceof Date
        ? doc.expiresAt.toISOString()
        : new Date(doc.expiresAt).toISOString(),
    ttlSeconds,
  };
}

/**
 * Giải phóng tự động các khóa bàn & giữ chỗ quá hạn 10 phút mà chưa thanh toán PAID.
 * Chống độ trễ dọn TTL (~60s) của MongoDB background thread.
 */
export async function releaseExpiredLocksAndHolds(options?: {
  tableId?: string;
  date?: string;
  time?: string;
  now?: Date;
}): Promise<ReleaseExpiredResult> {
  const now = options?.now ?? new Date();
  const isUnscoped = !options?.tableId && !options?.date && !options?.time;

  const lockFilter: Record<string, unknown> = {
    expiresAt: { $lte: now },
  };
  const reservationFilter: Record<string, unknown> = {
    paymentStatus: PaymentStatus.PENDING,
    holdExpiresAt: { $ne: null, $lte: now },
    status: { $ne: ReservationStatus.CANCELLED },
  };

  if (options?.tableId) {
    lockFilter.tableId = options.tableId;
    reservationFilter.tableId = options.tableId;
  }
  if (options?.date) {
    lockFilter.date = options.date;
    reservationFilter.date = options.date;
  }
  if (options?.time) {
    lockFilter.time = options.time;
    reservationFilter.time = options.time;
  }

  const [expiredLocks, expiredReservations] = await Promise.all([
    TableLock.find(lockFilter).select('_id reservationId tableId').lean(),
    Reservation.find(reservationFilter).select('_id tableId').lean(),
  ]);

  let expiredLocksCount = 0;
  if (expiredLocks.length > 0) {
    const expiredLockIds = expiredLocks.map((lock) => lock._id);
    const deleteRes = await TableLock.deleteMany({ _id: { $in: expiredLockIds } });
    expiredLocksCount = deleteRes.deletedCount ?? expiredLocks.length;
  }

  const reservationIdSet = new Set<string>();
  const affectedTableIdSet = new Set<string>();

  for (const lock of expiredLocks) {
    if (lock.reservationId) {
      reservationIdSet.add(String(lock.reservationId));
    }
    if (lock.tableId) {
      affectedTableIdSet.add(String(lock.tableId));
    }
  }

  for (const res of expiredReservations) {
    if (res._id) {
      reservationIdSet.add(String(res._id));
    }
    if (res.tableId) {
      affectedTableIdSet.add(String(res.tableId));
    }
  }

  const expiredReservationIds = Array.from(reservationIdSet);
  let expiredTransactionsCount = 0;
  let expiredReservationsCount = 0;

  if (expiredReservationIds.length > 0) {
    const [txUpdateRes, rsvUpdateRes] = await Promise.all([
      Transaction.updateMany(
        {
          reservationId: { $in: expiredReservationIds },
          status: 'PENDING',
        },
        {
          $set: { status: 'EXPIRED' },
        }
      ),
      Reservation.updateMany(
        {
          _id: { $in: expiredReservationIds },
          paymentStatus: { $ne: PaymentStatus.PAID },
          status: { $ne: ReservationStatus.CANCELLED },
        },
        {
          $set: {
            paymentStatus: PaymentStatus.EXPIRED,
            status: ReservationStatus.CANCELLED,
            holdExpiresAt: null,
          },
        }
      ),
    ]);

    expiredTransactionsCount += txUpdateRes.modifiedCount ?? 0;
    expiredReservationsCount = rsvUpdateRes.modifiedCount ?? 0;
  }

  if (isUnscoped) {
    const standaloneTxRes = await Transaction.updateMany(
      {
        status: 'PENDING',
        expiresAt: { $lte: now },
      },
      {
        $set: { status: 'EXPIRED' },
      }
    );
    expiredTransactionsCount += standaloneTxRes.modifiedCount ?? 0;
  }

  // Nhả trạng thái bàn từ RESERVED -> AVAILABLE nếu bàn không còn đơn CONFIRMED/CHECKED_IN nào
  for (const tableId of affectedTableIdSet) {
    const activeCount = await Reservation.countDocuments({
      tableId,
      status: { $in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN] },
    });
    if (activeCount === 0) {
      await Table.findOneAndUpdate(
        { _id: tableId, status: TableStatus.RESERVED },
        { $set: { status: TableStatus.AVAILABLE } }
      );
    }
  }

  return {
    expiredLocksCount,
    expiredTransactionsCount,
    expiredReservationsCount,
  };
}

/**
 * Xin khóa bàn tạm thời (Distributed Lock TTL 10 phút) theo cơ chế Atomic.
 * Chống Double Booking & Race Condition khi 2 người dùng bấm thanh toán cùng lúc.
 */
export async function acquireTableLock(
  input: AcquireTableLockInput
): Promise<AcquireTableLockResult> {
  const now = input.now ?? new Date();
  const ttlSeconds =
    input.ttlSeconds && input.ttlSeconds > 0 ? input.ttlSeconds : TABLE_LOCK_TTL_SECONDS;
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
  const lockKey = buildTableLockKey(input.tableId, input.date, input.time);
  const sessionId = input.sessionId?.trim() || generateLockSessionId();
  const normalizedTableNumber = (input.tableNumber ?? '').trim().toUpperCase();

  // 1. Dọn khóa & giữ chỗ đã quá hạn trên chính slot này trước khi kiểm tra
  await releaseExpiredLocksAndHolds({
    tableId: input.tableId,
    date: input.date,
    time: input.time,
    now,
  });

  // 2. Kiểm tra slot đã có đơn đặt bàn hợp lệ (khác chính reservationId đang thanh toán) chưa
  const validReservationId =
    input.reservationId && Types.ObjectId.isValid(input.reservationId)
      ? input.reservationId
      : null;

  const reservationQuery: Record<string, unknown> = {
    tableId: input.tableId,
    date: input.date,
    time: input.time,
    status: { $ne: ReservationStatus.CANCELLED },
  };
  if (validReservationId) {
    reservationQuery._id = { $ne: new Types.ObjectId(validReservationId) };
  }

  const existingReservation = await Reservation.findOne(reservationQuery)
    .select('_id paymentStatus')
    .lean();

  if (existingReservation) {
    return {
      acquired: false,
      conflictReason: 'ALREADY_RESERVED',
      lockedUntil: null,
      message: 'Bàn này đã có người đặt vào khung giờ đã chọn!',
    };
  }

  const lockPayload = {
    tableId: input.tableId,
    tableNumber: normalizedTableNumber,
    date: input.date.trim(),
    time: input.time.trim(),
    sessionId,
    userId:
      input.userId && Types.ObjectId.isValid(input.userId)
        ? new Types.ObjectId(input.userId)
        : null,
    reservationId: validReservationId ? new Types.ObjectId(validReservationId) : null,
    expiresAt,
  };

  // Bước A (Atomic): Nếu lock đã hết hạn hoặc thuộc cùng sessionId -> chiếm lại / gia hạn atomic
  const reclaimed = await TableLock.findOneAndUpdate(
    {
      lockKey,
      $or: [{ expiresAt: { $lte: now } }, { sessionId }],
    },
    { $set: lockPayload },
    { returnDocument: 'after' }
  );

  if (reclaimed) {
    return {
      acquired: true,
      renewed: true,
      lock: serializeLock(reclaimed, ttlSeconds),
    };
  }

  // Bước B (Atomic): Chưa có lock -> Insert mới dựa trên Unique Index trên lockKey
  try {
    const created = await TableLock.create({
      lockKey,
      ...lockPayload,
    });

    return {
      acquired: true,
      renewed: false,
      lock: serializeLock(created, ttlSeconds),
    };
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) {
      const existing = await TableLock.findOne({ lockKey }).select('expiresAt').lean();
      return {
        acquired: false,
        conflictReason: 'TABLE_LOCKED',
        lockedUntil: existing?.expiresAt ?? null,
        message:
          'Bàn này đang được khách hàng khác giữ chỗ thanh toán. Vui lòng chọn bàn khác hoặc thử lại sau.',
      };
    }
    throw err;
  }
}

/**
 * Giải phóng khóa bàn tạm thời khi khách hủy thanh toán, cổng báo FAILED/EXPIRED hoặc đã PAID.
 */
export async function releaseTableLock(
  input: ReleaseTableLockInput
): Promise<ReleaseTableLockResult> {
  const now = input.now ?? new Date();
  const reason = input.reason ?? TableLockReleaseReason.USER_CANCELLED;

  let resolvedLockKey: string | null = input.lockKey?.trim() || null;
  if (!resolvedLockKey && input.tableId && input.date && input.time) {
    resolvedLockKey = buildTableLockKey(input.tableId, input.date, input.time);
  }

  let targetLock: ITableLock | null = null;
  if (resolvedLockKey) {
    targetLock = await TableLock.findOne({ lockKey: resolvedLockKey }).lean();
  } else if (input.reservationId && Types.ObjectId.isValid(input.reservationId)) {
    targetLock = await TableLock.findOne({ reservationId: input.reservationId }).lean();
  }

  if (targetLock) {
    resolvedLockKey = targetLock.lockKey;

    if (!input.force) {
      const lockExpiry =
        targetLock.expiresAt instanceof Date
          ? targetLock.expiresAt
          : new Date(targetLock.expiresAt);
      const isLockActive = lockExpiry.getTime() > now.getTime();
      const trimmedSession = input.sessionId?.trim() || '';
      if (isLockActive && (!trimmedSession || targetLock.sessionId !== trimmedSession)) {
        return {
          released: false,
          forbidden: true,
          message: 'Bạn không có quyền giải phóng khóa bàn của phiên khác.',
          lockKey: resolvedLockKey,
          reservationId: targetLock.reservationId ? String(targetLock.reservationId) : null,
          updatedPaymentStatus: null,
          updatedReservationStatus: null,
        };
      }
    }

    await TableLock.deleteOne({ _id: targetLock._id });
  }

  const targetReservationId =
    input.reservationId?.trim() ||
    (targetLock?.reservationId ? String(targetLock.reservationId) : undefined);

  const targetTableId =
    input.tableId?.trim() ||
    (targetLock?.tableId ? String(targetLock.tableId) : undefined);

  let updatedPaymentStatus: string | null = null;
  let updatedReservationStatus: string | null = null;

  if (
    reason !== TableLockReleaseReason.PAYMENT_PAID &&
    targetReservationId &&
    Types.ObjectId.isValid(targetReservationId)
  ) {
    const nextStatus =
      reason === TableLockReleaseReason.EXPIRED ? PaymentStatus.EXPIRED : PaymentStatus.FAILED;

    await Transaction.updateMany(
      { reservationId: targetReservationId, status: 'PENDING' },
      { $set: { status: nextStatus } }
    );

    const updatedReservation = await Reservation.findOneAndUpdate(
      {
        _id: targetReservationId,
        paymentStatus: { $ne: PaymentStatus.PAID },
      },
      {
        $set: {
          paymentStatus: nextStatus,
          status: ReservationStatus.CANCELLED,
          holdExpiresAt: null,
        },
      },
      { returnDocument: 'after' }
    );

    if (updatedReservation) {
      updatedPaymentStatus = updatedReservation.paymentStatus ?? nextStatus;
      updatedReservationStatus = updatedReservation.status;
    }

    const resolvedTableId =
      targetTableId || (updatedReservation?.tableId ? String(updatedReservation.tableId) : undefined);

    if (updatedReservation && resolvedTableId) {
      const activeCount = await Reservation.countDocuments({
        tableId: resolvedTableId,
        status: { $in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN] },
      });
      if (activeCount === 0) {
        await Table.findOneAndUpdate(
          { _id: resolvedTableId, status: TableStatus.RESERVED },
          { $set: { status: TableStatus.AVAILABLE } }
        );
      }
    }
  }

  return {
    released: Boolean(targetLock || updatedReservationStatus),
    forbidden: false,
    lockKey: resolvedLockKey,
    reservationId: targetReservationId ?? null,
    updatedPaymentStatus,
    updatedReservationStatus,
  };
}
