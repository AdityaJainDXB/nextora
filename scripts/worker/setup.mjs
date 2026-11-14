#!/usr/bin/env node
// NEXTORA AI Worker setup. No dependencies. The Gemini key is read with hidden
// input, kept only in memory, piped to `wrangler secret put` via stdin, and never
// echoed, logged or written to disk.
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WORKER = join(ROOT, 'worker');
const TOML = join(WORKER, 'wrangler.toml');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const die = (msg) => { console.error(`\n[setup] ${msg}`); process.exit(1); };
const run = (args, opts = {}) => spawnSync(npx, ['wrangler', ...args], { cwd: WORKER, encoding: 'utf8', ...opts });

function hiddenPrompt(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) die('Run this in an interactive terminal (hidden key input needs a TTY).');
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let buf = '';
    const onData = (ch) => {
      for (const c of ch) {
        if (c === '\r' || c === '\n') {
          stdin.setRawMode(false); stdin.pause(); stdin.off('data', onData);
          process.stdout.write('\n');
          return resolve(buf.trim());
        }
        if (c === '\u0003') { process.stdout.write('\n'); process.exit(130); }
        if (c === '\u007f' || c === '\b') buf = buf.slice(0, -1);
        else buf += c;
      }
    };
    stdin.on('data', onData);
  });
}

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((r) => rl.question(q, (a) => { rl.close(); r(a.trim()); }));
}

// ---- 1. wrangler login
let who = run(['whoami']);
if (who.status !== 0 || /not authenticated|You are not logged in/i.test(who.stdout + who.stderr)) {
  console.log('[setup] Not logged in to Cloudflare; opening `wrangler login`...');
  const l = spawnSync(npx, ['wrangler', 'login'], { cwd: WORKER, stdio: 'inherit' });
  if (l.status !== 0) die('wrangler login failed.');
  who = run(['whoami']);
  if (who.status !== 0) die('Still not logged in.');
}
console.log('[setup] Cloudflare login OK.');

// ---- 2. key (hidden)
let key = await hiddenPrompt('Paste your Gemini API key (input hidden): ');
if (!key) die('No key entered.');

// ---- 3. models.list (key in memory only, sent as header)
async function listModels() {
  const out = [];
  let pageToken = '';
  do {
    const u = `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const res = await fetch(u, { headers: { 'x-goog-api-key': key } });
    if (!res.ok) throw new Error(`models.list HTTP ${res.status}`);
    const j = await res.json();
    out.push(...(j.models ?? []));
    pageToken = j.nextPageToken ?? '';
  } while (pageToken);
  return out;
}
let models;
try { models = await listModels(); } catch (e) { key = ''; die(`Gemini models.list failed (${e.message}). Check the key/network; nothing was changed.`); }

const EXCLUDE = /(image|tts|embedding|live|native-audio|thinking|exp|learnlm|gemma|aqa|robotics|computer-use)/i;
const usable = models
  .filter((m) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
  .map((m) => String(m.name).replace(/^models\//, ''))
  .filter((n) => /^gemini-/.test(n) && /flash/.test(n) && !EXCLUDE.test(n));
const ver = (n) => parseFloat((/gemini-(\d+(?:\.\d+)?)/.exec(n) ?? [])[1] ?? '0');
const score = (n) => ver(n) * 100 - (/preview/.test(n) ? 5 : 0) - (/-\d{3}$|-\d{2}-\d{4}$/.test(n) ? 1 : 0);
const sortNewest = (a) => [...new Set(a)].sort((x, y) => score(y) - score(x));
const flash = sortNewest(usable.filter((n) => !/lite/.test(n)));
const lite = sortNewest(usable.filter((n) => /lite/.test(n)));
const textModels = [...flash.slice(0, 2), ...lite.slice(0, 1)];
// models.list does not report input modalities; Gemini flash models (>=1.5) accept audio input.
const audioModels = [...flash.filter((n) => ver(n) >= 1.5).slice(0, 2), ...lite.filter((n) => ver(n) >= 2).slice(0, 1)];
if (!textModels.length || !audioModels.length) die('Could not find suitable flash models in models.list.');

console.log(`\nGEMINI_MODELS       = ${textModels.join(',')}`);
console.log(`GEMINI_AUDIO_MODELS = ${audioModels.join(',')}`);
if (!/^y(es)?$/i.test(await ask('Use these models? [y/N] '))) { key = ''; die('Aborted by user; nothing changed.'); }

// ---- 4. secret via stdin
const sec = run(['secret', 'put', 'GEMINI_API_KEY'], { input: key + '\n', stdio: ['pipe', 'pipe', 'pipe'] });
key = '';
if (sec.status !== 0) die('wrangler secret put failed (output suppressed for safety). Try `npx wrangler secret put GEMINI_API_KEY` in worker/.');
console.log('[setup] Secret GEMINI_API_KEY stored in Cloudflare.');

// ---- 5. write vars
let toml = readFileSync(TOML, 'utf8');
toml = toml.replace(/^GEMINI_MODELS\s*=.*$/m, `GEMINI_MODELS = "${textModels.join(',')}"`)
  .replace(/^GEMINI_AUDIO_MODELS\s*=.*$/m, `GEMINI_AUDIO_MODELS = "${audioModels.join(',')}"`);
writeFileSync(TOML, toml);
console.log('[setup] Updated worker/wrangler.toml vars.');

// ---- 6. deploy
const dep = await new Promise((resolve) => {
  const p = spawn(npx, ['wrangler', 'deploy'], { cwd: WORKER, stdio: ['inherit', 'pipe', 'inherit'] });
  let out = '';
  p.stdout.on('data', (d) => { out += d; process.stdout.write(d); });
  p.on('close', (code) => resolve({ code, out }));
});
if (dep.code !== 0) die('wrangler deploy failed.');
const url = (/https:\/\/[a-z0-9.-]+\.workers\.dev/i.exec(dep.out) ?? [])[0];
if (!url) die('Deployed, but could not find the workers.dev URL in output. Add it to config/worker.json manually.');

// ---- 7. public URL only
mkdirSync(join(ROOT, 'config'), { recursive: true });
writeFileSync(join(ROOT, 'config', 'worker.json'), JSON.stringify({ url }, null, 2) + '\n');
console.log(`\n[setup] Done. Worker URL written to config/worker.json: ${url}`);
console.log('[setup] Restart Expo and reload the app to pick up the Worker URL.');
console.log('[setup] Run `node scripts/worker/check.mjs` to verify.');
