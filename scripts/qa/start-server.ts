import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { qaChildEnv } from './database';
import { qaServerEnvironment } from './server-env';

async function main() {
  const env = await qaChildEnv();
  const port = env.QA_SERVER_PORT || '3113';
  const serverEnv = qaServerEnvironment(env);
  const reportsRoot = path.resolve('qa/reports');
  const reportDir = env.QA_REPORT_DIR ? path.resolve(env.QA_REPORT_DIR) : undefined;
  if (reportDir?.startsWith(`${reportsRoot}${path.sep}`)) {
    await mkdir(reportDir, { recursive: true, mode: 0o700 });
    await writeFile(path.join(reportDir, `QA-SERVER-ENVIRONMENT-${port}.json`), JSON.stringify({ host: '127.0.0.1', port, qaRun: serverEnv.QA_RUN === '1', runLockHeld: serverEnv.QA_LAB_RUN_LOCK_HELD === '1', syntheticCfClientHeaders: serverEnv.CLOUDFLARE_QUICK_TUNNEL_ENABLED === 'true', distDir: serverEnv.NEXT_DIST_DIR }, null, 2));
  }
  process.stdout.write(`QA server: loopback port ${port}; synthetic CF client headers ${serverEnv.CLOUDFLARE_QUICK_TUNNEL_ENABLED === 'true' ? 'enabled' : 'disabled'}.\n`);
  const child = spawn('npm', ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', port], { stdio: 'inherit', env: serverEnv });
  const forward = (signal: NodeJS.Signals) => child.kill(signal);
  process.on('SIGINT', () => forward('SIGINT'));
  process.on('SIGTERM', () => forward('SIGTERM'));
  child.on('exit', (code) => { process.exitCode = code ?? 1; });
}
main().catch((error) => { process.stderr.write(`BLOCKED: QA web server not started: ${error instanceof Error ? error.message : 'unknown error'}\n`); process.exitCode = 1; });
