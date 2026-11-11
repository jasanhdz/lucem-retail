import { afterEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import { productImageDirectory } from '../../src/lib/upload-storage';

describe('QA upload storage isolation', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('uses a dedicated ignored directory only under the explicit QA_RUN flag', () => {
    vi.stubEnv('QA_RUN', '1');
    expect(productImageDirectory()).toBe(path.resolve('.qa-uploads/products'));
  });
  it('preserves the existing product-upload location outside QA_RUN', () => {
    vi.stubEnv('QA_RUN', '0');
    expect(productImageDirectory()).toBe(path.join(process.cwd(), 'public', 'uploads', 'products'));
  });
});
