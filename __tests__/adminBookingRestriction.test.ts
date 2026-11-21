import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signAuthToken } from '@/app/lib/auth';
import { checkBookingAccess } from '@/app/lib/bookingRoleGuard';
import { proxy } from '@/proxy';
import { POST as postReservation } from '@/app/api/reservations/route';
import { POST as postTableLock } from '@/app/api/table-locks/route';
import { POST as postBooking } from '@/app/api/booking/route';

function makeRequest(url: string, token?: string, method = 'GET'): NextRequest {
  const headers = new Headers();
  if (token) {
    headers.set('cookie', `token=${encodeURIComponent(token)}`);
  }
  return new NextRequest(url, { method, headers });
}

describe('Admin booking restrictions', () => {
  const previousJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = 'vitest-admin-booking-restriction-secret';
  });

  afterEach(() => {
    if (previousJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousJwtSecret;
    }
  });

  it('checkBookingAccess blocks admin with 403 and permits customer, staff, and guests', () => {
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
      email: 'cust@smares.com',
      role: 'customer',
    });

    const adminResult = checkBookingAccess(makeRequest('http://localhost:3000/api/reservations', adminToken));
    expect(adminResult.errorResponse).toBeDefined();
    expect(adminResult.errorResponse?.status).toBe(403);

    const staffResult = checkBookingAccess(makeRequest('http://localhost:3000/api/reservations', staffToken));
    expect(staffResult.errorResponse).toBeUndefined();

    const customerResult = checkBookingAccess(makeRequest('http://localhost:3000/api/reservations', customerToken));
    expect(customerResult.errorResponse).toBeUndefined();

    const guestResult = checkBookingAccess(makeRequest('http://localhost:3000/api/reservations'));
    expect(guestResult.errorResponse).toBeUndefined();
  });

  it('proxy redirects admin away from /booking and /booking/diagram to /403 while allowing others', async () => {
    const adminToken = signAuthToken({
      userId: 'admin-1',
      email: 'admin@smares.com',
      role: 'admin',
    });
    const customerToken = signAuthToken({
      userId: 'cust-1',
      email: 'cust@smares.com',
      role: 'customer',
    });

    const adminRootRes = await proxy(makeRequest('http://localhost:3000/booking', adminToken));
    expect(adminRootRes.status).toBe(307);
    expect(adminRootRes.headers.get('location')).toBe('http://localhost:3000/403');

    const adminStepRes = await proxy(makeRequest('http://localhost:3000/booking/diagram', adminToken));
    expect(adminStepRes.status).toBe(307);
    expect(adminStepRes.headers.get('location')).toBe('http://localhost:3000/403');

    const customerRes = await proxy(makeRequest('http://localhost:3000/booking', customerToken));
    expect(customerRes.status).toBe(200);
    expect(customerRes.headers.get('location')).toBeNull();

    const guestRes = await proxy(makeRequest('http://localhost:3000/booking'));
    expect(guestRes.status).toBe(200);
    expect(guestRes.headers.get('location')).toBeNull();
  });

  it('booking POST endpoints return 403 when invoked by admin', async () => {
    const adminToken = signAuthToken({
      userId: 'admin-1',
      email: 'admin@smares.com',
      role: 'admin',
    });

    const resReservation = await postReservation(
      new NextRequest('http://localhost:3000/api/reservations', {
        method: 'POST',
        headers: {
          cookie: `token=${encodeURIComponent(adminToken)}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ tableNumber: 'B01', date: '2026-11-22', time: '19:00', guests: 2, phone: '0900000000' }),
      })
    );
    expect(resReservation.status).toBe(403);

    const resLock = await postTableLock(
      new NextRequest('http://localhost:3000/api/table-locks', {
        method: 'POST',
        headers: {
          cookie: `token=${encodeURIComponent(adminToken)}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ tableNumber: 'B01', date: '2026-11-22', time: '19:00' }),
      })
    );
    expect(resLock.status).toBe(403);

    const resLegacyBooking = await postBooking(
      new NextRequest('http://localhost:3000/api/booking', {
        method: 'POST',
        headers: {
          cookie: `token=${encodeURIComponent(adminToken)}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ tableId: 'B01', customerName: 'Admin', timeSlot: '19:00' }),
      })
    );
    expect(resLegacyBooking.status).toBe(403);
  });
});
