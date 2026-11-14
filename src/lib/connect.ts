// Matching, directory, connections and chat on the Firebase Spark plan (no Cloud
// Functions). The app writes directly to Firestore; firestore.rules enforces
// verification, blocks, contact-detail filtering, rate limits and the mutual reveal.
// The checks below mirror the rules only to give friendly messages.
import { useEffect, useState } from 'react';
import {
  collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc,
  updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { fb } from './firebase';
import { useAuth } from './auth';
import { rankMatches, unsafeText, type Match, type Me, type Other, type Reason } from '../shared/matching';
import type { Decision, Profile, PublicProfile } from '../store/types';

export type { Match, Reason };
type Person = PublicProfile & { uid: string };
const CAP = 200;

const need = () => {
  const s = fb();
  if (!s) throw Object.assign(new Error(), { code: 'nextora/not-configured' });
  const uid = s.auth.currentUser?.uid;
  if (!uid) throw Object.assign(new Error(), { code: 'nextora/not-signed-in' });
  return { ...s, uid };
};
const fail = (code: string) => Object.assign(new Error(code), { code: `nextora/${code}` });

/** Friendly error key for a failed action. */
export function connectErrorKey(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'nextora/no-contact': 'noContact', 'nextora/no-links': 'noLinks', 'nextora/too-soon': 'rateLimited',
    'nextora/blocked': 'blocked', 'nextora/exists': 'exists', 'nextora/not-configured': 'notConfigured',
    'permission-denied': 'notAllowed', unavailable: 'network',
  };
  return map[code] ?? 'generic';
}

function checkText(t: string) {
  const bad = unsafeText(t);
  if (bad) throw fail(bad === 'contact' ? 'no-contact' : 'no-links');
}

/** Local mirror of the rules' minimum intervals, for a clear "try again shortly" message. */
const last: Record<string, number> = {};
function tooSoon(field: string, secs: number) {
  if (Date.now() - (last[field] ?? 0) < secs * 1000) throw fail('too-soon');
}
const stamp = (field: string) => { last[field] = Date.now(); };

// ---------- matching (on device) ----------

const toMe = (p: Profile): Me => ({
  role: p.role, persona: p.persona, emirate: p.emirate, interests: p.interests, family: p.family,
  languages: p.languages, visibility: p.visibility,
});

/**
 * Suggestions: people of the other role who share a language or my emirate,
 * capped at 200 from Firestore, scored on this device. Only visible fields are used.
 */
export async function computeMatches(me: Profile, blocked: string[]): Promise<Match[]> {
  const { db, uid } = need();
  const wanted = me.role === 'newcomer' ? 'volunteer' : 'newcomer';
  const pub = collection(db, 'publicProfiles');
  const langs = me.visibility.languages ? me.languages.slice(0, 10) : [];
  const qs = [];
  if (langs.length) qs.push(getDocs(query(pub, where('role', '==', wanted), where('languages', 'array-contains-any', langs), limit(CAP))));
  if (me.visibility.emirate) qs.push(getDocs(query(pub, where('role', '==', wanted), where('emirate', '==', me.emirate), limit(CAP))));
  if (!qs.length) qs.push(getDocs(query(pub, where('role', '==', wanted), limit(CAP))));
  const pool = new Map<string, Other>();
  for (const snap of await Promise.all(qs)) {
    snap.docs.forEach((d) => {
      if (d.id !== uid && !blocked.includes(d.id)) pool.set(d.id, { uid: d.id, ...(d.data() as Omit<Other, 'uid'>) });
    });
  }
  const people = Object.fromEntries([...pool.values()].map((p) => [p.uid, p]));
  rememberProfiles(Object.values(people) as unknown as Person[]);
  return rankMatches(toMe(me), [...pool.values()]);
}

/** Manual directory: plain filters, no scoring, no AI. */
export async function searchDirectory(f: { role?: string; emirate?: string; interest?: string; language?: string; q?: string }, blocked: string[]) {
  const { db, uid } = need();
  const cons = [];
  if (f.role) cons.push(where('role', '==', f.role));
  if (f.emirate) cons.push(where('emirate', '==', f.emirate));
  if (f.language) cons.push(where('languages', 'array-contains', f.language));
  const snap = await getDocs(query(collection(db, 'publicProfiles'), ...cons, limit(CAP)));
  const needle = (f.q ?? '').trim().toLowerCase();
  const items = snap.docs
    .filter((d) => d.id !== uid && !blocked.includes(d.id))
    .map((d) => ({ uid: d.id, ...(d.data() as PublicProfile) }))
    .filter((p) => !f.interest || (p.interests ?? []).includes(f.interest as never))
    .filter((p) => !needle || p.displayName.toLowerCase().includes(needle))
    .slice(0, 50);
  rememberProfiles(items);
  return { items };
}

