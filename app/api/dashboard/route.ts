import { getAuth, jsonError } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const auth = await getAuth({ renewCookie: true });
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  const params = new URL(req.url).searchParams;
  const from = params.get('from') ? new Date(`${params.get('from')}T00:00:00.000Z`) : new Date(new Date().setHours(0, 0, 0, 0));
  const to = params.get('to') ? new Date(`${params.get('to')}T23:59:59.999Z`) : new Date();
  const [sales, returns, variants, recent] = await Promise.all([
    db.sale.findMany({ where: { businessId: auth.business.id, status: 'CONFIRMED', createdAt: { gte: from, lte: to } }, include: { lines: true } }),
    db.return.findMany({ where: { businessId: auth.business.id, createdAt: { gte: from, lte: to } } }),
    db.productVariant.findMany({ where: { businessId: auth.business.id, active: true } }),
    db.sale.findMany({ where: { businessId: auth.business.id, createdAt: { gte: from, lte: to } }, orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);
  const gross = sales.reduce((n, sale) => n + Number(sale.total), 0);
  const returned = returns.reduce((n, row) => n + Number(row.refundAmount), 0);
  const units = sales.reduce((n, sale) => n + sale.lines.reduce((x, line) => x + Number(line.quantity), 0), 0);
  const cogs = sales.reduce((n, sale) => n + sale.lines.reduce((x, line) => x + Number(line.unitCost) * Number(line.quantity), 0), 0);
  return Response.json({ gross: gross.toFixed(2), net: (gross - returned).toFixed(2), units, cogs: cogs.toFixed(2), profit: (gross - returned - cogs).toFixed(2), outOfStock: variants.filter((v) => Number(v.stock) === 0).length, lowStock: variants.filter((v) => Number(v.stock) > 0 && Number(v.stock) <= Number(v.lowStockThreshold)).length, recent: recent.map((s) => ({ id: s.id, folio: s.folio, total: s.total.toString(), status: s.status, createdAt: s.createdAt })) });
}
