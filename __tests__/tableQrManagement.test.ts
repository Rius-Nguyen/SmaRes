import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signAuthToken } from '@/app/lib/auth';
import { proxy } from '@/proxy';
import {
  buildPrintableTableQrUrl,
  getTableQrActivityMeta,
  isTableQrActive,
  normalizeQrBaseUrl,
} from '@/app/lib/tableQrHelpers';

function makeRequest(url: string, token?: string): NextRequest {
  const headers = new Headers();
  if (token) {
    headers.set('cookie', `token=${encodeURIComponent(token)}`);
  }
  return new NextRequest(url, { method: 'GET', headers });
}

describe('Table QR helpers and role-based access rules', () => {
  const previousJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = 'vitest-table-qr-secret';
  });

  afterEach(() => {
    if (previousJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousJwtSecret;
    }
  });

  it('classifies SEATED as active and AVAILABLE/RESERVED/CLEANING as inactive', () => {
    expect(isTableQrActive('SEATED')).toBe(true);
    expect(isTableQrActive(' seated ')).toBe(true);
    expect(isTableQrActive('AVAILABLE')).toBe(false);
    expect(isTableQrActive('RESERVED')).toBe(false);
    expect(isTableQrActive('CLEANING')).toBe(false);

    expect(getTableQrActivityMeta('SEATED').activityLabel).toBe('Đang hoạt động');
    expect(getTableQrActivityMeta('AVAILABLE').activityLabel).toBe('Không hoạt động');
    expect(getTableQrActivityMeta('RESERVED').activityLabel).toBe('Không hoạt động');
    expect(getTableQrActivityMeta('CLEANING').activityLabel).toBe('Không hoạt động');
  });

  it('builds permanent printable table-menu QR URLs without requiring login tokens', () => {
    expect(buildPrintableTableQrUrl(' b04 ')).toBe('/table-menu?table=B04');
    expect(buildPrintableTableQrUrl('B05', 'https://smares.vn/')).toBe(
      'https://smares.vn/table-menu?table=B05'
    );
    expect(normalizeQrBaseUrl('192.168.1.20:3000/')).toBe('http://192.168.1.20:3000');
    expect(normalizeQrBaseUrl('menu.smares.vn/')).toBe('https://menu.smares.vn');
  });

  it('restricts /staff/qr and /qr exclusively to staff and admin while allowing guests on /table-menu', async () => {
    const adminToken = signAuthToken({
      userId: 'admin-1',
      email: 'admin@smares.com',
      role: 'admin',
    });
    const staffToken = signAuthToken({
      userId: 'staff-1',
      email: 'staff@smares.com',
      role: 'staff',
    });
    const customerToken = signAuthToken({
      userId: 'cust-1',
      email: 'customer@smares.com',
      role: 'customer',
    });

    // Unauthenticated visitors are redirected to login for /staff/qr and /qr
    const guestStaffQr = await proxy(makeRequest('http://localhost:3000/staff/qr'));
    expect(guestStaffQr.status).toBe(307);
    expect(guestStaffQr.headers.get('location')).toBe(
      'http://localhost:3000/login?redirect=%2Fstaff%2Fqr'
    );

    const guestLegacyQr = await proxy(makeRequest('http://localhost:3000/qr'));
    expect(guestLegacyQr.status).toBe(307);
    expect(guestLegacyQr.headers.get('location')).toBe(
      'http://localhost:3000/login?redirect=%2Fqr'
    );

    // Customers receive 403 redirect on /staff/qr and /qr
    const custStaffQr = await proxy(makeRequest('http://localhost:3000/staff/qr', customerToken));
    expect(custStaffQr.status).toBe(307);
    expect(custStaffQr.headers.get('location')).toBe('http://localhost:3000/403');

    const custLegacyQr = await proxy(makeRequest('http://localhost:3000/qr', customerToken));
    expect(custLegacyQr.status).toBe(307);
    expect(custLegacyQr.headers.get('location')).toBe('http://localhost:3000/403');

    // Staff & Admin are permitted on /staff/qr and /qr
    expect((await proxy(makeRequest('http://localhost:3000/staff/qr', staffToken))).status).toBe(200);
    expect((await proxy(makeRequest('http://localhost:3000/staff/qr', adminToken))).status).toBe(200);
    expect((await proxy(makeRequest('http://localhost:3000/qr', staffToken))).status).toBe(200);
    expect((await proxy(makeRequest('http://localhost:3000/qr', adminToken))).status).toBe(200);

    // Anonymous walk-in diners scanning a printed table QR can open /table-menu directly without login
    const guestTableMenu = await proxy(makeRequest('http://localhost:3000/table-menu?table=B04'));
    expect(guestTableMenu.status).toBe(200);
    expect(guestTableMenu.headers.get('location')).toBeNull();
  });
});
