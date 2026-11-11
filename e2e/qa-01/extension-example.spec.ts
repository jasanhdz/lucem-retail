import { test, expect } from '@playwright/test';

// Extension template only. It intentionally requires a separately guarded QA fixture before execution.
test('synthetic extension example reports its missing isolated fixture', async () => {
  test.skip(!process.env.QA_SYNTHETIC_FIXTURE_READY, 'BLOCKED: isolated lucem_qa fixture is not provisioned');
  expect(process.env.QA_SYNTHETIC_FIXTURE_READY).toBe('1');
});
