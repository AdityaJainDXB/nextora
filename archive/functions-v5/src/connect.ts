// Stage 4: matching, directory, connection requests, chat, mutual contact
// reveal, reports and blocks. Everything that touches another person goes
// through here, so verification, blocks, limits and filters are enforced on the
// server rather than in the app.
import { FieldValue, getFirestore, type Firestore } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { rankMatches, unsafeText, type Me, type Other } from './matching.js';

const db = (): Firestore => getFirestore();
const enforceAppCheck = process.env.FUNCTIONS_EMULATOR !== 'true';

export const LIMITS = {
  requestsPerDay: 20,
  messagesPerMinute: 20,
  reportsPerDay: 10,
  refreshPerHour: 10,
  directoryPerMinute: 30,
  introMax: 500,
  messageMax: 1000,
  contactMax: 200,
  candidateCap: 200,
};
const REPORT_REASONS = ['harassment', 'scam', 'impersonation', 'childSafety', 'hate', 'other'] as const;

// ---- helpers ----

function verifiedUser(req: CallableRequest): string {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  if (req.auth.token.email_verified !== true) throw new HttpsError('failed-precondition', 'verify-email');
  return req.auth.uid;
}

export const pairId = (a: string, b: string) => [a, b].sort().join('_');

/** Everyone `uid` blocked, plus everyone who blocked `uid`. */
async function blockSet(uid: string): Promise<Set<string>> {
  const [mine, theirs] = await Promise.all([
    db().collection(`blocks/${uid}/blocked`).get(),
    db().collectionGroup('blocked').where('uid', '==', uid).get(),
  ]);
  const s = new Set<string>(mine.docs.map((d) => d.id));
  theirs.docs.forEach((d) => { const owner = d.ref.parent.parent?.id; if (owner) s.add(owner); });
  return s;
}

/** Fixed-window rate limit stored per user and action. */
async function rateLimit(uid: string, action: string, max: number, windowMs: number) {
  const ref = db().doc(`rateLimits/${uid}`);
  await db().runTransaction(async (tx) => {
    const now = Date.now();
    const cur = (await tx.get(ref)).data()?.[action] as { start: number; count: number } | undefined;
    const fresh = !cur || now - cur.start > windowMs;
    const next = fresh ? { start: now, count: 1 } : { start: cur.start, count: cur.count + 1 };
    if (next.count > max) throw new HttpsError('resource-exhausted', 'rate-limited');
    tx.set(ref, { [action]: next }, { merge: true });
  });
}

function cleanText(v: unknown, max: number): string {
  if (typeof v !== 'string') throw new HttpsError('invalid-argument', 'text');
  const t = v.trim();
  if (!t || t.length > max) throw new HttpsError('invalid-argument', 'length');
  const bad = unsafeText(t);
  if (bad) throw new HttpsError('invalid-argument', bad === 'contact' ? 'no-contact-details' : 'no-links');
  return t;
}

// ---- matching ----

export async function computeMatches(uid: string) {
  const priv = await db().doc(`users/${uid}/private/profile`).get();
  if (!priv.exists) { await db().doc(`matchCandidates/${uid}`).delete(); return; }
  const me = priv.data() as Me;
  const wanted = me.role === 'newcomer' ? 'volunteer' : 'newcomer';
  const pub = db().collection('publicProfiles');

  // Candidates: shared language (highest weight) and same emirate, capped.
  const langs = (me.visibility?.languages ? me.languages : []).slice(0, 10);
  const queries = [];
  if (langs.length) queries.push(pub.where('role', '==', wanted).where('languages', 'array-contains-any', langs).limit(LIMITS.candidateCap).get());
  if (me.visibility?.emirate) queries.push(pub.where('role', '==', wanted).where('emirate', '==', me.emirate).limit(LIMITS.candidateCap).get());
  if (!queries.length) queries.push(pub.where('role', '==', wanted).limit(LIMITS.candidateCap).get());
  const [snaps, blocked] = await Promise.all([Promise.all(queries), blockSet(uid)]);

  const pool = new Map<string, Other>();
  snaps.forEach((s) => s.docs.forEach((d) => {
    if (d.id !== uid && !blocked.has(d.id)) pool.set(d.id, { uid: d.id, ...(d.data() as Omit<Other, 'uid'>) });
  }));
  const items = rankMatches(me, [...pool.values()]);
  await db().doc(`matchCandidates/${uid}`).set({ items, updatedAt: FieldValue.serverTimestamp() });
}

