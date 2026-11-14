// Signs a moderator in with the regular Firebase JS SDK, so scripts obey the same
// Firestore rules as the app. No service account, no key file. The password is
// typed into a hidden terminal prompt and never printed or stored.
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc, getFirestore, type Firestore } from 'firebase/firestore';

export function ask(question: string, hidden = false): Promise<string> {
  let muted = false;
  const out = new Writable({ write(chunk, _e, cb) { if (!muted) process.stdout.write(chunk); cb(); } });
  const rl = createInterface({ input: process.stdin, output: out, terminal: true });
  return new Promise((resolve) => {
    rl.question(question, (a) => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(a.trim()); });
    muted = hidden;
  });
}

export function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** --env local (emulators) | dev | prod. Real projects read config/firebase.<env>.json. */
export async function signInModerator(): Promise<{ db: Firestore; uid: string; env: string }> {
  const env = arg('env') ?? 'local';
  const local = env === 'local';
  const config = local
    ? { apiKey: 'demo-key', projectId: 'demo-nextora', appId: 'demo-app', authDomain: 'demo-nextora.firebaseapp.com' }
    : JSON.parse(readFileSync(`config/firebase.${env}.json`, 'utf8'));
  if (!local && (typeof config.apiKey !== 'string' || !config.apiKey)) {
    throw new Error(`config/firebase.${env}.json is empty. Add the public web config first (docs/SETUP.md).`);
  }
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  if (local) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  const email = process.env.NEXTORA_MOD_EMAIL || (await ask('Moderator email: '));
  const password = process.env.NEXTORA_MOD_PASSWORD || (await ask('Password (hidden): ', true));
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  const role = await getDoc(doc(db, 'roles', user.uid)).then((d) => (d.exists() ? d.data().role : null));
  if (role !== 'moderator' && role !== 'admin') {
    throw new Error('This account is not a moderator. Set roles/{uid} = { role: "moderator" } in the Firebase console first (docs/HUMAN_TASKS.md).');
  }
  return { db, uid: user.uid, env };
}
