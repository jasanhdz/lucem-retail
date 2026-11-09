import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getAuth, jsonError } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
const types: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const auth = await getAuth({ renewCookie: true });
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  const { filename } = await params;
  const scopedMatch = /^([a-z0-9_-]{1,64})_([0-9a-f-]{36})\.(jpg|png|webp|gif)$/i.exec(filename);
  const legacyMatch = /^([0-9a-f-]{36})\.(jpg|png|webp|gif)$/i.exec(filename);
  const extension = scopedMatch?.[3] ?? legacyMatch?.[2];
  if (!extension) return jsonError('Imagen no encontrada', 404);
  if (scopedMatch) {
    if (scopedMatch[1] !== auth.business.id) return jsonError('Imagen no encontrada', 404);
  } else {
    const referenced = await db.product.findFirst({
      where: { businessId: auth.business.id, photoPath: `/api/products/image/${filename}` },
      select: { id: true },
    });
    if (!referenced) return jsonError('Imagen no encontrada', 404);
  }
  try {
    const image = await readFile(path.join(process.cwd(), 'public', 'uploads', 'products', filename));
    return new Response(new Uint8Array(image), { headers: { 'Content-Type': types[extension.toLowerCase()], 'Content-Length': String(image.length), 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, max-age=3600' } });
  } catch { return jsonError('Imagen no encontrada', 404); }
}
