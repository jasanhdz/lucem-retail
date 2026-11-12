import { lstat, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

export async function clearQaUploadsForBusinesses(businessIds: string[], root = process.cwd(), env: Record<string, string | undefined> = process.env) {
  if (env.QA_RUN !== '1' || env.QA_LAB_RUN_LOCK_HELD !== '1') throw new Error('QA upload cleanup requires the serialized QA runner.');
  const owners = [...new Set(businessIds)];
  if (!owners.length) return;
  if (owners.some((id) => !/^[a-zA-Z0-9_-]{1,128}$/.test(id))) throw new Error('QA upload owner ID is invalid.');

  const qaRoot = path.resolve(root, '.qa-uploads');
  const uploads = path.resolve(qaRoot, 'products');
  if (path.dirname(uploads) !== qaRoot) throw new Error('Refusing QA upload cleanup: product storage escaped QA root.');
  let rootInfo;
  try { rootInfo = await lstat(qaRoot); } catch (error) {
    if (isMissing(error)) return;
    throw error;
  }
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) throw new Error('QA upload root must be a real directory.');
  let uploadInfo;
  try { uploadInfo = await lstat(uploads); } catch (error) {
    if (isMissing(error)) return;
    throw error;
  }
  if (uploadInfo.isSymbolicLink() || !uploadInfo.isDirectory()) throw new Error('QA product uploads must be a real directory.');

  const entries = await readdir(uploads, { withFileTypes: true });
  const ownedPaths = entries
    .filter((entry) => owners.some((id) => entry.name.startsWith(`${id}_`) || entry.name.startsWith(`.${id}_`)))
    .map((entry) => path.join(uploads, entry.name));
  for (const file of ownedPaths) {
    const info = await lstat(file);
    if (info.isSymbolicLink() || !info.isFile()) throw new Error('Refusing QA upload cleanup: an owned path is not a regular file.');
  }
  for (const file of ownedPaths) await rm(file);
  return { removed: ownedPaths.length };
}

function isMissing(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT');
}
