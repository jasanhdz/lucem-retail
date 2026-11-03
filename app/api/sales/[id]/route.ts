import { getAuth, jsonError } from '@/lib/auth';
import { db } from '@/lib/db';

function serialize(sale: any) {
  return { ...sale, subtotal: sale.subtotal.toString(), total: sale.total.toString(), changeAmount: sale.changeAmount.toString(), receivedAmount: sale.receivedAmount?.toString() ?? null, lines: sale.lines.map((line: any) => ({ ...line, quantity: line.quantity.toString(), unitPrice: line.unitPrice.toString(), unitCost: line.unitCost.toString(), lineTotal: line.lineTotal.toString(), returnedQuantity: line.returnLines.reduce((sum: number, item: any) => sum + Number(item.quantity), 0) })) };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth({ renewCookie: true });
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  const { id } = await params;
  const sale = await db.sale.findFirst({ where: { id, businessId: auth.business.id }, include: { lines: { include: { variant: { include: { product: true } }, returnLines: true } }, user: { select: { name: true } } } });
  if (!sale) return jsonError('Venta no encontrada', 404);
  return Response.json(serialize(sale));
}
