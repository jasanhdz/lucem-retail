import crypto from 'node:crypto';
import { Prisma, Role, BusinessGiro } from '@prisma/client';
import { getAuth, jsonError } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

const giroCatalog = {
  ropa: { value: BusinessGiro.ROPA, label: 'Ropa y accesorios' }, papeleria: { value: BusinessGiro.PAPELERIA, label: 'Papelería y oficina' },
  abarrotes: { value: BusinessGiro.ABARROTES, label: 'Abarrotes y alimentos' }, ferreteria: { value: BusinessGiro.FERRETERIA, label: 'Ferretería y herramientas' },
  belleza: { value: BusinessGiro.BELLEZA, label: 'Belleza y cuidado personal' }, hogar: { value: BusinessGiro.HOGAR, label: 'Hogar y decoración' },
  electronica: { value: BusinessGiro.ELECTRONICA, label: 'Electrónica y accesorios' }, servicios: { value: BusinessGiro.SERVICIOS, label: 'Servicios y oficios' }, otro: { value: BusinessGiro.OTRO, label: 'Otro rubro comercial' },
} as const;

const giroByValue = new Map(Object.values(giroCatalog).map(item => [item.value, item]));

export async function GET() {
  const auth = await getAuth();
  if (!auth) return jsonError('Sesion requerida', 401);
  return Response.json({ activeBusinessId: auth.business?.id ?? null, businesses: auth.user.memberships.map((membership) => ({ id: membership.businessId, name: membership.business.name, branchName: membership.business.branchName, giro: membership.business.giro.toLowerCase(), role: membership.role })) });
}

export async function POST(req: Request) {
  const auth = await getAuth();
  if (!auth) return jsonError('Sesion requerida', 401);
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const branchName = typeof body.branchName === 'string' && body.branchName.trim() ? body.branchName.trim() : 'Sucursal principal';
  const giro = typeof body.giro === 'string' ? body.giro : '';
  const selected = giroCatalog[giro as keyof typeof giroCatalog];
  const key = req.headers.get('Idempotency-Key')?.trim() || (typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : '');
  if (name.length < 2 || name.length > 120) return jsonError('Escribe un nombre válido para tu negocio.', 400);
  if (!selected) return jsonError('Selecciona un giro válido.', 400);
  if (!key || key.length > 100) return jsonError('Solicitud inválida.', 400);
  const requestHash = crypto.createHash('sha256').update(JSON.stringify({ name, branchName, giro })).digest('hex');
  try {
    const result = await db.$transaction(async tx => {
      const existing = await tx.businessCreationIdempotency.findUnique({ where: { userId_key: { userId: auth.user.id, key } }, include: { business: true } });
      if (existing) {
        if (existing.requestHash !== requestHash) throw new Error('IDEMPOTENCY_CONFLICT');
        await tx.session.update({ where: { id: auth.session.id }, data: { activeBusinessId: existing.businessId } });
        return existing.business;
      }
      const business = await tx.business.create({ data: { name, branchName, giro: selected.value } });
      await tx.membership.create({ data: { userId: auth.user.id, businessId: business.id, role: Role.ADMIN } });
      await tx.session.update({ where: { id: auth.session.id }, data: { activeBusinessId: business.id } });
      await tx.businessCreationIdempotency.create({ data: { userId: auth.user.id, key, requestHash, businessId: business.id } });
      await audit({ userId: auth.user.id, businessId: business.id, action: 'CREATE', entityType: 'Business', entityId: business.id, metadata: { giro } }, tx);
      return business;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return Response.json({ business: { id: result.id, name: result.name, branchName: result.branchName, giro, giroLabel: selected.label }, redirect: '/negocios/confirmacion' }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'IDEMPOTENCY_CONFLICT') return jsonError('La solicitud repetida contiene datos distintos.', 409);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await db.businessCreationIdempotency.findUnique({ where: { userId_key: { userId: auth.user.id, key } }, include: { business: true } });
      if (existing?.requestHash === requestHash) return Response.json({ business: { id: existing.business.id, name: existing.business.name, branchName: existing.business.branchName, giro: giroByValue.get(existing.business.giro)?.value.toLowerCase(), giroLabel: giroByValue.get(existing.business.giro)?.label }, redirect: '/negocios/confirmacion' }, { status: 201 });
    }
    return jsonError('No fue posible crear el negocio. Inténtalo de nuevo.', 500);
  }
}
