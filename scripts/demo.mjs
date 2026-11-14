// One command for the demo: emulators -> wait until ready -> seed -> Metro (Expo Go, LAN).
// Ctrl+C stops everything, so the app is never left pointing at a dead backend.
import { spawn } from 'node:child_process';
const kids = [];
const run = (cmd, args, env = {}) => { const p = spawn(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } }); kids.push(p); return p; };
const stop = () => { for (const k of kids) k.kill('SIGINT'); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
const up = async () => { try { await fetch('http://127.0.0.1:9099/'); await fetch('http://127.0.0.1:8080/'); return true; } catch { return false; } };

import { existsSync } from 'node:fs';
// Keep accounts between runs, so phones with a saved sign-in still work after a restart.
const keep = existsSync('.emulator-data/firebase-export-metadata.json') ? ['--import', './.emulator-data'] : [];
if (!(await up())) run('npx', ['firebase', 'emulators:start', '--project', 'demo-nextora', '--only', 'auth,firestore', ...keep, '--export-on-exit', './.emulator-data']);
for (let i = 0; i < 90 && !(await up()); i++) await new Promise((r) => setTimeout(r, 1000));
if (!(await up())) { console.error('Emulators did not start. Is Java installed? See docs/SETUP.md.'); stop(); }
await new Promise((res, rej) => run('npx', ['tsx', 'scripts/seedDemo.ts']).on('exit', (c) => (c === 0 ? res() : rej(new Error('seed failed')))));
run('npx', ['expo', 'start', '--go', '--lan', '--port', '8085', '--clear'], { APP_ENV: 'demo' });
