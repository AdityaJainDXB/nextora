// Loads factual content (Appverse apps; later guides, schools, offers, events) into
// Firestore from data/seed/*.json ONLY. Never generates content. One invalid entry
// stops the run. Signs in as a moderator with the normal SDK (obeys the rules).
//
//   npm run seed:content -- --env local     (emulators)
//   npm run seed:content -- --env dev       (nextora-dev, after adding its public config)
// Test fixtures are refused anywhere but the local emulator:
//   npm run seed:content -- --env local --fixture tests/fixtures/apps.fixture.json
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { doc, increment, serverTimestamp, writeBatch } from 'firebase/firestore';
import { validateApp } from './lib/contentSchema';
import { arg, signInModerator } from './lib/signIn';

function readItems(file: string): Record<string, unknown>[] {
  const json = JSON.parse(readFileSync(file, 'utf8'));
  const items = Array.isArray(json) ? json : json.items;
  if (!Array.isArray(items)) throw new Error(`${file}: expected an array or { "items": [...] }`);
  return items;
}

async function main() {
  const env = arg('env') ?? 'local';
  const fixture = arg('fixture');
  if (fixture && env !== 'local') throw new Error('Fixtures are test data and can only be loaded into the local emulator.');

  const file = fixture ? resolve(fixture) : resolve('data/seed/apps.json');
  if (!existsSync(file)) {
    console.log(`Nothing to load: ${file} does not exist.`);
    console.log('Add checked content to data/seed/apps.json (docs/HUMAN_TASKS.md). Nothing was written.');
    return;
  }
  const items = readItems(file);
  const problems = items.flatMap((e, i) => validateApp(e).map((p) => `#${i + 1} ${String(e.id ?? '?')}: ${p}`));
  const ids = items.map((e) => e.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) problems.push(`duplicate ids: ${[...new Set(dupes)].join(', ')}`);
  // PLACEHOLDER entries may exist while drafting, but never reach a real project.
  const placeholders = items.filter((e) => JSON.stringify(e).includes('PLACEHOLDER'));
  if (placeholders.length && env === 'prod') problems.push(`PLACEHOLDER entries are blocked in production: ${placeholders.map((e) => e.id).join(', ')}`);
  if (problems.length) {
    console.error(`Refusing to load ${file}. Fix these first:\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }

  const { db, uid } = await signInModerator();
  const b = writeBatch(db);
  for (const e of items) {
    b.set(doc(db, 'content', 'apps', 'items', String(e.id)), {
      ...e, isTestFixture: !!fixture, version: increment(1), updatedAt: serverTimestamp(),
    }, { merge: true });
  }
  b.set(doc(db, 'auditLog', `seed-${Date.now()}`), {
    by: uid, action: 'content.seed', target: 'apps', note: `${items.length} entries from ${fixture ? 'test fixture' : 'data/seed/apps.json'}`, at: serverTimestamp(),
  });
  await b.commit();
  console.log(`Loaded ${items.length} app entries (${env}).`);
}

main().then(() => process.exit(0), (e: Error) => { console.error(`Failed: ${e.message}`); process.exit(1); });
