import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { features, type CoverageStatus, type Feature } from '../../qa/features/registry';

export type RouteRecord = {
  id: string; path: string; kind: 'page' | 'api'; module: string; methods: string[]; source: string; dynamicSegments: string[]; lastValidatedAt: string;
  fixtureStatus: 'not-dynamic' | 'registered' | 'FIXTURE_PENDING';
  excluded: boolean; exclusionReason?: string; auth: 'public' | 'protected' | 'unknown'; roles: string[];
  featureIds: string[]; tests: string[]; coverageStatus: CoverageStatus;
};
export type ControlRecord = { id: string; key: string; route: string; source: string; line: number; sourceLocations: Array<{ source: string; line: number }>; tag: string; label: string; coveredBy: string[]; status: CoverageStatus };
export type FeatureStateRecord = { featureId: string; featureTitle: string; area: string; state: string; testIds: string[]; status: CoverageStatus };
export type Finding = {
  id: string; category: string; severity: 'critical' | 'major' | 'minor'; module: string; feature: string; route: string;
  role: string; device: string; scenario: string; steps: string[]; expected: string; actual: string; evidence: string[];
  source: 'static' | 'playwright' | 'axe' | 'performance' | 'sanitizer'; confidence: 'high' | 'medium' | 'low';
  status: 'CONFIRMED' | 'SUSPECTED' | 'NEEDS_MANUAL_REVIEW' | 'RESOLVED' | 'FALSE_POSITIVE'; recommendation: string;
};
export type RunResult = { runId: string; profile: string; area?: string; startedAt: string; endedAt?: string; status: CoverageStatus; routes: RouteRecord[]; controls: ControlRecord[]; featureStates: FeatureStateRecord[]; findings: Finding[]; checks: Array<{ id: string; status: CoverageStatus; reason: string; durationMs?: number; evidence: string[] }>; blocked: string[]; metadata: Record<string, unknown> };
export type RouteExclusion = { path: string; kind: 'page' | 'api'; reason: string };

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const ignoredSegments = (segment: string) => segment.startsWith('@') || ['(.)', '(..)', '(...)'].includes(segment);
const sha12 = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 12);
const toPosix = (value: string) => value.split(path.sep).join('/');

async function walk(dir: string): Promise<string[]> {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return []; }
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (entry.isFile() && /^(page|route)\.(tsx?|jsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}
function normalizeSegments(segments: string[]): string {
  const visible = segments.filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')) && !ignoredSegments(segment));
  return `/${visible.map((segment) => {
    const optional = /^\[\[\.\.\.(.+)\]\]$/.exec(segment); if (optional) return `*${optional[1]}?`;
    const catchall = /^\[\.\.\.(.+)\]$/.exec(segment); if (catchall) return `*${catchall[1]}`;
    const dynamic = /^\[(.+)\]$/.exec(segment); return dynamic ? `:${dynamic[1]}` : segment;
  }).join('/')}`;
}
function methodExports(source: string): string[] {
  const file = ts.createSourceFile('route.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS); const found = new Set<string>();
  for (const statement of file.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && HTTP_METHODS.includes(statement.name.text) && statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) found.add(statement.name.text);
    if (ts.isVariableStatement(statement) && statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) for (const declaration of statement.declarationList.declarations) if (ts.isIdentifier(declaration.name) && HTTP_METHODS.includes(declaration.name.text)) found.add(declaration.name.text);
    if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) for (const element of statement.exportClause.elements) if (HTTP_METHODS.includes(element.name.text)) found.add(element.name.text);
  }
  return [...found].sort();
}

