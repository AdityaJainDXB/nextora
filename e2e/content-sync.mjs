// Appverse content seeded through the real V7 seed script (a moderator account
// signed in with the normal SDK, obeying the rules), filters, review badges, live
// content updates, and checklist progress sync between two "devices".
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { ROOT, L, OUT, FSB, OWNER, PW, reporter, clearAll, users, sleep, until, createAuthUser, ownerSet, pageHelpers, signUpUI, watchErrors } from './lib.mjs';

const { check, done } = reporter();
await clearAll();

// Moderator account in the emulator: auth user + roles/{uid} written with owner access.
const modEmail = `mod.${Date.now()}@example.com`, modPw = 'mod-password-9';
const modUid = await createAuthUser(modEmail, modPw);
await ownerSet(`roles/${modUid}`, { role: { stringValue: 'moderator' } });
let seedOut = '';
try {
  seedOut = execSync('npx tsx scripts/seedContent.ts --env local --fixture tests/fixtures/apps.fixture.json', {
    cwd: ROOT, env: { ...process.env, NEXTORA_MOD_EMAIL: modEmail, NEXTORA_MOD_PASSWORD: modPw }, stdio: 'pipe', timeout: 60000,
  }).toString();
  check('seed script loads the fixture as a moderator', /Loaded \d+ app entries/.test(seedOut), seedOut.trim());
} catch (e) {
  check('seed script loads the fixture as a moderator', false, `${e.stdout ?? ''}${e.stderr ?? ''}`.trim().slice(0, 300));
}
const seeded = (await (await fetch(`${FSB}/content/apps/items`, { headers: OWNER })).json()).documents ?? [];
check('fixture entries stored in content/apps/items', seeded.length >= 2, `${seeded.length} docs`);

// A non-moderator cannot seed.
const plainEmail = `plain.${Date.now()}@example.com`;
await createAuthUser(plainEmail, modPw);
try {
  execSync('npx tsx scripts/seedContent.ts --env local --fixture tests/fixtures/apps.fixture.json', {
    cwd: ROOT, env: { ...process.env, NEXTORA_MOD_EMAIL: plainEmail, NEXTORA_MOD_PASSWORD: modPw }, stdio: 'pipe', timeout: 60000,
  });
  check('seed script refuses a non-moderator', false, 'exited 0');
} catch (e) { check('seed script refuses a non-moderator', /not a moderator/.test(`${e.stdout}${e.stderr}`)); }

const browser = await chromium.launch();
const errors = [];
async function device(name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pg = await ctx.newPage();
  watchErrors(pg, name, errors);
  return pg;
}
const checked = async (l) => (await l.getAttribute('aria-checked')) === 'true';
const email = `fam.${Date.now()}@example.com`;

try {
  const A = await device('A');
  const a = pageHelpers(A);
  await signUpUI(A, { name: 'Rina', email, age: '40', verify: false });

  // ---- Appverse from Firestore ----
  await a.nav(1).click(); await A.waitForTimeout(2000);
  check('AI mode shows the entry suggested for families', await a.has('Example Transit (test fixture)'));
  check('AI mode hides the entry not suggested for families', !(await a.has('Example Gov Service (test fixture)')));
  await A.getByRole('button', { name: L.appv.all, exact: true }).last().click(); await A.waitForTimeout(800);
  check('Browse all shows both entries', await a.has('Example Gov Service (test fixture)'));
  await A.getByRole('checkbox', { name: new RegExp(`^${L.emirates.sharjah},`) }).click(); await A.waitForTimeout(600);
  check('Sharjah filter hides a Dubai-only entry', !(await a.has('Example Transit (test fixture)')));
  check('Sharjah filter keeps an all-emirates entry', await a.has('Example Gov Service (test fixture)'));
  await A.screenshot({ path: `${OUT}content-appverse.png` });
  await a.btn('Example Gov Service (test fixture)').click(); await A.waitForTimeout(1200);
  check('past nextReviewDue shows Needs re-check', await a.has(L.appv.needsRecheck));
  check('government disclaimer shown', await a.has(L.appv.disclaimerGov));
  check('official link button shown when URL supplied', await A.getByRole('button', { name: L.appv.officialLink }).count() > 0);
  check('no store buttons when those URLs are null', await A.getByRole('button', { name: L.appv.iosLink }).count() === 0);
  await A.screenshot({ path: `${OUT}content-detail.png` });

  // ---- Progress on device A ----
  await a.go('/app/test-fixture-transit');
  await A.getByRole('checkbox').first().click(); await A.waitForTimeout(800);
  await a.go('/home');
  await A.getByRole('checkbox').first().click(); await A.waitForTimeout(1500);

  // ---- Device B: same account ----
  const B = await device('B');
  const b = pageHelpers(B);
  await b.go('/');
  await B.getByRole('radio', { name: /^English,/ }).click();
  await b.btn(L.lang.continue).click(); await B.waitForTimeout(900);
  await b.btn(L.auth.haveAccount).click(); await B.waitForTimeout(800);
  await B.getByRole('textbox', { name: L.auth.email }).fill(email);
  await B.getByRole('textbox', { name: L.auth.password }).fill(PW);
  await B.getByRole('button', { name: L.auth.signIn, exact: true }).last().click(); await B.waitForTimeout(4000);
  check('device B sees the checklist tick from A', await checked(B.getByRole('checkbox').first()));
  await b.go('/app/test-fixture-transit');
  check('device B sees the app setup tick from A', await checked(B.getByRole('checkbox').first()));
  await b.go('/home');
  await B.getByRole('checkbox').nth(1).click(); await B.waitForTimeout(2000);
  check('device A sees B\'s tick live, without reloading', await until(() => checked(A.getByRole('checkbox').nth(1)), 6000));
  await A.screenshot({ path: `${OUT}content-home-A.png` });

  const u = (await users()).find((x) => x.email === email);
  const cl = await (await fetch(`${FSB}/users/${u.localId}/progress/checklist`, { headers: OWNER })).json();
  check('checklist progress stored in Firestore', Object.keys(cl.fields?.items?.mapValue?.fields ?? {}).length === 2);

  // ---- Live content edit ----
  await a.nav(1).click(); await A.waitForTimeout(1200);
  await fetch(`${FSB}/content/apps/items/test-fixture-transit?updateMask.fieldPaths=name`, {
    method: 'PATCH', headers: OWNER, body: JSON.stringify({ fields: { name: { stringValue: 'Example Transit renamed (test fixture)' } } }),
  });
  check('content edit appears without reload', await until(() => a.has('Example Transit renamed (test fixture)'), 6000));
  await sleep(100);
} catch (e) {
  check('script error', false, e.message.split('\n')[0]);
  for (const pg of browser.contexts().flatMap((c) => c.pages())) await pg.screenshot({ path: `${OUT}content-FAIL-${Math.random().toString(36).slice(2, 6)}.png` }).catch(() => {});
}
done(errors);
await browser.close();
