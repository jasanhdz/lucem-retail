import { getAuth, jsonError } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const auth = await getAuth({ renewCookie: true });
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  const p = new URL(req.url).searchParams;
  const from = p.get('from') ? new Date(`${p.get('from')}T00:00:00.000Z`) : undefined;
  const to = p.get('to') ? new Date(`${p.get('to')}T23:59:59.999Z`) : undefined;
  const sales = await db.sale.findMany({ where: { businessId: auth.business.id, ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}), ...(p.get('userId') ? { userId: p.get('userId')! } : {}), ...(p.get('paymentMethod') ? { paymentMethod: p.get('paymentMethod') as 'CASH' | 'CARD' | 'TRANSFER' } : {}) }, include: { lines: { include: { variant: { include: { product: true } }, returnLines: true } }, user: true }, orderBy: { createdAt: 'desc' } });
  const rows = sales.map((sale) => {
    const lines = sale.lines.filter((line) => (!p.get('productId') || line.variant.productId === p.get('productId')) && (!p.get('categoryId') || line.variant.product.categoryId === p.get('categoryId')));
    const returned = lines.reduce((sum, line) => sum + line.returnLines.reduce((lineSum, item) => lineSum + Number(item.quantity), 0), 0);
    const gross = lines.reduce((sum, line) => sum + Number(line.lineTotal), 0);
    const cogs = lines.reduce((sum, line) => sum + Number(line.unitCost) * (Number(line.quantity) - line.returnLines.reduce((lineSum, item) => lineSum + Number(item.quantity), 0)), 0);
    const net = sale.status === 'CANCELLED' ? 0 : gross - lines.reduce((sum, line) => sum + Number(line.unitPrice) * line.returnLines.reduce((lineSum, item) => lineSum + Number(item.quantity), 0), 0);
    return { id: sale.id, folio: sale.folio, status: sale.status, paymentMethod: sale.paymentMethod, total: net.toFixed(2), user: sale.user.name, userId: sale.userId, createdAt: sale.createdAt, units: sale.status === 'CANCELLED' ? 0 : lines.reduce((n, l) => n + Number(l.quantity), 0) - returned, cogs: sale.status === 'CANCELLED' ? '0.00' : cogs.toFixed(2), profit: sale.status === 'CANCELLED' ? '0.00' : (net - cogs).toFixed(2) };
  }).filter((row) => !p.get('productId') && !p.get('categoryId') || row.units > 0);
  return Response.json(rows);
}
