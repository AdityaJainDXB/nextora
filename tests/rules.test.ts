// Firestore rules tests (V7, Spark plan: rules are the only server-side enforcement).
// Run: npm test   (starts the Firestore emulator and runs vitest)
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, updateDoc, writeBatch,
  type Firestore,
} from 'firebase/firestore';

let env: RulesTestEnvironment;
const priv = {
  displayName: 'Sam', role: 'newcomer', persona: 'justArrived', emirate: 'dubai', neighbourhood: 'Al Nahda',
  interests: ['food'], family: ['none'], languages: ['hi', 'en'],
  visibility: { emirate: true, neighbourhood: false, interests: true, family: true, languages: true },
};
const as = (uid: string, claims: Record<string, unknown> = {}) =>
  env.authenticatedContext(uid, { email_verified: true, ...claims }).firestore();
const seed = (fn: (f: Firestore) => Promise<unknown>) => env.withSecurityRulesDisabled(async (c) => { await fn(c.firestore()); });

/** Public profile + private profile in one batch, as the app does. */
function saveProfile(f: Firestore, uid: string, p = priv, pub: Record<string, unknown> | null = null) {
  const b = writeBatch(f);
  b.set(doc(f, `users/${uid}/private/profile`), { ...p, updatedAt: serverTimestamp() });
  b.set(doc(f, `publicProfiles/${uid}`), pub ?? {
    displayName: p.displayName, role: p.role, persona: p.persona, isTeam: false,
    emirate: p.emirate, interests: p.interests, family: p.family, languages: p.languages, updatedAt: serverTimestamp(),
  });
  return b.commit();
}
/** A rate-limited write batched with its limits stamp, as the app does. */
function stampedWrite(f: Firestore, uid: string, field: string, write: (b: ReturnType<typeof writeBatch>) => void) {
  const b = writeBatch(f);
  b.set(doc(f, `limits/${uid}`), { [field]: serverTimestamp() }, { merge: true });
  write(b);
  return b.commit();
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-nextora',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await seed(async (f) => {
    for (const u of ['bob', 'carol']) {
      await setDoc(doc(f, `users/${u}/private/profile`), { ...priv, displayName: u });
      await setDoc(doc(f, `publicProfiles/${u}`), { displayName: u, role: 'volunteer', persona: 'family', isTeam: false });
    }
  });
});

