import { randomUUID } from 'node:crypto';
import { getAuth, jsonError, permitted } from '@/lib/auth';
import { Role } from '@prisma/client';
import { configuredRateLimit, consumeRateLimitBucket, limitedResponse, requestClientIp } from '@/lib/abuse-limits';
import { readBoundedUploadBody, UploadLimitError, writeQuotaScopedProductImage } from '@/lib/upload-storage';

export const runtime = 'nodejs';
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await getAuth({ renewCookie: true });
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  if (!permitted(auth.membership?.role, [Role.ADMIN, Role.INVENTORY_MANAGER])) return jsonError('No autorizado', 403);
  try {
    const limits = await Promise.all([
      consumeRateLimitBucket('upload-ip', requestClientIp(request), 60 * 60_000, configuredRateLimit('UPLOAD_IP', 20)),
      consumeRateLimitBucket('upload-business', auth.business.id, 60 * 60_000, configuredRateLimit('UPLOAD_BUSINESS', 60)),
      consumeRateLimitBucket('upload-global', 'all', 60 * 60_000, configuredRateLimit('UPLOAD_GLOBAL', 200)),
    ]);
    const blocked = limits.find((limit) => !limit.allowed);
    if (blocked) return limitedResponse(429, blocked.retryAfterSeconds);
  } catch {
    return jsonError('Almacenamiento temporalmente no disponible', 503);
  }
  let form: FormData;
  try {
    const body = await readBoundedUploadBody(request, MAX_SIZE + 64 * 1024);
    const boundedBody = new Uint8Array(body.byteLength);
    boundedBody.set(body);
    form = await new Request(request.url, { method: 'POST', headers: request.headers, body: boundedBody }).formData();
  } catch (error) {
    if (error instanceof UploadLimitError) return jsonError('Tamaño de solicitud no válido', error.status);
    return jsonError('Carga no válida', 400);
  }
  if ([...form.keys()].some((key) => key !== 'file') || form.getAll('file').length !== 1) return jsonError('Carga no válida', 400);
  const file = form.get('file');
  if (!(file instanceof File)) return jsonError('Selecciona una imagen');
  if (file.size <= 0 || file.size > MAX_SIZE) return jsonError('La imagen debe pesar hasta 5 MB');
  const bytes = Buffer.from(await file.arrayBuffer());
  let extension: string | undefined;
  let contentType: string | undefined;
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) { extension = 'png'; contentType = 'image/png'; }
  else if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) { extension = 'jpg'; contentType = 'image/jpeg'; }
  else if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') { extension = 'webp'; contentType = 'image/webp'; }
  else if (bytes.length >= 6 && /^GIF8[79]a$/.test(bytes.toString('ascii', 0, 6))) { extension = 'gif'; contentType = 'image/gif'; }
  if (!extension || file.type !== contentType) return jsonError('Formato no válido. Usa JPEG, PNG, WebP o GIF');
  const filename = `${auth.business.id}_${randomUUID()}.${extension}`;
  try {
    const photoPath = await writeQuotaScopedProductImage(auth.business.id, filename, bytes);
    return Response.json({ photoPath }, { status: 201 });
  } catch (error) {
    if (error instanceof UploadLimitError) {
      return error.status === 429 ? limitedResponse(429, 3600) : jsonError('Carga no disponible', error.status);
    }
    return jsonError('No fue posible guardar la imagen', 503);
  }
}
