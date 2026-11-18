import Table, { TableStatus, ITable } from '../models/table.model';
import Reservation, { ReservationStatus, IReservation } from '../models/reservation.model';

// ============================================================================
// 1. Types & Interfaces cho TK-142 (Kiểm tra QR Code & Trạng thái Bàn ăn)
// ============================================================================
export interface ValidateQrAccessPayload {
  table_number?: string;
  qr_token?: string;
}

export interface ValidateQrAccessSuccessData {
  can_order: true;
  table_id: any;
  table_number: string;
  zone_name: string;
  status: TableStatus;
  reservation_id: any | null;
  customer_name: string;
  check_in_time: Date;
}

export interface ValidateQrAccessDeniedData {
  can_order: false;
  table_number: string;
  status: TableStatus;
  zone_name: string;
}

export interface ValidateQrAccessResult {
  statusCode: number;
  body: {
    success: boolean;
    error?: string;
    message: string;
    data?: ValidateQrAccessSuccessData | ValidateQrAccessDeniedData;
  };
}

// ============================================================================
// 2. Pure Service Logic (Tái sử dụng cho Express, Next.js API & Unit Tests)
// ============================================================================
export async function validateTableQrAccessService(
  payload: ValidateQrAccessPayload
): Promise<ValidateQrAccessResult> {
  try {
    const rawTableNumber = payload?.table_number;

    // Bước 1: Chuẩn hóa table_number (trim, uppercase). Nếu rỗng -> 400
    if (!rawTableNumber || typeof rawTableNumber !== 'string' || !rawTableNumber.trim()) {
      return {
        statusCode: 400,
        body: {
          success: false,
          error: 'MISSING_TABLE_IDENTIFIER',
          message: 'Vui lòng cung cấp số bàn hoặc mã QR hợp lệ.',
        },
      };
    }

    const tableNumber = rawTableNumber.trim().toUpperCase();

    // Bước 2: Query Table.findOne({ table_number })
    const table: ITable | null = await Table.findOne({
      $or: [{ table_number: tableNumber }, { tableNumber: tableNumber }],
    });

    if (!table) {
      return {
        statusCode: 404,
        body: {
          success: false,
          error: 'TABLE_NOT_FOUND',
          message: 'Không tìm thấy thông tin bàn ăn trong hệ thống.',
        },
      };
    }

    // Bước 3 (CỐT LÕI): Kiểm tra table.status !== TableStatus.SEATED -> 403 Forbidden
    if (table.status !== TableStatus.SEATED) {
      return {
        statusCode: 403,
        body: {
          success: false,
          error: 'TABLE_NOT_OCCUPIED',
          message:
            'Bàn ăn hiện chưa được kích hoạt phục vụ. Quý khách vui lòng làm thủ tục Check-in hoặc liên hệ nhân viên trước khi gọi món.',
          data: {
            can_order: false,
            table_number: table.table_number,
            status: table.status,
            zone_name: table.zone_name,
          },
        },
      };
    }

    // Bước 4: Nếu SEATED, truy vấn Reservation đang Check-in
    let reservation: IReservation | null = await Reservation.findOne({
      table_id: table._id,
      status: ReservationStatus.CHECKED_IN,
    }).sort({ updatedAt: -1, createdAt: -1 });

    if (!reservation) {
      reservation = await Reservation.findOne({
        table_number: table.table_number,
        status: ReservationStatus.CHECKED_IN,
      }).sort({ updatedAt: -1, createdAt: -1 });
    }

    // Bước 5: Trả về HTTP 200 OK thành công
    return {
      statusCode: 200,
      body: {
        success: true,
        message: 'Bàn ăn đã được kích hoạt phiên phục vụ. Quý khách có thể bắt đầu gọi món.',
        data: {
          can_order: true,
          table_id: table._id,
          table_number: table.table_number,
          zone_name: table.zone_name,
          status: table.status,
          reservation_id: reservation?._id || null,
          customer_name: reservation?.customer_name || 'Khách tại bàn',
          check_in_time: reservation?.check_in_time || reservation?.updatedAt || table.updatedAt,
        },
      },
    };
  } catch (error: any) {
    console.error('Lỗi validateTableQrAccessService:', error);
    return {
      statusCode: 500,
      body: {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: error?.message || 'Đã xảy ra lỗi hệ thống khi kiểm tra tính hợp lệ của bàn ăn.',
      },
    };
  }
}

// ============================================================================
// 3. Express Controller Handler
// ============================================================================
export const validateTableQrAccess = async (req: any, res: any): Promise<void> => {
  const result = await validateTableQrAccessService(req.body);
  res.status(result.statusCode).json(result.body);
};
