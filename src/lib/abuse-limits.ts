import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import type { Prisma } from '@prisma/client';
import { db } from './db';

export type AbuseDimension = 'login-ip' | 'login-email' | 'register-ip' | 'register-email' | 'register-global' | 'upload-ip' | 'upload-business' | 'upload-global' | 'business-create-user' | 'business-create-global' | 'product-create-business' | 'product-create-global' | 'business-write-ip' | 'business-write-business' | 'business-write-global' | 'inventory-write' | 'general-write' | 'commercial-write' | 'commercial-read';

const RATE_LIMIT_PURGE_BATCH_SIZE = 500;

async function purgeExpiredRateLimitBuckets(tx: Prisma.TransactionClient, now: Date) {
  await tx.$executeRaw`WITH expired AS (
    SELECT "id" FROM "AbuseRateLimitBucket"
    WHERE "expiresAt" <= ${now}
    ORDER BY "expiresAt", "keyHash"
    LIMIT ${RATE_LIMIT_PURGE_BATCH_SIZE}
    FOR UPDATE SKIP LOCKED
  )
  DELETE FROM "AbuseRateLimitBucket" AS bucket
  USING expired WHERE bucket."id" = expired."id"`;
}

function isE2eDatabaseConfigured() {
  if (process.env.E2E_RATE_LIMIT_TEST !== 'true' || !process.env.E2E_DATABASE_URL) return false;
  try {
    const url = new URL(process.env.E2E_DATABASE_URL);
    return ['127.0.0.1', 'localhost', '::1'].includes(url.hostname) && url.port === '55432' &&
      decodeURIComponent(url.pathname.slice(1)) === 'lucem_retail_e2e' && decodeURIComponent(url.username) === 'lucem_e2e';
  } catch { return false; }
}

export function configuredRateLimit(name: string, fallback: number): number {
  const key = `LUCEM_RATE_LIMIT_${name}`;
  const raw = (isE2eDatabaseConfigured() ? process.env[`E2E_${key}`] : undefined) ?? process.env[key];
  if (raw === undefined || raw === '') return fallback;
  if (!/^[1-9]\d*$/.test(raw)) throw new Error('Invalid rate limit configuration');
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value > fallback * 10) throw new Error('Invalid rate limit configuration');
  return value;
}

function digest(dimension: AbuseDimension, value: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('Abuse limiter secret unavailable');
  if (typeof value !== 'string' || value.length < 1 || value.length > 512) throw new Error('Invalid limiter key');
  const key = createHmac('sha256', secret).update('lucem-rate-limit-v1').digest();
  return createHmac('sha256', key).update(`${dimension}\0${value}`).digest('hex');
}

export function requestClientIp(request: Request): string {
  if (process.env.CLOUDFLARE_QUICK_TUNNEL_ENABLED !== 'true') return 'unverified-direct-origin';
  const ray = request.headers.get('cf-ray');
  const visitor = request.headers.get('cf-visitor');
  const connecting = request.headers.get('cf-connecting-ip');
  if (ray && /^[a-f0-9]{16,32}-[a-z]{3,8}$/i.test(ray) && visitor && /^\s*\{\s*"scheme"\s*:\s*"https"\s*}\s*$/.test(visitor) && connecting && isIP(connecting.trim())) {
    return connecting.trim().toLowerCase();
  }
  // Deliberately collapse unverified/direct-origin clients into one bucket. Never trust XFF.
  return 'unverified-direct-origin';
}

export async function consumeRateLimitBucket(dimension: AbuseDimension, canonicalKey: string, windowMs: number, limit: number, now = new Date()) {
  const startMs = Math.floor(now.getTime() / windowMs) * windowMs;
  const windowStart = new Date(startMs);
  const expiresAt = new Date(startMs + windowMs + 24 * 60 * 60 * 1000);
  const keyHash = digest(dimension, canonicalKey);
  return db.$transaction(async (tx) => {
    // One transaction-level lock bounds cardinality safely across distinct keys
    // and serializes rate/quota operations across every app process on this DB.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(73103003) IS NULL`;
    await purgeExpiredRateLimitBuckets(tx, now);
    const rows = await tx.$queryRaw<Array<{ count: number }>>`SELECT "count" FROM "AbuseRateLimitBucket" WHERE "keyHash" = ${keyHash} AND "windowStart" = ${windowStart} FOR UPDATE`;
    if (!rows.length) {
      const count = await tx.abuseRateLimitBucket.count();
      if (count >= 100_000) throw new Error('Rate limit capacity reached');
      await tx.abuseRateLimitBucket.create({ data: { keyHash, windowStart, expiresAt, count: 1 } });
      return { allowed: true, count: 1, retryAfterSeconds: Math.max(1, Math.ceil((startMs + windowMs - now.getTime()) / 1000)) };
    }
    const next = rows[0].count + 1;
    const storedCount = Math.min(next, limit + 1);
    await tx.abuseRateLimitBucket.update({ where: { keyHash_windowStart: { keyHash, windowStart } }, data: { count: storedCount } });
    return { allowed: next <= limit, count: storedCount, retryAfterSeconds: Math.max(1, Math.ceil((startMs + windowMs - now.getTime()) / 1000)) };
  }, { maxWait: 5000, timeout: 10000 });
}

