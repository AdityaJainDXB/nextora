// Shared helpers for the e2e scripts. Emulators only (project demo-nextora).
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = process.env.NEXTORA_ROOT || path.resolve(process.cwd(), '..');
export const BASE = process.env.E2E_BASE_URL || 'http://localhost:8082';
export const OUT = path.join(ROOT, 'e2e', 'shots') + '/';
fs.mkdirSync(OUT, { recursive: true });
export const loc = (code) => JSON.parse(fs.readFileSync(`${ROOT}/locales/${code}.json`, 'utf8'));
export const L = loc('en');
/** i18next shows the key when a string is missing; mirror that so selectors still work. */
export const tr = (key, lang = L) => key.split('.').reduce((o, p) => o?.[p], lang) ?? key;
export const P = 'demo-nextora';
export const AUTH = 'http://127.0.0.1:9099';
export const FSB = `http://127.0.0.1:8080/v1/projects/${P}/databases/(default)/documents`;
export const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
export const PW = 'correct-horse-9';

export function reporter() {
  const log = []; let pass = 0, fail = 0;
  const check = (n, ok, extra = '') => { ok ? pass++ : fail++; log.push(`${ok ? 'PASS' : 'FAIL'} ${n}${extra ? ` (${extra})` : ''}`); };
  const done = (errors) => {
    log.push(`page errors: ${errors.length ? errors.slice(0, 8).join(' | ') : 'none'}`);
    log.push(`TOTAL ${pass} passed, ${fail} failed`);
    console.log(log.join('\n'));
    process.exitCode = fail ? 1 : 0;
  };
  return { check, done, log };
}

export const clearAll = async () => {
  await fetch(`${AUTH}/emulator/v1/projects/${P}/accounts`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${P}/databases/(default)/documents`, { method: 'DELETE' });
};
export const users = async () => (await (await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${P}/accounts:query`, { method: 'POST', headers: OWNER, body: '{}' })).json()).userInfo ?? [];
export const getDocRaw = async (p) => { const r = await fetch(`${FSB}/${p}`, { headers: OWNER }); return r.status === 200 ? r.json() : null; };
export const list = async (p) => (await (await fetch(`${FSB}/${p}`, { headers: OWNER })).json()).documents ?? [];
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Creates an auth user through the emulator REST API and returns its uid. */
export async function createAuthUser(email, password) {
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const j = await r.json();
  if (!j.localId) throw new Error(`signUp failed: ${JSON.stringify(j)}`);
  return j.localId;
}
/** Owner write that bypasses rules (emulator only). */
export async function ownerSet(p, fields) {
  const r = await fetch(`${FSB}/${p}`, { method: 'PATCH', headers: OWNER, body: JSON.stringify({ fields }) });
  if (!r.ok) throw new Error(`ownerSet ${p}: ${r.status} ${await r.text()}`);
}

export function pageHelpers(pg) {
  return {
    go: async (p) => { await pg.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' }); await pg.waitForTimeout(2500); },
    btn: (name) => pg.getByRole('button', { name, exact: false }).first(),
    nav: (i) => pg.locator(`nav[aria-label="${L.a11y.mainNav}"] .nimbus-item`).nth(i),
    has: async (text) => (await pg.getByText(text, { exact: false }).count()) > 0,
  };
}

export function watchErrors(pg, name, errors) {
  pg.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  pg.on('console', (m) => { if (m.type() === 'error' && !/GL Driver|favicon/.test(m.text())) errors.push(`${name}: ${m.text().slice(0, 200)}`); });
}

/** Full sign-up through the UI. persona: 'family' | 'justArrived' | 'guide'. */
export async function signUpUI(pg, { name, persona = 'family', email, age = '35', extraLang = false, verify = true, family = 'kids' }) {
  const { go, btn } = pageHelpers(pg);
  await go('/');
  await pg.getByRole('radio', { name: /^English,/ }).click();
  await btn(L.lang.continue).click(); await pg.waitForTimeout(900);
  if (persona === 'guide') await btn(L.hero.help).click();
  else { await btn(L.hero.new).click(); await pg.waitForTimeout(600); await btn(L.persona[persona]).click(); }
  await pg.waitForTimeout(900);
  await pg.getByRole('textbox', { name: L.age.label }).fill(age);
  await btn(L.common.continue).click(); await pg.waitForTimeout(600);
  await pg.getByRole('textbox', { name: L.auth.email }).fill(email);
  await pg.getByRole('textbox', { name: L.auth.password }).fill(PW);
  await pg.getByRole('button', { name: L.auth.create, exact: true }).click(); await pg.waitForTimeout(3000);
  await pg.getByRole('textbox', { name: L.onb.nameLabel }).fill(name);
  await btn(L.common.next).click(); await pg.waitForTimeout(400);
  await pg.getByRole('checkbox', { name: new RegExp(`^${L.interests.food},`) }).click();
  await btn(L.common.next).click(); await pg.waitForTimeout(400);
  await pg.getByRole('checkbox', { name: new RegExp(`^${L.family[family]},`) }).click();
  await btn(L.common.next).click(); await pg.waitForTimeout(400);
  if (extraLang) await pg.getByRole('checkbox', { name: /^हिन्दी,/ }).click();
  await btn(L.onb.finish).click(); await pg.waitForTimeout(3000);
  if (verify) await verifyEmail(pg, email);
}
export async function verifyEmail(pg, email) {
  const codes = (await (await fetch(`${AUTH}/emulator/v1/projects/${P}/oobCodes`)).json()).oobCodes;
  await fetch(codes.filter((c) => c.email === email && c.requestType === 'VERIFY_EMAIL').pop().oobLink);
  await pageHelpers(pg).btn(L.verify.done).click(); await pg.waitForTimeout(2500);
}
/** V7 deletion: open the sheet, type the password, confirm. */
export async function deleteAccountUI(pg, password = PW) {
  const { go, btn } = pageHelpers(pg);
  await go('/me');
  await btn(L.account.delete).click(); await pg.waitForTimeout(600);
  await pg.locator('input[type="password"]').last().fill(password);
  await pg.getByRole('button', { name: L.account.deleteConfirm, exact: true }).last().click(); await pg.waitForTimeout(6000);
}
/** Polls an async predicate until true or timeout; returns the last value. */
export async function until(fn, ms = 15000) {
  const t = Date.now(); let v = false;
  while (Date.now() - t < ms) { v = await fn(); if (v) return v; await sleep(500); }
  return v;
}
