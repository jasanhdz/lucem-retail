#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const configPath = path.join(root, '.env.e2e');
const templatePath = path.join(root, '.env.e2e.example');
const requiredKeys = [
  'E2E_DB_ADMIN_PASSWORD', 'E2E_DB_PASSWORD', 'E2E_DATABASE_URL', 'E2E_DATABASE_USER',
  'E2E_ADMIN_PASSWORD', 'E2E_SELLER_PASSWORD', 'E2E_INVENTORY_PASSWORD', 'SESSION_SECRET',
];

function fail(message) {
  process.stderr.write(`E2E configuration blocked: ${message}\n`);
  process.exit(1);
}

function ensureIgnored() {
  const ignored = spawnSync('git', ['check-ignore', '-q', '.env.e2e'], { cwd: root });
  if (ignored.status !== 0) fail('.env.e2e must be excluded by Git before credentials are created.');
}

function parseAssignments(text) {
  const values = Object.create(null);
  for (const [index, rawLine] of text.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
    if (!match || Object.hasOwn(values, match[1])) fail(`invalid or duplicate entry at line ${index + 1}.`);
    values[match[1]] = match[2];
  }
  return values;
}

function validateValues(values) {
  if (Object.keys(values).length !== requiredKeys.length || requiredKeys.some((key) => !Object.hasOwn(values, key))) {
    fail('.env.e2e must contain exactly the documented E2E keys.');
  }
  const url = (() => {
    try { return new URL(values.E2E_DATABASE_URL); } catch { fail('E2E_DATABASE_URL is invalid.'); }
  })();
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['127.0.0.1', 'localhost', '::1'].includes(url.hostname) || url.port !== '55432' || decodeURIComponent(url.pathname.slice(1)) !== 'lucem_retail_e2e' || decodeURIComponent(url.username) !== 'lucem_e2e' || decodeURIComponent(url.password) !== values.E2E_DB_PASSWORD) {
    fail('E2E_DATABASE_URL must identify only loopback lucem_e2e/lucem_retail_e2e on port 55432.');
  }
  if (values.E2E_DATABASE_USER !== 'lucem_e2e') fail('E2E_DATABASE_USER must be lucem_e2e.');
  for (const key of requiredKeys.filter((entry) => entry !== 'E2E_DATABASE_URL' && entry !== 'E2E_DATABASE_USER')) {
    if (values[key].length < 32 || values[key].includes('<') || values[key].includes('generated-locally')) fail(`${key} is missing or weak.`);
  }
  if (!/^[a-f0-9]{64}$/.test(values.E2E_DB_ADMIN_PASSWORD) || !/^[a-f0-9]{64}$/.test(values.E2E_DB_PASSWORD)) fail('Database passwords must be generated 256-bit hexadecimal values.');
  return values;
}

function readConfig() {
  ensureIgnored();
  let stat;
  try { stat = fs.lstatSync(configPath); } catch { fail('missing .env.e2e; run npm run e2e:env:init first.'); }
  if (stat.isSymbolicLink() || !stat.isFile()) fail('.env.e2e must be a regular non-symlink file.');
  if (typeof process.getuid === 'function' && stat.uid !== process.getuid()) fail('.env.e2e must be owned by the current user.');
  if ((stat.mode & 0o777) !== 0o600) fail('.env.e2e permissions must be exactly 0600.');
  const values = validateValues(parseAssignments(fs.readFileSync(configPath, 'utf8')));
  if (process.env.QA_DATABASE_URL || process.env.QA_RUN === '1') fail('QA environment detected; E2E commands require the separate E2E environment.');
  if (process.env.DATABASE_URL && process.env.DATABASE_URL !== values.E2E_DATABASE_URL) fail('inherited DATABASE_URL differs from the isolated E2E target.');
  if (process.env.E2E_DATABASE_URL && process.env.E2E_DATABASE_URL !== values.E2E_DATABASE_URL) fail('inherited E2E_DATABASE_URL differs from protected .env.e2e.');
  return values;
}

