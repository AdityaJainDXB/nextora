// Community events: guides host meetups; rules are the only enforcement (Spark plan).
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp, collection, deleteDoc, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, updateDoc, writeBatch, type Firestore } from 'firebase/firestore';

let env: RulesTestEnvironment;
const as = (uid: string, verified = true) => env.authenticatedContext(uid, { email_verified: verified }).firestore();
const seed = (fn: (f: Firestore) => Promise<unknown>) => env.withSecurityRulesDisabled(async (c) => { await fn(c.firestore()); });
const inDays = (d: number, h = 0) => Timestamp.fromMillis(Date.now() + d * 86400_000 + h * 3600_000);

const ev = (host: string, name: string, extra: Record<string, unknown> = {}) => ({
  hostUid: host, hostName: name, title: 'Newcomers coffee meetup', body: 'Meet other newcomers and ask questions in a friendly group.',
  place: 'Public cafe near the metro station', emirate: 'dubai', language: 'en', startsAt: inDays(3), endsAt: inDays(3, 2),
  capacity: 20, status: 'scheduled', hidden: false, isSample: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra,
});
function host(uid: string, data: Record<string, unknown>, id = 'e1') {
  const f = as(uid);
  const b = writeBatch(f);
  b.set(doc(f, `limits/${uid}`), { lastEventAt: serverTimestamp() }, { merge: true });
  b.set(doc(f, `events/${id}`), data);
  return b.commit();
}

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-nextora', firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } });
});
afterAll(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await seed(async (f) => {
    await setDoc(doc(f, 'users/guide/private/profile'), { role: 'volunteer' });
    await setDoc(doc(f, 'publicProfiles/guide'), { displayName: 'Anjali', role: 'volunteer' });
    await setDoc(doc(f, 'users/newbie/private/profile'), { role: 'newcomer' });
    await setDoc(doc(f, 'publicProfiles/newbie'), { displayName: 'Ravi', role: 'newcomer' });
  });
});

describe('hosting', () => {
  it('a verified guide can host', async () => { await assertSucceeds(host('guide', ev('guide', 'Anjali'))); });
  it('newcomers and unverified users cannot host', async () => {
    await assertFails(host('newbie', ev('newbie', 'Ravi')));
    const f = as('guide', false);
    const b = writeBatch(f);
    b.set(doc(f, 'limits/guide'), { lastEventAt: serverTimestamp() }, { merge: true });
    b.set(doc(f, 'events/e1'), ev('guide', 'Anjali'));
    await assertFails(b.commit());
  });
  it('cannot host as someone else or under another name', async () => {
    await assertFails(host('guide', ev('newbie', 'Anjali')));
    await assertFails(host('guide', ev('guide', 'Official UAE Team')));
  });
  it('rejects past dates, over-long events, contact details and links', async () => {
    await assertFails(host('guide', ev('guide', 'Anjali', { startsAt: inDays(-1), endsAt: inDays(-1, 1) })));
    await assertFails(host('guide', ev('guide', 'Anjali', { endsAt: inDays(5) })));
    await assertFails(host('guide', ev('guide', 'Anjali', { body: 'WhatsApp me on +971 50 123 4567 to join' })));
    await assertFails(host('guide', ev('guide', 'Anjali', { place: 'see www.example.com' })));
  });
  it('cannot pre-hide, pre-cancel or mark as sample', async () => {
    await assertFails(host('guide', ev('guide', 'Anjali', { status: 'cancelled' })));
    await assertFails(host('guide', ev('guide', 'Anjali', { isSample: true })));
  });
  it('hosting twice within 5 minutes is refused', async () => {
    await assertSucceeds(host('guide', ev('guide', 'Anjali'), 'e1'));
    await assertFails(host('guide', ev('guide', 'Anjali'), 'e2'));
  });
});

describe('editing and moderation', () => {
  beforeEach(async () => { await seed((f) => setDoc(doc(f, 'events/e1'), { ...ev('guide', 'Anjali'), createdAt: new Date(), updatedAt: new Date() })); });
  it('host edits and cancels; cannot reopen or change host', async () => {
    await assertSucceeds(updateDoc(doc(as('guide'), 'events/e1'), { place: 'Library meeting room', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as('guide'), 'events/e1'), { hostUid: 'newbie', updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(as('guide'), 'events/e1'), { status: 'cancelled', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as('guide'), 'events/e1'), { status: 'scheduled', updatedAt: serverTimestamp() }));
  });
  it('others cannot edit; moderators can hide', async () => {
    await assertFails(updateDoc(doc(as('newbie'), 'events/e1'), { title: 'Changed title here', updatedAt: serverTimestamp() }));
    await seed((f) => setDoc(doc(f, 'roles/mod1'), { role: 'moderator' }));
    await assertSucceeds(updateDoc(doc(as('mod1'), 'events/e1'), { hidden: true, updatedAt: serverTimestamp() }));
    await assertFails(getDoc(doc(as('newbie'), 'events/e1')));
    await assertSucceeds(getDoc(doc(as('guide'), 'events/e1')));
  });
  it('listing needs a verified email and a limit', async () => {
    await assertSucceeds(getDocs(query(collection(as('newbie'), 'events'), limit(50))));
    await assertFails(getDocs(query(collection(as('newbie', false), 'events'), limit(50))));
  });
  it('host can delete their event; others cannot', async () => {
    await assertFails(deleteDoc(doc(as('newbie'), 'events/e1')));
    await assertSucceeds(deleteDoc(doc(as('guide'), 'events/e1')));
  });
});

describe('RSVPs', () => {
  beforeEach(async () => { await seed((f) => setDoc(doc(f, 'events/e1'), { ...ev('guide', 'Anjali'), createdAt: new Date(), updatedAt: new Date() })); });
  it('anyone verified can RSVP for themselves only', async () => {
    await assertSucceeds(setDoc(doc(as('newbie'), 'events/e1/rsvps/newbie'), { status: 'going', at: serverTimestamp() }));
    await assertFails(setDoc(doc(as('newbie'), 'events/e1/rsvps/guide'), { status: 'going', at: serverTimestamp() }));
    await assertFails(setDoc(doc(as('newbie'), 'events/e1/rsvps/newbie'), { status: 'vip', at: serverTimestamp() }));
  });
  it('only the host can see who RSVPd', async () => {
    await seed((f) => setDoc(doc(f, 'events/e1/rsvps/newbie'), { status: 'going', at: new Date() }));
    await assertSucceeds(getDocs(collection(as('guide'), 'events/e1/rsvps')));
    await assertFails(getDocs(collection(as('newbie'), 'events/e1/rsvps')));
  });
  it('cannot RSVP to a cancelled event', async () => {
    await seed((f) => updateDoc(doc(f, 'events/e1'), { status: 'cancelled' }));
    await assertFails(setDoc(doc(as('newbie'), 'events/e1/rsvps/newbie'), { status: 'going', at: serverTimestamp() }));
  });
});