describe('account doc and age gate', () => {
  it('owner creates it once with server times', async () => {
    await assertSucceeds(setDoc(doc(as('alice'), 'users/alice'), { ageConfirmedAt: serverTimestamp(), createdAt: serverTimestamp(), language: 'en' }));
  });
  it('rejects back-dated age, extra fields, other users', async () => {
    await assertFails(setDoc(doc(as('alice'), 'users/alice'), { ageConfirmedAt: new Date('2000-01-01'), createdAt: serverTimestamp(), language: 'en' }));
    await assertFails(setDoc(doc(as('alice'), 'users/alice'), { ageConfirmedAt: serverTimestamp(), createdAt: serverTimestamp(), language: 'en', role: 'admin' }));
    await assertFails(getDoc(doc(as('alice'), 'users/bob')));
  });
  it('settings toggles are allowed, age cannot change, owner can delete', async () => {
    const a = as('alice');
    await setDoc(doc(a, 'users/alice'), { ageConfirmedAt: serverTimestamp(), createdAt: serverTimestamp(), language: 'en' });
    await assertSucceeds(updateDoc(doc(a, 'users/alice'), { matchingOn: false, assistantOn: false }));
    await assertFails(updateDoc(doc(a, 'users/alice'), { ageConfirmedAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(a, 'users/alice')));
  });
});

describe('public profile mirrors visible private fields', () => {
  it('a correct mirror is accepted', async () => {
    await assertSucceeds(saveProfile(as('alice'), 'alice'));
  });
  it('a hidden field cannot be published', async () => {
    await assertFails(saveProfile(as('alice'), 'alice', priv, {
      displayName: 'Sam', role: 'newcomer', persona: 'justArrived', isTeam: false, neighbourhood: 'Al Nahda', updatedAt: serverTimestamp(),
    }));
  });
  it('a value different from the private profile is rejected', async () => {
    await assertFails(saveProfile(as('alice'), 'alice', priv, {
      displayName: 'Sam', role: 'volunteer', persona: 'justArrived', isTeam: false, updatedAt: serverTimestamp(),
    }));
  });
  it('cannot claim to be NEXTORA Team without the role', async () => {
    await assertFails(saveProfile(as('alice'), 'alice', priv, {
      displayName: 'Sam', role: 'newcomer', persona: 'justArrived', isTeam: true, updatedAt: serverTimestamp(),
    }));
  });
  it('cannot write someone else\'s public profile', async () => {
    await assertFails(setDoc(doc(as('alice'), 'publicProfiles/bob'), { displayName: 'x', role: 'volunteer', persona: 'family', isTeam: false, updatedAt: serverTimestamp() }));
  });
  it('listing needs a verified email and a limit', async () => {
    await assertSucceeds(getDocs(query(collection(as('alice'), 'publicProfiles'), limit(50))));
    await assertFails(getDocs(collection(as('alice'), 'publicProfiles')));
    await assertFails(getDocs(query(collection(as('alice', { email_verified: false }), 'publicProfiles'), limit(50))));
  });
  it('a blocked person cannot open your profile', async () => {
    await seed((f) => setDoc(doc(f, 'blocks/bob/blocked/alice'), { uid: 'alice', at: new Date() }));
    await assertFails(getDoc(doc(as('alice'), 'publicProfiles/bob')));
  });
});

describe('connection requests', () => {
  const req = (from: string, to: string, intro = 'Hi! I just arrived and would love tips.') => {
    const members = [from, to].sort();
    const f = as(from);
    return stampedWrite(f, from, 'lastRequestAt', (b) => b.set(doc(f, `connections/${members.join('_')}`), {
      members, from, to, status: 'pending', intro, reveal: {}, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
  };
  it('a verified user can request', async () => { await assertSucceeds(req('alice', 'bob')); });
  it('unverified users cannot', async () => {
    const f = as('alice', { email_verified: false });
    await assertFails(stampedWrite(f, 'alice', 'lastRequestAt', (b) => b.set(doc(f, 'connections/alice_bob'), {
      members: ['alice', 'bob'], from: 'alice', to: 'bob', status: 'pending', intro: 'Hi', reveal: {}, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })));
  });
  it('intro with a phone number, email or link is refused', async () => {
    await assertFails(req('alice', 'bob', 'Call +971 50 123 4567'));
    await assertFails(req('alice', 'bob', 'mail me sam@example.com'));
    await assertFails(req('alice', 'bob', 'see https://scam.example'));
  });
  it('not allowed when either side blocked the other', async () => {
    await seed((f) => setDoc(doc(f, 'blocks/bob/blocked/alice'), { uid: 'alice', at: new Date() }));
    await assertFails(req('alice', 'bob'));
  });
  it('without the rate-limit stamp, or too soon after the last one, it is refused', async () => {
    const f = as('alice');
    await assertFails(setDoc(doc(f, 'connections/alice_bob'), {
      members: ['alice', 'bob'], from: 'alice', to: 'bob', status: 'pending', intro: 'Hi', reveal: {}, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
    await assertSucceeds(req('alice', 'bob'));
    await assertFails(req('alice', 'carol')); // within 30 s
  });
  it('only the recipient accepts; outsiders cannot read it', async () => {
    await req('alice', 'bob');
    await assertFails(updateDoc(doc(as('alice'), 'connections/alice_bob'), { status: 'connected', updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(as('bob'), 'connections/alice_bob'), { status: 'connected', updatedAt: serverTimestamp() }));
    await assertFails(getDoc(doc(as('carol'), 'connections/alice_bob')));
  });
});

describe('chat and mutual contact reveal', () => {
  beforeEach(async () => {
    await seed((f) => setDoc(doc(f, 'connections/alice_bob'), { members: ['alice', 'bob'], from: 'alice', to: 'bob', status: 'connected', reveal: {}, intro: 'x' }));
  });
  const msg = (uid: string, text: string, from = uid) => {
    const f = as(uid);
    return stampedWrite(f, uid, 'lastMessageAt', (b) => b.set(doc(collection(f, 'chats/alice_bob/messages')), { from, text, at: serverTimestamp() }));
  };
  it('members send messages; outsiders cannot read or send', async () => {
    await assertSucceeds(msg('alice', 'Which metro line is closest?'));
    await assertFails(msg('carol', 'hello'));
    await assertFails(getDocs(collection(as('carol'), 'chats/alice_bob/messages')));
  });
  it('messages with contact details or links are refused', async () => {
    await assertFails(msg('alice', 'my number is 050 123 4567'));
    await assertFails(msg('alice', 'www.example.com'));
  });
  it('cannot pretend to be the other person', async () => {
    await assertFails(msg('alice', 'hi', 'bob'));
  });
  it('blocked conversations cannot receive messages', async () => {
    await seed((f) => setDoc(doc(f, 'blocks/bob/blocked/alice'), { uid: 'alice', at: new Date() }));
    await assertFails(msg('alice', 'hello?'));
  });
  it('contact details stay hidden until BOTH agree, and from a third account always', async () => {
    await assertSucceeds(setDoc(doc(as('alice'), 'connections/alice_bob/contact/alice'), { text: 'alice-contact', at: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(as('alice'), 'connections/alice_bob'), { 'reveal.alice': true, updatedAt: serverTimestamp() }));
    await assertSucceeds(setDoc(doc(as('bob'), 'connections/alice_bob/contact/bob'), { text: 'bob-contact', at: serverTimestamp() }));
    await assertFails(getDoc(doc(as('bob'), 'connections/alice_bob/contact/alice')));
    await assertFails(updateDoc(doc(as('alice'), 'connections/alice_bob'), { 'reveal.bob': true, updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(as('bob'), 'connections/alice_bob'), { 'reveal.bob': true, updatedAt: serverTimestamp() }));
    await assertSucceeds(getDoc(doc(as('bob'), 'connections/alice_bob/contact/alice')));
    await assertSucceeds(getDoc(doc(as('alice'), 'connections/alice_bob/contact/bob')));
    await assertFails(getDoc(doc(as('carol'), 'connections/alice_bob/contact/bob')));
  });
});

describe('reports, roles and moderation', () => {
  const report = (reason: string, slaHours: number) => {
    const f = as('alice');
    return stampedWrite(f, 'alice', 'lastReportAt', (b) => b.set(doc(collection(f, 'reports')), {
      reporter: 'alice', targetType: 'user', target: 'bob', reason, note: '', contextId: null, status: 'open', assignee: null,
      createdAt: serverTimestamp(), slaHours,
    }));
  };
  it('reports get the right response window; a shorter or longer one is refused', async () => {
    await assertSucceeds(report('scam', 24));
    await env.clearFirestore();
    await assertFails(report('childSafety', 24));
    await assertSucceeds(report('childSafety', 1));
  });
  it('cannot file a report as someone else or as already handled', async () => {
    const f = as('alice');
    await assertFails(stampedWrite(f, 'alice', 'lastReportAt', (b) => b.set(doc(collection(f, 'reports')), {
      reporter: 'bob', targetType: 'user', target: 'carol', reason: 'scam', note: '', contextId: null, status: 'dismissed', assignee: null,
      createdAt: serverTimestamp(), slaHours: 24,
    })));
  });
  it('users cannot read reports, set roles, or write the audit log', async () => {
    await assertFails(getDocs(collection(as('alice'), 'reports')));
    await assertFails(setDoc(doc(as('alice'), 'roles/alice'), { role: 'moderator' }));
    await assertFails(addDoc(collection(as('alice'), 'auditLog'), { by: 'alice', action: 'x', target: 'y', note: '', at: serverTimestamp() }));
  });
  it('a moderator (roles doc set in the console) can read and update reports', async () => {
    await seed(async (f) => {
      await setDoc(doc(f, 'roles/mod1'), { role: 'moderator' });
      await setDoc(doc(f, 'reports/r1'), { reporter: 'alice', status: 'open', assignee: null });
    });
    await assertSucceeds(getDoc(doc(as('mod1'), 'reports/r1')));
    await assertSucceeds(updateDoc(doc(as('mod1'), 'reports/r1'), { status: 'inReview', assignee: 'mod1' }));
    await assertFails(updateDoc(doc(as('mod1'), 'reports/r1'), { reporter: 'someone' }));
    await assertSucceeds(getDoc(doc(as('mod1'), 'roles/mod1')));
    await assertFails(getDoc(doc(as('alice'), 'roles/mod1')));
  });
  it('only moderators write content; signed-in users read it', async () => {
    await seed((f) => setDoc(doc(f, 'roles/mod1'), { role: 'moderator' }));
    await assertFails(setDoc(doc(as('alice'), 'content/apps/items/x'), { name: 'Fake' }));
    await assertSucceeds(setDoc(doc(as('mod1'), 'content/apps/items/x'), { name: 'Checked' }));
    await assertSucceeds(getDoc(doc(as('alice'), 'content/apps/items/x')));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'content/apps/items/x')));
  });
});

describe('progress, consent, decisions, closed paths', () => {
  it('progress and decisions are the owner\'s own', async () => {
    await assertSucceeds(setDoc(doc(as('alice'), 'users/alice/progress/checklist'), { items: { sim: true }, updatedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(as('bob'), 'users/alice/progress/checklist'), { items: {}, updatedAt: serverTimestamp() }));
    await assertSucceeds(setDoc(doc(as('alice'), 'matchDecisions/alice/items/bob'), { decision: 'ignored', at: serverTimestamp() }));
    await assertFails(setDoc(doc(as('alice'), 'matchDecisions/alice/items/bob'), { decision: 'superlike', at: serverTimestamp() }));
  });
  it('consent log entries cannot be edited', async () => {
    const ref = await assertSucceeds(addDoc(collection(as('alice'), 'users/alice/consentLog'), { key: 'aiVoice', granted: true, version: 'v1', at: serverTimestamp() }));
    await assertFails(updateDoc(ref, { granted: false }));
  });
  it('rate-limit stamps must be the server time', async () => {
    await assertFails(setDoc(doc(as('alice'), 'limits/alice'), { lastPostAt: new Date(0) }));
  });
  it('unknown collections are closed', async () => {
    await assertFails(setDoc(doc(as('alice'), 'anything/x'), { a: 1 }));
  });
});
