import { NextResponse, type NextRequest } from 'next/server';

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api/') || !unsafeMethods.has(request.method)) {
    return NextResponse.next();
  }

  if (request.headers.get('sec-fetch-site')?.toLowerCase() === 'cross-site') {
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 });
  }

  const origin = request.headers.get('origin');
  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.origin !== origin || !['http:', 'https:'].includes(originUrl.protocol)) {
        return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 });
      }
      const configuredValues = process.env.LUCEM_ALLOWED_ORIGINS?.split(',').map((value) => value.trim()).filter(Boolean) ?? [];
      const expectedOrigins = configuredValues.length
        ? configuredValues.map((value) => new URL(value).origin)
        : [`${request.nextUrl.protocol}//${request.headers.get('host')}`];
      // Explicit origins support an HTTPS reverse proxy without trusting forwarded
      // headers supplied by the request itself.
      if (!expectedOrigins.includes(originUrl.origin)) {
        return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = { matcher: ['/api/:path*'] };
