// Community events (meetups hosted by guides). Direct Firestore writes; the
// rules check host role, dates, text safety, rate limits and who may edit.
import { useEffect, useState } from 'react';
import {
  Timestamp, collection, deleteDoc, doc, getCountFromServer, getDoc, limit, onSnapshot, orderBy, query,
  serverTimestamp, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { Share } from 'react-native';
import { fb } from './firebase';
import { useAuth } from './auth';
import { unsafeText } from '../shared/matching';
import type { Emirate } from '../store/types';

export type Rsvp = 'going' | 'maybe' | 'notNow';
export interface CommunityEvent {
  id: string; hostUid: string; hostName: string; title: string; body: string; place: string;
  emirate: Emirate; language: string; startsAt: Date; endsAt: Date; capacity: number;
  status: 'scheduled' | 'cancelled'; hidden: boolean; isSample: boolean;
}
export interface EventInput {
  title: string; body: string; place: string; emirate: Emirate; language: string;
  startsAt: Date; endsAt: Date; capacity: number;
}

const need = () => {
  const s = fb();
  const uid = s?.auth.currentUser?.uid;
  if (!s || !uid) throw Object.assign(new Error(), { code: 'nextora/not-configured' });
  return { ...s, uid };
};
const fail = (code: string) => Object.assign(new Error(code), { code: `nextora/${code}` });

/** Friendly checks that mirror the rules. Returns an error key or null. */
export function checkEvent(e: EventInput): string | null {
  if (e.title.trim().length < 5 || e.title.length > 100) return 'events.errTitle';
  if (e.body.trim().length < 10 || e.body.length > 2000) return 'events.errBody';
  if (e.place.trim().length < 3) return 'events.errPlace';
  for (const t of [e.title, e.body, e.place]) {
    const bad = unsafeText(t);
    if (bad) return bad === 'contact' ? 'authErr.noContact' : 'authErr.noLinks';
  }
  if (!(e.startsAt.getTime() > Date.now())) return 'events.errPast';
  if (!(e.endsAt > e.startsAt) || e.endsAt.getTime() - e.startsAt.getTime() > 24 * 3600_000) return 'events.errEnd';
  return null;
}

const toEvent = (id: string, d: Record<string, unknown>): CommunityEvent => ({
  ...(d as Omit<CommunityEvent, 'id' | 'startsAt' | 'endsAt'>),
  id,
  startsAt: (d.startsAt as Timestamp).toDate(),
  endsAt: (d.endsAt as Timestamp).toDate(),
});

const fields = (e: EventInput) => ({
  title: e.title.trim(), body: e.body.trim(), place: e.place.trim(), emirate: e.emirate, language: e.language,
  startsAt: Timestamp.fromDate(e.startsAt), endsAt: Timestamp.fromDate(e.endsAt), capacity: Math.max(0, Math.min(500, Math.round(e.capacity))),
});

export async function hostEvent(e: EventInput, hostName: string): Promise<string> {
  const { db, uid } = need();
  const err = checkEvent(e);
  if (err) throw fail(err);
  const ref = doc(collection(db, 'events'));
  const b = writeBatch(db);
  b.set(doc(db, 'limits', uid), { lastEventAt: serverTimestamp() }, { merge: true });
  b.set(ref, {
    hostUid: uid, hostName, ...fields(e), status: 'scheduled', hidden: false, isSample: false,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  await b.commit();
  return ref.id;
}

export async function editEvent(id: string, e: EventInput) {
  const { db } = need();
  const err = checkEvent(e);
  if (err) throw fail(err);
  await updateDoc(doc(db, 'events', id), { ...fields(e), updatedAt: serverTimestamp() });
}
export async function cancelEvent(id: string) {
  const { db } = need();
  await updateDoc(doc(db, 'events', id), { status: 'cancelled', updatedAt: serverTimestamp() });
}
export async function setHidden(id: string, hidden: boolean) {
  const { db } = need();
  await updateDoc(doc(db, 'events', id), { hidden, updatedAt: serverTimestamp() });
}
export async function rsvp(id: string, status: Rsvp | null) {
  const { db, uid } = need();
  const ref = doc(db, 'events', id, 'rsvps', uid);
  if (status) await setDoc(ref, { status, at: serverTimestamp() });
  else await deleteDoc(ref);
}
export async function myRsvp(id: string): Promise<Rsvp | null> {
  const { db, uid } = need();
  const d = await getDoc(doc(db, 'events', id, 'rsvps', uid)).catch(() => null);
  return d?.exists() ? (d.data().status as Rsvp) : null;
}
/** Host only: how many said "going". The list of people is never shown. */
export async function goingCount(id: string): Promise<number | null> {
  const { db } = need();
  try {
    const snap = await getCountFromServer(query(collection(db, 'events', id, 'rsvps'), where('status', '==', 'going')));
    return snap.data().count;
  } catch { return null; }
}

/** Upcoming, visible events (and my own, even if hidden). Live. */
export function useEvents() {
  const { user, status, verified } = useAuth();
  const [v, setV] = useState<{ data?: CommunityEvent[]; error: boolean }>({ error: false });
  useEffect(() => {
    const s = fb();
    if (!s || !user || status !== 'ready' || !verified) return;
    setV({ error: false });
    const q = query(collection(s.db, 'events'), where('hidden', '==', false), orderBy('startsAt', 'asc'), limit(100));
    return onSnapshot(q,
      (snap) => setV({ data: snap.docs.map((d) => toEvent(d.id, d.data())).filter((e) => e.endsAt.getTime() > Date.now()), error: false }),
      () => setV({ error: true }));
  }, [user?.uid, status, verified]);
  return v;
}

export function useEvent(id: string) {
  const { user } = useAuth();
  const [v, setV] = useState<{ data?: CommunityEvent | null; error: boolean }>({ error: false });
  useEffect(() => {
    const s = fb();
    if (!s || !user) return;
    return onSnapshot(doc(s.db, 'events', id), (d) => setV({ data: d.exists() ? toEvent(d.id, d.data()) : null, error: false }), () => setV({ data: null, error: false }));
  }, [id, user?.uid]);
  return v;
}

/** Shares an .ics calendar entry (no extra native packages). */
export async function addToCalendar(e: CommunityEvent) {
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NEXTORA//Events//EN', 'BEGIN:VEVENT',
    `UID:${e.id}@nextora`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(e.startsAt)}`, `DTEND:${f(e.endsAt)}`,
    `SUMMARY:${esc(e.title)}`, `LOCATION:${esc(e.place)}`, `DESCRIPTION:${esc(e.body)}`, 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  await Share.share({ title: `${e.title}.ics`, message: ics });
}

export const fmtWhen = (d: Date, lang: string) =>
  d.toLocaleString(lang, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
