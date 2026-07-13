#!/usr/bin/env node
// Thin launcher: runs the TS CLI via the workspace tsx (no build step needed).
// A compiled binary replaces this when we add ahead-of-time builds.
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..'); // packages/cli/bin -> repo root
const tsx = resolve(repoRoot, 'node_modules/.bin/tsx');
const entry = resolve(here, '../src/index.ts');

const child = spawn(tsx, [entry, ...process.argv.slice(2)], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
