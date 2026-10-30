import { getAuth, jsonError } from '@/lib/auth';

export async function GET() {
  const auth = await getAuth();
  if (!auth) return jsonError('Sesion requerida', 401);
  return Response.json({ activeBusinessId: auth.business?.id ?? null, businesses: auth.user.memberships.map((membership) => ({ id: membership.businessId, name: membership.business.name, role: membership.role })) });
}
