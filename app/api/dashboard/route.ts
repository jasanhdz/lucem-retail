import { getAuth, jsonError } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const auth = await getAuth({ renewCookie: true });
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  const params = new URL(req.url).searchParams;
  const from = params.get('from') ? new Date(`${params.get('from')}T00:00:00.000Z`) : new Date(new Date().setHours(0, 0, 0, 0));
  const to = params.get('to') ? new Date(`${params.get('to')}T23:59:59.999Z`) : new Date();
  const [sales, returns, variants, recent, reservations] = await Promise.all([
    db.sale.findMany({ where: { businessId: auth.business.id, status: 'CONFIRMED', createdAt: { gte: from, lte: to } }, include: { lines: true } }),
    db.return.findMany({ where: { businessId: auth.business.id, createdAt: { gte: from, lte: to } } }),
    db.productVariant.findMany({ where: { businessId: auth.business.id, active: true }, include: { product: { include: { category: true } } } }),
    db.sale.findMany({ where: { businessId: auth.business.id, createdAt: { gte: from, lte: to } }, include: { user: { select: { name: true } }, lines: { include: { variant: { include: { product: true } } } } }, orderBy: { createdAt: 'desc' }, take: 4 }),
    db.reservation.findMany({ where: { businessId: auth.business.id, status: 'ACTIVE' }, include: { variant: { include: { product: true } } }, orderBy: { expiresAt: 'asc' } }),
  ]);
  const gross = sales.reduce((n, sale) => n + Number(sale.total), 0);
  const returned = returns.reduce((n, row) => n + Number(row.refundAmount), 0);
  const units = sales.reduce((n, sale) => n + sale.lines.reduce((x, line) => x + Number(line.quantity), 0), 0);
  const cogs = sales.reduce((n, sale) => n + sale.lines.reduce((x, line) => x + Number(line.unitCost) * Number(line.quantity), 0), 0);
  const reservedByVariant = new Map<string, number>();
  reservations.forEach(reservation => reservedByVariant.set(reservation.variantId, (reservedByVariant.get(reservation.variantId) ?? 0) + Number(reservation.quantity)));
  const uniqueAlerts = (predicate: (variant: typeof variants[number]) => boolean) => {
    const products = new Map<string, { name: string; variant: string; stock: string }>();
    variants.filter(predicate).forEach(variant => {
      if (!products.has(variant.productId)) products.set(variant.productId, { name: variant.product.name, variant: [variant.color, variant.size].filter(Boolean).join(' / '), stock: variant.stock.toString() });
    });
    return [...products.values()];
  };
  const outOfStockItems = uniqueAlerts(variant => Number(variant.stock) === 0);
  const lowStockItems = uniqueAlerts(variant => Number(variant.stock) > 0 && Number(variant.stock) <= Number(variant.lowStockThreshold));
  const net = gross - returned;
  const reservedUnits = reservations.reduce((sum, reservation) => sum + Number(reservation.quantity), 0);
  const physical = variants.reduce((sum, variant) => sum + Number(variant.stock) + (reservedByVariant.get(variant.id) ?? 0), 0);
  const expiringReservations = reservations.filter(reservation => reservation.expiresAt.getTime() <= Date.now() + 48 * 60 * 60 * 1000).length;
  const cashClose = sales.filter(sale => sale.paymentMethod === 'CASH').reduce((sum, sale) => sum + Number(sale.total), 0);
  const activeSkus = variants.length;
  const activeCategories = new Set(variants.map(variant => variant.product.categoryId).filter(Boolean)).size;
  const healthyProducts = new Set(variants.filter(variant => Number(variant.stock) > Number(variant.lowStockThreshold)).map(variant => variant.productId)).size;
  return Response.json({
    gross: gross.toFixed(2), net: net.toFixed(2), units, cogs: cogs.toFixed(2), profit: (net - cogs).toFixed(2),
    outOfStock: outOfStockItems.length, lowStock: lowStockItems.length,
    businessName: auth.business.name, branchName: auth.business.branchName, updatedAt: new Date().toISOString(),
    transactionCount: sales.length, averageTicket: (sales.length ? net / sales.length : 0).toFixed(2),
    activeSkus, activeCategories, physical: physical.toFixed(2), reservedUnits: reservedUnits.toFixed(2),
    activeReservations: reservations.length, expiringReservations, healthyProducts, cashClose: cashClose.toFixed(2),
    outOfStockItems, lowStockItems,
    recent: recent.map(sale => ({ id: sale.id, folio: sale.folio, total: sale.total.toString(), status: sale.status, createdAt: sale.createdAt, userName: sale.user.name, paymentMethod: sale.paymentMethod, lineCount: sale.lines.length, items: sale.lines.slice(0, 2).map(line => `${line.variant.product.name} ×${Number(line.quantity)}`) })),
  });
}