export async function discoverRoutes(root = process.cwd(), definitions: Feature[] = features): Promise<RouteRecord[]> {
  const files = (await Promise.all(['app', 'src/app'].map((dir) => walk(path.join(root, dir))))).flat();
  let exclusions: RouteExclusion[] = [];
  try { exclusions = JSON.parse(await readFile(path.join(root, 'qa/routes/exclusions.json'), 'utf8')) as RouteExclusion[]; } catch { /* optional in isolated test roots */ }
  const routes: RouteRecord[] = []; const lastValidatedAt = new Date().toISOString();
  for (const file of [...new Set(files)].sort()) {
    const relative = toPosix(path.relative(root, file)).split('/');
    const appIndex = relative.findIndex((part, index) => part === 'app' && (index === 0 || relative[index - 1] === 'src'));
    if (appIndex < 0) continue;
    const segments = relative.slice(appIndex + 1, -1); const routePath = normalizeSegments(segments);
    const kind = path.basename(file).startsWith('route.') ? 'api' : 'page';
    const methods = kind === 'page' ? ['GET'] : methodExports(await readFile(file, 'utf8'));
    const matched = definitions.filter((feature) => feature.targets.some((target) => target.route === routePath && target.kind === kind && (!target.methods?.length || target.methods.some((method) => methods.includes(method)))));
    const exclusion = exclusions.find((record) => record.path === routePath && record.kind === kind);
    const tests = [...new Set(matched.flatMap((feature) => feature.tests))]; const roles = [...new Set(matched.flatMap((feature) => feature.roles).filter((role) => role !== 'anonymous'))];
    let coverageStatus: CoverageStatus = exclusion ? 'NOT_IMPLEMENTED' : 'NOT_MAPPED';
    if (!exclusion && matched.length) coverageStatus = matched.some((feature) => feature.status === 'BLOCKED') ? 'BLOCKED' : matched.some((feature) => feature.status === 'NOT_IMPLEMENTED' || !feature.implemented) ? 'NOT_IMPLEMENTED' : tests.length ? 'NOT_EXECUTED' : 'UNCOVERED';
    const dynamicSegments = segments.flatMap((segment) => {
      const optional = /^\[\[\.\.\.(.+)\]\]$/.exec(segment); if (optional) return [optional[1]];
      const catchall = /^\[\.\.\.(.+)\]$/.exec(segment); if (catchall) return [catchall[1]];
      const dynamic = /^\[(.+)\]$/.exec(segment); return dynamic ? [dynamic[1]] : [];
    });
    const publicRoute = ['/', '/login', '/registro', '/api/auth/login', '/api/auth/register'].includes(routePath);
    routes.push({ id: sha12(`${kind}:${routePath}`), path: routePath, kind, module: [...new Set(matched.map((feature) => feature.area))].join(',') || (routePath.split('/').filter(Boolean)[kind === 'api' ? 1 : 0] ?? 'home'), methods, source: toPosix(path.relative(root, file)), dynamicSegments, lastValidatedAt, fixtureStatus: dynamicSegments.length ? matched.some((feature) => Boolean(feature.fixture)) ? 'registered' : 'FIXTURE_PENDING' : 'not-dynamic', excluded: Boolean(exclusion), exclusionReason: exclusion?.reason, auth: publicRoute ? 'public' : roles.length ? 'protected' : 'unknown', roles, featureIds: matched.map((feature) => feature.id), tests, coverageStatus });
  }
  return routes;
}

