import { Types } from 'mongoose';
import Table from '@/app/models/Table';
import Reservation, { ReservationStatus } from '@/app/models/Reservation';
import {
  validateTableQrAccessCore,
  type QrReservationRecord,
  type QrTableRecord,
  type ValidateQrAccessPayload,
  type ValidateQrAccessResult,
} from './validateTableQrAccessCore';

export type {
  QrReservationRecord,
  QrTableRecord,
  ValidateQrAccessDeniedData,
  ValidateQrAccessDeps,
  ValidateQrAccessPayload,
  ValidateQrAccessResult,
  ValidateQrAccessSuccessData,
} from './validateTableQrAccessCore';

export async function validateTableQrAccessService(
  payload: ValidateQrAccessPayload
): Promise<ValidateQrAccessResult> {
  return validateTableQrAccessCore(payload, {
    async findTableByNumber(tableNumber: string): Promise<QrTableRecord | null> {
      return Table.findOne({ tableNumber }).lean<QrTableRecord | null>();
    },

    async findCheckedInReservation(
      tableId: unknown,
      tableNumber: string
    ): Promise<QrReservationRecord | null> {
      const normalizedTableId =
        typeof tableId === 'string' || tableId instanceof Types.ObjectId
          ? tableId
          : tableId != null
            ? String(tableId)
            : null;

      if (normalizedTableId) {
        const byTableId = await Reservation.findOne({
          tableId: normalizedTableId,
          status: ReservationStatus.CHECKED_IN,
        })
          .sort({ updatedAt: -1, createdAt: -1 })
          .lean<QrReservationRecord | null>();

        if (byTableId) {
          return byTableId;
        }
      }

      return Reservation.findOne({
        tableNumber,
        status: ReservationStatus.CHECKED_IN,
      })
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean<QrReservationRecord | null>();
    },
  });
}
