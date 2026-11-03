import { getAuth, jsonError } from '@/lib/auth';
import { db } from '@/lib/db';
export async function GET(req: Request) {
  const auth = await getAuth({ renewCookie: true }); if (!auth?.business) return jsonError('Sesion requerida', 401);
  const p = new URL(req.url).searchParams;
  const sales = await db.sale.findMany({ where: { businessId: auth.business.id, ...(p.get('from') || p.get('to') ? { createdAt: { ...(p.get('from') ? { gte: new Date(`${p.get('from')}T00:00:00.000Z`) } : {}), ...(p.get('to') ? { lte: new Date(`${p.get('to')}T23:59:59.999Z`) } : {}) } } : {}), ...(p.get('userId') ? { userId: p.get('userId')! } : {}), ...(p.get('paymentMethod') ? { paymentMethod: p.get('paymentMethod') as 'CASH' | 'CARD' | 'TRANSFER' } : {}) }, include: { lines: { include: { variant: { include: { product: true } }, returnLines: true } } }, orderBy: { createdAt: 'desc' } });
  const rows = sales.map((s) => { const lines = s.lines.filter((line) => (!p.get('productId') || line.variant.productId === p.get('productId')) && (!p.get('categoryId') || line.variant.product.categoryId === p.get('categoryId'))); const total = s.status === 'CANCELLED' ? 0 : lines.reduce((sum, line) => sum + Number(line.unitPrice) * (Number(line.quantity) - line.returnLines.reduce((n, item) => n + Number(item.quantity), 0)), 0); return { s, total }; }).filter(({ s, total }) => (!p.get('productId') && !p.get('categoryId')) || total > 0);
  const csv = ['Folio,Fecha,Metodo,Estado,Total MXN', ...rows.map(({ s, total }) => `${s.folio},${s.createdAt.toISOString()},${s.paymentMethod},${s.status},${total.toFixed(2)}`)].join('\n');
  return new Response('\ufeff' + csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="ventas.csv"' } });
}