function importSpecifiers(source: ts.SourceFile) {
  return source.statements.flatMap((statement) => {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) return [];
    const names: string[] = [];
    if (statement.importClause?.name) names.push('default');
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) names.push('*');
    if (bindings && ts.isNamedImports(bindings)) for (const element of bindings.elements) names.push(element.propertyName?.text ?? element.name.text);
    return [{ specifier: statement.moduleSpecifier.text, names }];
  });
}
async function resolveImport(root: string, importer: string, specifier: string) {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return undefined;
  const base = specifier.startsWith('@/') ? path.join(root, 'src', specifier.slice(2)) : path.resolve(path.dirname(importer), specifier);
  for (const candidate of [base, ...['.tsx', '.ts', '.jsx', '.js'].map((extension) => `${base}${extension}`), ...['index.tsx', 'index.ts'].map((name) => path.join(base, name))]) try { if ((await stat(candidate)).isFile()) return candidate; } catch { /* keep searching */ }
  return undefined;
}
function jsxText(node: ts.Node): string {
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isJsxText(node)) return node.text.replace(/\s+/g, ' ').trim();
  if (ts.isJsxElement(node) || ts.isJsxFragment(node)) return node.children.map(jsxText).filter(Boolean).join(' ');
  if (ts.isJsxExpression(node) && node.expression) {
    const expression = node.expression;
    if (ts.isConditionalExpression(expression)) return [jsxText(expression.whenTrue), jsxText(expression.whenFalse)].filter(Boolean).join(' ');
    if (ts.isJsxElement(expression) || ts.isJsxFragment(expression)) return jsxText(expression);
    if (ts.isStringLiteral(expression)) return expression.text;
  }
  return '';
}
function componentBodies(source: ts.SourceFile, names?: string[]): ts.Node[] {
  if (!names || names.includes('*')) return [source];
  const selected: ts.Node[] = [];
  const statements = source.statements;
  for (const name of names) {
    if (name === 'default') {
      const defaultFunction = statements.find((statement) => ts.isFunctionDeclaration(statement) && statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword));
      if (defaultFunction) selected.push(defaultFunction);
      else {
        const assignment = statements.find(ts.isExportAssignment);
        if (assignment && ts.isIdentifier(assignment.expression)) {
          const identifier = assignment.expression.text;
          const declaration = statements.find((statement) => (ts.isFunctionDeclaration(statement) && statement.name?.text === identifier) || (ts.isVariableStatement(statement) && statement.declarationList.declarations.some((item) => ts.isIdentifier(item.name) && item.name.text === identifier)));
          if (declaration) selected.push(declaration);
        }
      }
    } else {
      for (const statement of statements) {
        if (ts.isFunctionDeclaration(statement) && statement.name?.text === name) selected.push(statement);
        else if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) if (ts.isIdentifier(declaration.name) && declaration.name.text === name && declaration.initializer) selected.push(declaration.initializer);
      }
    }
  }
  return selected;
}
const interactiveTags = new Set(['button', 'a', 'link', 'input', 'select', 'textarea', 'form']);
export async function discoverControls(root = process.cwd(), routes?: RouteRecord[]): Promise<ControlRecord[]> {
  const records = routes ?? await discoverRoutes(root); const result: ControlRecord[] = [];
  for (const route of records.filter((record) => record.kind === 'page')) {
    const pending: Array<{ file: string; names?: string[] }> = [{ file: path.resolve(root, route.source), names: ['default'] }]; const visited = new Set<string>();
    while (pending.length) {
      const entry = pending.pop()!; const file = entry.file; const visitedKey = `${file}:${entry.names?.join(',') ?? '*'}`; if (visited.has(visitedKey)) continue; visited.add(visitedKey);
      let text: string; try { text = await readFile(file, 'utf8'); } catch { continue; }
      const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      for (const imported of importSpecifiers(source)) { const resolved = await resolveImport(root, file, imported.specifier); if (resolved && imported.names.length) pending.push({ file: resolved, names: imported.names }); }
      const followedLocal = new Set<string>();
      const visit = (node: ts.Node) => {
        if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && /^[A-Z]/.test(node.tagName.getText().split('.').pop() ?? '')) {
          const componentName = node.tagName.getText().split('.').pop()!;
          const local = source.statements.find((statement) => (ts.isFunctionDeclaration(statement) && statement.name?.text === componentName) || (ts.isVariableStatement(statement) && statement.declarationList.declarations.some((item) => ts.isIdentifier(item.name) && item.name.text === componentName)));
          if (local && !followedLocal.has(componentName)) { followedLocal.add(componentName); ts.forEachChild(local, visit); }
        }
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const elementName = node.tagName.getText().split('.').pop()!.toLowerCase();
          const roleButton = node.attributes.properties.some((property) => ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === 'role' && property.initializer && ts.isStringLiteral(property.initializer) && property.initializer.text === 'button');
          const clickHandler = node.attributes.properties.some((property) => ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === 'onClick');
          const tag = interactiveTags.has(elementName) ? elementName : roleButton || clickHandler ? 'action' : '';
          if (tag) {
            let label = '';
            for (const prop of node.attributes.properties) if (ts.isJsxAttribute(prop) && ts.isIdentifier(prop.name) && ['aria-label', 'name', 'id', 'title', 'placeholder', 'href'].includes(prop.name.text) && prop.initializer) {
              if (ts.isStringLiteral(prop.initializer)) label = prop.initializer.text;
              else if (ts.isJsxExpression(prop.initializer)) label = jsxText(prop.initializer);
              if (label && prop.name.text !== 'href') break;
            }
            if (!label && ['button', 'a', 'link', 'action'].includes(tag) && ts.isJsxElement(node.parent)) label = jsxText(node.parent).slice(0, 80);
            if (!label) label = `unlabeled-${tag}`;
            const sourcePath = toPosix(path.relative(root, file)); const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
            const key = `${route.path}|${tag}|${label.trim().toLowerCase().replace(/\s+/g, ' ')}`;
            result.push({ id: sha12(`${route.id}:${key}`), key, route: route.path, source: sourcePath, line, sourceLocations: [{ source: sourcePath, line }], tag, label, coveredBy: [], status: 'UNCOVERED' });
          }
        }
        ts.forEachChild(node, visit);
      };
      for (const body of componentBodies(source, entry.names)) visit(body);
    }
  }
  const unique = new Map<string, ControlRecord>();
  for (const control of result) {
    const existing = unique.get(control.key);
    if (existing) existing.sourceLocations.push(...control.sourceLocations);
    else unique.set(control.key, control);
  }
  return [...unique.values()].map((control) => ({ ...control, sourceLocations: [...new Map(control.sourceLocations.map((location) => [`${location.source}:${location.line}`, location])).values()].sort((a, b) => a.source.localeCompare(b.source) || a.line - b.line) })).sort((a, b) => a.route.localeCompare(b.route) || a.source.localeCompare(b.source) || a.line - b.line);
}

