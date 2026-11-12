import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { applyControlCoverage, discoverControls, discoverRoutes, featureStateCoverage, makeCoverageFindings, sanitize, validateFeatures, validateRouteExclusions, verifyConnectedDatabase, verifyQaTarget } from '../../scripts/qa/core';
import type { Feature } from '../../qa/features/registry';

const temporary: string[] = [];
async function tempRoot() { const root = await mkdtemp(path.join(os.tmpdir(), 'lucem-qa-test-')); temporary.push(root); return root; }
afterEach(async () => { await Promise.all(temporary.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

describe('QA-01 route and feature discovery', () => {
  it('discovers current pages and normalizes dynamic/API routes without implying PASS', async () => {
    const routes = await discoverRoutes(process.cwd());
    expect(routes.some((route) => route.path === '/')).toBe(true);
    expect(routes.some((route) => route.path === '/api/products/:id' && route.methods.includes('PUT'))).toBe(true);
    expect(routes.find((route) => route.path === '/api/products/:id')?.coverageStatus).toBe('NOT_EXECUTED');
    expect(routes.find((route) => route.path === '/login')).toMatchObject({ auth: 'public', coverageStatus: 'NOT_EXECUTED' });
    expect(routes.find((route) => route.path === '/api/auth/login')).toMatchObject({ auth: 'public', featureIds: ['AUTH-LOGIN'] });
    expect(routes.find((route) => route.path === '/api/auth/register')).toMatchObject({ auth: 'public', featureIds: ['AUTH-REGISTER'] });
    expect(routes.find((route) => route.path === '/api/products/:id')?.dynamicSegments).toEqual(['id']);
  });

  it('detects an unregistered route and later recognizes its feature/test/control contract', async () => {
    const root = await tempRoot(); const pageDir = path.join(root, 'app', 'fixture-module', '[id]'); const optionalPageDir = path.join(root, 'app', 'fixture-module', '[[...parts]]');
    await mkdir(pageDir, { recursive: true }); await mkdir(optionalPageDir, { recursive: true }); await mkdir(path.join(root, 'e2e'), { recursive: true });
    await writeFile(path.join(pageDir, 'page.tsx'), 'export default function Page(){return <main><form><button type="button">Exportar</button><input aria-label="Código" /></form></main>}');
    await writeFile(path.join(optionalPageDir, 'page.tsx'), 'export default function Page(){return <main>optional</main>}');
    await writeFile(path.join(root, 'e2e', 'fixture.spec.ts'), 'test("fixture", () => {});');
    const routes = await discoverRoutes(root, []);
    expect(routes.find((route) => route.path === '/fixture-module/:id')?.coverageStatus).toBe('NOT_MAPPED');
    expect(routes.find((route) => route.path === '/fixture-module/*parts?')?.dynamicSegments).toEqual(['parts']);
    const controls = applyControlCoverage(await discoverControls(root, routes), []);
    expect(controls.some((control) => control.tag === 'button' && control.status === 'UNCOVERED')).toBe(true);
    expect(controls.find((control) => control.key.endsWith('|button|exportar'))?.sourceLocations).toEqual([{ source: 'app/fixture-module/[id]/page.tsx', line: 1 }]);
    expect(makeCoverageFindings(routes, controls).some((finding) => finding.category === 'coverage')).toBe(true);
    const feature: Feature = { id: 'QA-FIXTURE-EXPORT', title: 'Export fixture', area: 'fixture', description: 'Extension check', targets: [{ route: '/fixture-module/:id', kind: 'page' }], roles: ['ADMIN'], criticality: 'major', requiredStates: ['ready', 'exported'], tests: ['e2e/fixture.spec.ts'], controls: ['/fixture-module/:id|button|exportar'], tags: ['fixture'], profile: ['full'], status: 'NOT_EXECUTED', implemented: true, screenshots: [], invariants: [], stitchReferences: [] };
    const registered = applyControlCoverage(await discoverControls(root, routes), [feature]);
    expect(validateFeatures(routes, [feature], root, controls)).toEqual([]);
    expect(registered.find((control) => control.tag === 'button')?.status).toBe('NOT_EXECUTED');
    expect(routes.find((route) => route.path === '/fixture-module/:id')?.coverageStatus).toBe('NOT_MAPPED'); // registry linkage affects a fresh inventory, not the old result
    const refreshed = await discoverRoutes(root, [feature]);
    expect(refreshed.find((route) => route.path === '/fixture-module/:id')?.coverageStatus).toBe('NOT_EXECUTED');
  });

  it('rejects duplicate feature IDs, absent routes and missing test files', async () => {
    const root = await tempRoot(); const pageDir = path.join(root, 'app', 'sample'); await mkdir(pageDir, { recursive: true });
    await writeFile(path.join(pageDir, 'page.tsx'), 'export default function Page(){return <main/>}');
    const routes = await discoverRoutes(root, []);
    const feature: Feature = { id: 'QA-EXTENSION', title: 'Missing fixture', area: 'qa', description: 'validation', targets: [{ route: '/missing', kind: 'page' }], roles: ['ADMIN'], criticality: 'minor', requiredStates: ['loaded'], tests: ['missing.spec.ts'], controls: [], tags: ['qa'], profile: ['quick'], status: 'NOT_IMPLEMENTED', implemented: false, screenshots: [], invariants: [], stitchReferences: [] };
    const errors = validateFeatures(routes, [feature, feature], root);
    expect(errors.some((error) => error.includes('Duplicate'))).toBe(true);
    expect(errors.some((error) => error.includes('missing route'))).toBe(true);
    expect(errors.some((error) => error.includes('missing test'))).toBe(true);
  });

  it('requires explicit reasons for exclusions and keeps excluded routes in inventory', async () => {
    const root = await tempRoot(); const pageDir = path.join(root, 'app', 'retired'); const exclusionsDir = path.join(root, 'qa', 'routes');
    await mkdir(pageDir, { recursive: true }); await mkdir(exclusionsDir, { recursive: true });
    await writeFile(path.join(pageDir, 'page.tsx'), 'export default function Page(){return <main/>}');
    const inventory = path.join(exclusionsDir, 'exclusions.json');
    await writeFile(inventory, JSON.stringify([{ path: '/retired', kind: 'page', reason: 'Explicitly deprecated and replaced.' }]));
    const routes = await discoverRoutes(root, []);
    expect(routes[0]).toMatchObject({ path: '/retired', excluded: true, coverageStatus: 'NOT_IMPLEMENTED' });
    expect(await validateRouteExclusions(routes, root)).toEqual([]);
    await writeFile(inventory, JSON.stringify([{ path: '/retired', kind: 'page', reason: ' ' }]));
    expect((await validateRouteExclusions(routes, root))[0]).toContain('requires a reason');
  });

  it('keeps required component/business states uncovered until mapped tests execute', () => {
    const feature: Feature = { id: 'QA-STATE-FEATURE', title: 'State contract', area: 'qa', description: 'state mapping', targets: [{ route: '/login', kind: 'page' }], roles: ['anonymous'], criticality: 'minor', requiredStates: ['empty', 'success'], tests: ['e2e/state.spec.ts'], testCases: { 'EMPTY-STATE': 'e2e/state.spec.ts' }, stateTests: { empty: ['EMPTY-STATE'] }, controls: [], tags: ['qa'], profile: ['quick'], status: 'NOT_EXECUTED', implemented: true, screenshots: [], invariants: [], stitchReferences: [] };
    const initial = featureStateCoverage([feature]);
    expect(initial.find((state) => state.state === 'empty')?.status).toBe('NOT_EXECUTED');
    expect(initial.find((state) => state.state === 'success')?.status).toBe('UNCOVERED');
    const passed = featureStateCoverage([feature], new Map([['QA-STATE-FEATURE:EMPTY-STATE', 'PASS']]));
    expect(passed.find((state) => state.state === 'empty')?.status).toBe('PASS');
    expect(validateFeatures([{ id: 'login', path: '/login', kind: 'page', module: 'auth', methods: ['GET'], source: 'app/login/page.tsx', dynamicSegments: [], lastValidatedAt: new Date().toISOString(), fixtureStatus: 'not-dynamic', excluded: false, auth: 'public', roles: [], featureIds: [], tests: [], coverageStatus: 'UNCOVERED' }], [feature], process.cwd()).some((error) => error.includes('references missing test e2e/state.spec.ts'))).toBe(true);
  });
});

describe('QA-01 safety and sanitization', () => {
  it('redacts credentials, emails, query secrets and common synthetic PII', () => {
    const safe = sanitize('Authorization: Bearer abcdef password=demo token=xyz email me@example.test SSN 123-45-6789', ['special-secret']);
    expect(safe).not.toMatch(/abcdef|demo|xyz|me@example\.test|123-45-6789|special-secret/);
  });
  it('requires the exact dedicated loopback QA URL and never falls back to DATABASE_URL', async () => {
    await expect(verifyQaTarget({ DATABASE_URL: 'postgres://x:x@localhost:5432/lucem_qa' })).rejects.toThrow('QA_DATABASE_URL is required');
    for (const value of ['postgres://lucem_qa:x@localhost:55432/lucem_qa', 'postgres://lucem_qa:x@example.com:55433/lucem_qa', 'postgres://lucem_qa:x@localhost:55433/lucem_retail_e2e', 'postgres://user:x@localhost:55433/lucem_qa']) await expect(verifyQaTarget({ QA_DATABASE_URL: value })).rejects.toThrow();
    const url = 'postgresql://lucem_qa:placeholder@127.0.0.1:55433/lucem_qa';
    expect(await verifyQaTarget({ QA_DATABASE_URL: url })).toBe(url);
    await expect(verifyConnectedDatabase(async () => ({ database: 'lucem_staging', user: 'lucem_qa' }), { QA_DATABASE_URL: url })).rejects.toThrow('identity');
  });
});
