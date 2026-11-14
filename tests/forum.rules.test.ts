// Forum rules tests: firestore.rules with rules/forum.rules.snippet spliced in
// before the catch-all. Run: npx vitest run tests/forum.rules.test.ts (emulator on 8080).
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  Timestamp, deleteDoc, doc, getDoc, getDocs, collection, increment, limit, query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
  type Firestore,
} from 'firebase/firestore';

const MARK = '    // Everything else is closed.';
function rules() {
  const base = readFileSync('firestore.rules', 'utf8');
  const snippet = readFileSync('rules/forum.rules.snippet', 'utf8');
  if (!base.includes(MARK)) throw new Error('catch-all marker not found in firestore.rules');
  // The snippet is merged into firestore.rules now; only splice it into an older copy.
  if (base.includes('forumPosts')) return base;
  return base.replace(MARK, `${snippet}\n${MARK}`);
}

let env: RulesTestEnvironment;
const as = (uid: string, verified = true) => env.authenticatedContext(uid, { email_verified: verified }).firestore();
const seed = (fn: (f: Firestore) => Promise<unknown>) => env.withSecurityRulesDisabled(async (c) => { await fn(c.firestore()); });

const post = (uid: string, over: Record<string, unknown> = {}) => ({
  authorUid: uid, displayName: 'Alice', topic: 'housing', emirate: 'dubai', language: 'en',
  title: 'Where to start looking?', body: 'Any tips for a first flat?', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  hidden: false, deleted: false, isSample: false, upvotes: 0, ...over,
});
const reply = (uid: string, over: Record<string, unknown> = {}) => ({
  authorUid: uid, displayName: 'Bob', body: 'Ask neighbours first.', createdAt: serverTimestamp(), deleted: false, isSample: false, ...over,
});
function stamped(f: Firestore, uid: string, field: string, write: (b: ReturnType<typeof writeBatch>) => void) {
  const b = writeBatch(f);
  b.set(doc(f, `limits/${uid}`), { [field]: serverTimestamp() }, { merge: true });
  write(b);
  return b.commit();
}
const createPost = (f: Firestore, uid: string, id: string, over: Record<string, unknown> = {}) =>
  stamped(f, uid, 'lastPostAt', (b) => b.set(doc(f, `forumPosts/${id}`), post(uid, over)));
const createReply = (f: Firestore, uid: string, pid: string, rid: string, over: Record<string, unknown> = {}) =>
  stamped(f, uid, 'lastReplyAt', (b) => b.set(doc(f, `forumPosts/${pid}/replies/${rid}`), reply(uid, over)));
function vote(f: Firestore, uid: string, pid: string, delta: number, withDoc = true) {
  const b = writeBatch(f);
  if (withDoc) {
    if (delta > 0) b.set(doc(f, `forumPosts/${pid}/votes/${uid}`), { at: serverTimestamp() });
    else b.delete(doc(f, `forumPosts/${pid}/votes/${uid}`));
  }
  b.update(doc(f, `forumPosts/${pid}`), { upvotes: increment(delta) });
  return b.commit();
}
/** A post written straight to the database (rules off), optionally back-dated. */
const seedPost = (id: string, uid: string, over: Record<string, unknown> = {}) =>
  seed((f) => setDoc(doc(f, `forumPosts/${id}`), post(uid, { createdAt: Timestamp.now(), updatedAt: Timestamp.now(), ...over })));

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-nextora', firestore: { rules: rules(), host: '127.0.0.1', port: 8080 } });
});
afterAll(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await seed((f) => setDoc(doc(f, 'roles/mod'), { role: 'moderator' }));
});