export function validateFeatures(routes: RouteRecord[], definitions: Feature[] = features, root = process.cwd(), controls?: ControlRecord[]): string[] {
  const errors: string[] = []; const ids = new Set<string>(); const available = new Map(routes.map((route) => [`${route.kind}:${route.path}`, route]));
  for (const feature of definitions) {
    if (!/^[A-Z][A-Z0-9-]{2,63}$/.test(feature.id)) errors.push(`Invalid feature id: ${feature.id}`);
    if (ids.has(feature.id)) errors.push(`Duplicate feature id: ${feature.id}`); ids.add(feature.id);
    if (!feature.title.trim() || !feature.area.trim() || !feature.targets.length || !feature.roles.length || !feature.requiredStates.length || !feature.tags.length || !feature.profile.length) errors.push(`Incomplete feature definition: ${feature.id}`);
    if (feature.implemented && feature.tests.length === 0) errors.push(`Implemented feature ${feature.id} has no executable test association.`);
    if (controls) for (const key of feature.controls ?? []) if (!controls.some((control) => control.key === key && feature.targets.some((target) => target.kind === 'page' && target.route === control.route))) errors.push(`Feature ${feature.id} references an undiscovered control ${key}.`);
    for (const [testId, testFile] of Object.entries(feature.testCases ?? {})) {
      if (!testId.trim() || !feature.tests.includes(testFile)) errors.push(`Feature ${feature.id} test case ${testId} must reference one of its registered test files.`);
    }
    for (const [state, testIds] of Object.entries(feature.stateTests ?? {})) {
      if (!feature.requiredStates.includes(state)) errors.push(`Feature ${feature.id} registers unknown state ${state}.`);
      for (const testId of testIds) if (!feature.testCases?.[testId]) errors.push(`Feature ${feature.id} state ${state} references unknown test case ${testId}.`);
    }
    for (const target of feature.targets) {
      const route = available.get(`${target.kind}:${target.route}`);
      if (!route) errors.push(`Feature ${feature.id} references missing route ${target.kind}:${target.route}`);
      else if (target.methods?.some((method) => !route.methods.includes(method))) errors.push(`Feature ${feature.id} references missing HTTP method for ${target.route}`);
    }
    for (const test of feature.tests) {
      if (path.isAbsolute(test) || test.split(/[\\/]/).includes('..')) errors.push(`Unsafe test path in ${feature.id}: ${test}`);
      else if (!existsSync(path.join(root, test))) errors.push(`Feature ${feature.id} references missing test ${test}`);
    }
  }
  return errors;
}
export async function validateRouteExclusions(routes: RouteRecord[], root = process.cwd()): Promise<string[]> {
  let exclusions: RouteExclusion[];
  try { exclusions = JSON.parse(await readFile(path.join(root, 'qa/routes/exclusions.json'), 'utf8')) as RouteExclusion[]; }
  catch { return ['Invalid qa/routes/exclusions.json']; }
  const errors: string[] = []; const ids = new Set<string>(); const available = new Set(routes.map((route) => `${route.kind}:${route.path}`));
  for (const exclusion of exclusions) {
    const key = `${exclusion.kind}:${exclusion.path}`;
    if (!exclusion.reason?.trim()) errors.push(`Route exclusion ${key} requires a reason.`);
    if (!available.has(key)) errors.push(`Route exclusion references missing route ${key}.`);
    if (ids.has(key)) errors.push(`Duplicate route exclusion ${key}.`); ids.add(key);
  }
  return errors;
}
export function applyControlCoverage(controls: ControlRecord[], definitions: Feature[] = features): ControlRecord[] {
  return controls.map((control) => {
    const owners = definitions.filter((feature) => feature.implemented && feature.tests.length && feature.targets.some((target) => target.kind === 'page' && target.route === control.route) && feature.controls?.includes(control.key));
    return { ...control, coveredBy: owners.map((feature) => feature.id), status: owners.length ? 'NOT_EXECUTED' : 'UNCOVERED' };
  });
}
export function makeCoverageFindings(routes: RouteRecord[], controls: ControlRecord[]): Finding[] {
  const findings: Finding[] = [];
  for (const route of routes) if (route.coverageStatus === 'NOT_MAPPED' || route.coverageStatus === 'UNCOVERED') findings.push({ id: `QA-COV-${route.id}`, category: 'coverage', severity: ['/pos', '/api/sales'].includes(route.path) ? 'critical' : 'major', module: route.module, feature: 'UNREGISTERED_ROUTE', route: route.path, role: route.auth, device: 'all', scenario: 'Discovered route coverage', steps: [`Inspect ${route.source}`], expected: 'Feature registry entry and executable test', actual: route.coverageStatus === 'NOT_MAPPED' ? 'Route has no registry mapping' : 'Mapped route has no executable coverage', evidence: [route.source], source: 'static', confidence: 'high', status: 'CONFIRMED', recommendation: 'Register this route and add an observable behavior test.' });
  for (const route of routes) if (route.fixtureStatus === 'FIXTURE_PENDING') findings.push({ id: `QA-FIXTURE-${route.id}`, category: 'coverage', severity: 'major', module: route.module, feature: route.featureIds.join(',') || 'DYNAMIC-ROUTE', route: route.path, role: route.auth, device: 'all', scenario: 'Resolve dynamic route with a real QA fixture', steps: [`Create or select a namespaced lucem_qa fixture for ${route.path}`], expected: 'Dynamic segment is exercised using a fixture owned by the run', actual: 'No fixture reference is declared', evidence: [route.source], source: 'static', confidence: 'high', status: 'NEEDS_MANUAL_REVIEW', recommendation: 'Add a fixture reference and test that resolves the route without a literal placeholder URL.' });
  for (const control of controls) if (control.status === 'UNCOVERED') findings.push({ id: `QA-SURF-${control.id}`, category: 'coverage', severity: ['button', 'form', 'action'].includes(control.tag) ? 'major' : 'minor', module: control.route.split('/')[1] || 'home', feature: 'UNREGISTERED_CONTROL', route: control.route, role: 'unknown', device: 'all', scenario: `${control.tag}: ${control.label}`, steps: control.sourceLocations.map(({ source, line }) => `Inspect ${source}:${line}`), expected: 'Declared behavior test for interactive control', actual: 'Control surface is not associated with a feature', evidence: control.sourceLocations.map(({ source }) => source), source: 'static', confidence: 'medium', status: 'CONFIRMED', recommendation: 'Register the action/control in qa/features/registry.ts and add a test.' });
  return findings;
}
export function featureStateCoverage(definitions: Feature[] = features, execution: Map<string, CoverageStatus> = new Map()): FeatureStateRecord[] {
  return definitions.flatMap((feature) => feature.requiredStates.map((state) => {
    const testIds = feature.stateTests?.[state] ?? [];
    let status: CoverageStatus = !feature.implemented ? 'NOT_IMPLEMENTED' : !testIds.length ? 'UNCOVERED' : 'NOT_EXECUTED';
    if (testIds.length) {
      const results = testIds.map((testId) => execution.get(`${feature.id}:${testId}`) ?? 'NOT_EXECUTED');
      if (results.every((result) => result === 'PASS')) status = 'PASS';
      else if (results.includes('FAIL')) status = 'FAIL';
      else if (results.includes('BLOCKED')) status = 'BLOCKED';
    }
    return { featureId: feature.id, featureTitle: feature.title, area: feature.area, state, testIds, status };
  }));
}
export function makeFeatureStateFindings(states: FeatureStateRecord[]): Finding[] {
  return states.filter((state) => state.status === 'UNCOVERED').map((state) => ({
    id: `QA-STATE-${sha12(`${state.featureId}:${state.state}`)}`, category: 'coverage', severity: 'major', module: state.area, feature: state.featureId,
    route: 'feature-registry', role: 'declared-role', device: 'all', scenario: `Required state ${state.state}`, steps: [`Locate ${state.featureId} state declaration`],
    expected: 'Required UI/business state maps to an identified test case and observable assertion', actual: 'State is listed but no test-case mapping is registered',
    evidence: ['qa/features/registry.ts'], source: 'static', confidence: 'high', status: 'CONFIRMED', recommendation: `Add a stable testCases ID and map ${state.state} in stateTests.`,
  }));
}

