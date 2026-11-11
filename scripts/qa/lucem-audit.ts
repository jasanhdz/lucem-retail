#!/usr/bin/env node
import path from 'node:path';
import { discoverRoutes, validateFeatures, writeReports } from './core.js';

const args = process.argv.slice(2);
const help = `lucem-audit — isolated QA inventory and runner\n\nUsage: lucem-audit [--help] [--coverage|--functional|--visual|--accessibility|--performance] [--module NAME] [--changed] [--package] [--full]\n\n--coverage       Discover routes and report functional coverage\n--functional     Select declared functional scenarios\n--visual         Select visual checks\n--accessibility  Select axe checks\n--performance    Select bounded performance checks\n--module NAME   Filter by feature area\n--changed        Restrict to changed route sources (requires git)\n--package       Export sanitized evidence (requires explicit artifact input)\n--full           Full profile; unimplemented modes remain explicit\n`;
async function main() {
if (args.includes('--help') || args.length === 0) { process.stdout.write(help); process.exit(args.length ? 0 : 2); }
const known = new Set(['--coverage','--functional','--visual','--accessibility','--performance','--module','--changed','--package','--full']);
for (const arg of args) if (arg.startsWith('--') && !known.has(arg)) { process.stderr.write(`Unknown option: ${arg}\n`); process.exit(2); }
if (args.includes('--module') && !args[args.indexOf('--module') + 1]) { process.stderr.write('--module requires a name\n'); process.exit(2); }
const selectedModes = args.filter(a => ['--functional','--visual','--accessibility','--performance','--package'].includes(a));
if (selectedModes.length) process.stderr.write(`NOT_IMPLEMENTED: ${selectedModes.join(', ')} execution is not configured; no browser, server, or database was started.\n`);
const routes = await discoverRoutes(); const errors = validateFeatures(routes);
if (errors.length) { process.stderr.write(`${errors.join('\n')}\n`); process.exitCode = 1; }
const moduleName = args.includes('--module') ? args[args.indexOf('--module') + 1] : undefined;
const filtered = moduleName ? routes.filter(r => r.path.includes(moduleName)) : routes;
const output = path.resolve('test-results/qa-01');
await writeReports(output, filtered);
process.stdout.write(`Discovered ${filtered.length} routes. Coverage gaps: ${filtered.filter(r => r.coverageStatus === 'UNCOVERED').length}. Reports: ${output}\n`);
if (selectedModes.length || filtered.some(r => r.coverageStatus === 'UNCOVERED')) process.exitCode = 1;
}
main().catch(error => { process.stderr.write(`QA audit failed: ${error instanceof Error ? error.message : 'unknown error'}\n`); process.exitCode = 1; });
