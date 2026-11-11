#!/usr/bin/env node
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const cli = path.resolve(__dirname, 'lucem-audit.ts');
const tsx = path.resolve(__dirname, '../../node_modules/tsx/dist/cli.mjs');
const result = spawnSync(process.execPath, [tsx, cli, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(result.status ?? 1);
