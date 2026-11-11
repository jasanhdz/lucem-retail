import { createHash, randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { link, mkdir, open, readFile, stat, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import bcrypt from 'bcryptjs';
import { PaymentMethod, Prisma, PrismaClient, ReservationStatus, Role, SaleStatus } from '@prisma/client';
import { BATCH_SIZE, businesses, DATABASE, ean13, EXPECTED_HOST, EXPECTED_USER, PRODUCT_COUNT, productName, stableId, targetConfiguration, validEan13, VARIANTS_PER_BUSINESS } from './seed-demo-data';

export const CREDENTIALS_PATH = join(process.env.HOME ?? '', '.local/share/lucem-retail-demo/credentials.json');
const db = new PrismaClient();

export const demoUsers = [
  { id: 'demo-user-admin', email: 'admin@lucem-demo.invalid', name: 'Administración Demo', role: Role.ADMIN },
  { id: 'demo-user-seller', email: 'seller@lucem-demo.invalid', name: 'Ventas Demo', role: Role.SELLER },
  { id: 'demo-user-inventory', email: 'inventory@lucem-demo.invalid', name: 'Inventario Demo', role: Role.INVENTORY_MANAGER },
];

function envFlag(name: string) { return process.env[name] === '1'; }
function expectedBusiness(index: number) { return businesses[index]; }
function priceFor(i: number) { return (49 + ((i * 37) % 195_000) / 100).toFixed(2); }
function stockFor(spec: typeof businesses[number], i: number) {
  if (spec.giro === 'SERVICIOS' || i % 10 === 0) return '0.00';
  if (i % 10 <= 2) return (i % 5 === 0 ? '1.00' : '3.00');
  if (spec.giro === 'ABARROTES' || spec.giro === 'OTRO') return `${(12 + (i % 70) * 0.25).toFixed(2)}`;
  return `${15 + (i % 90)}`;
}
async function assertTarget() {
  targetConfiguration(process.env.DATABASE_URL);
  const rows = await db.$queryRaw<Array<{ name: string; host: string; port: number; user: string }>>`SELECT current_database() AS name, trim(split_part(inet_server_addr()::text, '/', 1)) AS host, inet_server_port() AS port, current_user AS user`;
  const migrations = await db.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  if (rows[0]?.name !== DATABASE || rows[0]?.host !== EXPECTED_HOST || rows[0]?.port !== 5432 || rows[0]?.user !== EXPECTED_USER || Number(migrations[0]?.count) !== 6) throw new Error('Identidad de staging o estado de migraciones inválido');
}
async function checkCoreCollisions() {
  for (const business of businesses) {
    const existing = await db.business.findUnique({ where: { id: business.id } });
    if (existing && (existing.name !== business.name || existing.giro !== business.giro || existing.branchName !== 'Sucursal principal' || existing.currency !== 'MXN' || existing.timezone !== 'America/Mexico_City')) throw new Error(`Colisión de negocio demo ${business.id}`);
    const categories = business.categories.map((name, i) => ({ id: `demo-category-${businesses.indexOf(business) + 1}-${i + 1}`, name }));
    for (const category of categories) {
      const byId = await db.category.findUnique({ where: { id: category.id } });
      if (byId && (byId.businessId !== business.id || byId.name !== category.name || !byId.active)) throw new Error(`Colisión de categoría demo ${category.id}`);
    }
    const byName = await db.category.findMany({ where: { businessId: business.id, name: { in: business.categories } }, select: { id: true, name: true } });
    if (byName.some((row) => categories.find((category) => category.name === row.name)?.id !== row.id)) throw new Error(`Colisión de categoría en ${business.name}`);
  }
  for (const user of demoUsers) {
    const byId = await db.user.findUnique({ where: { id: user.id } });
    if (byId && (byId.email !== user.email || byId.name !== user.name || !byId.active)) throw new Error(`Colisión de usuario demo ${user.id}`);
    const byEmail = await db.user.findUnique({ where: { email: user.email } });
    if (byEmail && byEmail.id !== user.id) throw new Error('Email reservado de demo ocupado por una fila ajena');
  }
  for (const [businessIndex, business] of businesses.entries()) for (const [userIndex, user] of demoUsers.entries()) {
    const current = await db.membership.findUnique({ where: { userId_businessId: { userId: user.id, businessId: business.id } } });
    const role = [Role.ADMIN, Role.SELLER, Role.INVENTORY_MANAGER][userIndex];
    if (current && (current.role !== role || current.canCancelSales !== (userIndex === 0))) throw new Error(`Colisión de membership ${businessIndex + 1}/${userIndex + 1}`);
  }
  for (const [businessIndex, business] of businesses.entries()) if (business.giro !== 'SERVICIOS') {
    const sale = await db.sale.findUnique({ where: { businessId_folio: { businessId: business.id, folio: 900000 + businessIndex + 1 } }, select: { id: true } });
    if (sale && sale.id !== `demo-sale-${businessIndex + 1}-1`) throw new Error(`Folio demo ocupado en ${business.name}`);
    const returnRow = await db.return.findUnique({ where: { businessId_idempotencyKey: { businessId: business.id, idempotencyKey: `demo-return-${businessIndex + 1}` } }, select: { id: true } });
    if (returnRow && returnRow.id !== `demo-return-${businessIndex + 1}-1`) throw new Error(`Clave de devolución demo ocupada en ${business.name}`);
  }
}
async function getCredentials(existingUsers: number) {
  try {
    const dir = await stat(dirname(CREDENTIALS_PATH));
    if ((dir.mode & 0o777) !== 0o700) throw new Error('El directorio local de credenciales debe tener modo 0700');
    const info = await stat(CREDENTIALS_PATH);
    if ((info.mode & 0o777) !== 0o600) throw new Error('El archivo local de credenciales debe tener modo 0600');
    const parsed = JSON.parse(await readFile(CREDENTIALS_PATH, 'utf8')) as { users?: Array<{ id: string; email: string; password: string }> };
    if (!Array.isArray(parsed.users) || parsed.users.length !== 3 || new Set(parsed.users.map((saved) => saved.password)).size !== 3 || demoUsers.some((u) => !parsed.users!.some((saved) => saved.id === u.id && saved.email === u.email && typeof saved.password === 'string' && saved.password.length >= 24))) throw new Error('Archivo local de credenciales demo inválido');
    return parsed.users;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    if (existingUsers > 0) throw new Error('Hay usuarios demo previos pero no existe el archivo de credenciales; recuperación abortada');
    const generated = new Set<string>();
    const users = demoUsers.map((user) => {
      let password = randomBytes(36).toString('base64url');
      while (generated.has(password)) password = randomBytes(36).toString('base64url');
      generated.add(password);
      return { id: user.id, email: user.email, password };
    });
    await mkdir(dirname(CREDENTIALS_PATH), { recursive: true, mode: 0o700 });
    const dir = await stat(dirname(CREDENTIALS_PATH));
    if ((dir.mode & 0o777) !== 0o700) throw new Error('El directorio de credenciales debe tener modo 0700');
    const temporary = `${CREDENTIALS_PATH}.${process.pid}.tmp`;
    const file = await open(temporary, 'wx', 0o600);
    try { await file.writeFile(`${JSON.stringify({ users }, null, 2)}\n`); await file.sync(); }
    catch (error) { await file.close(); await unlink(temporary).catch(() => undefined); throw error; }
    await file.close();
    try { await link(temporary, CREDENTIALS_PATH); await unlink(temporary); } catch (error) { await unlink(temporary).catch(() => undefined); throw error; }
    return users;
  }
}
async function validateAndCreateMany<T extends { id: string }>(model: { findMany(args: any): Promise<any[]>; createMany(args: any): Promise<any> }, rows: T[], fields: (row: any) => unknown, label: string) {
  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);
    const found = await model.findMany({ where: { id: { in: batch.map((row) => row.id) } } });
    const byId = new Map(found.map((row) => [row.id, row]));
    for (const row of batch) {
      const current = byId.get(row.id);
      if (current && JSON.stringify(fields(current)) !== JSON.stringify(fields(row))) throw new Error(`Colisión de datos demo en ${label}, id ${row.id}`);
    }
    const missing = batch.filter((row) => !byId.has(row.id));
    if (missing.length) await db.$transaction((tx) => (tx as any)[label].createMany({ data: missing, skipDuplicates: true }));
  }
}
const same = (...values: unknown[]) => values.map((v) => v instanceof Date ? v.toISOString() : v?.toString?.() ?? v);

