import { getAuth, jsonError } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth({ renewCookie: true });
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  const { id } = await params;
  const product = await db.product.findFirst({ where: { id, businessId: auth.business.id }, select: { variants: { select: { id: true } } } });
  if (!product) return jsonError('Producto no encontrado', 404);
  const rows = await db.priceCostHistory.findMany({ where: { businessId: auth.business.id, variantId: { in: product.variants.map((v) => v.id) } }, include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } });
  return Response.json(rows.map((row) => ({ ...row, oldValue: row.oldValue?.toString() ?? null, newValue: row.newValue?.toString() ?? null })));
}
