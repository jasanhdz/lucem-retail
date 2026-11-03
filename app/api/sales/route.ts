import { getAuth, jsonError } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit, auditOptionsForRequest } from '@/lib/audit';
import { PaymentMethod } from '@prisma/client';

export async function GET(req: Request) {
  const auth = await getAuth({ renewCookie: true });
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  const search = new URL(req.url).searchParams.get('search')?.trim();
  const sales = await db.sale.findMany({ where: { businessId: auth.business.id, ...(search ? { OR: [{ id: search }, { folio: Number.isNaN(Number(search)) ? undefined : Number(search) }] } : {}) }, include: { lines: { include: { variant: { include: { product: true } }, returnLines: true } } }, orderBy: { createdAt: 'desc' }, take: 50 });
  return Response.json(sales.map((sale) => ({ ...sale, subtotal: sale.subtotal.toString(), total: sale.total.toString(), changeAmount: sale.changeAmount.toString(), receivedAmount: sale.receivedAmount?.toString() ?? null, lines: sale.lines.map((line) => ({ ...line, quantity: line.quantity.toString(), unitPrice: line.unitPrice.toString(), unitCost: line.unitCost.toString(), lineTotal: line.lineTotal.toString(), returnedQuantity: line.returnLines.reduce((sum, item) => sum + Number(item.quantity), 0) })) })));
}

export async function POST(req: Request) {
  const auth = await getAuth({ renewCookie: true });
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  const body = await req.json();
  if (!Array.isArray(body.items) || !body.items.length) return jsonError('El carrito esta vacio');
  if (!Object.values(PaymentMethod).includes(body.paymentMethod)) return jsonError('Metodo de pago invalido');
  if (body.idempotencyKey && (typeof body.idempotencyKey !== 'string' || body.idempotencyKey.length > 120)) return jsonError('Idempotencia invalida');
  try {
    const sale = await db.$transaction(async (tx) => {
      if (body.idempotencyKey) {
        const existing = await tx.saleIdempotency.findUnique({ where: { businessId_key: { businessId: auth.business!.id, key: body.idempotencyKey } }, include: { sale: true } });
        if (existing) {
          if (existing.requestHash !== JSON.stringify(body)) throw new Error('idempotency');
          return existing.sale;
        }
      }
       const ids = body.items.map((item: { variantId: string }) => item.variantId);
       if (new Set(ids).size !== ids.length) throw new Error('items');
      const variants = await tx.productVariant.findMany({ where: { id: { in: ids }, businessId: auth.business!.id } });
      if (variants.length !== ids.length) throw new Error('product');
      let subtotal = 0;
      const lines = body.items.map((item: { variantId: string; quantity: number }) => {
        const variant = variants.find((candidate: { id: string }) => candidate.id === item.variantId)!;
        const quantity = Number(item.quantity);
         if (!Number.isFinite(quantity) || quantity <= 0 || quantity > Number(variant.stock)) throw new Error('stock');
        const price = Number(variant.promoPrice ?? variant.price);
        subtotal += price * quantity;
        return { variant, quantity, price };
       });
      const previous = await tx.sale.findFirst({ where: { businessId: auth.business!.id }, orderBy: { folio: 'desc' } });
      const received = body.paymentMethod === 'CASH' ? Number(body.receivedAmount) : subtotal;
      if (body.paymentMethod === 'CASH' && received < subtotal) throw new Error('cash');
       const created = await tx.sale.create({ data: { businessId: auth.business!.id, userId: auth.user.id, folio: (previous?.folio ?? 0) + 1, paymentMethod: body.paymentMethod, subtotal, total: subtotal, receivedAmount: body.paymentMethod === 'CASH' ? received : null, changeAmount: body.paymentMethod === 'CASH' ? received - subtotal : 0, lines: { create: lines.map((line: { variant: { id: string; cost: unknown }; quantity: number; price: number }) => ({ variantId: line.variant.id, quantity: line.quantity, unitPrice: line.price, unitCost: line.variant.cost as number, lineTotal: line.price * line.quantity })) } } });
       for (const line of lines) {
         const changed = await tx.productVariant.updateMany({ where: { id: line.variant.id, businessId: auth.business!.id, stock: { gte: line.quantity } }, data: { stock: { decrement: line.quantity } } });
         if (changed.count !== 1) throw new Error('stock');
        await tx.inventoryMovement.create({ data: { businessId: auth.business!.id, variantId: line.variant.id, userId: auth.user.id, type: 'SALE', quantity: -line.quantity, referenceType: 'Sale', referenceId: created.id } });
      }
       if (body.idempotencyKey) await tx.saleIdempotency.create({ data: { businessId: auth.business!.id, key: body.idempotencyKey, saleId: created.id, requestHash: JSON.stringify(body) } });
       await audit({ businessId: auth.business!.id, userId: auth.user.id, action: 'CREATE', entityType: 'Sale', entityId: created.id }, tx, auditOptionsForRequest(req));
       return created;
     }, { isolationLevel: 'Serializable' });
     return Response.json({ ...sale, total: sale.total.toString(), changeAmount: sale.changeAmount.toString() }, { status: 201 });
    } catch (error) {
      const conflict = error instanceof Error && (['stock', 'idempotency'].includes(error.message) || 'code' in error && error.code === 'P2034');
      return jsonError(error instanceof Error && error.message === 'idempotency' ? 'La clave de idempotencia ya fue usada con otro contenido' : conflict ? 'Existencia insuficiente' : 'No fue posible registrar la venta', conflict ? 409 : 400);
    }
}
