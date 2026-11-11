import { describe, expect, it } from 'vitest';
import { discoverRoutes, sanitize, validateFeatures, verifyConnectedDatabase, verifyQaTarget } from '../../scripts/qa/core';

describe('QA-01 safety and route inventory', () => {
  it('discovers app routes and identifies newly added routes as uncovered', async () => {
    const routes = await discoverRoutes(process.cwd());
    expect(routes.some(route => route.path === '/')).toBe(true);
    expect(routes.some(route => route.path === '/api/products/:id')).toBe(true);
    expect(routes.find(route => route.path === '/api/products/:id')?.coverageStatus).toBe('UNCOVERED');
  });

  it('rejects feature registrations for unknown routes and duplicate ids', () => {
    const fake = [{ id: 'x', path: '/missing', kind: 'page' as const, methods: ['GET'], source: 'fake', dynamicSegments: [], excluded: false, coverageStatus: 'UNCOVERED' as const }];
    const definition = { id: 'extension-flow', route: '/not-real', kind: 'page' as const, area: 'synthetic', tags: ['synthetic'], profile: ['quick' as const], status: 'NOT_IMPLEMENTED' as const };
    expect(validateFeatures(fake, [definition]).some(error => error.includes('references missing route'))).toBe(true);
    expect(validateFeatures(fake, [definition, definition]).some(error => error.includes('Duplicate'))).toBe(true);
  });

  it('redacts credentials and common synthetic PII', () => {
    const safe = sanitize('Authorization: Bearer abcdef email me@example.test SSN 123-45-6789');
    expect(safe).not.toContain('abcdef');
    expect(safe).not.toContain('me@example.test');
    expect(safe).not.toContain('123-45-6789');
  });

  it('requires the exact dedicated loopback QA URL and never falls back', async () => {
    await expect(verifyQaTarget({ DATABASE_URL: 'postgres://x:x@localhost:5432/lucem_qa' })).rejects.toThrow('QA_DATABASE_URL is required');
    await expect(verifyQaTarget({ QA_DATABASE_URL: 'postgres://lucem_qa:fake@localhost:55432/lucem_qa' })).rejects.toThrow();
    const url = 'postgres://lucem_qa:fake@127.0.0.1:55433/lucem_qa';
    expect(await verifyQaTarget({ QA_DATABASE_URL: url })).toBe(url);
    await expect(verifyConnectedDatabase(async () => ({ database: 'lucem_retail_e2e', user: 'lucem_qa' }), { QA_DATABASE_URL: url })).rejects.toThrow('identity');
  });
});
