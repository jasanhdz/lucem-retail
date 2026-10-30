import { getAuth, jsonError } from '@/lib/auth';
import { db } from '@/lib/db';
export async function GET(req: Request) {
  const auth = await getAuth(); if (!auth?.business) return jsonError('Sesion requerida', 401);
  const p = new URL(req.url).searchParams;
  const sales = await db.sale.findMany({ where: { businessId: auth.business.id, ...(p.get('from') || p.get('to') ? { createdAt: { ...(p.get('from') ? { gte: new Date(`${p.get('from')}T00:00:00.000Z`) } : {}), ...(p.get('to') ? { lte: new Date(`${p.get('to')}T23:59:59.999Z`) } : {}) } } : {}), ...(p.get('userId') ? { userId: p.get('userId')! } : {}), ...(p.get('paymentMethod') ? { paymentMethod: p.get('paymentMethod') as 'CASH' | 'CARD' | 'TRANSFER' } : {}) }, orderBy: { createdAt: 'desc' } });
  const csv = ['Folio,Fecha,Metodo,Estado,Total MXN', ...sales.map((s) => `${s.folio},${s.createdAt.toISOString()},${s.paymentMethod},${s.status},${Number(s.total).toFixed(2)}`)].join('\n');
  return new Response('\ufeff' + csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="ventas.csv"' } });
}