async function createIdentity() {
  const usersPresent = await db.user.count({ where: { OR: [{ id: { in: demoUsers.map((u) => u.id) } }, { email: { in: demoUsers.map((u) => u.email) } }] } });
  const credentials = await getCredentials(usersPresent);
  for (let i = 0; i < demoUsers.length; i += 1) {
    const u = demoUsers[i]; const saved = credentials.find((c) => c.id === u.id)!;
    const found = await db.user.findUnique({ where: { id: u.id } });
    if (found) {
      if (found.email !== u.email || found.name !== u.name || !found.active || !await bcrypt.compare(saved.password, found.passwordHash)) throw new Error(`Colisión en usuario demo ${u.id}`);
    } else {
      const emailOwner = await db.user.findUnique({ where: { email: u.email } });
      if (emailOwner) throw new Error('Email de demo ocupado por una fila ajena');
      await db.user.create({ data: { id: u.id, email: u.email, name: u.name, passwordHash: await bcrypt.hash(saved.password, 12), active: true } });
    }
  }
  for (const [bi, business] of businesses.entries()) {
    const found = await db.business.findUnique({ where: { id: business.id } });
    if (found && (found.name !== business.name || found.giro !== business.giro || found.currency !== 'MXN' || found.timezone !== 'America/Mexico_City')) throw new Error(`Colisión en negocio ${business.id}`);
    if (!found) await db.business.create({ data: { id: business.id, name: business.name, branchName: 'Sucursal principal', giro: business.giro, currency: 'MXN', timezone: 'America/Mexico_City' } });
    for (const [ui, user] of demoUsers.entries()) {
      const role = [Role.ADMIN, Role.SELLER, Role.INVENTORY_MANAGER][ui];
      const current = await db.membership.findUnique({ where: { userId_businessId: { userId: user.id, businessId: business.id } } });
      if (current && (current.role !== role || current.canCancelSales !== (role === Role.ADMIN))) throw new Error('Colisión en membership demo');
      if (!current) await db.membership.create({ data: { id: `demo-membership-${ui + 1}-${bi + 1}`, userId: user.id, businessId: business.id, role, canCancelSales: role === Role.ADMIN } });
    }
  }
}
async function createCatalog(bi: number) {
  const spec = expectedBusiness(bi);
  const categories = spec.categories.map((name, i) => ({ id: `demo-category-${bi + 1}-${i + 1}`, businessId: spec.id, name, active: true }));
  const categoryNameCollisions = await db.category.findMany({ where: { businessId: spec.id, name: { in: spec.categories } }, select: { id: true, name: true } });
  if (categoryNameCollisions.some((row) => categories.find((category) => category.name === row.name)?.id !== row.id)) throw new Error(`Colisión de categoría ajena en ${spec.name}`);
  await validateAndCreateMany(db.category, categories, (r) => same(r.id, r.businessId, r.name, r.active), 'category');
  for (let offset = 0; offset < PRODUCT_COUNT; offset += BATCH_SIZE) {
    const batch = Array.from({ length: Math.min(BATCH_SIZE, PRODUCT_COUNT - offset) }, (_, j) => {
      const n = offset + j; return { id: stableId('product', bi, n + 1), businessId: spec.id, name: productName(spec, n), photoPath: null, categoryId: categories[n % categories.length].id, location: ['Pasillo A', 'Pasillo B', 'Mostrador', 'Bodega'][n % 4], archived: n % 97 === 0 };
    });
    await validateAndCreateMany(db.product, batch, (r) => same(r.id, r.businessId, r.name, r.photoPath, r.categoryId, r.location, r.archived), 'product');
    console.log(`Productos ${spec.name}: ${offset + batch.length}/${PRODUCT_COUNT}`);
  }
  for (let offset = 0; offset < VARIANTS_PER_BUSINESS; offset += BATCH_SIZE) {
    const batch = Array.from({ length: Math.min(BATCH_SIZE, VARIANTS_PER_BUSINESS - offset) }, (_, j) => {
      const n = offset + j; const productIndex = n < PRODUCT_COUNT ? n : n - PRODUCT_COUNT;
      const price = Number(priceFor(n)); const cost = Number((price * (0.42 + (n % 24) / 100)).toFixed(2));
      const whole = spec.giro !== 'ABARROTES' && spec.giro !== 'OTRO';
      const stock = stockFor(spec, n);
      const prefix = String(bi + 1).padStart(2, '0') + String(n + 1).padStart(10, '0');
      return { id: stableId('variant', bi, n + 1), businessId: spec.id, productId: stableId('product', bi, productIndex + 1), sku: `DM${bi + 1}-${String(n + 1).padStart(5, '0')}`, barcode: ean13(prefix), size: n >= PRODUCT_COUNT ? ['CH', 'M', 'G', 'Única'][n % 4] : null, color: n >= PRODUCT_COUNT ? ['Negro', 'Azul', 'Natural', 'Rojo'][n % 4] : null, cost: new Prisma.Decimal(cost), price: new Prisma.Decimal(price), promoPrice: n % 17 === 0 ? new Prisma.Decimal((price * 0.9).toFixed(2)) : null, stock: whole ? new Prisma.Decimal(stock).toDecimalPlaces(0) : new Prisma.Decimal(stock), lowStockThreshold: new Prisma.Decimal(spec.giro === 'SERVICIOS' ? 0 : (n % 3 === 0 ? 5 : 10)), active: true };
    });
    const uniqueRows = await db.productVariant.findMany({ where: { businessId: spec.id, OR: [{ sku: { in: batch.map((v) => v.sku) } }, { barcode: { in: batch.map((v) => v.barcode!) } }] }, select: { id: true, sku: true, barcode: true } });
    const expectedByUnique = new Map(batch.flatMap((v) => [[v.sku, v.id], [v.barcode!, v.id]] as Array<[string, string]>));
    for (const current of uniqueRows) if (expectedByUnique.get(current.sku) !== current.id && expectedByUnique.get(current.barcode ?? '') !== current.id) throw new Error(`Colisión de SKU/barcode ajeno en ${current.id}`);
    const barcodes = new Set<string>();
    for (const variant of batch) { if (!validEan13(variant.barcode) || barcodes.has(variant.barcode)) throw new Error('EAN-13 duplicado o inválido'); barcodes.add(variant.barcode); }
    await validateAndCreateMany(db.productVariant, batch, (r) => same(r.id, r.businessId, r.productId, r.sku, r.barcode, r.size, r.color, r.cost, r.price, r.promoPrice, r.stock, r.lowStockThreshold, r.active), 'productVariant');
    console.log(`Variantes ${spec.name}: ${offset + batch.length}/${VARIANTS_PER_BUSINESS}`);
    const positive = batch.filter((v) => v.stock.gt(0)).map((v) => ({ id: `${v.id}-initial`, businessId: spec.id, variantId: v.id, userId: demoUsers[2].id, type: 'INITIAL' as const, quantity: v.stock, reason: 'Existencia inicial de demostración', referenceType: 'DEMO_SEED', referenceId: v.id, createdAt: new Date('2025-01-01T12:00:00.000Z') }));
    const expectedInitialByVariant = new Map(positive.map((movement) => [movement.variantId, movement.id]));
    const existingInitials = await db.inventoryMovement.findMany({ where: { businessId: spec.id, type: 'INITIAL', variantId: { in: batch.map((variant) => variant.id) } }, select: { id: true, variantId: true } });
    if (existingInitials.some((movement) => expectedInitialByVariant.get(movement.variantId) !== movement.id)) throw new Error(`Movimiento INITIAL ajeno o duplicado para una variante de ${spec.name}`);
    if (positive.length) {
      await validateAndCreateMany(db.inventoryMovement, positive, (r) => same(r.id, r.businessId, r.variantId, r.userId, r.type, r.quantity, r.referenceType, r.referenceId), 'inventoryMovement');
      const audits = positive.map((movement) => ({ id: `${movement.id}-audit`, businessId: spec.id, userId: demoUsers[2].id, action: 'CREATE', entityType: 'InventoryMovement', entityId: movement.id, metadata: { demo: true, movementType: 'INITIAL' } }));
      await validateAndCreateMany(db.auditLog, audits, (r) => same(r.id, r.businessId, r.userId, r.action, r.entityType, r.entityId, JSON.stringify(r.metadata)), 'auditLog');
    }
  }
}
async function createCommerce(bi: number) {
  const business = businesses[bi];
  if (business.giro === 'SERVICIOS') return;
  const variant = await db.productVariant.findFirst({ where: { businessId: business.id, id: { startsWith: `demo-variant-${bi + 1}-` }, stock: { gte: 12 }, active: true }, orderBy: { id: 'asc' } });
  if (!variant) throw new Error(`No hay variante con stock para actividad de ${business.name}`);
  const seller = demoUsers[1].id; const base = bi * 10;
  const saleId = `demo-sale-${bi + 1}-1`; const saleLineId = `demo-sale-line-${bi + 1}-1`;
  const price = variant.promoPrice ?? variant.price; const quantity = new Prisma.Decimal(2); const total = price.mul(quantity);
  const saleAt = new Date('2025-01-02T12:00:00.000Z');
  const reservationAt = new Date('2025-01-03T12:00:00.000Z');
  const returnAt = new Date('2025-01-04T12:00:00.000Z');
  await db.$transaction(async (tx) => {
    const existingSale = await tx.sale.findUnique({ where: { id: saleId }, include: { lines: true } });
    if (existingSale && (existingSale.businessId !== business.id || existingSale.userId !== seller || existingSale.folio !== 900000 + bi + 1 || existingSale.lines.length !== 1 || existingSale.lines[0].id !== saleLineId || existingSale.lines[0].variantId !== variant.id || !existingSale.lines[0].quantity.eq(quantity))) throw new Error(`Colisión de venta demo ${saleId}`);
    if (!existingSale) {
      const latest = await tx.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
      if (latest.stock.lt(quantity)) throw new Error('Stock insuficiente para la venta demo');
      await tx.sale.create({ data: { id: saleId, businessId: business.id, userId: seller, folio: 900000 + bi + 1, status: SaleStatus.CONFIRMED, paymentMethod: PaymentMethod.CASH, subtotal: total, total, receivedAmount: total, changeAmount: new Prisma.Decimal(0), createdAt: saleAt, lines: { create: { id: saleLineId, variantId: variant.id, quantity, unitPrice: price, unitCost: variant.cost, lineTotal: total } } } });
      await tx.productVariant.update({ where: { id: variant.id }, data: { stock: { decrement: quantity } } });
      await tx.inventoryMovement.create({ data: { id: `${saleId}-movement`, businessId: business.id, variantId: variant.id, userId: seller, type: 'SALE', quantity: quantity.neg(), reason: 'Venta sintética de demostración', referenceType: 'Sale', referenceId: saleId, createdAt: saleAt } });
      await tx.auditLog.create({ data: { id: `${saleId}-audit`, businessId: business.id, userId: seller, action: 'CREATE', entityType: 'Sale', entityId: saleId, metadata: { demo: true }, createdAt: saleAt } });
    }
    const reserveId = `demo-reservation-${bi + 1}-1`;
    const reservationUser = demoUsers[2].id;
    const existingReservation = await tx.reservation.findUnique({ where: { id: reserveId } });
    if (existingReservation && (existingReservation.businessId !== business.id || existingReservation.variantId !== variant.id || existingReservation.userId !== reservationUser || !existingReservation.quantity.eq(1) || existingReservation.status !== ReservationStatus.ACTIVE)) throw new Error(`Colisión de reserva demo ${reserveId}`);
    if (!existingReservation) {
      const latest = await tx.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
      if (latest.stock.lt(1)) throw new Error('Stock insuficiente para la reserva demo');
      await tx.reservation.create({ data: { id: reserveId, businessId: business.id, variantId: variant.id, userId: reservationUser, quantity: new Prisma.Decimal(1), customerName: `Cliente Demo ${base + 1}`, expiresAt: new Date('2035-01-01T12:00:00Z'), notes: 'Registro sintético para demostración', status: ReservationStatus.ACTIVE, createdAt: reservationAt, updatedAt: reservationAt } });
      await tx.productVariant.update({ where: { id: variant.id }, data: { stock: { decrement: 1 } } });
      await tx.inventoryMovement.create({ data: { id: `${reserveId}-movement`, businessId: business.id, variantId: variant.id, userId: reservationUser, type: 'RESERVATION', quantity: new Prisma.Decimal(-1), reason: 'Reserva sintética de demostración', referenceType: 'Reservation', referenceId: reserveId, createdAt: reservationAt } });
      await tx.auditLog.create({ data: { id: `${reserveId}-audit`, businessId: business.id, userId: reservationUser, action: 'CREATE', entityType: 'Reservation', entityId: reserveId, metadata: { demo: true }, createdAt: reservationAt } });
    }
    const returnId = `demo-return-${bi + 1}-1`;
    const returnUser = demoUsers[0].id;
    const existingReturn = await tx.return.findUnique({ where: { id: returnId }, include: { lines: true } });
    if (existingReturn && (existingReturn.businessId !== business.id || existingReturn.saleId !== saleId || existingReturn.userId !== returnUser || existingReturn.lines.length !== 1 || existingReturn.lines[0].saleLineId !== saleLineId || !existingReturn.lines[0].quantity.eq(1))) throw new Error(`Colisión de devolución demo ${returnId}`);
    if (!existingReturn) {
      await tx.return.create({ data: { id: returnId, businessId: business.id, saleId, userId: returnUser, reason: 'Devolución sintética de demostración', refundAmount: price, idempotencyKey: `demo-return-${bi + 1}`, requestHash: createHash('sha256').update(returnId).digest('hex'), createdAt: returnAt, lines: { create: { id: `${returnId}-line`, saleLineId, quantity: new Prisma.Decimal(1), amount: price } } } });
      await tx.productVariant.update({ where: { id: variant.id }, data: { stock: { increment: 1 } } });
      await tx.inventoryMovement.create({ data: { id: `${returnId}-movement`, businessId: business.id, variantId: variant.id, userId: returnUser, type: 'RETURN', quantity: new Prisma.Decimal(1), reason: 'Devolución sintética de demostración', referenceType: 'Return', referenceId: returnId, createdAt: returnAt } });
      await tx.auditLog.create({ data: { id: `${returnId}-audit`, businessId: business.id, userId: returnUser, action: 'CREATE', entityType: 'Return', entityId: returnId, metadata: { demo: true }, createdAt: returnAt } });
    }
  }, { timeout: 20_000 });
}
async function report(verify: boolean) {
  const result = [];
  let valid = true;
  const [userCount, membershipRows, businessCount] = await Promise.all([db.user.count({ where: { id: { in: demoUsers.map((u) => u.id) } } }), db.membership.findMany({ where: { userId: { in: demoUsers.map((u) => u.id) }, businessId: { in: businesses.map((b) => b.id) } }, select: { userId: true, businessId: true, role: true, canCancelSales: true } }), db.business.count({ where: { id: { in: businesses.map((b) => b.id) } } })]);
  const membershipsValid = membershipRows.length === 27 && businesses.every((business) => demoUsers.every((user, index) => membershipRows.some((row) => row.userId === user.id && row.businessId === business.id && row.role === [Role.ADMIN, Role.SELLER, Role.INVENTORY_MANAGER][index] && row.canCancelSales === (index === 0))));
  valid &&= userCount === 3 && membershipsValid && businessCount === 9;
  for (const business of businesses) {
    const [products, variants, categories, movements, sales, reservations, returns, auditLogs, variantRows, initialRows, badStock, badTenant, badServiceStock, badOps, badAudit] = await Promise.all([
      db.product.count({ where: { businessId: business.id } }), db.productVariant.count({ where: { businessId: business.id } }), db.category.count({ where: { businessId: business.id } }), db.inventoryMovement.count({ where: { businessId: business.id } }), db.sale.count({ where: { businessId: business.id } }), db.reservation.count({ where: { businessId: business.id } }), db.return.count({ where: { businessId: business.id } }), db.auditLog.count({ where: { businessId: business.id } }),
      db.productVariant.findMany({ where: { businessId: business.id }, select: { sku: true, stock: true, barcode: true } }),
      db.inventoryMovement.findMany({ where: { businessId: business.id, type: 'INITIAL' }, select: { variantId: true, quantity: true } }),
      db.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) AS count FROM "ProductVariant" v WHERE v."businessId" = ${business.id} AND v.stock <> COALESCE((SELECT sum(m.quantity) FROM "InventoryMovement" m WHERE m."variantId" = v.id), 0)`,
      db.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) AS count FROM "Product" p JOIN "Category" c ON c.id = p."categoryId" WHERE p."businessId" = ${business.id} AND (c."businessId" <> p."businessId" OR p.photoPath IS NOT NULL)`,
      db.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) AS count FROM "ProductVariant" WHERE "businessId" = ${business.id} AND stock <> 0`,
      db.$queryRaw<Array<{ count: bigint }>>`SELECT ((SELECT count(*) FROM "Sale" s WHERE s."businessId" = ${business.id} AND (s.total <> COALESCE((SELECT sum(sl."lineTotal") FROM "SaleLine" sl WHERE sl."saleId" = s.id), 0) OR EXISTS (SELECT 1 FROM "SaleLine" sl WHERE sl."saleId" = s.id AND NOT EXISTS (SELECT 1 FROM "InventoryMovement" m WHERE m.type = 'SALE' AND m."referenceType" = 'Sale' AND m."referenceId" = s.id AND m."variantId" = sl."variantId" AND m.quantity = -sl.quantity)))) + (SELECT count(*) FROM "Reservation" r WHERE r."businessId" = ${business.id} AND r.status = 'ACTIVE' AND NOT EXISTS (SELECT 1 FROM "InventoryMovement" m WHERE m.type = 'RESERVATION' AND m."referenceType" = 'Reservation' AND m."referenceId" = r.id AND m."variantId" = r."variantId" AND m.quantity = -r.quantity)) + (SELECT count(*) FROM "Return" r WHERE r."businessId" = ${business.id} AND (r."refundAmount" <> COALESCE((SELECT sum(rl.amount) FROM "ReturnLine" rl WHERE rl."returnId" = r.id), 0) OR EXISTS (SELECT 1 FROM "ReturnLine" rl JOIN "SaleLine" sl ON sl.id = rl."saleLineId" WHERE rl."returnId" = r.id AND ((SELECT sum(allrl.quantity) FROM "ReturnLine" allrl WHERE allrl."saleLineId" = rl."saleLineId") > sl.quantity OR NOT EXISTS (SELECT 1 FROM "InventoryMovement" m WHERE m.type = 'RETURN' AND m."referenceType" = 'Return' AND m."referenceId" = r.id AND m."variantId" = sl."variantId" AND m.quantity = rl.quantity))))) AS count`,
      db.$queryRaw<Array<{ count: bigint }>>`SELECT ((SELECT count(*) FROM "InventoryMovement" m WHERE m."businessId" = ${business.id} AND NOT EXISTS (SELECT 1 FROM "AuditLog" a WHERE a."businessId" = m."businessId" AND a."entityType" = 'InventoryMovement' AND a."entityId" = m.id)) + (SELECT count(*) FROM "Sale" s WHERE s."businessId" = ${business.id} AND NOT EXISTS (SELECT 1 FROM "AuditLog" a WHERE a."businessId" = s."businessId" AND a."entityType" = 'Sale' AND a."entityId" = s.id)) + (SELECT count(*) FROM "Reservation" r WHERE r."businessId" = ${business.id} AND NOT EXISTS (SELECT 1 FROM "AuditLog" a WHERE a."businessId" = r."businessId" AND a."entityType" = 'Reservation' AND a."entityId" = r.id)) + (SELECT count(*) FROM "Return" r WHERE r."businessId" = ${business.id} AND NOT EXISTS (SELECT 1 FROM "AuditLog" a WHERE a."businessId" = r."businessId" AND a."entityType" = 'Return' AND a."entityId" = r.id))) AS count`,
    ]);
    const variantsValid = variants === VARIANTS_PER_BUSINESS;
    const barcodeValues = variantRows.map((row) => row.barcode).filter((value): value is string => value !== null);
    const barcodesValid = variantRows.every((row) => row.barcode !== null) && barcodeValues.every(validEan13) && new Set(barcodeValues).size === barcodeValues.length;
    const initialByVariant = new Map<string, Prisma.Decimal[]>();
    for (const movement of initialRows) initialByVariant.set(movement.variantId, [...(initialByVariant.get(movement.variantId) ?? []), movement.quantity]);
    const initialsValid = variantRows.every((row) => {
      const index = Number(row.sku.split('-').at(-1)) - 1;
      const expected = new Prisma.Decimal(stockFor(business, index));
      const actual = initialByVariant.get(stableId('variant', businesses.indexOf(business), index + 1)) ?? [];
      return expected.gt(0) ? actual.length === 1 && actual[0].eq(expected) : actual.length === 0;
    });
    const commerceOk = business.giro === 'SERVICIOS' ? sales === 0 && reservations === 0 && returns === 0 : sales === 1 && reservations === 1 && returns === 1;
    const serviceOk = business.giro !== 'SERVICIOS' || Number(badServiceStock[0].count) === 0;
    const ok = products === PRODUCT_COUNT && variantsValid && categories > 0 && barcodesValid && initialsValid && Number(badStock[0].count) === 0 && Number(badTenant[0].count) === 0 && Number(badOps[0].count) === 0 && Number(badAudit[0].count) === 0 && serviceOk && commerceOk && auditLogs >= movements;
    valid &&= ok;
    result.push({ business: business.name, products, variants, categories, movements, sales, reservations, returns, auditLogs, valid: ok });
  }
  console.table(result);
  const size = await db.$queryRaw<Array<{ bytes: bigint }>>`SELECT pg_database_size(current_database()) AS bytes`;
  const databaseBytes = Number(size[0]?.bytes ?? 0);
  console.log(`Tamaño real de ${DATABASE}: ${databaseBytes} bytes (${(databaseBytes / (1024 * 1024)).toFixed(2)} MiB)`);
  if (verify && !valid) throw new Error('Verificación demo fallida; consulte los conteos no sensibles anteriores');
  return valid;
}
async function main() {
  await assertTarget();
  await checkCoreCollisions();
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some((arg) => !['--dry-run', '--verify'].includes(arg))) throw new Error('Uso: lucem-seed-demo [--dry-run|--verify]');
  const counts = await Promise.all(businesses.map(async (business) => ({ business: business.name, products: await db.product.count({ where: { businessId: business.id } }), variants: await db.productVariant.count({ where: { businessId: business.id } }) })));
  if (args[0] === '--verify') { await report(true); return; }
  console.log(`Target verificado: ${DATABASE} ${EXPECTED_HOST}:5432; 6 migraciones. Plan: 9 negocios, 90.000 productos, ${VARIANTS_PER_BUSINESS * 9} variantes máximas; batches de ${BATCH_SIZE}.`);
  console.table(counts);
  if (args[0] === '--dry-run') return;
  if (!envFlag('LUCEM_DEMO_BACKUP_VERIFIED') || !process.env.LUCEM_DEMO_BACKUP_MANIFEST) throw new Error('Escritura bloqueada: se requiere manifest comprobado por scripts/lucem-seed-demo');
  const backup = JSON.parse(await readFile(process.env.LUCEM_DEMO_BACKUP_MANIFEST, 'utf8')) as { database?: string; verified?: boolean; host?: string; createdAt?: string; databaseBackup?: string; uploadsBackup?: string; sha256?: { database?: string; uploads?: string } };
  if (backup.database !== DATABASE || backup.host !== EXPECTED_HOST || backup.verified !== true) throw new Error('Manifest de backup inválido');
  const backupAge = backup.createdAt ? Date.now() - Date.parse(backup.createdAt) : Number.NaN;
  if (!Number.isFinite(backupAge) || backupAge < 0 || backupAge > 24 * 60 * 60 * 1000 || !backup.databaseBackup || !backup.uploadsBackup || !backup.sha256?.database || !backup.sha256.uploads) throw new Error('Manifest de backup no reciente o incompleto');
  if (((await stat(process.env.LUCEM_DEMO_BACKUP_MANIFEST)).mode & 0o777) !== 0o600) throw new Error('El manifest de backup debe tener modo 0600');
  const backupRoot = join(process.env.HOME ?? '', 'lucem-staging-backups');
  for (const [path, expected] of [[backup.databaseBackup, backup.sha256.database], [backup.uploadsBackup, backup.sha256.uploads]] as const) {
    if (dirname(path) !== backupRoot) throw new Error('El manifest referencia un backup fuera del directorio protegido');
    const info = await stat(path);
    if ((info.mode & 0o777) !== 0o600) throw new Error('Los artefactos de backup deben tener modo 0600');
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(path)) hash.update(chunk);
    const digest = hash.digest('hex');
    if (digest !== expected) throw new Error('El checksum de backup no coincide con el manifest');
  }
  await createIdentity();
  console.log(`Credenciales locales: ${CREDENTIALS_PATH}`);
  for (let bi = 0; bi < businesses.length; bi += 1) { console.log(`Catálogo ${bi + 1}/9: ${businesses[bi].name}`); await createCatalog(bi); await createCommerce(bi); }
  await report(true);
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Fallo del seed'); process.exitCode = 1; }).finally(() => db.$disconnect());