export const refreshMatches = onCall({ enforceAppCheck }, async (req) => {
  const uid = verifiedUser(req);
  await rateLimit(uid, 'refresh', LIMITS.refreshPerHour, 3600_000);
  await computeMatches(uid);
  return { ok: true };
});

export const dailyMatchRefresh = onSchedule('every 24 hours', async () => {
  let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let q = db().collection('publicProfiles').orderBy('__name__').limit(200);
    if (last) q = q.startAfter(last);
    const page = await q.get();
    if (page.empty) break;
    for (const d of page.docs) await computeMatches(d.id).catch(() => {});
    last = page.docs[page.docs.length - 1];
  }
});

// ---- directory (manual, no AI) ----

export const searchDirectory = onCall({ enforceAppCheck }, async (req) => {
  const uid = verifiedUser(req);
  await rateLimit(uid, 'directory', LIMITS.directoryPerMinute, 60_000);
  const f = (req.data ?? {}) as { role?: string; emirate?: string; interest?: string; language?: string; q?: string };
  let q: FirebaseFirestore.Query = db().collection('publicProfiles');
  if (f.role === 'newcomer' || f.role === 'volunteer') q = q.where('role', '==', f.role);
  if (typeof f.emirate === 'string') q = q.where('emirate', '==', f.emirate);
  if (typeof f.language === 'string') q = q.where('languages', 'array-contains', f.language);
  const [snap, blocked] = await Promise.all([q.limit(LIMITS.candidateCap).get(), blockSet(uid)]);
  const needle = typeof f.q === 'string' ? f.q.trim().toLowerCase() : '';
  const items = snap.docs
    .filter((d) => d.id !== uid && !blocked.has(d.id))
    .map((d) => ({ uid: d.id, ...d.data() } as Record<string, unknown> & { uid: string }))
    .filter((p) => !f.interest || (Array.isArray(p.interests) && p.interests.includes(f.interest)))
    .filter((p) => !needle || String(p.displayName).toLowerCase().includes(needle))
    .slice(0, 50)
    .map(({ updatedAt: _u, ...p }) => p);
  return { items };
});

// ---- connections ----

