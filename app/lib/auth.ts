import jwt from 'jsonwebtoken';
import { NextResponse, type NextRequest } from 'next/server';

export type AuthRole = 'customer' | 'staff' | 'admin';

export interface AuthPayload {
  userId: string;
  email: string;
  role: AuthRole;
}

export const AUTH_COOKIE_NAME = 'token';

export type AuthResult =
  | { user: AuthPayload; errorResponse?: undefined }
  | { user?: undefined; errorResponse: NextResponse };

const VALID_ROLES: readonly AuthRole[] = ['customer', 'staff', 'admin'];

function isValidRole(value: unknown): value is AuthRole {
  return typeof value === 'string' && VALID_ROLES.includes(value as AuthRole);
}

/**
 * Reads JWT_SECRET lazily from environment variables.
 * Throws an error if missing so no insecure fallback secret is ever used.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured.');
  }
  return secret;
}

/**
 * Signs a JWT payload using the configured server secret.
 */
export function signAuthToken(
  payload: AuthPayload,
  expiresIn: jwt.SignOptions['expiresIn'] = '1d'
): string {
  const secret = getJwtSecret();
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    },
    secret,
    { expiresIn }
  );
}

/**
 * Verifies a JWT string and returns the validated AuthPayload, or null if invalid/expired.
 */
export function verifyAuthToken(token: string): AuthPayload | null {
  if (!token) {
    return null;
  }

  const secret = getJwtSecret();
  try {
    const decoded = jwt.verify(token, secret);
    if (typeof decoded !== 'object' || decoded === null) {
      return null;
    }

    const record = decoded as Record<string, unknown>;
    if (
      typeof record.userId !== 'string' ||
      typeof record.email !== 'string' ||
      !isValidRole(record.role)
    ) {
      return null;
    }

    return {
      userId: record.userId,
      email: record.email,
      role: record.role,
    };
  } catch {
    return null;
  }
}

function parseCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }
    const key = pair.slice(0, eqIndex).trim();
    if (key === name) {
      const rawValue = pair.slice(eqIndex + 1).trim();
      if (!rawValue) {
        return null;
      }
      try {
        return decodeURIComponent(rawValue);
      } catch {
        return rawValue;
      }
    }
  }

  return null;
}

/**
 * Extracts a JWT from Authorization Bearer header first, falling back to the HttpOnly token cookie.
 */
export function extractTokenFromRequest(request: Request | NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match && match[1]) {
      const bearerToken = match[1].trim();
      if (bearerToken) {
        return bearerToken;
      }
    }
  }

  if ('cookies' in request && request.cookies && typeof request.cookies.get === 'function') {
    const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (cookieToken) {
      return cookieToken;
    }
  }

  return parseCookieValue(request.headers.get('cookie'), AUTH_COOKIE_NAME);
}

/**
 * Extracts and verifies the authenticated user from a Request or NextRequest.
 */
export function getAuthUser(request: Request | NextRequest): AuthPayload | null {
  const token = extractTokenFromRequest(request);
  if (!token) {
    return null;
  }
  return verifyAuthToken(token);
}

/**
 * Requires a valid authenticated user, returning a 401 JSON response if missing or invalid.
 */
export function requireAuth(request: Request | NextRequest): AuthResult {
  const user = getAuthUser(request);
  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { success: false, message: 'Yêu cầu xác thực hợp lệ (Unauthorized).' },
        { status: 401 }
      ),
    };
  }
  return { user };
}

/**
 * Requires an authenticated user whose role is included in allowedRoles (401 if unauthenticated, 403 if forbidden).
 */
export function requireRole(
  request: Request | NextRequest,
  allowedRoles: readonly AuthPayload['role'][]
): AuthResult {
  const authResult = requireAuth(request);
  if (authResult.errorResponse) {
    return authResult;
  }

  if (!allowedRoles.includes(authResult.user.role)) {
    return {
      errorResponse: NextResponse.json(
        { success: false, message: 'Bạn không có quyền thực hiện thao tác này (Forbidden).' },
        { status: 403 }
      ),
    };
  }

  return { user: authResult.user };
}

/**
 * Returns standard HttpOnly cookie options for storing the auth JWT.
 */
export function getAuthCookieOptions(maxAgeSeconds = 86400) {
  return {
    name: AUTH_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
