import { getAuth, jsonError, permitted } from '@/lib/auth';
import { audit, auditOptionsForRequest } from '@/lib/audit';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';
import { businessWriteGate, commercialWriteGate } from '@/lib/abuse-limits';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth({ renewCookie: true });
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  if (!permitted(auth.membership?.role, [Role.ADMIN]) && !auth.membership?.canCancelSales) return jsonError('No autorizado', 403);
  const writeGate = await businessWriteGate(auth.business.id, req);
  if (writeGate) return writeGate;
  const commercialGate = await commercialWriteGate(auth.business.id);
  if (commercialGate) return commercialGate;
  const body = await req.json();
  if (body.confirmation !== true || !body.reason?.trim()) return jsonError('Motivo y confirmacion son obligatorios');
  const { id } = await params;
  try {
    const sale = await db.$transaction(async (tx) => {
      const current = await tx.sale.findFirst({ where: { id, businessId: auth.business!.id }, include: { lines: true } });
      if (!current) throw new Error('not-found');
      if (current.status === 'CANCELLED') return current;
      const updated = await tx.sale.update({ where: { id }, data: { status: 'CANCELLED', cancelReason: body.reason.trim(), cancelledAt: new Date() } });
      for (const line of current.lines) {
        await tx.productVariant.update({ where: { id: line.variantId }, data: { stock: { increment: line.quantity } } });
        await tx.inventoryMovement.create({ data: { businessId: auth.business!.id, variantId: line.variantId, userId: auth.user.id, type: 'SALE_CANCEL', quantity: line.quantity, reason: body.reason.trim(), referenceType: 'Sale', referenceId: id } });
      }
      await audit({ businessId: auth.business!.id, userId: auth.user.id, action: 'CANCEL', entityType: 'Sale', entityId: id, metadata: { reason: body.reason.trim() } }, tx, auditOptionsForRequest(req));
      return updated;
    });
    return Response.json({ ...sale, total: sale.total.toString(), changeAmount: sale.changeAmount.toString() });
  } catch (error) {
    return jsonError(error instanceof Error && error.message === 'not-found' ? 'Venta no encontrada' : 'No fue posible cancelar la venta', error instanceof Error && error.message === 'not-found' ? 404 : 409);
  }
}
