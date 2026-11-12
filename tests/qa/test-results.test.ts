import { describe, expect, it } from 'vitest';
import { classifyTestFailure, compareIsolatedAndFullTests, parsePlaywrightResults } from '../../scripts/qa/test-results';

describe('QA Playwright result reporting', () => {
  it('keeps individual passed, failed and not-run cases with stable file/title IDs', () => {
    const output = [
      '  ✓  1 [chromium] › e2e/dev-03/products.spec.ts:8:5 › searches products @catalog (1.2s)',
      '  ✘  2 [chromium] › e2e/dev-03/products.spec.ts:19:5 › filters products @catalog (120ms)',
      '  -  3 [chromium] › e2e/dev-03/products.spec.ts:30:5 › archives product @mutation',
    ].join('\n');
    const first = parsePlaywrightResults(output, 'products-suite');
    const second = parsePlaywrightResults(output, 'products-suite');
    expect(first.map(({ id, status, file, title, durationMs }) => ({ id, status, file, title, durationMs }))).toEqual([
      { id: first[0].id, status: 'PASS', file: 'e2e/dev-03/products.spec.ts', title: 'searches products @catalog', durationMs: 1200 },
      { id: first[1].id, status: 'FAIL', file: 'e2e/dev-03/products.spec.ts', title: 'filters products @catalog', durationMs: 120 },
      { id: first[2].id, status: 'NOT_EXECUTED', file: 'e2e/dev-03/products.spec.ts', title: 'archives product @mutation', durationMs: undefined },
    ]);
    expect(second.map((result) => result.id)).toEqual(first.map((result) => result.id));
  });

  it('classifies only strong root-cause evidence and leaves generic assertion failures undetermined', () => {
    expect(classifyTestFailure('P2010: SQLSTATE 42601 syntax error at end of input', 'FAIL')).toBe('PRODUCT_DEFECT');
    expect(classifyTestFailure("Can't reach database server", 'BLOCKED')).toBe('ENVIRONMENT_FAILURE');
    expect(classifyTestFailure('Expected: 401\nReceived: 429; rate limit response', 'FAIL')).toBe('SUSPECTED');
    expect(classifyTestFailure('expect(locator).toBeVisible failed', 'FAIL')).toBe('UNDETERMINED');
    expect(classifyTestFailure('strict mode violation: getByLabel resolved to 2 elements', 'FAIL')).toBe('TEST_DEFECT');
    expect(classifyTestFailure('axe serious/critical violations in authenticated modules', 'FAIL')).toBe('PRODUCT_DEFECT');
    expect(classifyTestFailure('e2e/dev-sec-01/product-pagination.spec.ts Expected substring: "059" Received string: "fixture Product 048"', 'FAIL')).toBe('PRODUCT_DEFECT');
    expect(classifyTestFailure('e2e/dev-03/products.spec.ts editor integrado toBeFocused() failed Locator: getByRole button Nuevo producto', 'FAIL')).toBe('PRODUCT_DEFECT');
    expect(classifyTestFailure('authenticated workspace responsive overflow: controls offscreen and overlapping', 'FAIL')).toBe('PRODUCT_DEFECT');
    expect(classifyTestFailure('case was skipped', 'NOT_EXECUTED')).toBe('COVERAGE_GAP');
  });

  it('assigns evidence-backed test-defect classifications to parsed individual cases', () => {
    const result = parsePlaywrightResults([
      '  ✘  1 [qa-security-chromium] › e2e/security.spec.ts:74:5 › searches the POS catalog',
      '  1) [qa-security-chromium] › e2e/security.spec.ts:74:5 › searches the POS catalog',
      '     Error: locator.fill: Error: strict mode violation: getByLabel resolved to 2 elements',
    ].join('\n'), 'security-suite');
    expect(result[0]).toMatchObject({ status: 'FAIL', classification: 'TEST_DEFECT' });
  });

  it('compares same-ID isolated/full outcomes without conflating non-executed cases', () => {
    const isolated = parsePlaywrightResults([
      '  ✓  1 [chromium] › e2e/returns.spec.ts:8:1 › seeded return stays independent (2.0s)',
      '  ✘  2 [chromium] › e2e/pos.spec.ts:9:1 › checkout uses stock fixture (1.0s)',
      '  ✓  3 [chromium] › e2e/dashboard.spec.ts:10:1 › dashboard state waits (1.0s)',
    ].join('\n'), 'isolated');
    const full = parsePlaywrightResults([
      '  ✘  1 [chromium] › e2e/returns.spec.ts:8:1 › seeded return stays independent (2.0s)',
      '  ✘  2 [chromium] › e2e/pos.spec.ts:9:1 › checkout uses stock fixture (1.0s)',
      '  -  3 [chromium] › e2e/dashboard.spec.ts:10:1 › dashboard state waits',
    ].join('\n'), 'full');
    expect(compareIsolatedAndFullTests(full, isolated).map(({ relation, isolatedStatus, fullStatus }) => ({ relation, isolatedStatus, fullStatus }))).toEqual([
      { relation: 'FULL_ONLY_FAIL', isolatedStatus: 'PASS', fullStatus: 'FAIL' },
      { relation: 'SAME_STATUS', isolatedStatus: 'FAIL', fullStatus: 'FAIL' },
      { relation: 'NOT_COMPARABLE', isolatedStatus: 'PASS', fullStatus: 'NOT_EXECUTED' },
    ]);
  });
});
