// Accounts on the emulators (V7, Spark plan): age gate, sign-up, onboarding, email
// verification, consent log, export, sign-out/in, client-side deletion with password.
// Checks stored data through the emulator REST APIs (owner access), not just the UI.
import { chromium } from 'playwright';
import fs from 'node:fs';
import { L, tr, OUT, P, AUTH, PW, reporter, until, clearAll, users, getDocRaw, list, pageHelpers, watchErrors } from './lib.mjs';

const { check, done } = reporter();
await clearAll();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
watchErrors(page, 'A', errors);
const { go, btn, has } = pageHelpers(page);
const shot = (n) => page.screenshot({ path: `${OUT}accounts-${n}.png` });

try {
  // ---- 1. Under 18: blocked, nothing stored ----
  await go('/');
  await page.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase('firebaseLocalStorageDb'); });
  await go('/');
  await page.getByRole('radio', { name: /^English,/ }).click();
  await btn(L.lang.continue).click(); await page.waitForTimeout(900);
  await btn(L.hero.new).click(); await page.waitForTimeout(600);
  await btn(L.persona.family).click(); await page.waitForTimeout(900);
  await page.getByRole('textbox', { name: L.age.label }).fill('15');
  await btn(L.common.continue).click(); await page.waitForTimeout(900);
  check('under-18 sees blocked screen', await has(L.age.blocked));
  check('under-18: no auth user created', (await users()).length === 0);
  check('under-18: no Firestore docs', (await list('users')).length === 0);
  await shot('1-under18');

  // ---- 2. Adult sign-up ----
  await btn(L.age.backToStart).click(); await page.waitForTimeout(900);
  await btn(L.hero.new).click(); await page.waitForTimeout(600);
  await btn(L.persona.family).click(); await page.waitForTimeout(900);
  await page.getByRole('textbox', { name: L.age.label }).fill('34');
  await btn(L.common.continue).click(); await page.waitForTimeout(600);
  const email = `sam.${Date.now()}@example.com`;
  await page.getByRole('textbox', { name: L.auth.email }).fill(email);
  await page.getByRole('textbox', { name: L.auth.password }).fill(PW);
  await page.getByRole('button', { name: L.auth.create, exact: true }).click();
  await page.waitForTimeout(3000);
  const u = (await users())[0];
  check('auth user created', !!u, u?.email);
  const userDoc = u && await getDocRaw(`users/${u.localId}`);
  check('account doc has server-time ageConfirmedAt and no age', !!userDoc?.fields?.ageConfirmedAt?.timestampValue && !('age' in (userDoc?.fields ?? {})));

  // ---- 3. Onboarding: neighbourhood typed but left hidden ----
  await page.getByRole('textbox', { name: L.onb.nameLabel }).fill('Sam');
  await page.getByRole('textbox', { name: new RegExp(L.onb.neighbourhood) }).fill('Al Nahda');
  await page.getByRole('checkbox', { name: new RegExp(`^${L.reason.work},`) }).click();
  await btn(L.common.next).click(); await page.waitForTimeout(400);
  await page.getByRole('checkbox', { name: new RegExp(`^${L.interests.food},`) }).click();
  await btn(L.common.next).click(); await page.waitForTimeout(400);
  await page.getByRole('checkbox', { name: new RegExp(`^${L.family.kids},`) }).click();
  await btn(L.common.next).click(); await page.waitForTimeout(400);
  await btn(L.onb.finish).click(); await page.waitForTimeout(4000);
  const priv = await getDocRaw(`users/${u.localId}/private/profile`);
  check('private profile saved with hidden neighbourhood', priv?.fields?.neighbourhood?.stringValue === 'Al Nahda');
  const pub = await getDocRaw(`publicProfiles/${u.localId}`);
  check('client wrote public profile (allowed by rules)', !!pub, pub ? Object.keys(pub.fields).join(',') : 'missing');
  check('public profile omits hidden neighbourhood and private reason', !!pub && !('neighbourhood' in pub.fields) && !('reason' in pub.fields));
  check('verify banner shown while unverified', await has(L.verify.done));
  await shot('2-home-unverified');

  // ---- 4. Verify email through the emulator's out-of-band link ----
  const codes = (await (await fetch(`${AUTH}/emulator/v1/projects/${P}/oobCodes`)).json()).oobCodes;
  const verifyLink = codes.find((c) => c.requestType === 'VERIFY_EMAIL' && c.email === email)?.oobLink;
  check('verification email sent', !!verifyLink);
  await fetch(verifyLink);
  await btn(L.verify.done).click(); await page.waitForTimeout(2000);
  check('banner gone after verifying', !(await has(L.verify.done)));

  // ---- 5. Consent change is logged to the account ----
  await go('/consent');
  await page.getByRole('switch', { name: L.consent.notifications }).click(); await page.waitForTimeout(1500);
  const clog = await list(`users/${u.localId}/consentLog`);
  check('consent change appended to consentLog', clog.length === 1 && clog[0].fields.key.stringValue === 'notifications');

  // ---- 6. Me screen (V7): no sign-out-everywhere, matching setting present, export ----
  await go('/me');
  check('no "Sign out on all devices" button', (await page.getByRole('button', { name: L.account.signOutAll }).count()) === 0);
  check('matching on/off setting is labelled (en.json settings.matching)', tr('settings.matching') !== 'settings.matching' && await has(tr('settings.matching')), tr('settings.matching'));
  const sw = page.getByRole('switch', { name: tr('settings.matching') });
  if (await sw.count()) {
    await sw.first().click(); await page.waitForTimeout(1500);
    const ud = await getDocRaw(`users/${u.localId}`);
    check('turning matching off is saved to users/{uid}.matchingOn', ud?.fields?.matchingOn?.booleanValue === false);
    await sw.first().click(); await page.waitForTimeout(1200);
  } else check('matching switch found', false);
  await shot('3-me');
  const dl = page.waitForEvent('download', { timeout: 15000 });
  await btn(L.account.export).click();
  const file = await dl;
  const data = JSON.parse(fs.readFileSync(await file.path(), 'utf8'));
  check('export (on device) contains private profile and consent log', data.privateProfile?.displayName === 'Sam' && data.consentLog?.length === 1);
  check('export contains the public profile and account email', !!data.publicProfile && data.account?.email === email);

  // ---- 7. Sign out, then sign back in ----
  await btn(L.account.signOut).click(); await page.waitForTimeout(2000);
  check('signed out lands on hero', await has(L.hero.headline));
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('nextora:')) localStorage.removeItem(k); });
  await go('/');
  await page.getByRole('radio', { name: /^English,/ }).click();
  await btn(L.lang.continue).click(); await page.waitForTimeout(900);
  await btn(L.auth.haveAccount).click(); await page.waitForTimeout(800);
  await page.getByRole('textbox', { name: L.auth.email }).fill(email);
  await page.getByRole('textbox', { name: L.auth.password }).fill('wrong-password-1');
  await page.getByRole('button', { name: L.auth.signIn, exact: true }).last().click(); await page.waitForTimeout(2000);
  check('wrong password shows friendly error', await has(L.authErr.wrongCredentials));
  await page.getByRole('textbox', { name: L.auth.password }).fill(PW);
  await page.getByRole('button', { name: L.auth.signIn, exact: true }).last().click(); await page.waitForTimeout(3500);
  check('signed back in to home with profile from Firestore', await has(L.home.greeting.replace('{{name}}', 'Sam')));

  // ---- 8. Delete account (client-side, password required) ----
  await go('/me');
  await btn(L.account.delete).click(); await page.waitForTimeout(600);
  check('delete sheet has a labelled password field (en.json account.passwordToConfirm)', tr('account.passwordToConfirm') !== 'account.passwordToConfirm' && await has(tr('account.passwordToConfirm')), tr('account.passwordToConfirm'));
  const confirmBtn = page.getByRole('button', { name: L.account.deleteConfirm, exact: true }).last();
  check('confirm disabled until a password is typed', await confirmBtn.isDisabled() || (await confirmBtn.getAttribute('aria-disabled')) === 'true');
  const pwField = page.locator('input[type="password"]').last();
  await pwField.fill('wrong-password-1');
  await confirmBtn.click(); await page.waitForTimeout(800);
  check('wrong password: nothing deleted, friendly error', (await users()).length === 1 && !!(await getDocRaw(`users/${u.localId}`)) && await has(L.authErr.wrongCredentials));
  await shot('4-delete-wrong-pw');
  await pwField.fill(PW);
  await confirmBtn.click();
  check('auth user deleted', await until(async () => (await users()).length === 0, 20000));
  check('users doc and subcollections deleted', !(await getDocRaw(`users/${u.localId}`)) && !(await getDocRaw(`users/${u.localId}/private/profile`)) && (await list(`users/${u.localId}/consentLog`)).length === 0 && (await list(`users/${u.localId}/progress`)).length === 0);
  check('public profile deleted', !(await getDocRaw(`publicProfiles/${u.localId}`)));
  check('back at language picker', page.url().includes('/language'), page.url());
  await shot('5-after-delete');
} catch (e) {
  check('script error', false, e.message.split('\n')[0]);
  await shot('FAIL');
}
done(errors);
await browser.close();
