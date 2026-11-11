import { createHash } from 'node:crypto';
import { ZipArchive } from 'archiver';
import { createReadStream, createWriteStream } from 'node:fs';
import { chmod, copyFile, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { sanitize } from './core';

const excludedName = /(^|\/)(?:\.auth|storageState|\.env|\.staging|traces?)(\/|$)/i;
const excludedExt = /\.(?:trace|har|webm|dump|sql|db|sqlite|pem|key|p12|zip)$/i;
const textExt = /\.(?:json|md|html|txt|log|csv|xml|yaml|yml|svg)$/i;
async function listFiles(root: string, base = root): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(base, { withFileTypes: true })) {
    const file = path.join(base, entry.name);
    if (entry.isDirectory()) result.push(...await listFiles(root, file));
    else if (entry.isFile()) result.push(file);
  }
  return result;
}
async function digest(file: string) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
function knownSecrets() {
  return ['QA_DATABASE_URL', 'DATABASE_URL', 'E2E_DATABASE_URL', 'SESSION_SECRET', 'QA_SESSION_SECRET', 'QA_POSTGRES_PASSWORD', 'STAGING_DB_PASSWORD', 'E2E_ADMIN_PASSWORD', 'E2E_SELLER_PASSWORD', 'E2E_INVENTORY_PASSWORD']
    .map((name) => process.env[name]).filter((value): value is string => Boolean(value));
}

export async function exportSanitizedZip(runDir: string, outputRoot = path.join(process.cwd(), 'qa/reports')) {
  const absoluteRun = path.resolve(runDir); const absoluteOutput = path.resolve(outputRoot);
  if (absoluteRun === absoluteOutput || absoluteOutput.startsWith(`${absoluteRun}${path.sep}`)) throw new Error('Report source/output paths overlap; refusing package.');
  const runStat = await stat(absoluteRun);
  if (!runStat.isDirectory()) throw new Error('Evidence source is not a report directory.');
  await chmod(absoluteRun, 0o700);
  await mkdir(absoluteOutput, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '').replace('T', '-').replace('Z', '');
  const zipPath = path.join(absoluteOutput, `lucem-audit-${stamp}.zip`);
  const shaPath = `${zipPath}.sha256`;
  const temp = await mkdtemp(path.join(os.tmpdir(), 'lucem-qa-package-'));
  await chmod(temp, 0o700);
  const included: Array<{ path: string; size: number; sha256: string; sanitized: boolean }> = [];
  const omitted: Array<{ path: string; reason: string }> = [];
  try {
    for (const source of await listFiles(absoluteRun)) {
      const rel = path.relative(absoluteRun, source).split(path.sep).join('/');
      if (rel.split('/').some((part) => part === '..')) throw new Error('Unsafe artifact path encountered.');
      if (excludedName.test(rel) || excludedExt.test(rel)) { omitted.push({ path: rel, reason: 'sensitive/session/trace/binary-database artifact excluded' }); continue; }
      const target = path.join(temp, rel); await mkdir(path.dirname(target), { recursive: true });
      if (textExt.test(rel)) {
        const text = sanitize(await readFile(source, 'utf8'), knownSecrets());
        const secrets = knownSecrets();
        if (secrets.some((secret) => text.includes(secret))) throw new Error(`Sanitization failed for ${rel}`);
        await writeFile(target, text, { mode: 0o600 });
        included.push({ path: rel, size: Buffer.byteLength(text), sha256: createHash('sha256').update(text).digest('hex'), sanitized: true });
      } else {
        await copyFile(source, target);
        const info = await stat(target);
        included.push({ path: rel, size: info.size, sha256: await digest(target), sanitized: false });
      }
    }
    if (!included.some((entry) => entry.path === 'FINDINGS.json') || !included.some((entry) => entry.path === 'metadata.json')) throw new Error('Required report artifacts are missing; ZIP export aborted.');
    const manifest = { generatedAt: new Date().toISOString(), runId: path.basename(absoluteRun), included, omitted, note: 'Trace/HAR/storage-state and database artifacts are excluded. Binary screenshots contain only synthetic QA fixtures.' };
    await writeFile(path.join(temp, 'PACKAGE-MANIFEST.json'), JSON.stringify(manifest, null, 2), { mode: 0o600 });
    const destination = createWriteStream(zipPath, { mode: 0o600 });
    const archive = new ZipArchive({ zlib: { level: 9 } });
    const done = new Promise<void>((resolve, reject) => { destination.on('close', resolve); destination.on('error', reject); archive.on('error', reject); });
    archive.pipe(destination); archive.directory(temp, false); await archive.finalize(); await done;
    await chmod(zipPath, 0o600);
    const zipHash = await digest(zipPath);
    await writeFile(shaPath, `${zipHash}  ${path.basename(zipPath)}\n`, { mode: 0o600 });
    return { zipPath, shaPath, size: (await stat(zipPath)).size, sha256: zipHash, included: included.length + 1, omitted: omitted.length };
  } catch (error) {
    await rm(zipPath, { force: true }); await rm(shaPath, { force: true }); throw error;
  } finally { await rm(temp, { recursive: true, force: true }); }
}
