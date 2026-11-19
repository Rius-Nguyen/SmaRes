/**
 * File: backend/templates/reservationConfirmationEmail.js
 * Chức năng: Thiết kế mẫu HTML Template Email xác nhận đặt bàn cho SmaRes (TK-135)
 * Khớp với schema backend/models/Reservation.js
 */

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateVi(dateValue) {
  if (!dateValue) return 'Đang cập nhật';
  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return String(dateValue);
  }
  return parsedDate.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatStatusVi(status) {
  const map = {
    CONFIRMED: 'Đã xác nhận',
    CHECKED_IN: 'Đã nhận bàn',
    COMPLETED: 'Hoàn tất',
    CANCELLED: 'Đã hủy',
  };
  return map[status] || status || 'Đã xác nhận';
}

/**
 * Render HTML email xác nhận đặt bàn từ document/object Reservation
 * @param {Object} reservation - Dữ liệu đặt bàn theo ReservationSchema
 * @param {Object} [extra] - Thông tin bổ sung (restaurantName, restaurantPhone, restaurantAddress, note)
 * @returns {string} Chuỗi HTML hoàn chỉnh
 */
function renderReservationConfirmationEmail(reservation = {}, extra = {}) {
  const customerName = escapeHtml(
    reservation.customer_name || reservation.customerName || 'Quý khách'
  );
  const customerPhone = escapeHtml(
    reservation.customer_phone || reservation.customerPhone || 'Đang cập nhật'
  );
  const reservationCode = escapeHtml(
    reservation.reservationCode ||
      (reservation._id ? String(reservation._id).slice(-8).toUpperCase() : 'N/A')
  );
  const reservationDate = escapeHtml(
    formatDateVi(reservation.reservation_date || reservation.reservationDate)
  );
  const timeSlot = escapeHtml(
    reservation.time_slot || reservation.timeSlot || 'Đang cập nhật'
  );
  const guestCount = escapeHtml(reservation.guests ?? reservation.guestCount ?? 2);
  const tableNumber = escapeHtml(
    reservation.table_number || reservation.tableNumber || 'Sẽ sắp xếp khi đến'
  );
  const statusText = escapeHtml(formatStatusVi(reservation.status));
  const note = escapeHtml(reservation.note || extra.note || 'Không có ghi chú');

  const restaurantName = escapeHtml(extra.restaurantName || 'SmaRes Restaurant');
  const restaurantPhone = escapeHtml(extra.restaurantPhone || '1900 xxxx');
  const restaurantAddress = escapeHtml(
    extra.restaurantAddress || 'Đang cập nhật địa chỉ nhà hàng'
  );
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Xác nhận đặt bàn - ${restaurantName}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f5f7; font-family:Arial, Helvetica, sans-serif; color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f5f7; padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 16px rgba(15, 23, 42, 0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #111827 0%, #374151 100%); padding:28px 24px; text-align:center;">
              <div style="font-size:12px; letter-spacing:2px; text-transform:uppercase; color:#fbbf24; font-weight:bold; margin-bottom:6px;">
                ${restaurantName}
              </div>
              <h1 style="margin:0; font-size:22px; line-height:1.35; color:#ffffff; font-weight:700;">
                Xác Nhận Đặt Bàn Thành Công
              </h1>
            </td>
          </tr>

          <!-- Nội dung chính -->
          <tr>
            <td style="padding:28px 24px;">
              <p style="margin:0 0 14px; font-size:15px; line-height:1.6;">
                Xin chào <strong>${customerName}</strong>,
              </p>
              <p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:#4b5563;">
                Cảm ơn bạn đã đặt bàn tại <strong>${restaurantName}</strong>. Dưới đây là thông tin chi tiết lịch đặt bàn của bạn:
              </p>

              <!-- Bảng thông tin đặt bàn -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; margin-bottom:22px;">
                <tr>
                  <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; font-size:14px; color:#6b7280; width:40%;">
                    Mã đặt bàn
                  </td>
                  <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; font-size:14px; color:#111827; font-weight:bold;">
                    #${reservationCode}
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; font-size:14px; color:#6b7280;">
                    Trạng thái
                  </td>
                  <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; font-size:14px; color:#059669; font-weight:bold;">
                    ${statusText}
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; font-size:14px; color:#6b7280;">
                    Số điện thoại
                  </td>
                  <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; font-size:14px; color:#111827;">
                    ${customerPhone}
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; font-size:14px; color:#6b7280;">
                    Ngày đặt bàn
                  </td>
                  <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; font-size:14px; color:#111827; font-weight:600;">
                    ${reservationDate}
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; font-size:14px; color:#6b7280;">
                    Khung giờ
                  </td>
                  <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; font-size:14px; color:#111827; font-weight:600;">
                    ${timeSlot}
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; font-size:14px; color:#6b7280;">
                    Số khách
                  </td>
                  <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; font-size:14px; color:#111827; font-weight:600;">
                    ${guestCount} khách
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; font-size:14px; color:#6b7280;">
                    Số bàn
                  </td>
                  <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb; font-size:14px; color:#111827; font-weight:600;">
                    ${tableNumber}
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px; font-size:14px; color:#6b7280;">
                    Ghi chú
                  </td>
                  <td style="padding:12px 16px; font-size:14px; color:#111827;">
                    ${note}
                  </td>
                </tr>
              </table>

              <!-- Lưu ý -->
              <div style="background-color:#fffbeb; border-left:4px solid #f59e0b; padding:12px 14px; border-radius:6px; font-size:13px; line-height:1.55; color:#92400e; margin-bottom:20px;">
                <strong>Lưu ý:</strong> Vui lòng đến đúng khung giờ đã đặt để nhà hàng giữ bàn tốt nhất cho bạn. Nếu cần hỗ trợ hoặc đổi lịch, vui lòng liên hệ hotline <strong>${restaurantPhone}</strong>.
              </div>

              <p style="margin:0; font-size:14px; line-height:1.6; color:#4b5563;">
                Rất hân hạnh được phục vụ bạn tại <strong>${restaurantName}</strong>!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb; border-top:1px solid #e5e7eb; padding:18px 24px; text-align:center; font-size:12px; color:#6b7280; line-height:1.6;">
              <div><strong>${restaurantName}</strong></div>
              <div>Địa chỉ: ${restaurantAddress} | Hotline: ${restaurantPhone}</div>
              <div style="margin-top:6px;">© ${year} ${restaurantName}. All rights reserved.</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = {
  renderReservationConfirmationEmail,
};