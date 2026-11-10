import { lstat, mkdir, readdir, rename, statfs, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { Prisma } from '@prisma/client';
import { db } from './db';

const MiB = BigInt(1024) * BigInt(1024);
const GiB = BigInt(1024) * MiB;
const GLOBAL_DEFAULT = BigInt(5) * GiB;
const BUSINESS_DEFAULT = BigInt(250) * MiB;
const MINIMUM_FREE_DEFAULT = BigInt(10) * GiB;
function allowE2eQuotaOverrides() {
  if (process.env.E2E_UPLOAD_QUOTA_TEST !== 'true' || !process.env.E2E_DATABASE_URL) return false;
  try {
    const url = new URL(process.env.E2E_DATABASE_URL);
    return ['127.0.0.1', 'localhost', '::1'].includes(url.hostname) && url.port === '55432' &&
      decodeURIComponent(url.pathname.slice(1)) === 'lucem_retail_e2e' && decodeURIComponent(url.username) === 'lucem_e2e';
  } catch { return false; }
}

export class UploadLimitError extends Error {
  constructor(public readonly status: 400 | 411 | 413 | 429 | 503, message: string) {
    super(message);
    this.name = 'UploadLimitError';
  }
}

export async function readBoundedUploadBody(request: Request, maximumBytes: number): Promise<Buffer> {
  const rawLength = request.headers.get('content-length');
  if (!rawLength || !/^\d+$/.test(rawLength)) throw new UploadLimitError(411, 'Tamaño de solicitud no válido');
  const declaredLength = Number(rawLength);
  if (!Number.isSafeInteger(declaredLength) || declaredLength > maximumBytes) throw new UploadLimitError(413, 'Tamaño de solicitud no válido');

  const chunks: Buffer[] = [];
  let total = 0;
  const reader = request.body?.getReader();
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maximumBytes) {
          await reader.cancel().catch(() => undefined);
          throw new UploadLimitError(413, 'Tamaño de solicitud no válido');
        }
        chunks.push(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }
  }
  if (total !== declaredLength) throw new UploadLimitError(400, 'Tamaño de solicitud no válido');
  return Buffer.concat(chunks, total);
}

export function withinUploadLimits(input: { used: bigint; reserved: bigint; incoming: bigint; maximum: bigint; free: bigint; freeFloor: bigint }) {
  return input.used >= BigInt(0) && input.reserved >= BigInt(0) && input.incoming > BigInt(0) &&
    input.used + input.reserved + input.incoming <= input.maximum &&
    input.free >= input.incoming && input.free - input.incoming >= input.freeFloor;
}

function configuredBytes(name: string, fallback: bigint, allowZero = false): bigint {
  const e2eOverride = allowE2eQuotaOverrides() ? process.env[`E2E_${name}`] : undefined;
  const raw = e2eOverride ?? process.env[name];
  if (raw === undefined || raw === '') return fallback;
  if (!/^\d+$/.test(raw)) throw new UploadLimitError(503, 'Cuotas de almacenamiento no disponibles');
  const parsed = BigInt(raw);
  if (allowZero ? parsed < BigInt(0) : parsed <= BigInt(0)) throw new UploadLimitError(503, 'Cuotas de almacenamiento no disponibles');
  return parsed;
}

async function measureUsage(directory: string, businessId: string, tx: Prisma.TransactionClient) {
  const entries = await readdir(directory, { withFileTypes: true });
  const legacyProducts = await tx.product.findMany({
    where: { businessId, photoPath: { not: null } },
    select: { photoPath: true },
  });
  const referencedLegacy = new Set(legacyProducts.flatMap((row) => {
    if (!row.photoPath) return [];
    const prefix = '/api/products/image/';
    if (!row.photoPath.startsWith(prefix)) return [];
    const name = row.photoPath.slice(prefix.length);
    return /^[0-9a-f-]{36}\.(jpg|png|webp|gif)$/i.test(name) ? [name] : [];
  }));

  let globalUsed = BigInt(0);
  let businessUsed = BigInt(0);
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    let stat;
    try { stat = await lstat(path.join(directory, entry.name)); }
    catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') continue;
      throw error;
    }
    if (!stat.isFile()) continue;
    const bytes = BigInt(stat.size);
    globalUsed += bytes;
    // A crashed upload remains hidden as a dot-prefixed temporary file but is
    // still charged to its owner and to the global quota until operator cleanup.
    const ownerFilename = entry.name.startsWith('.') ? entry.name.slice(1) : entry.name;
    if (ownerFilename.startsWith(`${businessId}_`) || referencedLegacy.has(entry.name)) businessUsed += bytes;
  }
  return { globalUsed, businessUsed };
}

