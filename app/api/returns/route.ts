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
  const numericSearch = search && Number.isFinite(Number(search)) ? Number(search) : undefined;
  const rows = await db.return.findMany({ where: { businessId: auth.business.id, ...(search ? { OR: [{ saleId: search }, { reason: { contains: search, mode: 'insensitive' } }, ...(numericSearch === undefined ? [] : [{ sale: { folio: numericSearch } }])] } : {}) }, include: { sale: { select: { id: true, folio: true, total: true, createdAt: true } }, lines: true, user: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 50 });
  return Response.json(rows.map(serialize));
}

export async function POST(req: Request) {
  const auth = await getAuth();
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  if (!permitted(auth.membership?.role, [Role.ADMIN, Role.INVENTORY_MANAGER])) return jsonError('No autorizado', 403);
  const body = await req.json();
  if (body.confirmation !== true || !body.saleId || !body.reason?.trim() || !Array.isArray(body.items) || !body.items.length) return jsonError('Venta, motivo, lineas y confirmacion son obligatorios');
  if (body.idempotencyKey !== undefined && (typeof body.idempotencyKey !== 'string' || body.idempotencyKey.length < 8 || body.idempotencyKey.length > 120)) return jsonError('Idempotencia invalida');
  const requestHash = JSON.stringify(body);
  try {
    const result = await db.$transaction(async (tx) => {
      if (body.idempotencyKey) {
        const existing = await tx.return.findUnique({ where: { businessId_idempotencyKey: { businessId: auth.business!.id, idempotencyKey: body.idempotencyKey } }, include: { lines: true } });
        if (existing) {
          if (existing.requestHash !== requestHash) throw new Error('idempotency');
          return { row: existing, replay: true };
        }
      }
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
        return { line, quantity, amount: Number((Number(line.unitPrice) * quantity).toFixed(2)) };
      });
      const refund = Number(body.refundAmount);
      if (!Number.isFinite(refund) || refund < 0) throw new Error('refund');
      const expectedRefund = Number(lines.reduce((sum, item) => sum + item.amount, 0).toFixed(2));
      if (refund !== Number(refund.toFixed(2)) || refund !== expectedRefund) throw new Error('refund');
      const created = await tx.return.create({ data: { businessId: auth.business!.id, saleId: sale.id, userId: auth.user.id, reason: body.reason.trim(), refundAmount: expectedRefund, idempotencyKey: body.idempotencyKey || null, requestHash: body.idempotencyKey ? requestHash : null, lines: { create: lines.map(({ line, quantity, amount }) => ({ saleLineId: line!.id, quantity, amount })) } } });
      for (const { line, quantity } of lines) {
        await tx.productVariant.update({ where: { id: line!.variantId }, data: { stock: { increment: quantity } } });
        await tx.inventoryMovement.create({ data: { businessId: auth.business!.id, variantId: line!.variantId, userId: auth.user.id, type: 'RETURN', quantity, reason: body.reason.trim(), referenceType: 'Return', referenceId: created.id } });
      }
      const row = await tx.return.findUniqueOrThrow({ where: { id: created.id }, include: { lines: true } });
      await audit({ businessId: auth.business!.id, userId: auth.user.id, action: 'CREATE', entityType: 'Return', entityId: row.id }, tx, { failForTesting: process.env.NODE_ENV !== 'production' && req.headers.get('x-lucem-e2e-fail-audit') === '1' });
      return { row, replay: false };
    }, { isolationLevel: 'Serializable' });
    return Response.json(serialize(result.row), { status: result.replay ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const conflict = message === 'idempotency' || (error instanceof Error && 'code' in error && ['P2002', 'P2034'].includes(String((error as { code?: string }).code)));
    const text = message === 'quantity' ? 'La cantidad excede lo pendiente' : message === 'sale' ? 'Venta no encontrada o cancelada' : message === 'refund' ? 'El reembolso debe coincidir con el importe de las líneas' : conflict && message === 'idempotency' ? 'La clave de idempotencia ya fue usada con otro contenido' : conflict ? 'La devolución entró en conflicto; vuelve a consultar la venta' : 'No fue posible crear la devolucion';
    return jsonError(text, message === 'sale' ? 404 : conflict ? 409 : ['quantity', 'refund'].includes(message) ? 400 : 500);
  }
}
