import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const source = readFileSync(new URL('../app/api/audit/route.ts', import.meta.url), 'utf8');

describe('audit API projection regression', () => {
  test('uses a positive AuditLog and user projection without auth relations', () => {
    expect(source).toContain('select: {');
    expect(source).toContain('user: { select: { id: true, name: true, email: true, active: true } }');
    expect(source).not.toContain('include: { user: true }');
    expect(source).not.toContain('passwordHash');
    expect(source).not.toContain('tokenHash');
  });

  test('keeps the authorization and isolation guards', () => {
    expect(source).toContain('getAuth()');
    expect(source).toContain('jsonError(\'Sesion requerida\', 401)');
    expect(source).toContain('permitted(auth.membership?.role, [Role.ADMIN])');
    expect(source).toContain('jsonError(\'No autorizado\', 403)');
    expect(source).toContain('where: { businessId: auth.business.id }');
    expect(source).toContain('take: 100');
    expect(source).toContain("orderBy: { createdAt: 'desc' }");
  });
});
