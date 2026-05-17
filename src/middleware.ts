import { NextResponse, NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  try {
    const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret';
    const token = await getToken({ req: request, secret });
    const isAuthenticated = !!token;

    const { pathname } = request.nextUrl;

    if (pathname.startsWith('/api/')) {
      if (!isAuthenticated) {
        const url = request.nextUrl.clone();
        url.pathname = '/api/auth/signin';
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  } catch (error) {
    // Allow request to proceed if middleware fails
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/api/admin/:path*',
    '/api/teacher/:path*',
    '/api/students/:path*',
    '/api/messages/:path*',
    '/api/analytics/:path*',
    '/api/mastery/:path*',
  ],
};