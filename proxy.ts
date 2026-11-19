import { NextResponse, type NextRequest } from 'next/server';
import { getAuthUser, type AuthRole } from '@/app/lib/auth';

const ROUTE_ROLE_RULES: ReadonlyArray<{
  prefixes: readonly string[];
  allowedRoles: readonly AuthRole[] | null;
}> = [
  { prefixes: ['/admin'], allowedRoles: ['admin'] },
  { prefixes: ['/staff', '/kds'], allowedRoles: ['staff', 'admin'] },
  { prefixes: ['/history'], allowedRoles: null },
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const matchedRule = ROUTE_ROLE_RULES.find((rule) =>
    rule.prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );

  if (!matchedRule) {
    return NextResponse.next();
  }

  const user = getAuthUser(request);
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (matchedRule.allowedRoles && !matchedRule.allowedRoles.includes(user.role)) {
    const forbiddenUrl = new URL('/', request.url);
    forbiddenUrl.searchParams.set('error', 'forbidden');
    return NextResponse.redirect(forbiddenUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/staff/:path*', '/kds/:path*', '/history/:path*'],
};
