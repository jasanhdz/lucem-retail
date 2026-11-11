import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { features, type CoverageStatus } from '../../qa/features/registry.js';

export type RouteRecord = { id: string; path: string; kind: 'page' | 'api'; methods: string[]; source: string; dynamicSegments: string[]; excluded: boolean; exclusionReason?: string; coverageStatus: CoverageStatus };
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const ignored = (s: string) => s.startsWith('_') || s.startsWith('.') || s === 'layout' || s === 'loading' || s === 'error' || s === 'not-found' || s === 'template' || s === 'default';
function normalize(parts: string[]): string {
  return '/' + parts.filter(p => !(p.startsWith('(') && p.endsWith(')'))).map(p => p.startsWith('[[...') ? `:${p.slice(5, -2)}?` : p.startsWith('[...') ? `*${p.slice(4, -1)}` : p.startsWith('[') ? `:${p.slice(1, -1)}` : p).join('/');
}
async function walk(dir: string): Promise<string[]> {
  let entries; try { entries = await readdir(dir, { withFileTypes: true }); } catch { return []; }
  const out: string[] = [];
  for (const ent of entries) { const full = path.join(dir, ent.name); if (ent.isDirectory()) out.push(...await walk(full)); else if ((ent.name === 'page.tsx' || ent.name === 'route.ts') && !ent.name.startsWith('_')) out.push(full); }
  return out;
}
export async function discoverRoutes(root = process.cwd()): Promise<RouteRecord[]> {
  const appRoots = ['app', 'src/app'].filter(async () => true).map(p => path.join(root, p));
  const files = (await Promise.all(appRoots.map(walk))).flat();
  const records: RouteRecord[] = [];
  for (const file of [...new Set(files)].sort()) {
    const rel = path.relative(root, file).split(path.sep); const appIndex = rel.lastIndexOf('app');
    const segments = rel.slice(appIndex + 1, -1); if (segments.some(ignored)) continue;
    const kind = path.basename(file) === 'route.ts' ? 'api' : 'page'; const route = normalize(segments);
    const text = kind === 'api' ? await readFile(file, 'utf8') : '';
    const methods = kind === 'page' ? ['GET'] : METHODS.filter(m => new RegExp(`export\\s+(?:async\\s+)?function\\s+${m}\\b|export\\s+const\\s+${m}\\b`).test(text));
    const matching = features.find(f => f.route === route && f.kind === kind);
    records.push({ id: createHash('sha1').update(`${kind}:${route}`).digest('hex').slice(0, 12), path: route || '/', kind, methods, source: path.relative(root, file), dynamicSegments: segments.filter(s => s.startsWith('[')).map(s => s.replace(/^\[\[?\.\.\./, '').replace(/\]?\]$/, '')), excluded: false, coverageStatus: matching?.status ?? 'UNCOVERED' });
  }
  return records;
}
export function validateFeatures(routes: RouteRecord[], definitions = features) {
  const errors: string[] = []; const ids = new Set<string>(); const routesByKey = new Set(routes.map(r => `${r.kind}:${r.path}`));
  for (const f of definitions) {
    if (!/^[a-z0-9][a-z0-9-]+$/.test(f.id)) errors.push(`Invalid feature id: ${f.id}`);
    if (ids.has(f.id)) errors.push(`Duplicate feature id: ${f.id}`); ids.add(f.id);
    if (!routesByKey.has(`${f.kind}:${f.route}`)) errors.push(`Feature ${f.id} references missing route ${f.kind}:${f.route}`);
    if (!f.area || !f.tags.length || !f.profile.length || !['PASS','UNCOVERED','NOT_EXECUTED','NOT_IMPLEMENTED','BLOCKED'].includes(f.status)) errors.push(`Invalid feature definition: ${f.id}`);
  }
  return errors;
}
export function sanitize(input: string): string {
  return input.replace(/(authorization\s*[:=]\s*)bearer\s+[^\s,;"']+/gi, '$1[REDACTED]')
    .replace(/(authorization|cookie|set-cookie|x-api-key|password|token|secret)(\s*[:=]\s*)([^\s,;"']+)/gi, '$1$2[REDACTED]')
    .replace(/(postgres(?:ql)?:\/\/)[^/@\s]+:[^/@\s]+@/gi, '$1[REDACTED]@')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[REDACTED_EMAIL]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_PII]');
}
export async function verifyQaTarget(env: Record<string, string | undefined> = process.env) {
  const raw = env.QA_DATABASE_URL;
  if (!raw) throw new Error('QA_DATABASE_URL is required; DATABASE_URL fallback is forbidden');
  let url: URL; try { url = new URL(raw); } catch { throw new Error('QA_DATABASE_URL is invalid'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname) || url.port !== '55433' || decodeURIComponent(url.username) !== 'lucem_qa' || decodeURIComponent(url.pathname.slice(1)) !== 'lucem_qa') throw new Error('QA target must be loopback lucem_qa user/database on port 55433');
  return raw;
}
export async function verifyConnectedDatabase(query: (sql: string) => Promise<{ database: string; user: string }>, env: Record<string, string | undefined> = process.env) {
  const url = await verifyQaTarget(env); const identity = await query('select current_database() as database, current_user as user');
  if (identity.database !== 'lucem_qa' || identity.user !== 'lucem_qa') throw new Error('Connected database identity does not match dedicated QA target');
  return url;
}
export async function writeReports(outDir: string, routes: RouteRecord[]) {
  await mkdir(outDir, { recursive: true });
  const inventory = { generatedAt: new Date().toISOString(), routes };
  await writeFile(path.join(outDir, 'inventory.json'), JSON.stringify(inventory, null, 2));
  const md = ['# QA route inventory', '', ...routes.map(r => `- **${r.coverageStatus}** \`${r.kind}\` \`${r.path}\` (${r.methods.join(', ')}) — \`${r.source}\``)].join('\n');
  await writeFile(path.join(outDir, 'report.md'), md);
  await writeFile(path.join(outDir, 'report.html'), `<!doctype html><meta charset="utf-8"><title>QA inventory</title><pre>${md.replaceAll('&','&amp;').replaceAll('<','&lt;')}</pre>`);
}
