// Two real accounts on the emulators (a guide and a newcomer). V7: matching runs on
// the device from publicProfiles; all writes are direct Firestore writes checked by
// the rules. Covers matching on/off, ignore/undo, request with filtered intro, accept,
// realtime chat, link refusal, mutual reveal, directory, report, block, deletion.
import { chromium } from 'playwright';
import { L, tr, OUT, reporter, clearAll, users, list, getDocRaw, until, pageHelpers, signUpUI, deleteAccountUI, watchErrors } from './lib.mjs';

const { check, done } = reporter();
await clearAll();
const browser = await chromium.launch();
const errors = [];
async function newPage(name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pg = await ctx.newPage();
  watchErrors(pg, name, errors);
  return pg;
}

try {
  const t0 = Date.now();
  const G = await newPage('G'), N = await newPage('N');
  await signUpUI(G, { name: 'Anjali', persona: 'guide', email: `guide.${t0}@example.com`, extraLang: true });
  await signUpUI(N, { name: 'Ravi', persona: 'family', email: `new.${t0}@example.com`, extraLang: true });
  const g = pageHelpers(G), n = pageHelpers(N);
  const us = await users();
  const gUid = us.find((u) => u.email.startsWith('guide')).localId;
  const nUid = us.find((u) => u.email.startsWith('new')).localId;

  // ---- Matching (on device) ----
  await n.nav(3).click(); await N.waitForTimeout(3000);
  check('newcomer sees the real guide as a match', await until(() => n.has('Anjali'), 8000));
  check('label and reasons from real overlaps', await n.has(L.match.strong) && await n.has(L.match.rLang.replace('{{list}}', 'English, हिन्दी')));
  check('"AI suggestion. You decide." shown', await n.has(L.match.disclaimer));
  await N.screenshot({ path: `${OUT}match-1-suggestion.png` });

  // ---- Matching off / on (Me > settings.matching) ----
  await n.go('/me');
  await N.getByRole('switch', { name: tr('settings.matching') }).first().click(); await N.waitForTimeout(1200);
  await n.go('/matches'); await N.waitForTimeout(1500);
  check('matching off: no suggestions, "off" message shown', !(await n.has(L.match.disclaimer)) && await n.has(tr('match.off')), tr('match.off'));
  check('matching off saved to account', (await getDocRaw(`users/${nUid}`))?.fields?.matchingOn?.booleanValue === false);
  await N.screenshot({ path: `${OUT}match-2-off.png` });
  await n.btn(tr('match.turnOn')).click(); await N.waitForTimeout(3000);
  check('turn matching back on from Matches brings the guide back', await until(() => n.has('Anjali'), 8000));

  // ---- Ignore / undo ----
  await n.btn(L.match.ignore).click(); await N.waitForTimeout(1500);
  check('ignore hides the suggestion', !(await n.has('Anjali')));
  check('ignore decision stored in matchDecisions', (await list(`matchDecisions/${nUid}/items`)).length === 1);
  await n.btn(L.match.reviewHidden.replace('{{n}}', '1')).click(); await N.waitForTimeout(800);
  await n.btn(L.match.undo).click(); await N.waitForTimeout(1500);
  await N.getByRole('button', { name: L.common.close }).last().click(); await N.waitForTimeout(600);
  check('undo brings it back', await n.has('Anjali'));

  // ---- Request with intro (contact details filtered) ----
  await n.btn(L.match.accept).click(); await N.waitForTimeout(800);
  const intro = N.getByRole('textbox', { name: L.chat.placeholder });
  await intro.fill('Hi! Call me on +971 50 123 4567');
  await n.btn(L.match.send).click(); await N.waitForTimeout(1200);
  check('intro with a phone number is refused', await n.has(L.authErr.noContact.slice(0, 30)) && (await list('connections')).length === 0);
  await intro.fill('Hi! I just moved with my kids and would love a few tips.');
  await n.btn(L.match.send).click();
  check('request sent', await until(async () => (await list('connections')).length === 1, 8000));

  // ---- Guide accepts ----
  await g.nav(4).click(); await G.waitForTimeout(3000);
  check('guide sees the incoming request with intro', await g.has(L.chat.incoming.replace('{{name}}', 'Ravi')) && await g.has('would love a few tips'));
  await G.screenshot({ path: `${OUT}match-3-incoming.png` });
  await G.getByRole('button', { name: L.match.accept, exact: true }).click(); await G.waitForTimeout(3000);
  const cid = [gUid, nUid].sort().join('_');
  check('connection status connected', (await getDocRaw(`connections/${cid}`))?.fields?.status?.stringValue === 'connected');

  // ---- Realtime chat ----
  await n.go(`/chat/${cid}`);
  const box = (pg) => pg.getByRole('textbox', { name: L.chat.placeholder });
  await box(N).fill('Which metro line is closest to Al Barsha?');
  await n.btn(L.chat.send).click();
  check('guide receives the message live', await until(() => g.has('Which metro line is closest'), 8000));
  await box(G).fill('Check www.cheap-visas.xyz for help');
  await g.btn(L.chat.send).click(); await G.waitForTimeout(1200);
  check('link in a message is refused', await g.has(L.authErr.noLinks.slice(0, 25)));
  check('refused link never stored', !JSON.stringify(await list(`chats/${cid}/messages`)).includes('cheap-visas'));
  await box(G).fill('The red line, Mall of the Emirates station.');
  await g.btn(L.chat.send).click();
  check('newcomer receives the reply live', await until(() => n.has('Mall of the Emirates station'), 8000));
  check('chat header shows display name only', await n.has('Anjali') && !(await n.has(`guide.${t0}@example.com`)));

  // ---- Mutual reveal ----
  await n.btn(L.chat.share).click(); await N.waitForTimeout(600);
  await N.getByRole('textbox', { name: L.chat.contactLabel }).fill('ravi-contact-demo');
  await N.getByRole('button', { name: L.chat.share, exact: true }).last().click(); await N.waitForTimeout(2500);
  check('one-sided offer does not reveal anything', !(await g.has('ravi-contact-demo')) && await n.has(L.chat.shareWaiting.replace('{{name}}', 'Anjali')));
  await g.btn(L.chat.share).click(); await G.waitForTimeout(600);
  await G.getByRole('textbox', { name: L.chat.contactLabel }).fill('anjali-contact-demo');
  await G.getByRole('button', { name: L.chat.share, exact: true }).last().click();
  check('after both agree, the first offerer sees the other\'s contact live', await until(() => n.has('anjali-contact-demo'), 8000));
  check('after both agree, the second offerer sees the other\'s contact live (no reload)', await until(() => g.has('ravi-contact-demo'), 8000));
  await G.screenshot({ path: `${OUT}match-4b-chat-guide.png` });
  await g.go(`/chat/${cid}`);
  check('second offerer sees the contact after reopening the chat', await until(() => g.has('ravi-contact-demo'), 8000));
  await N.screenshot({ path: `${OUT}match-4-chat.png` });

  // ---- Directory ----
  await n.go('/matches');
  await N.getByRole('button', { name: L.match.directory, exact: true }).last().click(); await N.waitForTimeout(2500);
  check('directory lists the guide', await n.has('Anjali'));

  // ---- Report ----
  await g.go(`/chat/${cid}`);
  await G.getByRole('button', { name: L.chat.report }).first().click(); await G.waitForTimeout(600);
  await G.getByRole('checkbox', { name: new RegExp(`^${L.report.scam},`) }).click();
  await G.getByRole('button', { name: L.chat.report, exact: true }).last().click(); await G.waitForTimeout(2500);
  const reps = await list('reports');
  check('report ticket created with status open and SLA hours', reps.length === 1 && reps[0].fields.status?.stringValue === 'open' && !!(reps[0].fields.slaHours ?? reps[0].fields.slaDueAt), reps[0] ? Object.keys(reps[0].fields).join(',') : 'none');

  // ---- Block ----
  await n.go(`/chat/${cid}`);
  await N.getByRole('button', { name: L.chat.block }).first().click(); await N.waitForTimeout(600);
  await N.getByRole('button', { name: L.chat.block, exact: true }).last().click(); await N.waitForTimeout(3500);
  check('block stored in blocks/{me}/blocked', !!(await getDocRaw(`blocks/${nUid}/blocked/${gUid}`)));
  await g.go(`/chat/${cid}`);
  check('block closes the conversation for the other person', await g.has(L.chat.closed));
  await n.go('/matches');
  await N.getByRole('button', { name: L.match.directory, exact: true }).last().click(); await N.waitForTimeout(2500);
  check('blocked guide disappears from the directory', !(await n.has('Anjali')));
  await N.screenshot({ path: `${OUT}match-5-directory-after-block.png` });

  // ---- Guide deletes the account (on device, password) ----
  await deleteAccountUI(G);
  const gone = await until(async () => !(await users()).some((u) => u.localId === gUid), 20000);
  check('guide auth user deleted', gone);
  check('guide docs deleted (users, private, publicProfiles)', !(await getDocRaw(`users/${gUid}`)) && !(await getDocRaw(`users/${gUid}/private/profile`)) && !(await getDocRaw(`publicProfiles/${gUid}`)));
  check('deleting an account removes its connections and all messages', (await list('connections')).length === 0 && (await list(`chats/${cid}/messages`)).length === 0, `connections=${(await list('connections')).length} messages=${(await list(`chats/${cid}/messages`)).length}`);
  const leftover = await list(`connections/${cid}/contact`);
  check('contact reveal docs removed', leftover.length === 0, leftover.map((d) => d.name.split('/').pop()).join(','));
  await G.screenshot({ path: `${OUT}match-5-after-delete.png` });
} catch (e) {
  check('script error', false, e.message.split('\n')[0]);
  for (const pg of browser.contexts().flatMap((c) => c.pages())) await pg.screenshot({ path: `${OUT}match-FAIL-${Math.random().toString(36).slice(2, 6)}.png` }).catch(() => {});
}
done(errors);
await browser.close();
