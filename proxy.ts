import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/app/lib/session';

export default async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  // Protect dashboard and draft routes
  if (request.nextUrl.pathname.startsWith('/dashboard') || 
      request.nextUrl.pathname.startsWith('/draft')) {
    if (!session.isLoggedIn) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Redirect logged-in users away from login page
  if (request.nextUrl.pathname === '/login' && session.isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/draft/:path*', '/login'],
};