'use strict';

const fs = require('node:fs');
const path = require('node:path');

const QA_KEYS = new Set([
  'QA_DATABASE_URL',
  'QA_POSTGRES_PASSWORD',
  'E2E_ADMIN_PASSWORD',
  'E2E_SELLER_PASSWORD',
  'E2E_INVENTORY_PASSWORD',
]);
const DISCARDED_DATABASE_KEYS = new Set(['DATABASE_URL', 'E2E_DATABASE_URL', 'E2E_DATABASE_USER']);

function loadAuthorizedQaEnv(checkoutRoot, currentEnv = process.env) {
  const root = fs.realpathSync(checkoutRoot);
  const privateDir = path.join(root, '.qa-private');
  const envPath = path.join(privateDir, 'runtime.env');
  const uid = typeof process.getuid === 'function' ? process.getuid() : undefined;
  const directory = fs.lstatSync(privateDir);
  const file = fs.lstatSync(envPath);
  if (directory.isSymbolicLink() || !directory.isDirectory() || file.isSymbolicLink() || !file.isFile()) {
    throw new Error('Authorized QA runtime path must be a real directory containing a regular file.');
  }
  if ((directory.mode & 0o777) !== 0o700 || (file.mode & 0o777) !== 0o600) {
    throw new Error('Authorized QA runtime permissions must be directory 0700 and file 0600.');
  }
  if (uid !== undefined && (directory.uid !== uid || file.uid !== uid)) {
    throw new Error('Authorized QA runtime must be owned by the current user.');
  }

  const values = new Map();
  const contents = fs.readFileSync(envPath, 'utf8');
  for (const [index, rawLine] of contents.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) throw new Error(`Invalid QA runtime entry on line ${index + 1}.`);
    const [, key, value] = match;
    if (!QA_KEYS.has(key) && !DISCARDED_DATABASE_KEYS.has(key)) throw new Error(`Unsupported key in authorized QA runtime on line ${index + 1}.`);
    if (values.has(key)) throw new Error(`Duplicate key in authorized QA runtime on line ${index + 1}.`);
    if (!value || value.trim() !== value || /[\r\n\0]/.test(value)) throw new Error(`Invalid value format in authorized QA runtime on line ${index + 1}.`);
    values.set(key, value);
  }

  const loaded = {};
  for (const key of QA_KEYS) {
    if (currentEnv[key] !== undefined) loaded[key] = currentEnv[key];
    else if (values.has(key)) loaded[key] = values.get(key);
  }
  if (!loaded.QA_DATABASE_URL) throw new Error('QA_DATABASE_URL is unavailable in the explicit environment and authorized QA runtime.');
  return { ...currentEnv, ...loaded };
}

module.exports = { loadAuthorizedQaEnv };
