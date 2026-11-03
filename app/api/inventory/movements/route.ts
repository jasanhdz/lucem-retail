import { getAuth, jsonError } from '@/lib/auth';
import { db } from '@/lib/db';

export { POST } from '../route';

export async function GET(req: Request) {
  const auth = await getAuth({ renewCookie: true });
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 25)));
  const q = url.searchParams.get('q')?.trim();
  const variantId = url.searchParams.get('variantId');
  const type = url.searchParams.get('type');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const createdAt = from || to ? { ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}) } : undefined;
  if ((from && Number.isNaN(new Date(`${from}T00:00:00`).getTime())) || (to && Number.isNaN(new Date(`${to}T23:59:59.999`).getTime()))) return jsonError('Rango de fechas invalido');
  const movementTypes = ['INITIAL', 'PURCHASE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'RESERVATION', 'RELEASE', 'SALE', 'SALE_CANCEL', 'RETURN', 'CORRECTION'];
  if (type && !movementTypes.includes(type)) return jsonError('Tipo de movimiento invalido');
  const where = {
    businessId: auth.business.id,
    ...(variantId ? { variantId } : {}),
    ...(type ? { type: type as never } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(q ? { OR: [{ reason: { contains: q, mode: 'insensitive' as const } }, { variant: { sku: { contains: q, mode: 'insensitive' as const } } }, { variant: { product: { name: { contains: q, mode: 'insensitive' as const } } } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    db.inventoryMovement.findMany({ where, include: { user: { select: { name: true } }, variant: { select: { id: true, sku: true, size: true, color: true, product: { select: { id: true, name: true } } } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    db.inventoryMovement.count({ where }),
  ]);
  return Response.json({ items: rows.map((row) => ({ ...row, quantity: row.quantity.toString() })), page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
}
