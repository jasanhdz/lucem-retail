import { URL } from 'node:url';

const NAME_MARKERS = ['_e2e', '_test', 'e2e', 'test'];
const FORBIDDEN = ['lucem_retail', 'production', 'prod', 'staging', 'shared'];

export function requireE2eDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.E2E_DATABASE_URL;
  if (!raw) throw new Error('E2E_DATABASE_URL is required; DATABASE_URL fallback is forbidden.');
  let parsed: URL;
  try { parsed = new URL(raw); } catch { throw new Error('E2E_DATABASE_URL is not a valid PostgreSQL URL.'); }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) throw new Error('E2E_DATABASE_URL must use PostgreSQL.');
  if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) throw new Error('E2E_DATABASE_URL host must be local/loopback.');
  const database = decodeURIComponent(parsed.pathname.slice(1)).toLowerCase();
  if (!database || !NAME_MARKERS.some(marker => database.endsWith(marker) || database.includes(`${marker}_`))) throw new Error('E2E_DATABASE_URL database name must clearly identify an E2E/test database.');
  if (FORBIDDEN.some(marker => ['production', 'prod', 'staging', 'shared'].includes(marker) ? database.includes(marker) : (database.includes(marker) && !database.endsWith('_e2e') && !database.endsWith('_test')))) throw new Error('E2E_DATABASE_URL points at a forbidden/shared database name.');
  if (parsed.port === '5432') throw new Error('E2E_DATABASE_URL must not use the shared PostgreSQL port 5432.');
  return raw;
}

export function e2eChildEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const url = requireE2eDatabaseUrl(env);
  return { ...env, E2E_DATABASE_URL: url, DATABASE_URL: url };
}

export function requirePasswords(env: NodeJS.ProcessEnv = process.env) {
  const values = {
    admin: env.E2E_ADMIN_PASSWORD,
    seller: env.E2E_SELLER_PASSWORD,
    inventory: env.E2E_INVENTORY_PASSWORD,
  };
  for (const [role, password] of Object.entries(values)) {
    if (!password || password.length < 12 || password === 'password' || password.includes('replace')) throw new Error(`E2E_${role.toUpperCase()}_PASSWORD is missing or weak.`);
  }
  return values as { admin: string; seller: string; inventory: string };
}
