import path from 'node:path';
import { chmodSync, lstatSync, mkdirSync } from 'node:fs';

export function qaPlaywrightOutputDir(suite: string, normalOutput: string) {
  let root = process.env.QA_PLAYWRIGHT_OUTPUT_DIR;
  if (!root && process.env.QA_RUN === '1') {
    const privateRoot = path.resolve('.qa-artifacts');
    mkdirSync(privateRoot, { recursive: true, mode: 0o700 });
    const info = lstatSync(privateRoot);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new Error('QA artifacts root must be a private real directory.');
    if ((info.mode & 0o777) !== 0o700) chmodSync(privateRoot, 0o700);
    root = path.join(privateRoot, process.env.QA_RUN_ID || `run-${process.pid}`, 'traces');
  }
  if (!root) return normalOutput;
  const resolvedRoot = path.resolve(root);
  const reportRoot = process.env.QA_REPORT_DIR ? path.resolve(process.env.QA_REPORT_DIR) : undefined;
  if (reportRoot && resolvedRoot !== path.join(reportRoot, 'traces')) throw new Error('QA Playwright output must stay under the current report trace directory.');
  if (process.env.QA_RUN === '1' && !reportRoot && !resolvedRoot.startsWith(`${path.resolve('.qa-artifacts')}${path.sep}`)) throw new Error('QA artifacts must remain under .qa-artifacts.');
  const output = path.resolve(resolvedRoot, suite);
  if (!output.startsWith(`${resolvedRoot}${path.sep}`)) throw new Error('QA Playwright output escaped its protected root.');
  return output;
}