export async function setDecision(uid: string, other: string, decision: Decision | null) {
  const { db } = need();
  const ref = doc(db, 'matchDecisions', uid, 'items', other);
  if (decision) await setDoc(ref, { decision, at: serverTimestamp() });
  else await deleteDoc(ref);
}

// ---------- connections ----------

export const pairId = (a: string, b: string) => [a, b].sort().join('_');

export async function requestConnection(to: string, intro: string) {
  const { db, uid } = need();
  const text = intro.trim();
  checkText(text);
  tooSoon('lastRequestAt', 30);
  const members = [uid, to].sort();
  const id = members.join('_');
  if ((await getDoc(doc(db, 'connections', id)).catch(() => null))?.exists()) throw fail('exists');
  const b = writeBatch(db);
  b.set(doc(db, 'limits', uid), { lastRequestAt: serverTimestamp() }, { merge: true });
  b.set(doc(db, 'connections', id), {
    members, from: uid, to, status: 'pending', intro: text, reveal: {}, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  b.set(doc(db, 'matchDecisions', uid, 'items', to), { decision: 'accepted', at: serverTimestamp() });
  await b.commit();
  stamp('lastRequestAt');
  return { id };
}

export async function respondConnection(id: string, accept: boolean) {
  const { db } = need();
  await updateDoc(doc(db, 'connections', id), { status: accept ? 'connected' : 'declined', updatedAt: serverTimestamp() });
}

export async function sendMessage(id: string, text: string) {
  const { db, uid } = need();
  const body = text.trim();
  checkText(body);
  tooSoon('lastMessageAt', 1);
  const b = writeBatch(db);
  b.set(doc(db, 'limits', uid), { lastMessageAt: serverTimestamp() }, { merge: true });
  b.set(doc(collection(db, 'chats', id, 'messages')), { from: uid, text: body, at: serverTimestamp() });
  b.update(doc(db, 'connections', id), { updatedAt: serverTimestamp() });
  await b.commit();
  stamp('lastMessageAt');
}

/** Offer (or withdraw) contact details; the other person can read them only after both offered. */
export async function setReveal(id: string, on: boolean, contact?: string) {
  const { db, uid } = need();
  const b = writeBatch(db);
  const ref = doc(db, 'connections', id, 'contact', uid);
  if (on) b.set(ref, { text: (contact ?? '').trim().slice(0, 200), at: serverTimestamp() });
  else b.delete(ref);
  b.update(doc(db, 'connections', id), { [`reveal.${uid}`]: on, updatedAt: serverTimestamp() });
  await b.commit();
}

export async function reportUser(target: string, reason: string, note: string, contextId?: string, targetType: 'user' | 'post' | 'reply' | 'event' = 'user') {
  const { db, uid } = need();
  tooSoon('lastReportAt', 10);
  const b = writeBatch(db);
  b.set(doc(db, 'limits', uid), { lastReportAt: serverTimestamp() }, { merge: true });
  b.set(doc(collection(db, 'reports')), {
    reporter: uid, targetType, target, reason, note: note.trim().slice(0, 1000), contextId: contextId ?? null,
    status: 'open', assignee: null, createdAt: serverTimestamp(), slaHours: reason === 'childSafety' ? 1 : 24,
  });
  await b.commit();
  stamp('lastReportAt');
}

/** Block: they can't contact you or open your profile; any conversation closes. */
export async function block(uid: string, other: string) {
  const { db } = need();
  const b = writeBatch(db);
  b.set(doc(db, 'blocks', uid, 'blocked', other), { uid: other, at: serverTimestamp() });
  const c = await getDoc(doc(db, 'connections', pairId(uid, other))).catch(() => null);
  if (c?.exists()) b.update(c.ref, { status: 'blocked', updatedAt: serverTimestamp() });
  await b.commit();
}
export async function unblock(uid: string, other: string) {
  const { db } = need();
  await deleteDoc(doc(db, 'blocks', uid, 'blocked', other));
}

// ---------- profiles (cached) ----------
const profileCache = new Map<string, Person>();
function rememberProfiles(list: Person[]) { list.forEach((p) => profileCache.set(p.uid, p)); }
export async function getPublicProfile(uid: string): Promise<Person | null> {
  if (profileCache.has(uid)) return profileCache.get(uid)!;
  const s = fb();
  if (!s) return null;
  const snap = await getDoc(doc(s.db, 'publicProfiles', uid)).catch(() => null);
  if (!snap?.exists()) return null;
  const p = { uid, ...(snap.data() as PublicProfile) };
  profileCache.set(uid, p);
  return p;
}
export function usePublicProfiles(uids: string[]) {
  const [map, setMap] = useState<Record<string, Person>>({});
  const key = uids.join(',');
  useEffect(() => {
    let alive = true;
    Promise.all(uids.map(getPublicProfile)).then((list) => {
      if (alive) setMap(Object.fromEntries(list.filter(Boolean).map((p) => [p!.uid, p!])));
    });
    return () => { alive = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return map;
}

// ---------- live data ----------

function useLive<T>(subscribe: ((set: (v: T) => void, fail: () => void) => () => void) | null, deps: unknown[]) {
  const [v, setV] = useState<{ data?: T; error: boolean }>({ error: false });
  useEffect(() => {
    if (!subscribe) return;
    setV({ error: false });
    return subscribe((data) => setV({ data, error: false }), () => setV({ error: true }));
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return v;
}

/** Suggestions for the signed-in person, recomputed on demand (Regenerate). */
export function useMatchCandidates(profile: Profile | null, blocked: string[] | undefined, enabled: boolean) {
  const [v, setV] = useState<{ data?: Match[]; error: boolean }>({ error: false });
  const [n, setN] = useState(0);
  const key = JSON.stringify([profile, blocked, enabled, n]);
  useEffect(() => {
    if (!profile || !blocked || !enabled) return;
    let alive = true;
    setV({ error: false });
    computeMatches(profile, blocked)
      .then((data) => { if (alive) setV({ data, error: false }); })
      .catch(() => { if (alive) setV({ error: true }); });
    return () => { alive = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...v, regenerate: () => setN((x) => x + 1) };
}

export function useDecisions() {
  const { user, status } = useAuth();
  return useLive<Record<string, Decision>>(user && status === 'ready' ? (set, err) =>
    onSnapshot(collection(fb()!.db, 'matchDecisions', user.uid, 'items'),
      (s) => set(Object.fromEntries(s.docs.map((d) => [d.id, d.data().decision as Decision]))), err) : null, [user?.uid, status]);
}

export interface Connection {
  id: string; members: string[]; from: string; to: string;
  status: 'pending' | 'connected' | 'declined' | 'blocked'; intro: string; reveal: Record<string, boolean>;
  /** True while this device has an uncommitted optimistic connection write. */
  pending?: boolean;
}

export function useConnections() {
  const { user, status } = useAuth();
  return useLive<Connection[]>(user && status === 'ready' ? (set, err) =>
    onSnapshot(query(collection(fb()!.db, 'connections'), where('members', 'array-contains', user.uid), orderBy('updatedAt', 'desc')),
      (s) => set(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Connection, 'id'>) }))), err) : null, [user?.uid, status]);
}

export function useConnection(id: string) {
  const { user } = useAuth();
  return useLive<Connection | null>(user ? (set, err) =>
    onSnapshot(doc(fb()!.db, 'connections', id), (s) => set(s.exists() ? ({ id: s.id, ...(s.data() as Omit<Connection, 'id'>), pending: s.metadata.hasPendingWrites }) : null), () => set(null)) : null, [id, user?.uid]);
}

export interface ChatMessage { id: string; from: string; text: string; at: Date | null }
export function useMessages(id: string, enabled: boolean) {
  return useLive<ChatMessage[]>(enabled ? (set, err) =>
    onSnapshot(query(collection(fb()!.db, 'chats', id, 'messages'), orderBy('at', 'asc')),
      (s) => set(s.docs.map((d) => ({ id: d.id, from: d.data().from, text: d.data().text, at: d.data().at?.toDate?.() ?? null }))), err) : null, [id, enabled]);
}

/** The other person's contact text; the rules only allow it once both agreed. */
export function useRevealedContact(id: string, other: string | undefined, bothAgreed: boolean) {
  return useLive<string | null>(other && bothAgreed ? (set, err) =>
    onSnapshot(doc(fb()!.db, 'connections', id, 'contact', other), (s) => set(s.exists() ? (s.data().text as string) : null), err) : null, [id, other, bothAgreed]);
}

export function useBlocks() {
  const { user, status } = useAuth();
  return useLive<string[]>(user && status === 'ready' ? (set, err) =>
    onSnapshot(collection(fb()!.db, 'blocks', user.uid, 'blocked'), (s) => set(s.docs.map((d) => d.id)), err) : null, [user?.uid, status]);
}
