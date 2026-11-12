import { appendFile, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import type { RunResult } from './core';
import { sanitize } from './core';

async function latestRunDirectory() {
  const reports = path.resolve('qa/reports');
  let entries; try { entries = await readdir(reports, { withFileTypes: true }); } catch { return undefined; }
  const candidates = entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(reports, entry.name));
  const complete = [];
  for (const directory of candidates) try { const info = await stat(path.join(directory, 'RUN-RESULT.json')); complete.push({ directory, mtime: info.mtimeMs }); } catch { /* incomplete report */ }
  complete.sort((a, b) => a.mtime - b.mtime);
  return complete.at(-1)?.directory;
}

async function main() {
  const target = process.env.GITHUB_STEP_SUMMARY;
  if (!target) return;
  const directory = await latestRunDirectory();
  if (!directory) { await appendFile(target, '\n## Lucem QA Lab\nNo complete run report was produced.\n'); return; }
  const run = JSON.parse(await readFile(path.join(directory, 'RUN-RESULT.json'), 'utf8')) as RunResult;
  const count = (selector: (item: RunResult['checks'][number]) => boolean) => run.checks.filter(selector).length;
  const featureStateCounts = new Map<string, number>();
  for (const state of run.featureStates ?? []) featureStateCounts.set(state.status, (featureStateCounts.get(state.status) ?? 0) + 1);
  const screenshotManifest = JSON.parse(await readFile(path.join(directory, 'SCREENSHOT-MANIFEST.json'), 'utf8')) as { screenshots?: unknown[] };
  const secrets = ['QA_DATABASE_URL', 'DATABASE_URL', 'E2E_DATABASE_URL', 'SESSION_SECRET', 'QA_SESSION_SECRET', 'QA_POSTGRES_PASSWORD', 'E2E_ADMIN_PASSWORD', 'E2E_SELLER_PASSWORD', 'E2E_INVENTORY_PASSWORD'].map((key) => process.env[key]).filter((value): value is string => Boolean(value));
  const content = [
    '', '## Lucem QA Lab — sanitized run summary',
    `- Run: \`${run.runId}\` · profile: \`${run.profile}\` · status: **${run.status}**`,
    `- Routes: ${run.routes.length} · capabilities: ${new Set((run.featureStates ?? []).map((state) => state.featureId)).size} · required states: ${(run.featureStates ?? []).length}`,
    `- Playwright/runner checks: PASS ${count((check) => check.status === 'PASS')}, FAIL ${count((check) => check.status === 'FAIL')}, BLOCKED ${count((check) => check.status === 'BLOCKED')}, NOT_EXECUTED ${count((check) => check.status === 'NOT_EXECUTED')}`,
    `- Feature-state coverage: ${[...featureStateCounts].map(([status, total]) => `${status} ${total}`).join(', ') || 'none'}`,
    `- Screenshots: ${screenshotManifest.screenshots?.length ?? 0} · findings: ${run.findings.length}`,
    `- Report directory: \`${path.relative(process.cwd(), directory)}\``,
    '- Full evidence ZIP is uploaded as a separate workflow artifact; this summary contains no URLs, credentials, cookies, payloads, or finding text.',
    ...(run.blocked.length ? ['', '### Blockers', ...run.blocked.map((reason) => `- ${sanitize(reason, secrets)}`)] : []),
    '',
  ].join('\n');
  await appendFile(target, content);
}
main().catch(() => { if (process.env.GITHUB_STEP_SUMMARY) process.exitCode = 1; });
