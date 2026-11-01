import { describe, expect, it } from 'vitest';
import { visibleWorkspaceRoutes } from '../src/lib/workspace-navigation';

describe('membership-aware workspace navigation', () => {
  it('offers audit only to ADMIN and keeps existing routes for every real role', () => {
    for (const role of ['ADMIN', 'SELLER', 'INVENTORY_MANAGER'] as const) {
      const routes = visibleWorkspaceRoutes(role).map(item => item.href);
      expect(routes).toContain('/dashboard');
      expect(routes).toContain('/pos');
      expect(routes.includes('/auditoria')).toBe(role === 'ADMIN');
    }
  });
});
