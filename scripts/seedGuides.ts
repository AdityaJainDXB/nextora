// Loads guide content into Firestore from data/seed/<type>.json ONLY, for each of
// timeline, property, schools, offers, events, services. Never generates content.
// Any invalid record stops the whole run before anything is written.
//
//   npm run seed:guides -- --env local
//   npm run seed:guides -- --env dev
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { doc, increment, serverTimestamp, writeBatch } from 'firebase/firestore';
import { GUIDE_TYPES, validateGuide, type GuideType } from './lib/contentSchemas';
import { arg, signInModerator } from './lib/signIn';

function readItems(file: string): Record<string, unknown>[] {
  const json = JSON.parse(readFileSync(file, 'utf8'));
  const items = Array.isArray(json) ? json : json.items;
  if (!Array.isArray(items)) throw new Error(`${file}: expected an array or { "items": [...] }`);
  return items;
}

async function main() {
  const env = arg('env') ?? 'local';
  // Drafts (data/seed-drafts) may only go to the local emulator; real projects read data/seed only.
  const dir = arg('dir') ?? 'data/seed';
  if (dir !== 'data/seed' && env !== 'local') throw new Error('--dir is only allowed with --env local.');
  const load: { type: GuideType; file: string; items: Record<string, unknown>[] }[] = [];
  const problems: string[] = [];

  for (const type of GUIDE_TYPES) {
    const file = resolve(`${dir}/${type}.json`);
    if (!existsSync(file)) { console.log(`${type}: Nothing to load (${file} does not exist).`); continue; }
    const items = readItems(file);
    items.forEach((e, i) => validateGuide(type, e).forEach((p) => problems.push(`${type} #${i + 1} ${String(e.id ?? '?')}: ${p}`)));
    const ids = items.map((e) => e.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dupes.length) problems.push(`${type}: duplicate ids: ${[...new Set(dupes)].join(', ')}`);
    const ph = items.filter((e) => JSON.stringify(e).includes('PLACEHOLDER'));
    if (ph.length && env === 'prod') problems.push(`${type}: PLACEHOLDER entries are blocked in production: ${ph.map((e) => e.id).join(', ')}`);
    if (items.length > 450) problems.push(`${type}: more than 450 records; split the file`);
    load.push({ type, file, items });
  }

  if (problems.length) {
    console.error(`Refusing to load. Fix these first:\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }
  if (!load.some((l) => l.items.length)) { console.log('Nothing was written.'); return; }

  const { db, uid } = await signInModerator();
  for (const { type, items } of load) {
    if (!items.length) continue;
    const b = writeBatch(db);
    for (const e of items) {
      b.set(doc(db, 'content', type, 'items', String(e.id)), { ...e, version: increment(1), updatedAt: serverTimestamp() }, { merge: true });
    }
    b.set(doc(db, 'auditLog', `seed-${type}-${Date.now()}`), {
      by: uid, action: 'content.seed', target: type, note: `${items.length} entries from data/seed/${type}.json`, at: serverTimestamp(),
    });
    await b.commit();
    console.log(`${type}: loaded ${items.length} entries (${env}).`);
  }
}

main().then(() => process.exit(0), (e: Error) => { console.error(`Failed: ${e.message}`); process.exit(1); });
