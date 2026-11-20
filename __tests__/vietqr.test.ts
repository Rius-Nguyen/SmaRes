import { describe, it, expect, afterEach } from 'vitest';
import {
  buildVietQrPayload,
  crc16CcittFalse,
  DEFAULT_VIETQR_ACCOUNT_NO,
  DEFAULT_VIETQR_BANK_BIN,
  DEFAULT_VIETQR_SERVICE_CODE,
  formatEmvTlv,
  getVietQrAccountConfig,
  sanitizeTransferNote,
} from '@/app/lib/payments/vietqr';

describe('VietQR NAPAS 247 Dynamic QR Generator & CRC-16/CCITT-FALSE', () => {
  const originalEnv = {
    VIETQR_BANK_BIN: process.env.VIETQR_BANK_BIN,
    VIETQR_ACCOUNT_NO: process.env.VIETQR_ACCOUNT_NO,
    VIETQR_ACCOUNT_NAME: process.env.VIETQR_ACCOUNT_NAME,
    NEXT_PUBLIC_VIETQR_BANK_BIN: process.env.NEXT_PUBLIC_VIETQR_BANK_BIN,
    NEXT_PUBLIC_VIETQR_ACCOUNT_NO: process.env.NEXT_PUBLIC_VIETQR_ACCOUNT_NO,
    NEXT_PUBLIC_VIETQR_ACCOUNT_NAME: process.env.NEXT_PUBLIC_VIETQR_ACCOUNT_NAME,
  };

  afterEach(() => {
    for (const [key, val] of Object.entries(originalEnv)) {
      if (val === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = val;
      }
    }
  });

  it('computes exact CRC-16/CCITT-FALSE check value for standard vector "123456789"', () => {
    expect(crc16CcittFalse('123456789')).toBe('29B1');
  });

  it('formats EMVCo TLV segments with 2-digit zero-padded byte length', () => {
    expect(formatEmvTlv('00', '01')).toBe('000201');
    expect(formatEmvTlv('53', '704')).toBe('5303704');
    expect(formatEmvTlv('08', 'RES5B0B29')).toBe('0809RES5B0B29');
  });

  it('builds a dynamic VietQR payload matching img.vietqr.io byte-for-byte with Tag 63 CRC', () => {
    const payload = buildVietQrPayload({
      amount: 100000,
      bookingCode: 'RES-5B0B29',
    });

    // Exact byte-for-byte match against official img.vietqr.io MBBank reference payload
    expect(payload).toBe(
      '00020101021238540010A00000072701240006970422011050180820060208QRIBFTTA530370454061000005802VN62130809RES5B0B296304843A'
    );

    // Dynamic QR header: Tag 00 = 01, Tag 01 = 12
    expect(payload.startsWith('000201010212')).toBe(true);
    // NAPAS AID + Default BIN + Account No + Service Code
    expect(payload).toContain('0010A000000727');
    expect(payload).toContain(`0006${DEFAULT_VIETQR_BANK_BIN}`);
    expect(payload).toContain(`0110${DEFAULT_VIETQR_ACCOUNT_NO}`);
    expect(payload).toContain(`0208${DEFAULT_VIETQR_SERVICE_CODE}`);
    // Currency VND (704), Amount (100000), Country (VN), Additional Data Tag 62 subtag 08
    expect(payload).toContain('5303704');
    expect(payload).toContain('5406100000');
    expect(payload).toContain('5802VN');
    expect(payload).toContain('62130809RES5B0B29');

    // Verify Tag 63 checksum matches CRC-16/CCITT-FALSE over payload without last 4 chars
    const bodyWithTag63Prefix = payload.slice(0, -4);
    const embeddedCrc = payload.slice(-4);
    expect(bodyWithTag63Prefix.endsWith('6304')).toBe(true);
    expect(embeddedCrc).toMatch(/^[0-9A-F]{4}$/);
    expect(embeddedCrc).toBe(crc16CcittFalse(bodyWithTag63Prefix));
  });

  it('uses static initiation method (010211) without Tag 54 when amount is zero', () => {
    const payload = buildVietQrPayload({
      amount: 0,
      bookingCode: 'RES-STATIC1',
    });
    expect(payload.startsWith('000201010211')).toBe(true);
    // Tag 53 (VND currency) goes straight to Tag 58 (VN) with no Tag 54 amount in between
    expect(payload).toContain('53037045802VN');
    expect(payload.slice(-4)).toBe(crc16CcittFalse(payload.slice(0, -4)));
  });

  it('rounds decimal amounts and sanitizes Vietnamese diacritics and hyphens in transfer notes', () => {
    expect(sanitizeTransferNote('Đặt cọc RES-AA11BB!')).toBe('Dat coc RESAA11BB');

    const payload = buildVietQrPayload({
      amount: 300000.6,
      bookingCode: 'RES-VIP001',
    });
    expect(payload).toContain('5406300001');
    expect(payload).toContain('0809RESVIP001');
    expect(payload.slice(-4)).toBe(crc16CcittFalse(payload.slice(0, -4)));
  });

  it('supports overriding bank BIN, account number, and account name via environment variables', () => {
    process.env.VIETQR_BANK_BIN = '970436';
    process.env.VIETQR_ACCOUNT_NO = '0123456789';
    process.env.VIETQR_ACCOUNT_NAME = 'SMARES TEST';

    const cfg = getVietQrAccountConfig();
    expect(cfg.bankBin).toBe('970436');
    expect(cfg.accountNo).toBe('0123456789');
    expect(cfg.accountName).toBe('SMARES TEST');

    const payload = buildVietQrPayload({
      amount: 200000,
      bookingCode: 'RES-ENV001',
    });
    expect(payload).toContain('0006970436');
    expect(payload).toContain('01100123456789');
    expect(payload.slice(-4)).toBe(crc16CcittFalse(payload.slice(0, -4)));
  });
});
