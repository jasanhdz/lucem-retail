import { spawnSync } from 'node:child_process';
import { e2eChildEnv, requireE2eDatabaseUrl } from './database';
import { seedE2e } from './seed';

const env = e2eChildEnv();
requireE2eDatabaseUrl(env);
const migration = spawnSync('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit', env });
if (migration.status !== 0) { console.error('BLOCKED: E2E PostgreSQL unavailable (prisma migrate deploy failed).'); process.exit(migration.status ?? 1); }
seedE2e().catch(error => { console.error(error instanceof Error ? error.message : 'E2E preparation failed'); process.exitCode = 1; });