export async function writeQuotaScopedProductImage(businessId: string, filename: string, bytes: Buffer): Promise<string> {
  const globalLimit = configuredBytes('LUCEM_UPLOAD_GLOBAL_MAX_BYTES', GLOBAL_DEFAULT);
  const businessLimit = configuredBytes('LUCEM_UPLOAD_BUSINESS_MAX_BYTES', BUSINESS_DEFAULT);
  const freeFloor = configuredBytes('LUCEM_UPLOAD_MIN_FREE_BYTES', MINIMUM_FREE_DEFAULT, true);
  if (businessLimit > globalLimit) throw new UploadLimitError(503, 'Cuotas de almacenamiento no disponibles');

  const directory = path.join(process.cwd(), 'public', 'uploads', 'products');
  await mkdir(directory, { recursive: true });
  const temporaryPath = path.join(directory, `.${filename}.uploading`);
  const finalPath = path.join(directory, filename);
  let published = false;
  try {
    return await db.$transaction(async (tx) => {
      // This transaction-level lock is shared with abuse bucket updates. It
      // serializes directory reconciliation, quota reservation and publication.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(73103003) IS NULL`;
      const { globalUsed, businessUsed } = await measureUsage(directory, businessId, tx);
      const filesystem = await statfs(directory, { bigint: true });
      const freeBytes = filesystem.bavail * filesystem.bsize;
      const uploadBytes = BigInt(bytes.length);
      if (businessUsed + uploadBytes > businessLimit) throw new UploadLimitError(429, 'Cuota de imágenes del negocio alcanzada');
      if (!withinUploadLimits({ used: globalUsed, reserved: BigInt(0), incoming: uploadBytes, maximum: globalLimit, free: freeBytes, freeFloor })) {
        throw new UploadLimitError(429, 'Almacenamiento temporalmente no disponible');
      }

      const globalRow = await tx.uploadQuotaCounter.findFirst({ where: { scope: 'GLOBAL', businessId: null } });
      const businessRow = await tx.uploadQuotaCounter.findUnique({ where: { businessId } });
      const globalId = globalRow?.id ?? randomUUID();
      const businessCounterId = businessRow?.id;

      if (globalRow) await tx.uploadQuotaCounter.update({ where: { id: globalRow.id }, data: { usedBytes: globalUsed, reservedBytes: uploadBytes } });
      else await tx.uploadQuotaCounter.create({ data: { id: globalId, scope: 'GLOBAL', businessId: null, usedBytes: globalUsed, reservedBytes: uploadBytes } });
      if (businessRow) await tx.uploadQuotaCounter.update({ where: { id: businessRow.id }, data: { usedBytes: businessUsed, reservedBytes: uploadBytes } });
      else await tx.uploadQuotaCounter.create({ data: { scope: 'BUSINESS', businessId, usedBytes: businessUsed, reservedBytes: uploadBytes } });

      await writeFile(temporaryPath, bytes, { flag: 'wx', mode: 0o644 });
      await rename(temporaryPath, finalPath);
      published = true;
      if (globalRow) await tx.uploadQuotaCounter.update({ where: { id: globalRow.id }, data: { usedBytes: globalUsed + uploadBytes, reservedBytes: BigInt(0) } });
      else await tx.uploadQuotaCounter.update({ where: { id: globalId }, data: { usedBytes: globalUsed + uploadBytes, reservedBytes: BigInt(0) } });
      if (businessCounterId) await tx.uploadQuotaCounter.update({ where: { id: businessCounterId }, data: { usedBytes: businessUsed + uploadBytes, reservedBytes: BigInt(0) } });
      else await tx.uploadQuotaCounter.update({ where: { businessId }, data: { usedBytes: businessUsed + uploadBytes, reservedBytes: BigInt(0) } });
      return `/api/products/image/${filename}`;
    }, { maxWait: 10_000, timeout: 30_000 });
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    if (published) await unlink(finalPath).catch(() => undefined);
    throw error;
  }
}
