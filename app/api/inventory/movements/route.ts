import { getAuth, jsonError } from '@/lib/auth';
import { db } from '@/lib/db';

export { POST } from '../route';

export async function GET(req: Request) {
  const auth = await getAuth({ renewCookie: true });
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  const url = new URL(req.url);
  if (url.searchParams.get('summary') === '30d') {
    const start = new Date(url.searchParams.get('from') ?? '');
    if (Number.isNaN(start.getTime())) return jsonError('Fecha inicial invalida');
    const where = { businessId: auth.business.id, createdAt: { gte: start } };
    const [groups, users] = await Promise.all([
      db.inventoryMovement.groupBy({ by: ['type'], where, _sum: { quantity: true }, _count: { _all: true } }),
      db.inventoryMovement.findMany({ where, distinct: ['userId'], select: { userId: true, user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }),
    ]);
    return Response.json({
      total: groups.reduce((sum, group) => sum + group._count._all, 0),
      byType: groups.map((group) => ({ type: group.type, quantity: group._sum.quantity?.toString() ?? '0', count: group._count._all })),
      users: users.map((item) => ({ id: item.userId, name: item.user.name })),
    });
  }
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 25)));
  const q = url.searchParams.get('q')?.trim();
  const variantId = url.searchParams.get('variantId');
  const type = url.searchParams.get('type');
  const group = url.searchParams.get('group');
  const userId = url.searchParams.get('userId');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const createdAt = from || to ? { ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}) } : undefined;
  if ((from && Number.isNaN(new Date(`${from}T00:00:00`).getTime())) || (to && Number.isNaN(new Date(`${to}T23:59:59.999`).getTime()))) return jsonError('Rango de fechas invalido');
  const movementTypes = ['INITIAL', 'PURCHASE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'RESERVATION', 'RELEASE', 'SALE', 'SALE_CANCEL', 'RETURN', 'CORRECTION'];
  if (type && !movementTypes.includes(type)) return jsonError('Tipo de movimiento invalido');
  const movementGroups: Record<string, string[]> = {
    IN: ['INITIAL', 'PURCHASE', 'ADJUSTMENT_IN'],
    SALE: ['SALE'],
    ADJUSTMENT: ['ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'CORRECTION'],
    RESERVATION: ['RESERVATION', 'RELEASE'],
    CANCEL: ['SALE_CANCEL', 'RETURN'],
  };
  if (group && !movementGroups[group]) return jsonError('Grupo de movimientos invalido');
  const types = type ? [type] : group ? movementGroups[group] : undefined;
  const where = {
    businessId: auth.business.id,
    ...(variantId ? { variantId } : {}),
    ...(types ? { type: { in: types as never[] } } : {}),
    ...(userId ? { userId } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(q ? { OR: [{ reason: { contains: q, mode: 'insensitive' as const } }, { variant: { sku: { contains: q, mode: 'insensitive' as const } } }, { variant: { product: { name: { contains: q, mode: 'insensitive' as const } } } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    db.inventoryMovement.findMany({ where, include: { user: { select: { name: true } }, variant: { select: { id: true, sku: true, size: true, color: true, product: { select: { id: true, name: true, photoPath: true, category: { select: { name: true } } } } } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    db.inventoryMovement.count({ where }),
  ]);
  return Response.json({ items: rows.map((row) => ({ ...row, quantity: row.quantity.toString() })), page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
}