export async function verifyQaTarget(env: Record<string, string | undefined> = process.env): Promise<string> {
  const raw = env.QA_DATABASE_URL;
  if (!raw) throw new Error('QA_DATABASE_URL is required; DATABASE_URL fallback is forbidden');
  let url: URL; try { url = new URL(raw); } catch { throw new Error('QA_DATABASE_URL is invalid'); }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1', '::1'].includes(host) || url.port !== '55433' || decodeURIComponent(url.username) !== 'lucem_qa' || decodeURIComponent(url.pathname.slice(1)) !== 'lucem_qa') throw new Error('QA target must be loopback lucem_qa user/database on port 55433');
  return raw;
}
export async function verifyConnectedDatabase(query: () => Promise<{ database: string; user: string }>, env: Record<string, string | undefined> = process.env) {
  const url = await verifyQaTarget(env); const identity = await query();
  if (identity.database !== 'lucem_qa' || identity.user !== 'lucem_qa') throw new Error('Connected database identity does not match dedicated QA target');
  return url;
}

export function sanitize(input: string, secrets: string[] = []): string {
  let output = input;
  for (const secret of [...secrets].filter(Boolean).sort((a, b) => b.length - a.length)) output = output.split(secret).join('[REDACTED_SECRET]');
  return output.replace(/(authorization\s*[:=]\s*)bearer\s+[^\s,;"']+/gi, '$1[REDACTED]')
    .replace(/([\w-]*(?:authorization|cookie|set-cookie|api[-_]?key|password|token|secret)[\w-]*)(\s*[:=]\s*)([^\s,;"']+)/gi, '$1$2[REDACTED]')
    .replace(/(postgres(?:ql)?:\/\/)[^/@\s]+:[^/@\s]+@/gi, '$1[REDACTED]@')
    .replace(/([?&](?:token|password|secret|key|code)=)[^&#\s]+/gi, '$1[REDACTED]')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[REDACTED_EMAIL]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_PII]');
}

export async function writeReports(outDir: string, routes: RouteRecord[], controls: ControlRecord[] = [], findings: Finding[] = [], run?: Partial<RunResult>) {
  await mkdir(outDir, { recursive: true });
  for (const dir of ['screenshots', 'diffs', 'traces', 'playwright-report']) await mkdir(path.join(outDir, dir), { recursive: true });
  await writeFile(path.join(outDir, 'ROUTE-INVENTORY.json'), JSON.stringify({ generatedAt: new Date().toISOString(), routes }, null, 2));
  await writeFile(path.join(outDir, 'FINDINGS.json'), JSON.stringify(findings, null, 2));
  const featureStates = run?.featureStates ?? featureStateCoverage(features);
  await writeFile(path.join(outDir, 'FEATURE-COVERAGE.json'), JSON.stringify(featureStates, null, 2));
  const screenshotManifest = path.join(outDir, 'SCREENSHOT-MANIFEST.json');
  if (!existsSync(screenshotManifest)) await writeFile(screenshotManifest, JSON.stringify({ generatedAt: new Date().toISOString(), screenshots: [], comparisons: [] }, null, 2));
  const readJson = async (filename: string): Promise<any | undefined> => { try { return JSON.parse(await readFile(path.join(outDir, filename), 'utf8')); } catch { return undefined; } };
  const screenshotData = await readJson('SCREENSHOT-MANIFEST.json');
  const screenshotRows = screenshotData?.screenshots ?? [];
  const axeRuns = (await Promise.all(['accessibility/axe-findings.json', 'accessibility/authenticated-axe-findings.json'].map(readJson))).flatMap((value) => Array.isArray(value) ? value : []);
  const axeViolationCount = axeRuns.reduce((total: number, result: { violations?: unknown[] }) => total + (result.violations?.length ?? 0), 0);
  const navigationPerformance = await readJson('performance/navigation-samples.json');
  const apiPerformance = await readJson('performance/authenticated-api-samples.json');
  const responsiveRuns = (await Promise.all(['responsive/overflow-findings.json', 'responsive/authenticated-overflow-findings.json'].map(readJson))).filter(Boolean);
  const responsiveFailures = responsiveRuns.reduce((total: number, result: { failures?: unknown[] }) => total + (result.failures?.length ?? 0), 0);
  const checkStatusCounts = new Map<string, number>(); for (const check of run?.checks ?? []) checkStatusCounts.set(check.status, (checkStatusCounts.get(check.status) ?? 0) + 1);
  let observedTestCount: number | undefined;
  try { const log = await readFile(path.join(outDir, 'read-only-browser-observation.log'), 'utf8'); const match = /(?:^|\n)\s*(\d+) passed\b/.exec(log); if (match) observedTestCount = Number(match[1]); } catch { /* browser observation did not run */ }
  const statusCounts = new Map<string, number>(); for (const route of routes) statusCounts.set(route.coverageStatus, (statusCounts.get(route.coverageStatus) ?? 0) + 1);
  const stateCounts = new Map<string, number>(); for (const state of featureStates) stateCounts.set(state.status, (stateCounts.get(state.status) ?? 0) + 1);
  const coverage = ['# Coverage matrix', '', `Routes discovered: ${routes.length}`, `Capabilities registered: ${new Set(featureStates.map((state) => state.featureId)).size}`, `Required states registered: ${featureStates.length}`, '', ...[...statusCounts].map(([status, count]) => `- Route ${status}: ${count}`), ...[...stateCounts].map(([status, count]) => `- Feature state ${status}: ${count}`), '', '## Routes', ...routes.map((route) => `- **${route.coverageStatus}** \`${route.kind} ${route.path}\` (${route.methods.join(', ')}) — ${route.source}; tests: ${route.tests.join(', ') || 'none'}; fixture: ${route.fixtureStatus}`), '', '## Feature states', ...featureStates.map((state) => `- **${state.status}** ${state.featureId} · ${state.state} · tests: ${state.testIds.join(', ') || 'none'}`), '', '## Interactive controls', ...controls.map((control) => `- **${control.status}** \`${control.route}\` ${control.tag}: ${control.label} (${control.sourceLocations.map(({ source, line }) => `${source}:${line}`).join(', ')})`)].join('\n');
  await writeFile(path.join(outDir, 'COVERAGE-MATRIX.md'), coverage);
  const summary = [`# Executive summary`, '', `Run: ${run?.runId ?? path.basename(outDir)}`, `Profile: ${run?.profile ?? 'coverage'}`, `Status: ${run?.status ?? 'NOT_EXECUTED'}`, `Routes: ${routes.length}`, `Registered capabilities: ${new Set(featureStates.map((state) => state.featureId)).size}`, `Required states: ${featureStates.length}`, `Uncovered state mappings: ${featureStates.filter((state) => state.status === 'UNCOVERED').length}`, `Findings: ${findings.length}`, `Uncovered routes: ${routes.filter((route) => route.coverageStatus === 'UNCOVERED').length}`, `Uncovered controls: ${controls.filter((control) => control.status === 'UNCOVERED').length}`, `Screenshots captured: ${screenshotRows.length}`, `Read-only Playwright tests passed: ${observedTestCount ?? 'NOT_EXECUTED'}`, `axe violations: ${axeViolationCount}`, `Responsive findings: ${responsiveFailures}`, '', 'Route discovery is not functional PASS.', ...[...checkStatusCounts].map(([status, count]) => `- Check ${status}: ${count}`), ...((run?.blocked ?? []).map((reason) => `- BLOCKED: ${reason}`))];
  const reports: Record<string, string[]> = {
    'EXECUTIVE-SUMMARY.md': summary,
    'FUNCTIONAL-REPORT.md': ['# Functional report', '', `Read-only Playwright passed: ${observedTestCount ?? 'NOT_EXECUTED'}`, '', ...routes.map((route) => `- ${route.coverageStatus}: ${route.path} — ${route.tests.join(', ') || 'no test registered'}`), '', '## Executed checks', ...(run?.checks ?? []).map((check) => `- ${check.status}: ${check.id} — ${check.reason}`)],
    'UX-VISUAL-REPORT.md': ['# UX and visual report', '', `Screenshots captured: ${screenshotRows.length}`, `Responsive findings: ${responsiveFailures}`, 'Missing visual baselines are NOT_EXECUTED and are never auto-approved.', ...findings.filter((finding) => ['visual', 'responsive', 'usability'].includes(finding.category)).map((finding) => `- ${finding.id} ${finding.status}: ${finding.route} — ${finding.actual}`)],
    'ACCESSIBILITY-REPORT.md': ['# Accessibility report', '', `Screens scanned: ${axeRuns.length}`, `Violations: ${axeViolationCount}`, 'Automated axe results do not certify full WCAG conformance.', ...findings.filter((finding) => finding.category === 'accessibility').map((finding) => `- ${finding.id} ${finding.severity}: ${finding.actual}`)],
    'PERFORMANCE-REPORT.md': ['# Performance report', '', ...(navigationPerformance ? [`Public navigation: p50=${navigationPerformance.p50Ms}ms, p95=${navigationPerformance.p95Ms}ms; threshold=${navigationPerformance.thresholdMs}ms; samples=${navigationPerformance.samples?.length ?? 0}.`] : ['Public navigation: NOT_EXECUTED.']), ...(apiPerformance ? (apiPerformance.summary ?? []).map((metric: { route: string; p50Ms: number; p95Ms: number; thresholdMs: number; samples: number }) => `${metric.route}: p50=${metric.p50Ms}ms, p95=${metric.p95Ms}ms; threshold=${metric.thresholdMs}ms; samples=${metric.samples}.`) : ['Authenticated/catalog performance: BLOCKED or NOT_EXECUTED.']), 'No result is extrapolated to production load.', ...findings.filter((finding) => finding.category === 'performance').map((finding) => `- ${finding.id}: ${finding.actual}`)],
  };
  for (const [filename, lines] of Object.entries(reports)) await writeFile(path.join(outDir, filename), lines.join('\n'));
  const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const rows = routes.map((route) => `<tr><td>${escape(route.coverageStatus)}</td><td>${escape(route.kind)}</td><td>${escape(route.path)}</td><td>${escape(route.methods.join(', '))}</td><td>${escape(route.source)}</td><td>${escape(route.tests.join(', ') || 'No test registered')}</td></tr>`).join('');
  await writeFile(path.join(outDir, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Lucem QA Lab report</title><style>body{font:15px system-ui;margin:2rem;color:#172033}table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd2dc;padding:.5rem;text-align:left}th{background:#edf1f7}</style><h1>Lucem QA Lab</h1><p>${escape(run?.status ?? 'NOT_EXECUTED')} · ${routes.length} routes · ${findings.length} findings</p><table><thead><tr><th>Status</th><th>Type</th><th>Route</th><th>Methods</th><th>Source</th><th>Tests</th></tr></thead><tbody>${rows}</tbody></table><h2>Findings</h2><pre>${escape(JSON.stringify(findings, null, 2))}</pre></html>`);
  await writeFile(path.join(outDir, 'metadata.json'), JSON.stringify({ runId: run?.runId ?? path.basename(outDir), generatedAt: new Date().toISOString(), revision: run?.metadata?.revision ?? 'unknown', profile: run?.profile ?? 'coverage', status: run?.status ?? 'NOT_EXECUTED', routeCount: routes.length, capabilityCount: new Set(featureStates.map((state) => state.featureId)).size, requiredStateCount: featureStates.length, findingCount: findings.length, blocked: run?.blocked ?? [] }, null, 2));
}
