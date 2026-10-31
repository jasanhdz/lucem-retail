import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getAuth, jsonError, permitted } from '@/lib/auth';
import { Role } from '@prisma/client';

export const runtime = 'nodejs';
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await getAuth();
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  if (!permitted(auth.membership?.role, [Role.ADMIN, Role.INVENTORY_MANAGER])) return jsonError('No autorizado', 403);
  const form = await request.formData();
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
  const filename = `${randomUUID()}.${extension}`;
  const directory = path.join(process.cwd(), 'public', 'uploads', 'products');
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), bytes, { flag: 'wx', mode: 0o644 });
  return Response.json({ photoPath: `/api/products/image/${filename}` }, { status: 201 });
}
