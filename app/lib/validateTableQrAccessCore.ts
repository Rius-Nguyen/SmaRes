export interface QrTableRecord {
  _id: unknown;
  tableNumber: string;
  zoneName?: string;
  status: string;
  updatedAt?: Date | string;
}

export interface QrReservationRecord {
  _id: unknown;
  customerName?: string;
  checkInTime?: Date | string | null;
  updatedAt?: Date | string;
}

export interface ValidateQrAccessPayload {
  table_number?: string;
  tableNumber?: string;
  qr_token?: string;
  qrToken?: string;
}

export interface ValidateQrAccessDeps {
  findTableByNumber(tableNumber: string): Promise<QrTableRecord | null>;
  findCheckedInReservation(
    tableId: unknown,
    tableNumber: string
  ): Promise<QrReservationRecord | null>;
}

export interface ValidateQrAccessSuccessData {
  can_order: true;
  table_id: unknown;
  table_number: string;
  zone_name: string;
  status: string;
  reservation_id: unknown | null;
  customer_name: string;
  check_in_time: Date | string | undefined;
}

export interface ValidateQrAccessDeniedData {
  can_order: false;
  table_number: string;
  status: string;
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

export async function validateTableQrAccessCore(
  payload: ValidateQrAccessPayload,
  deps: ValidateQrAccessDeps
): Promise<ValidateQrAccessResult> {
  try {
    const rawTableNumber = payload?.table_number ?? payload?.tableNumber;

    // Step 1: Normalize table identifier (trim, uppercase); missing/empty -> 400
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

    // Step 2: Look up table by normalized tableNumber -> 404 if not found
    const table = await deps.findTableByNumber(tableNumber);
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

    // Step 3: Table must be in SEATED state to allow QR ordering -> 403 otherwise
    if (table.status !== 'SEATED') {
      return {
        statusCode: 403,
        body: {
          success: false,
          error: 'TABLE_NOT_OCCUPIED',
          message:
            'Bàn ăn hiện chưa được kích hoạt phục vụ. Quý khách vui lòng làm thủ tục Check-in hoặc liên hệ nhân viên trước khi gọi món.',
          data: {
            can_order: false,
            table_number: table.tableNumber,
            status: table.status,
            zone_name: table.zoneName || 'Khu vực chính',
          },
        },
      };
    }

    // Step 4: Fetch active CHECKED_IN reservation for this table
    const reservation = await deps.findCheckedInReservation(table._id, table.tableNumber);

    // Step 5: Allow ordering -> 200 OK
    return {
      statusCode: 200,
      body: {
        success: true,
        message: 'Bàn ăn đã được kích hoạt phiên phục vụ. Quý khách có thể bắt đầu gọi món.',
        data: {
          can_order: true,
          table_id: table._id,
          table_number: table.tableNumber,
          zone_name: table.zoneName || 'Khu vực chính',
          status: table.status,
          reservation_id: reservation?._id ?? null,
          customer_name: reservation?.customerName || 'Khách tại bàn',
          check_in_time: reservation?.checkInTime || reservation?.updatedAt || table.updatedAt,
        },
      },
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Đã xảy ra lỗi hệ thống khi kiểm tra tính hợp lệ của bàn ăn.';

    return {
      statusCode: 500,
      body: {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message,
      },
    };
  }
}
