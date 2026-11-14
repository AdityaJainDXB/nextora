// Forum, meetups and the assistant, as the seeded demo newcomer (emulators only).
import { chromium } from 'playwright';
import { BASE, reporter, list, sleep, tr } from './lib.mjs';
const { check, done } = reporter(); const errors = [];
const b = await chromium.launch({ executablePath: process.env.HOME + '/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell' });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('pageerror', (e) => errors.push(e.message.slice(0, 120)));
const go = async (r) => { await p.goto(BASE + r); await p.waitForTimeout(3500); };
const body = () => p.innerText('body');
await go('/language'); await p.getByText('English', { exact: true }).first().click(); await p.waitForTimeout(500);
const c = p.getByRole('button', { name: /Continue/ }); if (await c.count()) await c.first().click(); await p.waitForTimeout(2000);
await go('/auth'); await p.getByText('Sign in', { exact: true }).first().click(); await p.waitForTimeout(600);
await p.locator('input').first().fill('demo@nextora.app'); await p.locator('input[type=password]').first().fill(process.env.DEMO_PW);
await p.getByRole('button', { name: 'Sign in', exact: true }).last().click(); await p.waitForTimeout(7000);
await go('/home'); check('signed in to Home', /First 48 hours/.test(await body()));
check('checklist shows SIM providers', /Etisalat|du/.test(await body()));

// Forum
await go('/forum'); let t = await body();
check('forum lists sample posts', /first-week checklist/i.test(t));
await go('/forum/new');
const agree = p.getByText('I agree', { exact: true }); check('community rules shown before first post', await agree.count() > 0); if (await agree.count()) { await agree.first().click(); await p.waitForTimeout(2500); }
const inputs = p.locator('input:visible, textarea:visible'); const n = await inputs.count();
const title = 'E2E question about bus routes ' + Date.now() % 10000;
await inputs.nth(0).fill(title); await inputs.nth(n - 1).fill('Which bus apps did you find most useful when you first arrived here?');
for (const name of ['Transport', 'Dubai']) { const ch = p.getByText(name, { exact: true }); if (await ch.count()) await ch.first().click(); }
await p.getByRole('button', { name: /Post|Publish/i }).last().click(); await p.waitForTimeout(4000);
const posts = await list('forumPosts?pageSize=50');
check('new forum post saved', posts.some((d) => d.fields?.title?.stringValue === title), p.url());
await go('/forum'); check('new post appears in forum', (await body()).includes(title));
await p.getByText(title).first().click(); await p.waitForTimeout(3000);
const box = p.locator('textarea:visible, input:visible').last();
await box.fill('Call me on 050 123 4567'); await p.getByRole('button', { name: /Reply|Send/i }).last().click(); await p.waitForTimeout(2500);
check('phone number in reply is refused', !(await body()).includes('050 123 4567') || /phone|contact/i.test(await body()));
await box.fill('Try the official transport app for your emirate.'); await p.getByRole('button', { name: /Reply|Send/i }).last().click(); await p.waitForTimeout(3000);
check('reply appears live', (await body()).includes('official transport app'));

// Meetups
await go('/events'); t = await body();
check('meetups list loads', /Meetups/.test(t) && /coffee|market/i.test(t));
check('newcomers cannot host', !(await p.getByRole('button', { name: /Host a meetup/i }).count()));
await p.getByText(/Community coffee/i).first().click(); await p.waitForTimeout(3000);
check('meetup detail opens', /Hosted by/i.test(await body()));
await p.getByText('Going', { exact: true }).first().click(); await p.waitForTimeout(2500);
const ev = (await list('events?pageSize=20')).find((d) => /coffee/i.test(d.fields?.title?.stringValue ?? ''));
const rs = ev ? await list(ev.name.split('/documents/')[1] + '/rsvps') : [];
check('RSVP saved', rs.some((d) => d.fields?.status?.stringValue === 'going'));

// Guides and assistant
await go('/guides'); check('guides screen loads', /Guides/.test(await body()));
await go('/ask'); t = await body(); check('assistant screen loads', /Ask NEXTORA/.test(t));
const q = p.locator('textarea:visible, input:visible').last(); await q.fill('How do I get a SIM card?'); await q.press('Enter'); await p.waitForTimeout(8000);
t = await body(); check('assistant replies or explains (no crash, no blank)', t.split('How do I get a SIM card?').length > 1 && !/Something broke/.test(t), t.slice(t.lastIndexOf('SIM card?') , t.lastIndexOf('SIM card?') + 140).replace(/\n/g, ' | '));
await p.screenshot({ path: 'shots/ask-local.png' });
await b.close(); done(errors);
