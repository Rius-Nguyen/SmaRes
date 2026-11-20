export interface VietQrAccountConfig {
  bankBin: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  serviceCode: string;
}

export interface BuildVietQrPayloadInput {
  amount: number;
  bookingCode: string;
  bankBin?: string;
  accountNo?: string;
  serviceCode?: string;
}

export const DEFAULT_VIETQR_BANK_BIN = '970422'; // MBBank
export const DEFAULT_VIETQR_BANK_NAME = 'MBBank';
export const DEFAULT_VIETQR_ACCOUNT_NO = '5018082006';
export const DEFAULT_VIETQR_ACCOUNT_NAME = 'NGUYEN NGOC THINH';
export const DEFAULT_VIETQR_SERVICE_CODE = 'QRIBFTTA';
const NAPAS_AID = 'A000000727';

const BANK_NAME_BY_BIN: Readonly<Record<string, string>> = {
  '970422': 'MBBank',
  '970415': 'VietinBank',
  '970436': 'Vietcombank',
  '970418': 'BIDV',
  '970407': 'Techcombank',
  '970416': 'ACB',
  '970423': 'TPBank',
  '970432': 'VPBank',
  '970405': 'Agribank',
};

function isConfiguredValue(value?: string): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  return (
    trimmed.length > 0 &&
    !trimmed.startsWith('YOUR_') &&
    !trimmed.startsWith('replace-with-')
  );
}

export function getVietQrAccountConfig(): VietQrAccountConfig {
  const envBin =
    process.env.NEXT_PUBLIC_VIETQR_BANK_BIN || process.env.VIETQR_BANK_BIN;
  const envAccountNo =
    process.env.NEXT_PUBLIC_VIETQR_ACCOUNT_NO || process.env.VIETQR_ACCOUNT_NO;
  const envAccountName =
    process.env.NEXT_PUBLIC_VIETQR_ACCOUNT_NAME || process.env.VIETQR_ACCOUNT_NAME;

  const bankBin = isConfiguredValue(envBin) ? envBin.trim() : DEFAULT_VIETQR_BANK_BIN;
  const accountNo = isConfiguredValue(envAccountNo)
    ? envAccountNo.trim()
    : DEFAULT_VIETQR_ACCOUNT_NO;
  const accountName = isConfiguredValue(envAccountName)
    ? envAccountName.trim()
    : DEFAULT_VIETQR_ACCOUNT_NAME;

  return {
    bankBin,
    bankName: BANK_NAME_BY_BIN[bankBin] ?? `BIN ${bankBin}`,
    accountNo,
    accountName,
    serviceCode: DEFAULT_VIETQR_SERVICE_CODE,
  };
}

/**
 * Formats an EMVCo TLV segment: 2-digit Tag + 2-digit zero-padded length + Value.
 */
export function formatEmvTlv(tag: string, value: string): string {
  const byteLength = new TextEncoder().encode(value).length;
  const lengthStr = String(byteLength).padStart(2, '0');
  return `${tag}${lengthStr}${value}`;
}

/**
 * Sanitizes transfer description (Tag 62 subtag 08) to safe ASCII alphanumeric/space characters
 * matching NAPAS 247 / VietQR reference behavior (strips hyphens/punctuation like `RES-5B0B29` -> `RES5B0B29`).
 */
export function sanitizeTransferNote(raw: string): string {
  return raw
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50);
}

/**
 * Computes CRC-16/CCITT-FALSE checksum (poly 0x1021, init 0xFFFF, no reflection, xorOut 0x0000)
 * as required by EMVCo QR Code Specification (Tag 63).
 */
export function crc16CcittFalse(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let crc = 0xffff;

  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i] << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generates a dynamic NAPAS 247 VietQR EMVCo payload string with pre-filled amount (Tag 54),
 * transfer note / bookingCode (Tag 62 subtag 08), and CRC-16/CCITT-FALSE checksum (Tag 63).
 */
export function buildVietQrPayload(input: BuildVietQrPayloadInput): string {
  const defaults = getVietQrAccountConfig();
  const bankBin = (input.bankBin ?? defaults.bankBin).trim();
  const accountNo = (input.accountNo ?? defaults.accountNo).trim();
  const serviceCode = (input.serviceCode ?? defaults.serviceCode).trim();
  const roundedAmount = Math.max(0, Math.round(input.amount));
  const cleanNote = sanitizeTransferNote(input.bookingCode);
  const initiationMethod = roundedAmount > 0 ? '12' : '11';

  // Tag 38: Merchant Account Information (VietQR / NAPAS 247)
  const beneficiaryInfo =
    formatEmvTlv('00', bankBin) + formatEmvTlv('01', accountNo);
  const merchantAccountInfo =
    formatEmvTlv('00', NAPAS_AID) +
    formatEmvTlv('01', beneficiaryInfo) +
    formatEmvTlv('02', serviceCode);

  const segments: string[] = [
    formatEmvTlv('00', '01'), // Payload Format Indicator
    formatEmvTlv('01', initiationMethod), // 12 = Dynamic QR (has amount), 11 = Static QR
    formatEmvTlv('38', merchantAccountInfo),
    formatEmvTlv('53', '704'), // VND
  ];

  if (roundedAmount > 0) {
    segments.push(formatEmvTlv('54', String(roundedAmount)));
  }

  segments.push(formatEmvTlv('58', 'VN'));

  if (cleanNote.length > 0) {
    const additionalData = formatEmvTlv('08', cleanNote);
    segments.push(formatEmvTlv('62', additionalData));
  }

  const payloadWithoutCrc = `${segments.join('')}6304`;
  const crc = crc16CcittFalse(payloadWithoutCrc);
  return `${payloadWithoutCrc}${crc}`;
}
