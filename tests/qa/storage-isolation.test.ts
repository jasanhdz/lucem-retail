import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { productImageDirectory } from '../../src/lib/upload-storage';
import { clearQaUploadsForBusinesses } from '../../scripts/qa/storage';

describe('QA upload storage isolation', () => {
  const tempRoots: string[] = [];
  afterEach(async () => {
    vi.unstubAllEnvs();
    await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });
  it('uses a dedicated ignored directory only under the explicit QA_RUN flag', () => {
    vi.stubEnv('QA_RUN', '1');
    expect(productImageDirectory()).toBe(path.resolve('.qa-uploads/products'));
  });
  it('preserves the existing product-upload location outside QA_RUN', () => {
    vi.stubEnv('QA_RUN', '0');
    expect(productImageDirectory()).toBe(path.join(process.cwd(), 'public', 'uploads', 'products'));
  });

  it('clears only exact QA-owned business upload prefixes and preserves other tenants', async () => {
    const root = await mkdtemp(path.join(process.env.TMPDIR ?? '/tmp', 'lucem-qa-upload-cleanup-'));
    tempRoots.push(root);
    const uploads = path.join(root, '.qa-uploads', 'products');
    await mkdir(uploads, { recursive: true });
    await writeFile(path.join(uploads, 'qa-centro_123.png'), 'owned');
    await writeFile(path.join(uploads, '.qa-centro_temp.uploading'), 'owned temp');
    await writeFile(path.join(uploads, 'qa-other_456.png'), 'other owner');

    const result = await clearQaUploadsForBusinesses(['qa-centro'], root, { QA_RUN: '1', QA_LAB_RUN_LOCK_HELD: '1' });

    expect(result?.removed).toBe(2);
    expect(await readFile(path.join(uploads, 'qa-other_456.png'), 'utf8')).toBe('other owner');
  });

  it('fails closed on an owned symlink and refuses cleanup outside the serialized QA run', async () => {
    const root = await mkdtemp(path.join(process.env.TMPDIR ?? '/tmp', 'lucem-qa-upload-link-'));
    tempRoots.push(root);
    const uploads = path.join(root, '.qa-uploads', 'products');
    await mkdir(uploads, { recursive: true });
    const outside = path.join(root, 'outside.png');
    await writeFile(outside, 'preserved');
    await symlink(outside, path.join(uploads, 'qa-centro_escape.png'));

    await expect(clearQaUploadsForBusinesses(['qa-centro'], root, { QA_RUN: '1', QA_LAB_RUN_LOCK_HELD: '1' })).rejects.toThrow('not a regular file');
    await expect(clearQaUploadsForBusinesses(['qa-centro'], root, { QA_RUN: '1' })).rejects.toThrow('serialized QA runner');
    expect(await readFile(outside, 'utf8')).toBe('preserved');
  });
});
