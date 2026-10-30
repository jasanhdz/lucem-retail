import { getAuth, jsonError } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

export async function POST(req: Request) {
  const auth = await getAuth();
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  const body = await req.json();
  if (!Array.isArray(body.items) || !body.items.length) return jsonError('El carrito esta vacio');
  try {
    const sale = await db.$transaction(async (tx) => {
      if (body.idempotencyKey) {
        const existing = await tx.saleIdempotency.findUnique({ where: { businessId_key: { businessId: auth.business!.id, key: body.idempotencyKey } }, include: { sale: true } });
        if (existing) return existing.sale;
      }
      const ids = body.items.map((item: { variantId: string }) => item.variantId);
      const variants = await tx.productVariant.findMany({ where: { id: { in: ids }, businessId: auth.business!.id } });
      if (variants.length !== ids.length) throw new Error('product');
      let subtotal = 0;
      const lines = body.items.map((item: { variantId: string; quantity: number }) => {
        const variant = variants.find((candidate: { id: string }) => candidate.id === item.variantId)!;
        const quantity = Number(item.quantity);
        if (!quantity || quantity > Number(variant.stock)) throw new Error('stock');
        const price = Number(variant.promoPrice ?? variant.price);
        subtotal += price * quantity;
        return { variant, quantity, price };
      });
      const previous = await tx.sale.findFirst({ where: { businessId: auth.business!.id }, orderBy: { folio: 'desc' } });
      const received = body.paymentMethod === 'CASH' ? Number(body.receivedAmount) : subtotal;
      if (body.paymentMethod === 'CASH' && received < subtotal) throw new Error('cash');
      const created = await tx.sale.create({ data: { businessId: auth.business!.id, userId: auth.user.id, folio: (previous?.folio ?? 0) + 1, paymentMethod: body.paymentMethod ?? 'CASH', subtotal, total: subtotal, receivedAmount: body.paymentMethod === 'CASH' ? received : null, changeAmount: body.paymentMethod === 'CASH' ? received - subtotal : 0, lines: { create: lines.map((line: { variant: { id: string; cost: unknown }; quantity: number; price: number }) => ({ variantId: line.variant.id, quantity: line.quantity, unitPrice: line.price, unitCost: line.variant.cost as number, lineTotal: line.price * line.quantity })) } } });
      for (const line of lines) {
        await tx.productVariant.update({ where: { id: line.variant.id }, data: { stock: { decrement: line.quantity } } });
        await tx.inventoryMovement.create({ data: { businessId: auth.business!.id, variantId: line.variant.id, userId: auth.user.id, type: 'SALE', quantity: -line.quantity, referenceType: 'Sale', referenceId: created.id } });
      }
      if (body.idempotencyKey) await tx.saleIdempotency.create({ data: { businessId: auth.business!.id, key: body.idempotencyKey, saleId: created.id, requestHash: JSON.stringify(body) } });
      return created;
    });
    await audit({ businessId: auth.business.id, userId: auth.user.id, action: 'CREATE', entityType: 'Sale', entityId: sale.id });
    return Response.json({ ...sale, total: sale.total.toString(), changeAmount: sale.changeAmount.toString() }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error && error.message === 'stock' ? 'Existencia insuficiente' : 'No fue posible registrar la venta', 409);
  }
}
