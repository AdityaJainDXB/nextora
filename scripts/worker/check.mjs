#!/usr/bin/env node
// Smoke check for the deployed Worker. Optional env NEXTORA_TEST_ID_TOKEN (a Firebase ID token).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let url = process.env.NEXTORA_WORKER_URL;
if (!url) {
  try { url = JSON.parse(readFileSync(join(ROOT, 'config', 'worker.json'), 'utf8')).url; }
  catch { console.error('FAIL: config/worker.json missing; run setup first.'); process.exit(1); }
}
url = url.replace(/\/$/, '');
let failed = false;
const report = (ok, name, detail) => { if (!ok) failed = true; console.log(`${ok ? 'PASS' : 'FAIL'} ${name} (${detail})`); };
const body = JSON.stringify({ question: 'How do I pay my DEWA bill?', lang: 'en' });

const r1 = await fetch(`${url}/ask`, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
report(r1.status === 401, 'unauthenticated /ask -> 401', `got ${r1.status}`);

const token = process.env.NEXTORA_TEST_ID_TOKEN;
if (token) {
  const r2 = await fetch(`${url}/ask`, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body });
  report(r2.status === 200, 'authenticated /ask -> 200', `got ${r2.status}, model ${r2.headers.get('x-model') ?? '-'}`);
} else {
  console.log('SKIP authenticated /ask (set NEXTORA_TEST_ID_TOKEN to run)');
}
process.exit(failed ? 1 : 0);
