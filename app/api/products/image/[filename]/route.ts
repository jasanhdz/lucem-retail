import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getAuth, jsonError } from '@/lib/auth';

export const runtime = 'nodejs';
const types: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const auth = await getAuth({ renewCookie: true });
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  const { filename } = await params;
  const match = /^([0-9a-f-]{36})\.(jpg|png|webp|gif)$/.exec(filename);
  if (!match) return jsonError('Imagen no encontrada', 404);
  try {
    const image = await readFile(path.join(process.cwd(), 'public', 'uploads', 'products', filename));
    return new Response(new Uint8Array(image), { headers: { 'Content-Type': types[match[2]], 'Content-Length': String(image.length), 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, max-age=3600' } });
  } catch { return jsonError('Imagen no encontrada', 404); }
}