export async function checkRateLimitBucket(dimension: AbuseDimension, canonicalKey: string, windowMs: number, limit: number, now = new Date()) {
  const startMs = Math.floor(now.getTime() / windowMs) * windowMs;
  const windowStart = new Date(startMs);
  const keyHash = digest(dimension, canonicalKey);
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(73103003) IS NULL`;
    await purgeExpiredRateLimitBuckets(tx, now);
    const rows = await tx.$queryRaw<Array<{ count: number }>>`SELECT "count" FROM "AbuseRateLimitBucket" WHERE "keyHash" = ${keyHash} AND "windowStart" = ${windowStart}`;
    const count = rows[0]?.count ?? 0;
    return { allowed: count < limit, count, retryAfterSeconds: Math.max(1, Math.ceil((startMs + windowMs - now.getTime()) / 1000)) };
  }, { maxWait: 5000, timeout: 10000 });
}

export async function clearRateLimitBucket(dimension: AbuseDimension, canonicalKey: string, windowMs: number, now = new Date()) {
  const startMs = Math.floor(now.getTime() / windowMs) * windowMs;
  const keyHash = digest(dimension, canonicalKey);
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(73103003) IS NULL`;
    await tx.abuseRateLimitBucket.deleteMany({ where: { keyHash, windowStart: new Date(startMs) } });
  });
}

export function limitedResponse(status: number, retryAfterSeconds: number) {
  return Response.json({ error: 'Solicitud no disponible' }, { status, headers: { 'Retry-After': String(retryAfterSeconds), 'Cache-Control': 'no-store' } });
}

export async function businessWriteGate(businessId: string, request: Request): Promise<Response | null> {
  try {
    const limits = await Promise.all([
      consumeRateLimitBucket('business-write-ip', requestClientIp(request), 60 * 60_000, configuredRateLimit('BUSINESS_WRITE_IP', 1000)),
      consumeRateLimitBucket('business-write-business', businessId, 60 * 60_000, configuredRateLimit('BUSINESS_WRITE_BUSINESS', 500)),
      consumeRateLimitBucket('business-write-global', 'all', 60 * 60_000, configuredRateLimit('BUSINESS_WRITE_GLOBAL', 5000)),
      consumeRateLimitBucket('general-write', businessId, 60 * 60_000, configuredRateLimit('GENERAL_WRITE', 1000)),
    ]);
    const blocked = limits.find((limit) => !limit.allowed);
    return blocked ? limitedResponse(429, blocked.retryAfterSeconds) : null;
  } catch {
    return Response.json({ error: 'Servicio temporalmente no disponible' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

async function scopedRateGate(dimension: AbuseDimension, businessId: string, configName: string, fallback: number): Promise<Response | null> {
  try {
    const result = await consumeRateLimitBucket(dimension, businessId, 60 * 60_000, configuredRateLimit(configName, fallback));
    return result.allowed ? null : limitedResponse(429, result.retryAfterSeconds);
  } catch {
    return Response.json({ error: 'Servicio temporalmente no disponible' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

export function inventoryWriteGate(businessId: string) {
  return scopedRateGate('inventory-write', businessId, 'INVENTORY_WRITE', 1000);
}

export function commercialWriteGate(businessId: string) {
  return scopedRateGate('commercial-write', businessId, 'COMMERCIAL_WRITE', 500);
}

export function commercialReadGate(businessId: string) {
  return scopedRateGate('commercial-read', businessId, 'COMMERCIAL_READ', 5000);
}
