import { formatMoney } from '@/app/lib/format';
import { getAppUrl } from '@/app/lib/payments/config';

export interface ReservationConfirmationEmailPayload {
  toEmail?: string | null;
  customerName: string;
  phone: string;
  bookingCode: string;
  tableNumber: string;
  date: string;
  time: string;
  guests: number;
  depositAmount: number;
  transactionRef: string;
  provider: string;
}

export interface SendEmailResult {
  sent: boolean;
  skipped: boolean;
  reason?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderReservationConfirmationEmail(
  payload: ReservationConfirmationEmailPayload
): string {
  const appUrl = getAppUrl();
  const safeName = escapeHtml(payload.customerName || 'Quý khách');
  const safeCode = escapeHtml(payload.bookingCode);
  const safeTable = escapeHtml(payload.tableNumber);
  const safeDate = escapeHtml(payload.date);
  const safeTime = escapeHtml(payload.time);
  const safePhone = escapeHtml(payload.phone);
  const safeDeposit = escapeHtml(formatMoney(payload.depositAmount));
  const safeTxRef = escapeHtml(payload.transactionRef);
  const safeProvider = escapeHtml(payload.provider);
  const bookingUrl = `${appUrl}/booking/success?code=${encodeURIComponent(payload.bookingCode)}&table=${encodeURIComponent(payload.tableNumber)}`;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Xác nhận đặt bàn - SmaRes</title>
</head>
<body style="margin:0; padding:0; background-color:#FAF8F5; font-family:Arial, Helvetica, sans-serif; color:#1C1917;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FAF8F5; padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px; background-color:#FFFFFF; border-radius:16px; border:1px solid #EBE7DF; overflow:hidden;">
          <tr>
            <td style="background-color:#14532D; padding:28px 24px; text-align:center;">
              <div style="font-size:12px; letter-spacing:2px; text-transform:uppercase; color:#FBBF24; font-weight:bold; margin-bottom:6px;">
                SmaRes Restaurant
              </div>
              <h1 style="margin:0; font-size:22px; line-height:1.35; color:#FFFFFF; font-weight:700;">
                Xác Nhận Đặt Bàn &amp; Thanh Toán Cọc Thành Công
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;">
              <p style="margin:0 0 14px; font-size:15px; line-height:1.6;">
                Xin chào <strong>${safeName}</strong>,
              </p>
              <p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:#57534E;">
                Nhà hàng SmaRes xác nhận đã nhận tiền đặt cọc cho lịch đặt bàn của quý khách. Chi tiết đặt chỗ:
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FAF8F5; border:1px solid #EBE7DF; border-radius:12px; margin-bottom:22px;">
                <tr>
                  <td style="padding:12px 16px; border-bottom:1px solid #EBE7DF; font-size:14px; color:#78716C; width:42%;">Mã đặt bàn</td>
                  <td style="padding:12px 16px; border-bottom:1px solid #EBE7DF; font-size:14px; color:#14532D; font-weight:bold;">${safeCode}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px; border-bottom:1px solid #EBE7DF; font-size:14px; color:#78716C;">Số bàn</td>
                  <td style="padding:12px 16px; border-bottom:1px solid #EBE7DF; font-size:14px; color:#1C1917; font-weight:bold;">Bàn ${safeTable}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px; border-bottom:1px solid #EBE7DF; font-size:14px; color:#78716C;">Thời gian hẹn</td>
                  <td style="padding:12px 16px; border-bottom:1px solid #EBE7DF; font-size:14px; color:#1C1917; font-weight:600;">${safeTime} - Ngày ${safeDate}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px; border-bottom:1px solid #EBE7DF; font-size:14px; color:#78716C;">Số lượng khách</td>
                  <td style="padding:12px 16px; border-bottom:1px solid #EBE7DF; font-size:14px; color:#1C1917;">${payload.guests} khách</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px; border-bottom:1px solid #EBE7DF; font-size:14px; color:#78716C;">Số điện thoại</td>
                  <td style="padding:12px 16px; border-bottom:1px solid #EBE7DF; font-size:14px; color:#1C1917;">${safePhone}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px; border-bottom:1px solid #EBE7DF; font-size:14px; color:#78716C;">Tiền cọc đã thanh toán</td>
                  <td style="padding:12px 16px; border-bottom:1px solid #EBE7DF; font-size:14px; color:#D97706; font-weight:bold;">${safeDeposit} (${safeProvider})</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px; font-size:14px; color:#78716C;">Mã giao dịch</td>
                  <td style="padding:12px 16px; font-size:13px; color:#57534E;">${safeTxRef}</td>
                </tr>
              </table>
              <div style="text-align:center; margin-bottom:20px;">
                <a href="${bookingUrl}" style="display:inline-block; background-color:#14532D; color:#FFFFFF; text-decoration:none; padding:12px 24px; border-radius:10px; font-weight:bold; font-size:14px;">
                  Xem Phiếu Đặt Bàn &amp; Mã QR
                </a>
              </div>
              <p style="margin:0; font-size:13px; line-height:1.6; color:#78716C;">
                Lưu ý: Nhà hàng giữ bàn tối đa 15 phút so với giờ hẹn. Hân hạnh được phục vụ quý khách!
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Kích hoạt gửi email xác nhận đặt bàn trong tối đa 1 phút sau khi thanh toán cọc (BR-RES-05).
 * Nếu môi trường Sandbox chưa cấu hình RESEND_API_KEY hoặc khách không để lại email, log an toàn và không làm gián đoạn IPN.
 */
export async function sendReservationConfirmationEmail(
  payload: ReservationConfirmationEmailPayload
): Promise<SendEmailResult> {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const fromAddress = (
    process.env.EMAIL_FROM || 'SmaRes Restaurant <onboarding@resend.dev>'
  ).trim();
  const toEmail = (payload.toEmail || '').trim();

  if (!toEmail || !toEmail.includes('@')) {
    console.info(
      `[BR-RES-05] Xác nhận đặt bàn ${payload.bookingCode} (Bàn ${payload.tableNumber}, cọc ${payload.depositAmount}đ) - bỏ qua gửi email do chưa có địa chỉ email khách hàng.`
    );
    return { sent: false, skipped: true, reason: 'NO_RECIPIENT_EMAIL' };
  }

  if (!apiKey || apiKey.startsWith('YOUR_')) {
    console.info(
      `[BR-RES-05] Sandbox Mail Log -> To: ${toEmail}, Booking: ${payload.bookingCode}, Table: ${payload.tableNumber}, Deposit: ${payload.depositAmount}đ`
    );
    return { sent: false, skipped: true, reason: 'EMAIL_PROVIDER_NOT_CONFIGURED' };
  }

  try {
    const html = renderReservationConfirmationEmail(payload);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [toEmail],
        subject: `[SmaRes] Xác nhận đặt bàn ${payload.bookingCode} - Bàn ${payload.tableNumber}`,
        html,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      console.warn(`[BR-RES-05] Gửi email thất bại (${res.status}): ${errorText}`);
      return { sent: false, skipped: false, reason: `HTTP_${res.status}` };
    }

    return { sent: true, skipped: false };
  } catch (err) {
    console.warn(
      '[BR-RES-05] Lỗi kết nối khi gửi email xác nhận đặt bàn:',
      err instanceof Error ? err.message : err
    );
    return { sent: false, skipped: false, reason: 'NETWORK_ERROR' };
  }
}
