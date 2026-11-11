import { spawn } from 'node:child_process';
import { qaChildEnv } from './database';

async function main() {
  const env = await qaChildEnv();
  const port = env.QA_SERVER_PORT || '3113';
  const child = spawn('npm', ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', port], { stdio: 'inherit', env: { ...env, NEXT_DIST_DIR: '.next-qa' } });
  const forward = (signal: NodeJS.Signals) => child.kill(signal);
  process.on('SIGINT', () => forward('SIGINT'));
  process.on('SIGTERM', () => forward('SIGTERM'));
  child.on('exit', (code) => { process.exitCode = code ?? 1; });
}
main().catch((error) => { process.stderr.write(`BLOCKED: QA web server not started: ${error instanceof Error ? error.message : 'unknown error'}\n`); process.exitCode = 1; });
