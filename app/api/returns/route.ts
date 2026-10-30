import { getAuth, jsonError, permitted } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';

function serialize(row: any) {
  return { ...row, refundAmount: row.refundAmount.toString(), lines: row.lines?.map((line: any) => ({ ...line, quantity: line.quantity.toString(), amount: line.amount.toString() })) };
}

export async function GET(req: Request) {
  const auth = await getAuth();
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  const search = new URL(req.url).searchParams.get('search')?.trim();
  const rows = await db.return.findMany({ where: { businessId: auth.business.id, ...(search ? { OR: [{ saleId: search }, { reason: { contains: search, mode: 'insensitive' } }] } : {}) }, include: { sale: { select: { folio: true } }, lines: true, user: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 50 });
  return Response.json(rows.map(serialize));
}

export async function POST(req: Request) {
  const auth = await getAuth();
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  if (!permitted(auth.membership?.role, [Role.ADMIN, Role.INVENTORY_MANAGER])) return jsonError('No autorizado', 403);
  const body = await req.json();
  if (body.confirmation !== true || !body.saleId || !body.reason?.trim() || !Array.isArray(body.items) || !body.items.length) return jsonError('Venta, motivo, lineas y confirmacion son obligatorios');
  try {
    const result = await db.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({ where: { id: body.saleId, businessId: auth.business!.id }, include: { lines: { include: { returnLines: true } } } });
      if (!sale || sale.status === 'CANCELLED') throw new Error('sale');
      const requested = new Map<string, number>();
      for (const item of body.items) {
        const quantity = Number(item.quantity);
        if (!item.saleLineId || !Number.isFinite(quantity) || quantity <= 0 || requested.has(item.saleLineId)) throw new Error('quantity');
        requested.set(item.saleLineId, quantity);
      }
      const lines = [...requested.entries()].map(([saleLineId, quantity]) => {
        const line = sale.lines.find((candidate) => candidate.id === saleLineId);
        const returned = line?.returnLines.reduce((sum, item) => sum + Number(item.quantity), 0) ?? 0;
        if (!line || quantity + returned > Number(line.quantity)) throw new Error('quantity');
        return { line, quantity, amount: Number(line.unitPrice) * quantity };
      });
      const refund = Number(body.refundAmount);
      if (!Number.isFinite(refund) || refund < 0) throw new Error('refund');
      const created = await tx.return.create({ data: { businessId: auth.business!.id, saleId: sale.id, userId: auth.user.id, reason: body.reason.trim(), refundAmount: refund, lines: { create: lines.map(({ line, quantity, amount }) => ({ saleLineId: line!.id, quantity, amount })) } } });
      for (const { line, quantity } of lines) {
        await tx.productVariant.update({ where: { id: line!.variantId }, data: { stock: { increment: quantity } } });
        await tx.inventoryMovement.create({ data: { businessId: auth.business!.id, variantId: line!.variantId, userId: auth.user.id, type: 'RETURN', quantity, reason: body.reason.trim(), referenceType: 'Return', referenceId: created.id } });
      }
      return tx.return.findUniqueOrThrow({ where: { id: created.id }, include: { lines: true } });
    });
    await audit({ businessId: auth.business.id, userId: auth.user.id, action: 'CREATE', entityType: 'Return', entityId: result.id });
    return Response.json(serialize(result), { status: 201 });
  } catch (error) {
    const message = error instanceof Error && error.message === 'quantity' ? 'La cantidad excede lo pendiente' : error instanceof Error && error.message === 'sale' ? 'Venta no encontrada o cancelada' : 'No fue posible crear la devolucion';
    return jsonError(message, error instanceof Error && error.message === 'sale' ? 404 : 400);
  }
}
