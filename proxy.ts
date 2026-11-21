import { NextResponse, type NextRequest } from 'next/server';

export type AuthRole = 'customer' | 'staff' | 'admin';

const AUTH_COOKIE_NAME = 'token';
const VALID_ROLES: readonly AuthRole[] = ['customer', 'staff', 'admin'];

const ROUTE_ROLE_RULES: ReadonlyArray<{
  prefixes: readonly string[];
  allowedRoles: readonly AuthRole[] | null;
}> = [
  { prefixes: ['/admin'], allowedRoles: ['admin'] },
  { prefixes: ['/staff', '/kds', '/qr'], allowedRoles: ['staff', 'admin'] },
  { prefixes: ['/history'], allowedRoles: null },
];

function isAuthRole(value: unknown): value is AuthRole {
  return typeof value === 'string' && VALID_ROLES.includes(value as AuthRole);
}

function parseCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const pair of cookieHeader.split(';')) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) continue;
    const key = pair.slice(0, eqIndex).trim();
    if (key === name) {
      const rawValue = pair.slice(eqIndex + 1).trim();
      if (!rawValue) return null;
      try {
        return decodeURIComponent(rawValue);
      } catch {
        return rawValue;
      }
    }
  }

  return null;
}

function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match && match[1] && match[1].trim()) {
      return match[1].trim();
    }
  }

  const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value?.trim();
  if (cookieToken) {
    return cookieToken;
  }

  return parseCookieValue(request.headers.get('cookie'), AUTH_COOKIE_NAME);
}

function decodeBase64Url(input: string): Uint8Array | null {
  try {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function getRoleFromToken(request: NextRequest): Promise<AuthRole | null> {
  const token = extractToken(request);
  const secret = process.env.JWT_SECRET?.trim();

  if (!token || !secret) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const headerBytes = decodeBase64Url(headerB64);
  const payloadBytes = decodeBase64Url(payloadB64);
  const signatureBytes = decodeBase64Url(signatureB64);

  if (!headerBytes || !payloadBytes || !signatureBytes) {
    return null;
  }

  try {
    const header = JSON.parse(new TextDecoder().decode(headerBytes)) as Record<string, unknown>;
    if (header.alg !== 'HS256') {
      return null;
    }

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const sigBuffer = signatureBytes.buffer.slice(
      signatureBytes.byteOffset,
      signatureBytes.byteOffset + signatureBytes.byteLength
    ) as ArrayBuffer;

    const isValid = await crypto.subtle.verify('HMAC', key, sigBuffer, signingInput);
    if (!isValid) {
      return null;
    }

    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as Record<string, unknown>;
    if (typeof payload.exp === 'number') {
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (payload.exp <= nowSeconds) {
        return null;
      }
    }

    return isAuthRole(payload.role) ? payload.role : null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/booking' || pathname.startsWith('/booking/')) {
    const role = await getRoleFromToken(request);
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/403', request.url));
    }
    return NextResponse.next();
  }

  const matchedRule = ROUTE_ROLE_RULES.find((rule) =>
    rule.prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );

  if (!matchedRule) {
    return NextResponse.next();
  }

  const role = await getRoleFromToken(request);
  if (!role) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (matchedRule.allowedRoles && !matchedRule.allowedRoles.includes(role)) {
    return NextResponse.redirect(new URL('/403', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/staff/:path*',
    '/kds/:path*',
    '/qr/:path*',
    '/history/:path*',
    '/booking/:path*',
  ],
};