function init() {
  ensureIgnored();
  const template = parseAssignments(fs.readFileSync(templatePath, 'utf8'));
  if (Object.keys(template).length !== requiredKeys.length || requiredKeys.some((key) => !Object.hasOwn(template, key))) fail('the versioned E2E template has an unexpected key set.');
  if (fs.existsSync(configPath)) {
    readConfig();
    process.stdout.write('Protected .env.e2e already exists and was preserved.\n');
    return;
  }
  const dbAdminPassword = crypto.randomBytes(32).toString('hex');
  const dbPassword = crypto.randomBytes(32).toString('hex');
  const values = {
    E2E_DB_ADMIN_PASSWORD: dbAdminPassword,
    E2E_DB_PASSWORD: dbPassword,
    E2E_DATABASE_URL: `postgresql://lucem_e2e:${dbPassword}@127.0.0.1:55432/lucem_retail_e2e?schema=public`,
    E2E_DATABASE_USER: 'lucem_e2e',
    E2E_ADMIN_PASSWORD: crypto.randomBytes(32).toString('hex'),
    E2E_SELLER_PASSWORD: crypto.randomBytes(32).toString('hex'),
    E2E_INVENTORY_PASSWORD: crypto.randomBytes(32).toString('hex'),
    SESSION_SECRET: crypto.randomBytes(48).toString('base64url'),
  };
  const content = `${requiredKeys.map((key) => `${key}=${values[key]}`).join('\n')}\n`;
  let descriptor;
  try {
    descriptor = fs.openSync(configPath, 'wx', 0o600);
    fs.writeFileSync(descriptor, content, { encoding: 'utf8' });
    fs.fchmodSync(descriptor, 0o600);
    fs.fsyncSync(descriptor);
  } catch (error) {
    if (error && error.code === 'EEXIST') {
      readConfig();
      process.stdout.write('Protected .env.e2e appeared concurrently and was preserved.\n');
      return;
    }
    throw error;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
  readConfig();
  process.stdout.write('Created protected .env.e2e (mode 0600); credentials were not displayed.\n');
}

function run(command, args) {
  const values = readConfig();
  const env = { ...process.env, ...values, DATABASE_URL: values.E2E_DATABASE_URL };
  delete env.QA_DATABASE_URL;
  delete env.QA_RUN;
  delete env.QA_LAB_RUN_LOCK_HELD;
  const rootArgs = { cwd: root, stdio: 'inherit', env };
  const verify = () => spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'scripts/e2e/verify.ts'], rootArgs);
  if (command === 'prepare' || command === 'cleanup' || command === 'verify' || command === 'diagnose-dashboard' || command === 'fingerprint') {
    const child = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', `scripts/e2e/${command}.ts`], rootArgs);
    process.exit(child.status ?? 1);
  }
  if (command === 'build:security') {
    const preflight = verify();
    if (preflight.status !== 0) process.exit(preflight.status ?? 1);
    env.NEXT_DIST_DIR = '.next-e2e-security';
    const child = spawnSync('npx', ['--no-install', 'next', 'build'], rootArgs);
    process.exit(child.status ?? 1);
  }
  if (command === 'playwright') {
    const preflight = verify();
    if (preflight.status !== 0) process.exit(preflight.status ?? 1);
    const child = spawnSync('npx', ['--no-install', 'playwright', 'test', ...args], rootArgs);
    process.exit(child.status ?? 1);
  }
  if (command === 'ordering:5') {
    const testName = 'sorts products by Decimal variant prices before paging and preserves the sequence in API and catalog UI';
    for (let iteration = 1; iteration <= 5; iteration += 1) {
      process.stdout.write(`\nE2E ordering run ${iteration}/5\n`);
      const preflight = verify();
      if (preflight.status !== 0) process.exit(preflight.status ?? 1);
      const child = spawnSync('npx', ['--no-install', 'playwright', 'test', '--config=playwright.products.config.ts', 'e2e/dev-03/products.spec.ts', '--project=chromium', '-g', testName], rootArgs);
      if (child.status !== 0) process.exit(child.status ?? 1);
    }
    process.stdout.write('\nAll five independent E2E ordering runs passed.\n');
    return;
  }
  fail('unsupported command; use prepare, cleanup, verify, build:security, playwright or ordering:5.');
}

const [mode, command, ...args] = process.argv.slice(2);
try {
  if (mode === 'init') init();
  else if (mode === 'check') {
    const values = readConfig();
    process.stdout.write(`E2E target validated: ${new URL(values.E2E_DATABASE_URL).hostname}:55432/lucem_retail_e2e as lucem_e2e; secret values hidden.\n`);
  } else if (mode === 'run') run(command, args);
  else fail('use init, check or run.');
} catch (error) {
  if (error && error.code === 'E2E_CONFIG_BLOCKED') fail(error.message);
  process.stderr.write(`E2E configuration blocked: ${error instanceof Error ? error.message : 'unexpected error'}\n`);
  process.exit(1);
}
