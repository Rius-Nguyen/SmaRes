import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, signAuthToken } from '@/app/lib/auth';
import { config, proxy } from '@/proxy';

describe('Proxy RBAC protection for /admin routes (BR-OPS-03)', () => {
  const previousJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = 'vitest-smares-proxy-secret';
  });

  afterEach(() => {
    if (previousJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousJwtSecret;
    }
  });

  it('includes /admin and /admin/:path* in matcher config', () => {
    expect(config.matcher).toContain('/admin');
    expect(config.matcher).toContain('/admin/:path*');
  });

  it('redirects unauthenticated requests on /admin, /admin/menu, and /admin/analytics to /login', () => {
    for (const path of ['/admin', '/admin/menu', '/admin/analytics']) {
      const req = new NextRequest(`http://localhost:3000${path}`);
      const res = proxy(req);
      expect(res.status).toBe(307);
      const location = res.headers.get('location') ?? '';
      expect(location).toContain('/login');
      expect(location).toContain(`redirect=${encodeURIComponent(path)}`);
    }
  });

  it('redirects non-admin authenticated users (customer, staff) with error=forbidden', () => {
    for (const role of ['customer', 'staff'] as const) {
      const token = signAuthToken({
        userId: `${role}-1`,
        email: `${role}@smares.vn`,
        role,
      });

      for (const path of ['/admin', '/admin/menu', '/admin/analytics']) {
        const req = new NextRequest(`http://localhost:3000${path}`, {
          headers: {
            cookie: `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
          },
        });
        const res = proxy(req);
        expect(res.status).toBe(307);
        const location = res.headers.get('location') ?? '';
        expect(location).toContain('error=forbidden');
      }
    }
  });

  it('allows admin requests through /admin, /admin/menu, and /admin/analytics', () => {
    const adminToken = signAuthToken({
      userId: 'admin-1',
      email: 'admin@smares.vn',
      role: 'admin',
    });

    for (const path of ['/admin', '/admin/menu', '/admin/analytics']) {
      const req = new NextRequest(`http://localhost:3000${path}`, {
        headers: {
          cookie: `${AUTH_COOKIE_NAME}=${encodeURIComponent(adminToken)}`,
        },
      });
      const res = proxy(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    }
  });
});
