import { NextResponse, type NextRequest } from 'next/server';

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function hasCloudflareTunnelHeaders(request: NextRequest) {
  if (process.env.CLOUDFLARE_QUICK_TUNNEL_ENABLED !== 'true') return false;
  const ray = request.headers.get('cf-ray') ?? '';
  const visitor = request.headers.get('cf-visitor') ?? '';
  const clientIp = request.headers.get('cf-connecting-ip') ?? '';
  return /^[a-f0-9]{16,32}-[a-z]{3,8}$/i.test(ray) &&
    /^\s*\{\s*"scheme"\s*:\s*"https"\s*}\s*$/.test(visitor) &&
    clientIp.length > 0 && clientIp.length <= 45 && /^[0-9a-f:.]+$/i.test(clientIp);
}

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/api/products/image' && request.method === 'POST') {
    const rawLength = request.headers.get('content-length');
    if (!rawLength || !/^\d+$/.test(rawLength) || Number(rawLength) > 5 * 1024 * 1024 + 64 * 1024) {
      return NextResponse.json({ error: 'Tamaño de solicitud no válido' }, { status: rawLength && /^\d+$/.test(rawLength) ? 413 : 411 });
    }
  }
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
      const tunnelHttpsOrigin = process.env.CLOUDFLARE_QUICK_TUNNEL_ENABLED === 'true' &&
        hasCloudflareTunnelHeaders(request) &&
        originUrl.protocol === 'https:' && originUrl.host === request.headers.get('host');
      if (!expectedOrigins.includes(originUrl.origin) && !tunnelHttpsOrigin) {
        return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = { matcher: ['/api/:path*'] };
