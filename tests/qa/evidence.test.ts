import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import yauzl from 'yauzl';
import { exportSanitizedZip } from '../../scripts/qa/evidence';

const roots: string[] = [];
async function temp() { const root = await mkdtemp(path.join(os.tmpdir(), 'lucem-qa-evidence-')); roots.push(root); return root; }
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

async function readZip(file: string) {
  const bytes = await readFile(file);
  const zip = await yauzl.fromBufferPromise(bytes, { lazyEntries: true });
  const entries: Record<string, string> = {};
  return await new Promise<Record<string, string>>((resolve, reject) => {
    zip.on('error', reject);
    zip.on('end', () => resolve(entries));
    zip.on('entry', (entry) => zip.openReadStream(entry, (error, stream) => {
      if (error) { reject(error); return; }
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => { entries[entry.fileName] = Buffer.concat(chunks).toString('utf8'); zip.readEntry(); });
    }));
    zip.readEntry();
  });
}

describe('QA-01 shareable evidence packaging', () => {
  it('sanitizes text, excludes session/trace artifacts, includes screenshots and verifies ZIP checksums', async () => {
    const root = await temp(); const report = path.join(root, 'report'); const output = path.join(root, 'deliverables');
    await mkdir(path.join(report, 'screenshots', 'login'), { recursive: true });
    await mkdir(path.join(report, 'traces'), { recursive: true });
    await mkdir(path.join(report, 'playwright', '.auth'), { recursive: true });
    await writeFile(path.join(report, 'FINDINGS.json'), JSON.stringify({ error: 'password=pass-sample, user: qa-test@example.invalid' }));
    await writeFile(path.join(report, 'metadata.json'), JSON.stringify({ status: 'PASS' }));
    await writeFile(path.join(report, 'screenshots', 'login', 'desktop.png'), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    await writeFile(path.join(report, 'traces', 'failure.trace'), 'cookie: session-cookie-raw');
    await writeFile(path.join(report, 'playwright', '.auth', 'storageState.json'), '{"cookies":["session-cookie-raw"]}');
    const originalQaUrl = process.env.QA_DATABASE_URL; process.env.QA_DATABASE_URL = 'postgresql://lucem_qa:pass-sample@127.0.0.1:55433/lucem_qa';
    try {
      const result = await exportSanitizedZip(report, output);
      const entries = await readZip(result.zipPath);
      expect(entries['FINDINGS.json']).not.toContain('pass-sample');
      expect(entries['FINDINGS.json']).not.toContain('qa-test@example.invalid');
      expect(entries['screenshots/login/desktop.png']).toContain('PNG');
      expect(entries['traces/failure.trace']).toBeUndefined();
      expect(entries['playwright/.auth/storageState.json']).toBeUndefined();
      expect(entries['PACKAGE-MANIFEST.json']).toContain('failure.trace');
      expect(result.size).toBeGreaterThan(0);
      expect((await readFile(result.shaPath, 'utf8')).trim()).toContain(result.sha256);
    } finally {
      if (originalQaUrl === undefined) delete process.env.QA_DATABASE_URL; else process.env.QA_DATABASE_URL = originalQaUrl;
    }
  });
});