describe('creating posts', () => {
  it('a verified user posts with the rate-limit stamp', async () => {
    await assertSucceeds(createPost(as('alice'), 'alice', 'p1'));
  });
  it('an unverified user cannot post', async () => {
    await assertFails(createPost(as('alice', false), 'alice', 'p1'));
  });
  it('title must be 5-120 and body 1-4000 characters', async () => {
    await assertFails(createPost(as('alice'), 'alice', 'p1', { title: 'Hey' }));
    await assertFails(createPost(as('alice'), 'alice', 'p2', { title: 'x'.repeat(121) }));
    await assertFails(createPost(as('alice'), 'alice', 'p3', { body: '' }));
    await assertFails(createPost(as('alice'), 'alice', 'p4', { body: 'x'.repeat(4001) }));
    await assertSucceeds(createPost(as('alice'), 'alice', 'p5', { title: 'x'.repeat(120), body: 'x'.repeat(4000) }));
  });
  it('contact details and links are refused in the body', async () => {
    await assertFails(createPost(as('alice'), 'alice', 'p1', { body: 'call me on 050 123 4567' }));
    await assertFails(createPost(as('alice'), 'alice', 'p2', { body: 'mail a@b.com' }));
    await assertFails(createPost(as('alice'), 'alice', 'p3', { body: 'see https://example.com' }));
  });
  it('needs the stamp and allows one post per 60 seconds', async () => {
    const a = as('alice');
    await assertFails(setDoc(doc(a, 'forumPosts/p0'), post('alice')));
    await assertSucceeds(createPost(a, 'alice', 'p1'));
    await assertFails(createPost(a, 'alice', 'p2'));
  });
  it('rejects wrong author, topic, preset counters or extra fields', async () => {
    await assertFails(createPost(as('alice'), 'alice', 'p1', { authorUid: 'bob' }));
    await assertFails(createPost(as('alice'), 'alice', 'p2', { topic: 'crypto' }));
    await assertFails(createPost(as('alice'), 'alice', 'p3', { upvotes: 50 }));
    await assertFails(createPost(as('alice'), 'alice', 'p4', { hidden: true }));
    await assertFails(createPost(as('alice'), 'alice', 'p5', { pinned: true }));
  });
});

describe('sample content', () => {
  it('only moderators can write isSample posts and replies', async () => {
    await assertFails(createPost(as('alice'), 'alice', 'p1', { isSample: true }));
    await assertSucceeds(setDoc(doc(as('mod'), 'forumPosts/s1'), post('mod', { isSample: true })));
    await assertFails(createReply(as('alice'), 'alice', 's1', 'r1', { isSample: true }));
    await assertSucceeds(setDoc(doc(as('mod'), 'forumPosts/s1/replies/r1'), reply('mod', { isSample: true })));
  });
  it('moderators can hard-delete sample docs, not real ones; users cannot', async () => {
    await seedPost('s1', 'mod', { isSample: true });
    await seedPost('p1', 'alice');
    await assertFails(deleteDoc(doc(as('alice'), 'forumPosts/s1')));
    await assertFails(deleteDoc(doc(as('mod'), 'forumPosts/p1')));
    await assertSucceeds(deleteDoc(doc(as('mod'), 'forumPosts/s1')));
  });
});

describe('editing', () => {
  it('the author can edit within 15 minutes', async () => {
    await seedPost('p1', 'alice');
    await assertSucceeds(updateDoc(doc(as('alice'), 'forumPosts/p1'), {
      title: 'Edited title here', body: 'New body', updatedAt: serverTimestamp(), editedAt: serverTimestamp(),
    }));
  });
  it('not after 15 minutes', async () => {
    const old = Timestamp.fromMillis(Date.now() - 16 * 60 * 1000);
    await seedPost('p1', 'alice', { createdAt: old, updatedAt: old });
    await assertFails(updateDoc(doc(as('alice'), 'forumPosts/p1'), {
      title: 'Edited title here', body: 'New body', updatedAt: serverTimestamp(), editedAt: serverTimestamp(),
    }));
  });
  it('other users and moderators cannot edit the text; author cannot change other fields', async () => {
    await seedPost('p1', 'alice');
    const edit = { title: 'Edited title here', body: 'New body', updatedAt: serverTimestamp(), editedAt: serverTimestamp() };
    await assertFails(updateDoc(doc(as('bob'), 'forumPosts/p1'), edit));
    await assertFails(updateDoc(doc(as('mod'), 'forumPosts/p1'), edit));
    await assertFails(updateDoc(doc(as('alice'), 'forumPosts/p1'), { ...edit, topic: 'health' }));
    await assertFails(updateDoc(doc(as('alice'), 'forumPosts/p1'), { ...edit, body: 'call 050 123 4567' }));
  });
});

