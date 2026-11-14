// en/hi/ar switch on a real signed-in account (emulators): language persists to the
// account, RTL flips for Arabic, Noto fonts per script. Also smoke-checks the newer
// Home entry points (Guides, Forum) and the /events screen in each language.
import { chromium } from 'playwright';
import { loc, tr, OUT, FSB, OWNER, reporter, clearAll, users, pageHelpers, signUpUI, watchErrors } from './lib.mjs';

const L = { en: loc('en'), hi: loc('hi'), ar: loc('ar') };
const { check, done } = reporter();
await clearAll();
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
const errors = []; watchErrors(pg, 'A', errors);
const { go } = pageHelpers(pg);
try {
  const email = `lang.${Date.now()}@example.com`;
  await signUpUI(pg, { name: 'Lina', persona: 'justArrived', email, age: '28', family: 'none' });
  const uid = (await users()).find((u) => u.email === email).localId;

  for (const [code, name] of [['ar', 'العربية'], ['hi', 'हिन्दी'], ['en', 'English']]) {
    const T = L[code];
    await go('/language?from=settings');
    await pg.getByRole('radio', { name: new RegExp(`^${name},`) }).click();
    await pg.getByRole('button', { name: T.lang.continue }).last().click(); await pg.waitForTimeout(1500);
    await go('/home');
    const dir = await pg.evaluate(() => document.documentElement.dir);
    const title = await pg.getByText(T.home.title).count();
    const font = title ? await pg.getByText(T.home.title).first().evaluate((el) => getComputedStyle(el).fontFamily) : '';
    const stored = (await (await fetch(`${FSB}/users/${uid}`, { headers: OWNER })).json()).fields?.language?.stringValue;
    check(`${code}: home in ${code}`, title > 0);
    check(`${code}: direction ${code === 'ar' ? 'rtl' : 'ltr'}`, dir === (code === 'ar' ? 'rtl' : 'ltr'), dir);
    check(`${code}: Noto font for its script`, /NotoSans/.test(font) && (code !== 'ar' || /Arabic/.test(font)) && (code !== 'hi' || /Devanagari/.test(font)), font.split(',')[0]);
    check(`${code}: saved to the account`, stored === code, stored);
    if (code !== 'en') check(`${code}: AI-translated label shown`, await pg.getByText(T.ai.translated).count() > 0);
    check(`${code}: Home has Guides and Forum entry points`, await pg.getByText(tr('home.guides', T)).count() > 0 && await pg.getByText(tr('home.forum', T)).count() > 0);
    await pg.screenshot({ path: `${OUT}lang-${code}.png` });
    await go('/events'); await pg.screenshot({ path: `${OUT}lang-events-${code}.png` });
    check(`${code}: /events (meetups) screen renders in this language`, await pg.getByText(tr('events.meetups', T)).count() > 0);
  }
} catch (e) { check('script error', false, e.message.split('\n')[0]); await pg.screenshot({ path: `${OUT}lang-FAIL.png` }); }
done(errors);
await b.close();
