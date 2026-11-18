const express = require('express');
const router = express.Router();
const Table = require('../models/Table');
const Reservation = require('../models/Reservation');

// ============================================================================
// TK-142: POST /api/v1/tables/validate-qr-access
// Kiểm tra tính hợp lệ của mã QR / số bàn (chỉ mở khi bàn Occupied / SEATED)
// ============================================================================
router.post('/validate-qr-access', async (req, res) => {
  try {
    const rawTableNumber = req.body?.table_number;

    // Bước 1: Chuẩn hóa table_number (trim, uppercase). Nếu rỗng -> trả về 400
    if (!rawTableNumber || typeof rawTableNumber !== 'string' || !rawTableNumber.trim()) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_TABLE_IDENTIFIER',
        message: 'Vui lòng cung cấp số bàn hoặc mã QR hợp lệ.',
      });
    }

    const tableNumber = rawTableNumber.trim().toUpperCase();

    // Bước 2: Query Table.findOne({ table_number })
    const table = await Table.findOne({
      $or: [{ table_number: tableNumber }, { tableNumber: tableNumber }],
    });

    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'TABLE_NOT_FOUND',
        message: 'Không tìm thấy thông tin bàn ăn trong hệ thống.',
      });
    }

    // Bước 3 (CỐT LÕI): Kiểm tra table.status. Nếu !== 'SEATED' -> trả về 403 Forbidden
    if (table.status !== 'SEATED') {
      return res.status(403).json({
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
      });
    }

    // Bước 4: Nếu SEATED, truy vấn Reservation đang Check-in
    let reservation = await Reservation.findOne({
      table_id: table._id,
      status: 'CHECKED_IN',
    }).sort({ updatedAt: -1, createdAt: -1 });

    if (!reservation) {
      reservation = await Reservation.findOne({
        table_number: table.table_number,
        status: 'CHECKED_IN',
      }).sort({ updatedAt: -1, createdAt: -1 });
    }

    // Bước 5: Trả về HTTP 200 OK thành công
    return res.status(200).json({
      success: true,
      message: 'Bàn ăn đã được kích hoạt phiên phục vụ. Quý khách có thể bắt đầu gọi món.',
      data: {
        can_order: true,
        table_id: table._id,
        table_number: table.table_number,
        zone_name: table.zone_name,
        status: table.status,
        reservation_id: reservation ? reservation._id : null,
        customer_name: reservation ? reservation.customer_name : 'Khách tại bàn',
        check_in_time: reservation ? (reservation.check_in_time || reservation.updatedAt) : table.updatedAt,
      },
    });
  } catch (error) {
    console.error('Lỗi POST /api/v1/tables/validate-qr-access:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: error?.message || 'Đã xảy ra lỗi hệ thống khi kiểm tra tính hợp lệ của bàn ăn.',
    });
  }
});

module.exports = router;