export const requestConnection = onCall({ enforceAppCheck }, async (req) => {
  const from = verifiedUser(req);
  const { to, intro } = (req.data ?? {}) as { to?: string; intro?: string };
  if (typeof to !== 'string' || to === from) throw new HttpsError('invalid-argument', 'to');
  const text = cleanText(intro, LIMITS.introMax);
  if (!(await db().doc(`publicProfiles/${to}`).get()).exists) throw new HttpsError('not-found', 'person');
  if ((await blockSet(from)).has(to)) throw new HttpsError('permission-denied', 'blocked');
  await rateLimit(from, 'request', LIMITS.requestsPerDay, 86400_000);

  const id = pairId(from, to);
  const ref = db().doc(`connections/${id}`);
  await db().runTransaction(async (tx) => {
    const cur = await tx.get(ref);
    if (cur.exists && cur.data()?.status !== 'declined') throw new HttpsError('already-exists', 'exists');
    tx.set(ref, {
      members: [from, to], from, to, status: 'pending', intro: text,
      reveal: { [from]: false, [to]: false }, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
  });
  await db().doc(`matchDecisions/${from}/items/${to}`).set({ decision: 'accepted', at: FieldValue.serverTimestamp() });
  return { id };
});

export const respondConnection = onCall({ enforceAppCheck }, async (req) => {
  const uid = verifiedUser(req);
  const { id, accept } = (req.data ?? {}) as { id?: string; accept?: boolean };
  const ref = db().doc(`connections/${String(id)}`);
  await db().runTransaction(async (tx) => {
    const c = (await tx.get(ref)).data();
    if (!c || c.to !== uid || c.status !== 'pending') throw new HttpsError('failed-precondition', 'not-pending');
    tx.update(ref, { status: accept ? 'connected' : 'declined', updatedAt: FieldValue.serverTimestamp() });
  });
  return { ok: true };
});

async function memberConnection(uid: string, id: unknown) {
  const ref = db().doc(`connections/${String(id)}`);
  const c = (await ref.get()).data();
  if (!c || !(c.members as string[]).includes(uid)) throw new HttpsError('permission-denied', 'not-member');
  return { ref, c, other: (c.members as string[]).find((m) => m !== uid)! };
}

export const sendMessage = onCall({ enforceAppCheck }, async (req) => {
  const uid = verifiedUser(req);
  const { id, text } = (req.data ?? {}) as { id?: string; text?: string };
  const { ref, c, other } = await memberConnection(uid, id);
  if (c.status !== 'connected') throw new HttpsError('failed-precondition', 'not-connected');
  if ((await blockSet(uid)).has(other)) throw new HttpsError('permission-denied', 'blocked');
  const body = cleanText(text, LIMITS.messageMax);
  await rateLimit(uid, 'message', LIMITS.messagesPerMinute, 60_000);
  await db().collection(`chats/${ref.id}/messages`).add({ from: uid, text: body, at: FieldValue.serverTimestamp() });
  await ref.update({ updatedAt: FieldValue.serverTimestamp() });
  return { ok: true };
});

/** Offer (or withdraw) contact details. They become readable only when both offered. */
export const setReveal = onCall({ enforceAppCheck }, async (req) => {
  const uid = verifiedUser(req);
  const { id, on, contact } = (req.data ?? {}) as { id?: string; on?: boolean; contact?: string };
  const { ref, c } = await memberConnection(uid, id);
  if (c.status !== 'connected') throw new HttpsError('failed-precondition', 'not-connected');
  const contactRef = db().doc(`connections/${ref.id}/contact/${uid}`);
  if (on) {
    if (typeof contact !== 'string' || !contact.trim() || contact.length > LIMITS.contactMax) throw new HttpsError('invalid-argument', 'contact');
    await contactRef.set({ text: contact.trim(), at: FieldValue.serverTimestamp() });
  } else {
    await contactRef.delete();
  }
  await ref.update({ [`reveal.${uid}`]: !!on, updatedAt: FieldValue.serverTimestamp() });
  return { ok: true };
});

// ---- safety ----

export const reportUser = onCall({ enforceAppCheck }, async (req) => {
  const uid = verifiedUser(req);
  const { target, reason, note, connectionId } = (req.data ?? {}) as Record<string, unknown>;
  if (typeof target !== 'string' || target === uid) throw new HttpsError('invalid-argument', 'target');
  if (!REPORT_REASONS.includes(reason as (typeof REPORT_REASONS)[number])) throw new HttpsError('invalid-argument', 'reason');
  const text = typeof note === 'string' ? note.trim().slice(0, 1000) : '';
  await rateLimit(uid, 'report', LIMITS.reportsPerDay, 86400_000);
  const now = Date.now();
  // Child safety reports get the shortest response window.
  const slaHours = reason === 'childSafety' ? 1 : 24;
  await db().collection('reports').add({
    reporter: uid, targetType: 'user', target, reason, note: text,
    connectionId: typeof connectionId === 'string' ? connectionId : null,
    status: 'open', assignee: null, createdAt: FieldValue.serverTimestamp(), slaDueAt: new Date(now + slaHours * 3600_000),
    audit: [{ action: 'created', by: 'reporter', at: new Date(now) }],
  });
  return { ok: true };
});

/** A block closes any connection between the two people. */
export const onBlockCreated = onDocumentCreated('blocks/{uid}/blocked/{other}', async (event) => {
  const { uid, other } = event.params;
  const ref = db().doc(`connections/${pairId(uid, other)}`);
  if ((await ref.get()).exists) await ref.update({ status: 'blocked', updatedAt: FieldValue.serverTimestamp() });
  await computeMatches(uid).catch(() => {});
});
