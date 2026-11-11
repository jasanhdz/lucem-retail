#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { features, type CoverageStatus } from '../../qa/features/registry';
import { qaConfig } from '../../qa/config';
import { applyControlCoverage, discoverControls, discoverRoutes, featureStateCoverage, makeCoverageFindings, makeFeatureStateFindings, sanitize, validateFeatures, validateRouteExclusions, writeReports, type Finding, type RunResult } from './core';
import { qaChildEnv } from './database';
import { exportSanitizedZip } from './evidence';

const help = `Lucem QA Lab — isolated, evolutive audit runner

Usage:
  lucem-audit                                  Full audit
  lucem-audit --functional                    Functional Playwright flows (QA DB only)
  lucem-audit --visual                        Responsive screenshots and approved-baseline comparison
  lucem-audit --accessibility                 axe-core on observable screens
  lucem-audit --performance                   Bounded navigation measurements
  lucem-audit --coverage                      Route/control coverage inventory
  lucem-audit --module products               Scope by feature area
  lucem-audit --changed                       Audit changed routes/features
  lucem-audit --package                       Package latest report after sanitization
  lucem-audit --quick                         Coverage delta + essential QA smoke
  lucem-audit --full                          Full functional and observation matrix
  lucem-audit --help

QA mutations require QA_DATABASE_URL for loopback lucem_qa:lucem_qa on port 55433.
Read-only public-screen observations may run without a database and use a private local Next server.
Reports: qa/reports/<runId>/; ZIPs: qa/reports/lucem-audit-*.zip
`;
const validOptions = new Set(['--help', '--functional', '--visual', '--accessibility', '--performance', '--coverage', '--module', '--changed', '--package', '--quick', '--full']);
type Options = { functional: boolean; visual: boolean; accessibility: boolean; performance: boolean; coverage: boolean; module?: string; changed: boolean; packageOnly: boolean; quick: boolean; full: boolean };
function parseArgs(args: string[]): Options {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.startsWith('--') && !validOptions.has(arg)) throw new Error(`Unknown option: ${arg}`);
    if (arg === '--module' && (!args[index + 1] || args[index + 1].startsWith('--'))) throw new Error('--module requires a feature area');
  }
  const get = (flag: string) => args.includes(flag);
  return { functional: get('--functional'), visual: get('--visual'), accessibility: get('--accessibility'), performance: get('--performance'), coverage: get('--coverage'), module: get('--module') ? args[args.indexOf('--module') + 1] : undefined, changed: get('--changed'), packageOnly: get('--package'), quick: get('--quick'), full: get('--full') || args.length === 0 };
}
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '').replace('T', '-').replace('Z', '');
const findSecrets = () => ['QA_DATABASE_URL', 'DATABASE_URL', 'E2E_DATABASE_URL', 'SESSION_SECRET', 'QA_SESSION_SECRET', 'QA_POSTGRES_PASSWORD', 'STAGING_DB_PASSWORD', 'E2E_ADMIN_PASSWORD', 'E2E_SELLER_PASSWORD', 'E2E_INVENTORY_PASSWORD'].map((key) => process.env[key]).filter((value): value is string => Boolean(value));
function gitFiles(args: string[]) { try { return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split(/\r?\n/).filter(Boolean); } catch { return []; } }
function changedFiles(): Set<string> {
  const base = process.env.GITHUB_BASE_REF;
  const before = process.env.QA_BASE_SHA;
  const diff = before && !/^0+$/.test(before) ? gitFiles(['diff', '--name-only', `${before}...HEAD`]) : base ? gitFiles(['diff', '--name-only', `origin/${base}...HEAD`]) : gitFiles(['diff', '--name-only', 'HEAD~1...HEAD']);
  return new Set([...diff, ...gitFiles(['diff', '--name-only']), ...gitFiles(['diff', '--cached', '--name-only'])]);
}
function changedFeatureIds() {
  const base = process.env.QA_BASE_SHA;
  const baseDiff = base && !/^0+$/.test(base) ? gitFiles(['diff', '-U0', `${base}...HEAD`, '--', 'qa/features/registry.ts']) : process.env.GITHUB_BASE_REF ? gitFiles(['diff', '-U0', `origin/${process.env.GITHUB_BASE_REF}...HEAD`, '--', 'qa/features/registry.ts']) : gitFiles(['diff', '-U0', 'HEAD~1...HEAD', '--', 'qa/features/registry.ts']);
  const localDiff = [...gitFiles(['diff', '-U0', '--', 'qa/features/registry.ts']), ...gitFiles(['diff', '--cached', '-U0', '--', 'qa/features/registry.ts'])];
  return new Set([...baseDiff, ...localDiff].filter((line) => /^\+[^+]/.test(line)).flatMap((line) => [...line.matchAll(/id:\s*['"]([A-Z][A-Z0-9-]{2,63})['"]/g)].map((match) => match[1])));
}
function runId() { return `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`; }
function filterByChanged<T extends { source?: string; route?: string; tests?: string[] }>(items: T[], changed: Set<string>): T[] {
  if (!changed.size) return items;
  return items.filter((item) => (item.source && changed.has(item.source)) || (item.tests && item.tests.some((test) => changed.has(test))) || (item.route && changed.has(item.route)));
}
function moduleFeatures(area?: string) { return area ? features.filter((feature) => feature.area === area || feature.tags.includes(area)) : features; }
function suiteForTest(test: string): string | undefined {
  if (test.includes('dev-test-01/')) return 'playwright.e2e.config.ts';
  if (test.includes('dev-03/')) return 'playwright.products.config.ts';
  if (test.includes('dev-04/')) return 'playwright.inventory.config.ts';
  if (test.includes('dev-05/')) return 'playwright.pos.config.ts';
  if (test.includes('dev-06/')) return 'playwright.reservations.config.ts';
  if (test.includes('dev-07/')) return 'playwright.returns.config.ts';
  if (test.includes('dev-08/')) return 'playwright.onboarding.config.ts';
  if (test.includes('dev-09/')) return 'playwright.dev-09.config.ts';
  if (test.includes('dev-10/')) return 'playwright.dev-10.config.ts';
  if (test.includes('dev-sec-01/')) return 'playwright.qa.security.config.ts';
  if (test.includes('dev-11r/')) return 'playwright.dev-11r-products.config.ts';
  if (test.includes('dev-11/')) return 'playwright.dev-11.config.ts';
  return undefined;
}
function captureCommand(label: string, command: string, args: string[], env: NodeJS.ProcessEnv, runDir: string) {
  const started = Date.now();
  const result = spawnSync(command, args, { cwd: process.cwd(), env, encoding: 'utf8', timeout: 25 * 60_000, maxBuffer: 32 * 1024 * 1024 });
  const raw = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const safe = sanitize(raw, findSecrets());
  const skipped = Number(raw.match(/(?:^|\n)\s*(\d+) skipped\b/m)?.[1] ?? 0);
  const passed = Number(raw.match(/(?:^|\n)\s*(\d+) passed\b/m)?.[1] ?? 0);
  const prerequisiteBlocked = /^BLOCKED:/m.test(raw) || /Executable doesn't exist|browserType\.launch.*executable/i.test(raw);
  const status: CoverageStatus = result.status === 0 ? skipped > 0 && passed === 0 ? 'NOT_EXECUTED' : 'PASS' : result.error?.message.includes('ETIMEDOUT') || prerequisiteBlocked || result.error ? 'BLOCKED' : 'FAIL';
  const reason = result.status === 0 ? status === 'NOT_EXECUTED' ? `All ${skipped} selected Playwright tests were skipped.` : 'Command completed.' : result.error?.message ?? (prerequisiteBlocked ? 'Required QA prerequisite is unavailable.' : `exit ${result.status ?? 'unknown'}`);
  return { id: label, status, reason, durationMs: Date.now() - started, evidence: [`${label}.log`], output: safe, exitCode: result.status ?? 1, runDir };
}
function findingForCommand(command: ReturnType<typeof captureCommand>): Finding | undefined {
  if (command.status === 'PASS') return undefined;
  return { id: `QA-RUN-${command.id.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`, category: command.status === 'BLOCKED' || command.status === 'NOT_EXECUTED' ? 'coverage' : 'functional', severity: command.status === 'NOT_EXECUTED' ? 'minor' : 'major', module: command.id, feature: command.id, route: 'application', role: 'QA fixture', device: 'chromium', scenario: command.id, steps: [`Run ${command.id}`], expected: 'Command exits zero with reproducible test evidence', actual: command.reason, evidence: command.evidence, source: 'playwright', confidence: 'high', status: command.status === 'BLOCKED' || command.status === 'NOT_EXECUTED' ? 'NEEDS_MANUAL_REVIEW' : 'CONFIRMED', recommendation: 'Inspect the sanitized command log and satisfy the isolated QA prerequisite before claiming coverage.' };
}
async function browserFindings(reportDir: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const eventDir = path.join(reportDir, 'browser-events');
  let eventFiles: string[] = [];
  try { eventFiles = (await readdir(eventDir)).filter((file) => file.endsWith('.json')); } catch { /* no browser mode */ }
  for (const file of eventFiles) {
    let record: { title?: string; events?: Array<{ type: string; url?: string; message?: string; status?: number; expected?: boolean }> };
    try { record = JSON.parse(await readFile(path.join(eventDir, file), 'utf8')); } catch { continue; }
    for (const [index, event] of (record.events ?? []).entries()) {
      if (event.expected || event.type === 'visual-baseline-not-approved') {
        if (event.type === 'visual-baseline-not-approved') findings.push({ id: `QA-VISUAL-${shaSlug(`${file}-${index}`)}`, category: 'visual', severity: 'minor', module: 'visual', feature: 'VISUAL-BASELINE', route: event.message?.split(';')[0] ?? 'public screen', role: 'anonymous', device: 'multi-viewport', scenario: 'Compare against approved baseline', steps: [event.message ?? 'No baseline'], expected: 'Approved reference image exists and matches within threshold', actual: 'NOT_EXECUTED: baseline is absent; current capture was retained for review', evidence: [`screenshots/${event.message?.split('/')[0] ?? ''}`], source: 'static', confidence: 'high', status: 'NEEDS_MANUAL_REVIEW', recommendation: 'Review the paired Stitch/current images and approve a baseline explicitly if appropriate.' });
        continue;
      }
      const supported = ['console-error', 'page-error', 'request-failed', 'http-4xx', 'http-5xx'].includes(event.type);
      if (!supported) continue;
      findings.push({ id: `QA-BROWSER-${shaSlug(`${file}-${index}-${event.type}`)}`, category: event.type.startsWith('http') || event.type === 'request-failed' ? 'network' : 'browser', severity: event.type === 'page-error' || event.type === 'http-5xx' ? 'major' : 'minor', module: 'browser', feature: record.title ?? path.basename(file), route: event.url ?? 'unknown', role: 'anonymous', device: 'observed viewport', scenario: event.type, steps: [record.title ?? 'Run browser observation'], expected: 'No unexpected console/runtime/network failure', actual: `${event.type}${event.status ? ` HTTP ${event.status}` : ''}${event.message ? `: ${event.message}` : ''}`, evidence: [`browser-events/${file}`], source: 'playwright', confidence: 'high', status: 'CONFIRMED', recommendation: 'Reproduce with the referenced route and inspect the sanitized browser event log.' });
    }
  }
  for (const filename of ['axe-findings.json', 'authenticated-axe-findings.json']) try {
    const axe = JSON.parse(await readFile(path.join(reportDir, 'accessibility', filename), 'utf8')) as Array<{ route: string; violations: Array<{ id: string; impact?: string | null; description: string; nodes: Array<{ target: string[]; summary?: string | null }> }> }>;
    for (const result of axe) for (const violation of result.violations) findings.push({ id: `QA-AXE-${shaSlug(`${result.route}-${violation.id}`)}`, category: 'accessibility', severity: violation.impact === 'critical' || violation.impact === 'serious' ? 'major' : 'minor', module: 'accessibility', feature: violation.id, route: result.route, role: filename.startsWith('authenticated') ? 'ADMIN' : 'anonymous', device: 'desktop', scenario: violation.description, steps: [`Open ${result.route}`, 'Run axe-core'], expected: 'No violations at the configured WCAG tags', actual: `${violation.impact ?? 'unknown'} violation ${violation.id}`, evidence: violation.nodes.flatMap((node) => node.target), source: 'axe', confidence: 'high', status: 'CONFIRMED', recommendation: violation.nodes.map((node) => node.summary ?? '').filter(Boolean).join('\n') || violation.description });
  } catch { /* axe mode did not execute */ }
  for (const filename of ['overflow-findings.json', 'authenticated-overflow-findings.json']) try {
    const responsive = JSON.parse(await readFile(path.join(reportDir, 'responsive', filename), 'utf8')) as { failures?: Array<{ page: string; viewport: string; overflowPx: number; offscreenControls: number; overlappingControls: number; overlapDetails?: string[] }> };
    for (const failure of responsive.failures ?? []) findings.push({ id: `QA-RESP-${shaSlug(`${failure.page}-${failure.viewport}`)}`, category: 'responsive', severity: 'major', module: 'responsive', feature: 'VIEWPORT-BOUNDS', route: failure.page, role: filename.startsWith('authenticated') ? 'ADMIN' : 'anonymous', device: failure.viewport, scenario: 'Horizontal overflow, offscreen controls or severe control overlap', steps: [`Open ${failure.page}`, `Set viewport ${failure.viewport}`], expected: 'No horizontal overflow, offscreen controls or near-total overlap', actual: `${failure.overflowPx}px horizontal overflow; ${failure.offscreenControls} controls outside viewport; ${failure.overlappingControls} overlapping pairs${failure.overlapDetails?.length ? ` (${failure.overlapDetails.join('; ')})` : ''}`, evidence: [`screenshots/${failure.page.replace(/^\//, '')}/${failure.viewport}`], source: 'playwright', confidence: 'high', status: 'CONFIRMED', recommendation: 'Inspect the viewport capture and adjust the affected responsive layout.' });
  } catch { /* responsive mode did not execute */ }
  try {
    const performance = JSON.parse(await readFile(path.join(reportDir, 'performance', 'navigation-samples.json'), 'utf8')) as { p95Ms: number; thresholdMs: number; samples: unknown[] };
    if (performance.p95Ms > performance.thresholdMs) findings.push({ id: 'QA-PERF-PUBLIC-NAV', category: 'performance', severity: 'major', module: 'performance', feature: 'PUBLIC-NAVIGATION', route: '/login,/registro', role: 'anonymous', device: 'desktop', scenario: 'Five navigation samples per public route', steps: ['Navigate repeatedly to each registered public page'], expected: `p95 < ${performance.thresholdMs}ms`, actual: `p95 ${performance.p95Ms}ms across ${performance.samples.length} samples`, evidence: ['performance/navigation-samples.json'], source: 'performance', confidence: 'medium', status: 'CONFIRMED', recommendation: 'Repeat under a controlled warm server and inspect the route waterfall before attributing cause.' });
  } catch { /* performance check did not execute */ }
  try {
    const apis = JSON.parse(await readFile(path.join(reportDir, 'performance', 'authenticated-api-samples.json'), 'utf8')) as { summary?: Array<{ route: string; p95Ms: number; thresholdMs: number; samples: number }> };
    for (const metric of apis.summary ?? []) if (metric.p95Ms > metric.thresholdMs) findings.push({ id: `QA-PERF-${shaSlug(metric.route)}`, category: 'performance', severity: 'major', module: 'performance', feature: metric.route, route: metric.route, role: 'ADMIN', device: 'chromium', scenario: `Five authenticated API samples for ${metric.route}`, steps: [`GET ${metric.route} five times`], expected: `p95 < ${metric.thresholdMs}ms`, actual: `p95 ${metric.p95Ms}ms`, evidence: ['performance/authenticated-api-samples.json'], source: 'performance', confidence: 'medium', status: 'CONFIRMED', recommendation: 'Repeat controlled samples and inspect the server request/query trace locally.' });
  } catch { /* authenticated performance not executed */ }
  return findings;
}
function shaSlug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48); }
async function latestReport() {
  const root = path.resolve('qa/reports');
  let entries; try { entries = await readdir(root, { withFileTypes: true }); } catch { throw new Error('No QA reports exist yet.'); }
  const runs = entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(root, entry.name)).sort();
  const latest = runs.at(-1); if (!latest) throw new Error('No QA report directory exists to package.');
  return latest;
}
async function makeScreenshotManifest(runDir: string) {
  const root = path.join(runDir, 'screenshots'); const records: Array<{ path: string; route: string; viewport: string; bytes: number; stitchReference?: string; comparison: string }> = [];
  async function walk(directory: string): Promise<string[]> {
    let entries; try { entries = await readdir(directory, { withFileTypes: true }); } catch { return []; }
    const result: string[] = []; for (const entry of entries) { const file = path.join(directory, entry.name); if (entry.isDirectory()) result.push(...await walk(file)); else if (entry.isFile() && /\.(png|jpg|jpeg)$/i.test(entry.name)) result.push(file); }
    return result;
  }
  for (const file of await walk(root)) {
    const rel = path.relative(runDir, file).split(path.sep).join('/');
    const parts = path.relative(root, file).split(path.sep); const routeId = parts[0];
    const page = [...qaConfig.publicPages, ...qaConfig.authenticatedPages].find((screen) => screen.id === routeId);
    const stitchSource = page && 'stitch' in page ? page.stitch : features.find((feature) => feature.targets.some((target) => target.kind === 'page' && target.route === page?.path))?.stitchReferences[0];
    records.push({ path: rel, route: page?.path ?? 'unknown', viewport: path.basename(file, path.extname(file)), bytes: (await readFile(file)).length, stitchReference: stitchSource ? `stitch/${shaSlug(stitchSource)}.png` : undefined, comparison: existsSync(path.resolve('qa/visual-baselines', routeId, `${path.basename(file).split('-')[0]}.png`)) ? 'baseline comparison executed' : 'NOT_EXECUTED: approved baseline absent' });
  }
  await writeFile(path.join(runDir, 'SCREENSHOT-MANIFEST.json'), JSON.stringify({ generatedAt: new Date().toISOString(), screenshots: records, comparisons: records.map((record) => ({ route: record.route, screenshot: record.path, stitchReference: record.stitchReference ?? null, status: record.comparison })) }, null, 2));
}
async function copyStitchReferences(runDir: string) {
  const targetDir = path.join(runDir, 'stitch'); await mkdir(targetDir, { recursive: true });
  const mapping: Array<{ source: string; packaged: string; features: string[] }> = [];
  const refs = [...new Set(features.flatMap((feature) => feature.stitchReferences))];
  for (const source of refs) {
    const id = shaSlug(source); const packaged = `${id}${path.extname(source)}`; const file = path.resolve(source);
    if (!existsSync(file)) continue;
    await copyFile(file, path.join(targetDir, packaged));
    mapping.push({ source, packaged: `stitch/${packaged}`, features: features.filter((feature) => feature.stitchReferences.includes(source)).map((feature) => feature.id) });
  }
  await writeFile(path.join(targetDir, 'REFERENCE-MANIFEST.json'), JSON.stringify(mapping, null, 2));
  return mapping;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) { process.stdout.write(help); return; }
  const options = parseArgs(args);
  if (options.packageOnly && !options.full && !options.functional && !options.visual && !options.accessibility && !options.performance && !options.coverage && !options.changed && !options.quick) {
    const result = await exportSanitizedZip(await latestReport()); process.stdout.write(`ZIP=${result.zipPath}\nSHA256=${result.sha256}\nSIZE=${result.size}\n`); return;
  }
  if (options.quick) { options.coverage = true; options.functional = true; }
  if (options.full) { options.coverage = true; options.functional = true; options.visual = true; options.accessibility = true; options.performance = true; }
  const startedAt = new Date().toISOString();
  const id = runId(); const reportDir = path.resolve('qa/reports', id); await mkdir(reportDir, { recursive: true, mode: 0o700 });
  const checks: RunResult['checks'] = []; const blocked: string[] = []; const findings: Finding[] = [];
  const executedFeatureTests = new Map<string, CoverageStatus>();
  const executedStateTests = new Map<string, CoverageStatus>();
  let qaReady = false; let qaRuntimeEnv: NodeJS.ProcessEnv | undefined;
  let functionalBlocked = false;
  const allRoutes = await discoverRoutes();
  const rawControls = await discoverControls(process.cwd(), allRoutes);
  const allControls = applyControlCoverage(rawControls);
  const registryErrors = [...validateFeatures(allRoutes, features, process.cwd(), rawControls), ...await validateRouteExclusions(allRoutes)];
  for (const message of registryErrors) findings.push({ id: `QA-REG-${findings.length + 1}`, category: 'coverage', severity: 'major', module: 'registry', feature: 'REGISTRY-VALIDATION', route: 'qa/features/registry.ts', role: 'all', device: 'all', scenario: 'Validate registry references', steps: [message], expected: 'Feature entry references existing routes and tests', actual: message, evidence: ['qa/features/registry.ts'], source: 'static', confidence: 'high', status: 'CONFIRMED', recommendation: 'Update the declarative registry and test reference.' });
  let routes = allRoutes; let controls = allControls;
  if (options.module) {
    const selected = moduleFeatures(options.module); const ids = new Set(selected.map((feature) => feature.id));
    routes = routes.filter((route) => route.featureIds.some((featureId) => ids.has(featureId)) || route.path.split('/')[1] === options.module);
    controls = controls.filter((control) => routes.some((route) => route.path === control.route));
    if (!selected.length && !routes.length) throw new Error(`Unknown module: ${options.module}`);
  }
  const changed = options.changed ? changedFiles() : new Set<string>();
  if (options.changed) { routes = filterByChanged(routes, changed); controls = filterByChanged(controls, changed); }
  const registryChanges = options.changed && changed.has('qa/features/registry.ts') ? changedFeatureIds() : new Set<string>();
  const selectedFeatureSet = options.changed ? features.filter((feature) => registryChanges.has(feature.id) || feature.tests.some((test) => changed.has(test)) || feature.targets.some((target) => allRoutes.some((route) => route.path === target.route && changed.has(route.source))) || allControls.some((control) => changed.has(control.source) && (control.coveredBy.includes(feature.id) || feature.targets.some((target) => target.kind === 'page' && target.route === control.route)))) : moduleFeatures(options.module);
  if (options.coverage || options.changed || (!options.functional && !options.visual && !options.accessibility && !options.performance && !options.packageOnly)) findings.push(...makeCoverageFindings(routes, controls));
  for (const feature of selectedFeatureSet) checks.push({ id: feature.id, status: feature.status === 'PASS' ? 'NOT_EXECUTED' : feature.status, reason: feature.tests.length ? `Registered tests: ${feature.tests.join(', ')} (run status is recorded separately).` : 'No executable test association registered.', evidence: feature.tests });
  if (registryErrors.length) blocked.push(`Feature registry has ${registryErrors.length} validation error(s).`);

  await writeReports(reportDir, routes, controls, findings, { runId: id, profile: options.full ? 'full' : options.quick ? 'quick' : 'selected', blocked, metadata: { revision: gitFiles(['rev-parse', 'HEAD'])[0] ?? 'unknown' } });
  for (const check of checks) await writeFile(path.join(reportDir, `${check.id}.log`), sanitize(`${check.status}: ${check.reason}\n${check.evidence.join('\n')}`, findSecrets()));

  const runCommands: Array<{ label: string; args: string[]; env: NodeJS.ProcessEnv }> = [];
  const tags = [options.visual && '@qa-observe', options.accessibility && '@qa-axe', options.performance && '@qa-performance'].filter(Boolean) as string[];
  const publicObservationSelected = !options.module || options.module === 'auth';
  if (tags.length && publicObservationSelected) {
    const env = { ...process.env, QA_READ_ONLY: '1', QA_MODULE: options.module ?? '', QA_REPORT_DIR: reportDir, QA_PLAYWRIGHT_REPORT_DIR: path.join(reportDir, 'playwright-report'), DATABASE_URL: 'postgresql://lucem_qa:read-only-placeholder@127.0.0.1:55433/lucem_qa?schema=public', CLOUDFLARE_QUICK_TUNNEL_ENABLED: 'false' } as NodeJS.ProcessEnv;
    runCommands.push({ label: 'read-only-browser-observation', args: ['playwright', 'test', '--config=playwright.qa.readonly.config.ts', '--grep', tags.join('|')], env });
  }
  if (options.functional) {
    try {
      const env = await qaChildEnv(); Object.assign(env, { QA_MODULE: options.module ?? '', QA_REPORT_DIR: reportDir, QA_PLAYWRIGHT_REPORT_DIR: path.join(reportDir, 'playwright-report') });
      // QA preparation rechecks the connected DB identity before migrate, fixture creation and cleanup.
      const prepared = captureCommand('qa-database-prepare', 'npx', ['tsx', 'scripts/qa/prepare.ts'], env, reportDir);
      checks.push({ id: prepared.id, status: prepared.status, reason: prepared.reason, durationMs: prepared.durationMs, evidence: prepared.evidence });
      await writeFile(path.join(reportDir, 'qa-database-prepare.log'), prepared.output);
      if (prepared.status !== 'PASS') { functionalBlocked = true; blocked.push(prepared.reason); const failure = findingForCommand(prepared); if (failure) findings.push(failure); }
      else {
        qaReady = true; qaRuntimeEnv = env;
        const selectedFeatures = selectedFeatureSet;
        const suites = options.quick && !options.changed && !options.module ? [] : options.full || (!options.quick && !options.module && !options.changed)
          ? ['playwright.e2e.config.ts', 'playwright.onboarding.config.ts', 'playwright.products.config.ts', 'playwright.inventory.config.ts', 'playwright.pos.config.ts', 'playwright.reservations.config.ts', 'playwright.returns.config.ts', 'playwright.dev-09.config.ts', 'playwright.dev-10.config.ts', 'playwright.qa.security.config.ts', 'playwright.dev-11r-products.config.ts']
          : [...new Set(selectedFeatures.flatMap((feature) => feature.tests.map(suiteForTest).filter((config): config is string => Boolean(config))))];
        const executions: Array<{ config: string; suffix?: string; extraArgs?: string[]; testFiles?: string[] }> = [];
        if (!options.module || options.module === 'auth') executions.push({ config: 'playwright.qa.config.ts', suffix: 'functional-smoke', extraArgs: ['--grep', '@qa-functional'], testFiles: ['e2e/qa-01/audit.spec.ts'] });
        if (selectedFeatures.some((feature) => feature.tests.some((test) => test.endsWith('dev-01-auth.spec.ts')))) executions.push({ config: 'playwright.qa.config.ts', suffix: 'auth-form', extraArgs: ['e2e/dev-01-auth.spec.ts'], testFiles: ['e2e/dev-01-auth.spec.ts'] });
        for (const config of suites) executions.push({ config });
        for (const execution of executions) {
          const config = execution.config;
          const commandArgs = ['playwright', 'test', `--config=${config}`, ...(execution.extraArgs ?? [])];
          const command = captureCommand(`functional-${execution.suffix ?? config.replace(/[^a-z0-9]+/gi, '-')}`, 'npx', commandArgs, env, reportDir);
          const coveredFiles = execution.testFiles ?? features.flatMap((feature) => feature.tests.filter((test) => suiteForTest(test) === config));
          for (const testFile of coveredFiles) executedFeatureTests.set(testFile, command.status);
          checks.push({ id: command.id, status: command.status, reason: command.reason, durationMs: command.durationMs, evidence: command.evidence });
          await writeFile(path.join(reportDir, `${command.id}.log`), command.output);
          const failure = findingForCommand(command); if (failure) findings.push(failure);
          process.stdout.write(`${command.id}: ${command.status} (${command.reason})\n`);
        }
      }
    } catch (error) {
      functionalBlocked = true;
      const message = error instanceof Error ? error.message : 'QA database prerequisite failed';
      blocked.push(message);
      checks.push({ id: 'qa-database-preflight', status: 'BLOCKED', reason: message, evidence: [] });
      findings.push({ id: 'QA-DB-001', category: 'isolation', severity: 'critical', module: 'qa', feature: 'QA-DATABASE-GUARD', route: 'lucem_qa', role: 'runner', device: 'all', scenario: 'Verify QA DB target before mutations', steps: ['Set explicit loopback QA_DATABASE_URL and provision isolated lucem_qa'], expected: 'Connected database/user exactly lucem_qa on port 55433', actual: message, evidence: [], source: 'static', confidence: 'high', status: 'NEEDS_MANUAL_REVIEW', recommendation: 'Provision the dedicated local QA service; do not use the E2E, staging, production, or Cloudflare target.' });
      process.stderr.write(`BLOCKED: ${message}\n`);
    }
  }
  const databaseObservationTags = publicObservationSelected ? [] : [options.visual && '@qa-db-visual', options.accessibility && '@qa-db-axe', options.performance && '@qa-db-performance'].filter(Boolean) as string[];
  const authenticatedObservationTags = !options.module ? [options.visual && '@qa-db-visual', options.accessibility && '@qa-db-axe', options.performance && '@qa-db-performance'].filter(Boolean) as string[] : databaseObservationTags;
  if (authenticatedObservationTags.length && process.env.QA_DATABASE_URL && !qaReady) {
    try {
      const env = await qaChildEnv(); Object.assign(env, { QA_MODULE: options.module ?? '', QA_REPORT_DIR: reportDir, QA_PLAYWRIGHT_REPORT_DIR: path.join(reportDir, 'playwright-report') });
      const prepared = captureCommand('qa-database-prepare-observation', 'npx', ['tsx', 'scripts/qa/prepare.ts'], env, reportDir);
      checks.push({ id: prepared.id, status: prepared.status, reason: prepared.reason, durationMs: prepared.durationMs, evidence: prepared.evidence });
      await writeFile(path.join(reportDir, `${prepared.id}.log`), prepared.output);
      if (prepared.status === 'PASS') { qaReady = true; qaRuntimeEnv = env; }
      else { blocked.push(prepared.reason); const failure = findingForCommand(prepared); if (failure) findings.push(failure); }
    } catch (error) { blocked.push(error instanceof Error ? error.message : 'QA identity preflight failed.'); }
  }
  if (authenticatedObservationTags.length) {
    if (qaReady && qaRuntimeEnv) {
      if (options.performance && (!options.module || options.module === 'products')) {
        const fixture = captureCommand('qa-performance-fixture', 'npx', ['tsx', 'scripts/qa/perf-fixture.ts'], qaRuntimeEnv, reportDir);
        checks.push({ id: fixture.id, status: fixture.status, reason: fixture.reason, durationMs: fixture.durationMs, evidence: fixture.evidence });
        await writeFile(path.join(reportDir, `${fixture.id}.log`), fixture.output);
        if (fixture.status === 'PASS') qaRuntimeEnv.QA_PERF_FIXTURE_READY = '1';
        else { blocked.push(fixture.reason); const failure = findingForCommand(fixture); if (failure) findings.push(failure); }
      }
      runCommands.push({ label: 'authenticated-qa-observation', args: ['playwright', 'test', '--config=playwright.qa.config.ts', '--grep', authenticatedObservationTags.join('|')], env: qaRuntimeEnv });
    }
    else {
      const message = 'Authenticated responsive/axe/API performance checks BLOCKED: isolated lucem_qa and synthetic credentials are unavailable.';
      blocked.push(message); checks.push({ id: 'authenticated-observation-prerequisite', status: 'BLOCKED', reason: message, evidence: [] });
    }
  }
  for (const command of runCommands) {
    const result = captureCommand(command.label, 'npx', command.args, command.env, reportDir);
    checks.push({ id: result.id, status: result.status, reason: result.reason, durationMs: result.durationMs, evidence: result.evidence });
    await writeFile(path.join(reportDir, `${result.id}.log`), result.output);
    const failure = findingForCommand(result); if (failure) findings.push(failure);
    if (result.id === 'read-only-browser-observation' && result.status === 'PASS') {
      executedFeatureTests.set('e2e/qa-01/audit.spec.ts', 'PASS');
      executedStateTests.set('ROOT-ENTRY:ROOT-LANDING', 'PASS');
    }
    process.stdout.write(`${result.id}: ${result.status} (${result.reason})\n`);
  }
  if (qaReady && qaRuntimeEnv) {
    const cleanup = captureCommand('qa-database-cleanup', 'npx', ['tsx', 'scripts/qa/cleanup.ts'], qaRuntimeEnv, reportDir);
    checks.push({ id: cleanup.id, status: cleanup.status, reason: cleanup.reason, durationMs: cleanup.durationMs, evidence: cleanup.evidence });
    await writeFile(path.join(reportDir, `${cleanup.id}.log`), cleanup.output);
    if (cleanup.status !== 'PASS') { blocked.push(`QA cleanup requires review: ${cleanup.reason}`); const failure = findingForCommand(cleanup); if (failure) findings.push(failure); }
  }
  const authenticatedChecksBlocked = databaseObservationTags.length > 0 && !qaReady;
  const featureResults = new Map<string, CoverageStatus>();
  for (const feature of features) {
    let featureStatus: CoverageStatus;
    const testResults = feature.tests.map((test) => executedFeatureTests.get(test) ?? 'NOT_EXECUTED');
    if (!feature.implemented) featureStatus = 'NOT_IMPLEMENTED';
    else if (!feature.tests.length) featureStatus = 'UNCOVERED';
    else if (testResults.length && testResults.every((result) => result === 'PASS')) featureStatus = 'PASS';
    else if (testResults.includes('FAIL')) featureStatus = 'FAIL';
    else if (testResults.includes('BLOCKED') || (options.functional && functionalBlocked && selectedFeatureSet.some((selected) => selected.id === feature.id)) || (authenticatedChecksBlocked && selectedFeatureSet.some((selected) => selected.id === feature.id) && feature.roles.some((role) => role !== 'anonymous'))) featureStatus = 'BLOCKED';
    else featureStatus = 'NOT_EXECUTED';
    featureResults.set(feature.id, featureStatus);
  }
  for (const check of checks) if (featureResults.has(check.id)) {
    check.status = featureResults.get(check.id)!;
    check.reason = check.status === 'PASS' ? 'All declared feature tests passed in this run.' : check.status === 'FAIL' ? 'At least one declared feature test failed.' : check.status === 'BLOCKED' ? 'Feature test execution was blocked by an isolated QA prerequisite.' : check.status === 'NOT_IMPLEMENTED' ? 'Feature is explicitly documented as not implemented.' : check.status === 'UNCOVERED' ? 'Feature has no registered executable tests.' : 'Registered feature tests were not executed in this profile.';
  }
  for (const check of checks) if (featureResults.has(check.id)) await writeFile(path.join(reportDir, `${check.id}.log`), sanitize(`${check.status}: ${check.reason}\n${check.evidence.join('\n')}`, findSecrets()));
  routes = routes.map((route) => {
    if (route.coverageStatus !== 'NOT_EXECUTED') return route;
    const associated = features.filter((feature) => route.featureIds.includes(feature.id));
    const tests = [...new Set(associated.flatMap((feature) => feature.tests))];
    const results = associated.map((feature) => featureResults.get(feature.id) ?? 'NOT_EXECUTED');
    if (results.length && results.every((result) => result === 'PASS')) return { ...route, coverageStatus: 'PASS' };
    if (results.includes('FAIL')) return { ...route, coverageStatus: 'FAIL' };
    if (results.includes('BLOCKED')) return { ...route, coverageStatus: 'BLOCKED' };
    return route;
  });
  controls = controls.map((control) => {
    if (!control.coveredBy.length) return control;
    const tests = [...new Set(features.filter((feature) => control.coveredBy.includes(feature.id)).flatMap((feature) => feature.tests))];
    const results = features.filter((feature) => control.coveredBy.includes(feature.id)).map((feature) => featureResults.get(feature.id) ?? 'NOT_EXECUTED');
    const status = results.length && results.every((result) => result === 'PASS') ? 'PASS' : results.includes('FAIL') ? 'FAIL' : 'NOT_EXECUTED';
    return { ...control, status };
  });
  const finalStateCoverage = featureStateCoverage(selectedFeatureSet, executedStateTests);
  findings.push(...makeFeatureStateFindings(finalStateCoverage));
  findings.push(...await browserFindings(reportDir));
  if ((options.visual || options.full) && findings.some((finding) => finding.category === 'visual' && finding.status === 'NEEDS_MANUAL_REVIEW')) checks.push({ id: 'approved-visual-baselines', status: 'NOT_EXECUTED', reason: 'No approved screenshot baselines were found; captured images are available for review.', evidence: ['SCREENSHOT-MANIFEST.json', 'stitch-comparison.html'] });
  await copyStitchReferences(reportDir);
  await makeScreenshotManifest(reportDir);
  const status: CoverageStatus = checks.some((check) => check.status === 'FAIL') || findings.some((finding) => finding.status === 'CONFIRMED' && finding.category !== 'coverage') ? 'FAIL' : findings.some((finding) => finding.severity === 'critical' && finding.category !== 'coverage') ? 'BLOCKED' : findings.some((finding) => finding.category === 'coverage') ? 'UNCOVERED' : checks.some((check) => check.status === 'BLOCKED') ? 'BLOCKED' : checks.some((check) => check.status === 'NOT_EXECUTED') ? 'NOT_EXECUTED' : 'PASS';
  const completed: RunResult = { runId: id, profile: options.full ? 'full' : options.quick ? 'quick' : 'selected', startedAt, endedAt: new Date().toISOString(), status, routes, controls, featureStates: finalStateCoverage, findings, checks, blocked, metadata: { revision: gitFiles(['rev-parse', 'HEAD'])[0] ?? 'unknown', changedFiles: [...changed] } };
  await writeReports(reportDir, routes, controls, findings, completed);
  await writeFile(path.join(reportDir, 'RUN-RESULT.json'), JSON.stringify(completed, null, 2));
  const screenshotManifest = JSON.parse(await readFile(path.join(reportDir, 'SCREENSHOT-MANIFEST.json'), 'utf8')) as { screenshots: Array<{ path: string; route: string; viewport: string; stitchReference?: string; comparison: string }> };
  const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const comparisonHtml = ['<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Stitch comparisons</title><style>body{font:15px system-ui;margin:2rem;color:#172033}section{margin:2rem 0;padding:1rem;border:1px solid #ccd4dc}div{display:flex;gap:1rem;flex-wrap:wrap}figure{margin:0;flex:1;min-width:280px}img{max-width:100%;height:auto}</style><h1>Stitch references and current screens</h1>', ...screenshotManifest.screenshots.map((screen) => `<section><h2>${escapeHtml(screen.route)} · ${escapeHtml(screen.viewport)}</h2><p>${escapeHtml(screen.comparison)}</p><div><figure><figcaption>${screen.stitchReference ? 'Stitch reference' : 'No Stitch reference registered'}</figcaption>${screen.stitchReference ? `<img src="${escapeHtml(screen.stitchReference)}" alt="Approved Stitch reference for ${escapeHtml(screen.route)}">` : '<p>No approved design reference.</p>'}</figure><figure><figcaption>Current capture</figcaption><img src="${escapeHtml(screen.path)}" alt="Current application capture for ${escapeHtml(screen.route)}"></figure></div></section>`), '</html>'].join('\n');
  await writeFile(path.join(reportDir, 'stitch-comparison.html'), comparisonHtml);
  process.stdout.write(`Lucem QA Lab ${status}\nRoutes=${routes.length}; controls=${controls.length}; findings=${findings.length}; blocked=${blocked.length}\nReport=${reportDir}\nHTML=${path.join(reportDir, 'index.html')}\n`);
  if (options.packageOnly || options.full || options.quick || options.packageOnly) {
    try { const zipped = await exportSanitizedZip(reportDir); process.stdout.write(`ZIP=${zipped.zipPath}\nSHA256=${zipped.sha256}\nSIZE=${zipped.size}\n`); }
    catch (error) { process.stderr.write(`BLOCKED: evidence ZIP not created: ${error instanceof Error ? error.message : 'sanitization failure'}\n`); process.exitCode = 1; }
  }
  if (status !== 'PASS' || registryErrors.length) process.exitCode = 1;
}

main().catch((error) => { process.stderr.write(`QA audit failed: ${error instanceof Error ? sanitize(error.message, findSecrets()) : 'unknown error'}\n`); process.exitCode = 1; });