describe('soft delete and hide', () => {
  const tomb = () => ({ deleted: true, title: '', body: '', updatedAt: serverTimestamp() });
  it('author and moderator can soft-delete; others cannot', async () => {
    await seedPost('p1', 'alice');
    await seedPost('p2', 'alice');
    await assertFails(updateDoc(doc(as('bob'), 'forumPosts/p1'), tomb()));
    await assertSucceeds(updateDoc(doc(as('alice'), 'forumPosts/p1'), tomb()));
    await assertSucceeds(updateDoc(doc(as('mod'), 'forumPosts/p2'), tomb()));
  });
  it('a tombstone must clear the text', async () => {
    await seedPost('p1', 'alice');
    await assertFails(updateDoc(doc(as('alice'), 'forumPosts/p1'), { deleted: true, updatedAt: serverTimestamp() }));
  });
  it('only moderators hide; hidden posts are invisible to others', async () => {
    await seedPost('p1', 'alice');
    await assertFails(updateDoc(doc(as('alice'), 'forumPosts/p1'), { hidden: true, updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(as('mod'), 'forumPosts/p1'), { hidden: true, updatedAt: serverTimestamp() }));
    await assertFails(getDoc(doc(as('bob'), 'forumPosts/p1')));
    await assertSucceeds(getDoc(doc(as('alice'), 'forumPosts/p1')));
    await assertSucceeds(getDoc(doc(as('mod'), 'forumPosts/p1')));
    await assertSucceeds(getDocs(query(collection(as('bob'), 'forumPosts'), where('hidden', '==', false), limit(50))));
    await assertFails(getDocs(query(collection(as('bob'), 'forumPosts'), limit(50))));
  });
  it('replies: author or moderator soft-deletes', async () => {
    await seedPost('p1', 'alice');
    await assertSucceeds(createReply(as('bob'), 'bob', 'p1', 'r1'));
    await assertFails(updateDoc(doc(as('carol'), 'forumPosts/p1/replies/r1'), { deleted: true, body: '' }));
    await assertSucceeds(updateDoc(doc(as('bob'), 'forumPosts/p1/replies/r1'), { deleted: true, body: '' }));
  });
});

describe('replies', () => {
  it('verified, stamped, 10 s apart, safe text, not on a deleted post', async () => {
    await seedPost('p1', 'alice');
    await seedPost('gone', 'alice', { deleted: true, title: '', body: '' });
    await assertFails(createReply(as('bob', false), 'bob', 'p1', 'r0'));
    await assertFails(setDoc(doc(as('bob'), 'forumPosts/p1/replies/r0'), reply('bob')));
    await assertFails(createReply(as('bob'), 'bob', 'p1', 'r0', { body: 'www.example.com' }));
    await assertFails(createReply(as('bob'), 'bob', 'p1', 'r0', { body: 'x'.repeat(2001) }));
    await assertFails(createReply(as('bob'), 'bob', 'gone', 'r0'));
    await assertSucceeds(createReply(as('bob'), 'bob', 'p1', 'r1'));
    await assertFails(createReply(as('bob'), 'bob', 'p1', 'r2'));
  });
});

describe('votes', () => {
  it('+1 with my vote doc in the same batch', async () => {
    await seedPost('p1', 'alice');
    await assertSucceeds(vote(as('bob'), 'bob', 'p1', 1));
  });
  it('no vote doc, or a delta other than ±1, is refused', async () => {
    await seedPost('p1', 'alice');
    await assertFails(vote(as('bob'), 'bob', 'p1', 1, false));
    await assertFails(vote(as('bob'), 'bob', 'p1', 2));
    await assertFails(setDoc(doc(as('bob'), 'forumPosts/p1/votes/bob'), { at: serverTimestamp() }));
    await assertFails(vote(as('bob', false), 'bob', 'p1', 1));
  });
  it('cannot vote twice, cannot vote for someone else', async () => {
    await seedPost('p1', 'alice');
    await assertSucceeds(vote(as('bob'), 'bob', 'p1', 1));
    await assertFails(vote(as('bob'), 'bob', 'p1', 1));
    const f = as('bob');
    const b = writeBatch(f);
    b.set(doc(f, 'forumPosts/p1/votes/carol'), { at: serverTimestamp() });
    b.update(doc(f, 'forumPosts/p1'), { upvotes: increment(1) });
    await assertFails(b.commit());
  });
  it('-1 only by removing my vote', async () => {
    await seedPost('p1', 'alice');
    await assertFails(vote(as('bob'), 'bob', 'p1', -1));
    await assertSucceeds(vote(as('bob'), 'bob', 'p1', 1));
    await assertFails(vote(as('bob'), 'bob', 'p1', -1, false));
    await assertSucceeds(vote(as('bob'), 'bob', 'p1', -1));
  });
});

describe('saves', () => {
  it('private to the owner', async () => {
    await assertSucceeds(setDoc(doc(as('bob'), 'users/bob/saves/p1'), { at: serverTimestamp() }));
    await assertFails(setDoc(doc(as('bob'), 'users/alice/saves/p1'), { at: serverTimestamp() }));
    await assertFails(getDoc(doc(as('alice'), 'users/bob/saves/p1')));
    await assertSucceeds(deleteDoc(doc(as('bob'), 'users/bob/saves/p1')));
  });
});
