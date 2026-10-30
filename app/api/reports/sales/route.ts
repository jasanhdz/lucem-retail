import { getAuth, jsonError } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const auth = await getAuth();
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  const p = new URL(req.url).searchParams;
  const from = p.get('from') ? new Date(`${p.get('from')}T00:00:00.000Z`) : undefined;
  const to = p.get('to') ? new Date(`${p.get('to')}T23:59:59.999Z`) : undefined;
  const sales = await db.sale.findMany({ where: { businessId: auth.business.id, ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}), ...(p.get('userId') ? { userId: p.get('userId')! } : {}), ...(p.get('paymentMethod') ? { paymentMethod: p.get('paymentMethod') as 'CASH' | 'CARD' | 'TRANSFER' } : {}) }, include: { lines: { include: { variant: { include: { product: true } }, returnLines: true } }, user: true }, orderBy: { createdAt: 'desc' } });
  const rows = sales.filter((sale) => !p.get('productId') && !p.get('categoryId') || sale.lines.some((line) => (!p.get('productId') || line.variant.productId === p.get('productId')) && (!p.get('categoryId') || line.variant.product.categoryId === p.get('categoryId'))));
  return Response.json(rows.map((s) => ({ id: s.id, folio: s.folio, status: s.status, paymentMethod: s.paymentMethod, total: s.total.toString(), user: s.user.name, userId: s.userId, createdAt: s.createdAt, units: s.lines.reduce((n, l) => n + Number(l.quantity), 0), cogs: s.lines.reduce((n, l) => n + Number(l.unitCost) * Number(l.quantity), 0).toFixed(2), profit: (Number(s.total) - s.lines.reduce((n, l) => n + Number(l.unitCost) * Number(l.quantity), 0)).toFixed(2) })));
}
