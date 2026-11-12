import { createHash } from 'node:crypto';
import type { FindingClassification, PlaywrightTestResult, TestRunComparison } from './core';
import type { CoverageStatus } from '../../qa/features/registry';

export function classifyTestFailure(output: string, status: CoverageStatus): FindingClassification | undefined {
  if (status === 'PASS') return undefined;
  if (status === 'BLOCKED') return 'ENVIRONMENT_FAILURE';
  if (status === 'NOT_EXECUTED' || status === 'UNCOVERED' || status === 'NOT_IMPLEMENTED') return 'COVERAGE_GAP';
  if (/axe (?:serious|critical)\/?(?:serious|critical)? violations|serious\/critical violations/i.test(output)) return 'PRODUCT_DEFECT';
  if (/product-pagination\.spec\.ts[\s\S]*Expected substring:.*059[\s\S]*Received string:.*Product 048/i.test(output)
    || /e2e\/dev-03\/products\.spec\.ts[\s\S]*editor integrado[\s\S]*toBeFocused\(\) failed[\s\S]*Nuevo producto/i.test(output)
    || /authenticated workspace responsive overflow/i.test(output)) return 'PRODUCT_DEFECT';
  if (/strict mode violation:.*resolved to \d+ elements/i.test(output)
    || /toBeFocused\(\) failed[\s\S]{0,500}disabled type="button"/i.test(output)
    || /Crea tu primer negocio[\s\S]{0,300}element\(s\) not found/i.test(output)
    || /getByText\('3', \{ exact: true \}\)[\s\S]{0,300}element\(s\) not found/i.test(output)
    || /getByRole\('textbox', \{ name: 'Buscar en catálogo' \}\)[\s\S]{0,300}(?:Timeout|element\(s\) not found)/i.test(output)
    || /waitUntil: "networkidle"[\s\S]{0,300}Timeout/i.test(output)) return 'TEST_DEFECT';
  if (/\b42601\b|\bP2010\b|syntax error at end of input/i.test(output)) return 'PRODUCT_DEFECT';
  if (/Can't reach database server|ECONNREFUSED|Executable doesn't exist|browserType\.launch.*executable|No production build/i.test(output)) return 'ENVIRONMENT_FAILURE';
  if (/Expected:\s*\d+[\s\S]{0,300}Received:\s*\d+/i.test(output) && /rate.?limit|retry-after|throttl|quota|429/i.test(output)) return 'SUSPECTED';
  return 'UNDETERMINED';
}

export function classifyCommandFailure(output: string, status: CoverageStatus, tests: PlaywrightTestResult[]): FindingClassification | undefined {
  if (status === 'PASS') return undefined;
  if (status === 'BLOCKED') return 'ENVIRONMENT_FAILURE';
  if (/\b42601\b|\bP2010\b|syntax error at end of input/i.test(output)) return 'PRODUCT_DEFECT';
  if (/Can't reach database server|ECONNREFUSED|Executable doesn't exist|browserType\.launch.*executable|No production build/i.test(output)) return 'ENVIRONMENT_FAILURE';
  const classifications = [...new Set(tests.filter((test) => test.status === 'FAIL').map((test) => test.classification).filter((value): value is FindingClassification => Boolean(value)))];
  return classifications.length === 1 ? classifications[0] : status === 'NOT_EXECUTED' ? 'COVERAGE_GAP' : 'UNDETERMINED';
}

function failedCaseDetails(output: string, project: string, file: string, line?: number) {
  if (line === undefined) return undefined;
  const lines = output.split(/\r?\n/);
  const start = lines.findIndex((text) => {
    const match = /^\s*\d+\)\s+\[([^\]]+)\]\s+›\s+(.+?):(\d+)(?::\d+)?\s+›/.exec(text);
    return match?.[1] === project && match[2] === file && Number(match[3]) === line;
  });
  if (start < 0) return undefined;
  let end = start + 1;
  while (end < lines.length && !/^\s*\d+\)\s+\[/.test(lines[end])) end += 1;
  return lines.slice(start, end).join('\n').slice(0, 5000);
}

export function parsePlaywrightResults(output: string, suite: string): PlaywrightTestResult[] {
  const results: PlaywrightTestResult[] = [];
  const linePattern = /^\s*([✓✔✘×-])\s+\d+\s+\[([^\]]+)\]\s+›\s+(.+)$/;
  for (const line of output.split(/\r?\n/)) {
    const match = linePattern.exec(line);
    if (!match) continue;
    const separator = match[3].indexOf(' › ');
    if (separator < 1) continue;
    const location = match[3].slice(0, separator).trim();
    const file = location.replace(/:\d+(?::\d+)?$/, '');
    const sourceLine = /:(\d+)(?::\d+)?$/.exec(location);
    const lineNumber = sourceLine ? Number(sourceLine[1]) : undefined;
    let title = match[3].slice(separator + 3).trim();
    let durationMs: number | undefined;
    const duration = /\s+\((\d+(?:\.\d+)?)(ms|s|m)\)$/.exec(title);
    if (duration) {
      const value = Number(duration[1]);
      durationMs = Math.round(duration[2] === 'm' ? value * 60_000 : duration[2] === 's' ? value * 1000 : value);
      title = title.slice(0, duration.index).trim();
    }
    const status: PlaywrightTestResult['status'] = ['✓', '✔'].includes(match[1]) ? 'PASS' : ['✘', '×'].includes(match[1]) ? 'FAIL' : 'NOT_EXECUTED';
    const identity = `${file}|${match[2]}|${title}`;
    const id = `PW-${createHash('sha256').update(identity).digest('hex').slice(0, 16)}`;
    const reason = status === 'PASS' ? 'Playwright case passed.' : status === 'NOT_EXECUTED' ? 'Playwright did not run this selected case.' : failedCaseDetails(output, match[2], file, lineNumber) ?? 'Playwright case failed; consult the sanitized suite log for assertion evidence.';
    results.push({
      id, title, suite, file, line: lineNumber, project: match[2], status, durationMs,
      classification: status === 'PASS' ? undefined : classifyTestFailure(`${file} ${title}\n${reason}`, status),
      reason,
      evidence: [`${suite}.log`],
    });
  }
  return results;
}

export function compareIsolatedAndFullTests(full: PlaywrightTestResult[], isolated: PlaywrightTestResult[]): TestRunComparison[] {
  const isolatedById = new Map(isolated.map((result) => [result.id, result]));
  return full.flatMap((result) => {
    const prior = isolatedById.get(result.id);
    if (!prior) return [];
    const relation: TestRunComparison['relation'] = prior.status === result.status ? 'SAME_STATUS' : prior.status === 'NOT_EXECUTED' || result.status === 'NOT_EXECUTED' ? 'NOT_COMPARABLE' : prior.status === 'FAIL' ? 'ISOLATED_ONLY_FAIL' : 'FULL_ONLY_FAIL';
    const classification: FindingClassification | undefined = relation === 'SAME_STATUS' ? undefined : relation === 'NOT_COMPARABLE' ? 'COVERAGE_GAP' : 'SUSPECTED';
    return [{ id: result.id, title: result.title, file: result.file, isolatedSuite: prior.suite, isolatedStatus: prior.status, fullSuite: result.suite, fullStatus: result.status, relation, classification }];
  });
}
