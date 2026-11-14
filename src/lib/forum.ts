// Community forum on the Firebase Spark plan. Writes go straight to Firestore;
// rules/forum.rules.snippet (pasted into firestore.rules) enforces verification,
// lengths, contact filtering, rate limits, the 15-minute edit window and ±1 votes.
// Checks here only mirror the rules to give friendly messages.
import { useEffect, useState } from 'react';
import {
  collection, deleteDoc, doc, increment, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc,
  updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { fb } from './firebase';
import { useAuth } from './auth';
import { myRole } from './account';
import { unsafeText } from '../shared/matching';
import type { Emirate } from '../store/types';

export const TOPICS = [
  'housing', 'schoolsFamily', 'jobsWork', 'visasPaperwork', 'health', 'foodGroceries', 'transport', 'events', 'newcomers',
] as const;
export type Topic = (typeof TOPICS)[number];
/** Topics where we show a scam warning in the composer. */
export const SCAM_TOPICS: Topic[] = ['housing', 'jobsWork'];
export const EDIT_WINDOW_MS = 15 * 60 * 1000;
export const LIMITS = { titleMin: 5, titleMax: 120, bodyMax: 4000, replyMax: 2000 };
const CAP = 200;

export interface ForumPost {
  id: string; authorUid: string; displayName: string; topic: Topic; emirate: Emirate; language: string;
  title: string; body: string; createdAt: Date | null; updatedAt: Date | null; editedAt: Date | null;
  hidden: boolean; deleted: boolean; isSample: boolean; upvotes: number;
}
export interface ForumReply {
  id: string; authorUid: string; displayName: string; body: string; createdAt: Date | null; deleted: boolean; isSample: boolean;
}

const need = () => {
  const s = fb();
  if (!s) throw Object.assign(new Error(), { code: 'nextora/not-configured' });
  const uid = s.auth.currentUser?.uid;
  if (!uid) throw Object.assign(new Error(), { code: 'nextora/not-signed-in' });
  return { ...s, uid };
};
const fail = (code: string) => Object.assign(new Error(code), { code: `nextora/${code}` });

/** Friendly string key (forum.err*) for a failed forum action. */
export function forumErrorKey(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'nextora/no-contact': 'noContact', 'nextora/no-links': 'noLinks', 'nextora/too-soon': 'rateLimited',
    'nextora/too-short': 'tooShort', 'nextora/too-long': 'tooLong', 'nextora/edit-window': 'editWindow',
    'nextora/not-configured': 'notConfigured', 'nextora/not-signed-in': 'notSignedIn',
    'permission-denied': 'notAllowed', unavailable: 'network',
  };
  return 'forum.err' + (map[code] ?? 'generic').replace(/^./, (c) => c.toUpperCase());
}

function checkText(t: string) {
  const bad = unsafeText(t);
  if (bad) throw fail(bad === 'contact' ? 'no-contact' : 'no-links');
}
function checkLen(t: string, min: number, max: number) {
  if (t.length < min) throw fail('too-short');
  if (t.length > max) throw fail('too-long');
}
const last: Record<string, number> = {};
function tooSoon(field: string, secs: number) {
  if (Date.now() - (last[field] ?? 0) < secs * 1000) throw fail('too-soon');
}
const stamp = (field: string) => { last[field] = Date.now(); };

const toDate = (v: unknown): Date | null => (v as { toDate?: () => Date })?.toDate?.() ?? null;
function toPost(id: string, d: Record<string, unknown>): ForumPost {
  return {
    id, authorUid: String(d.authorUid ?? ''), displayName: String(d.displayName ?? ''), topic: d.topic as Topic,
    emirate: d.emirate as Emirate, language: String(d.language ?? 'en'), title: String(d.title ?? ''), body: String(d.body ?? ''),
    createdAt: toDate(d.createdAt), updatedAt: toDate(d.updatedAt), editedAt: toDate(d.editedAt),
    hidden: d.hidden === true, deleted: d.deleted === true, isSample: d.isSample === true, upvotes: Number(d.upvotes ?? 0),
  };
}
function toReply(id: string, d: Record<string, unknown>): ForumReply {
  return {
    id, authorUid: String(d.authorUid ?? ''), displayName: String(d.displayName ?? ''), body: String(d.body ?? ''),
    createdAt: toDate(d.createdAt), deleted: d.deleted === true, isSample: d.isSample === true,
  };
}

export const canEdit = (p: ForumPost, uid?: string | null, now = Date.now()) =>
  !!uid && p.authorUid === uid && !p.deleted && !!p.createdAt && now - p.createdAt.getTime() < EDIT_WINDOW_MS;

// ---------- writes ----------

export async function createPost(input: { displayName: string; topic: Topic; emirate: Emirate; language: string; title: string; body: string }) {
  const { db, uid } = need();
  const title = input.title.trim();
  const body = input.body.trim();
  checkLen(title, LIMITS.titleMin, LIMITS.titleMax);
  checkLen(body, 1, LIMITS.bodyMax);
  checkText(title);
  checkText(body);
  tooSoon('lastPostAt', 60);
  const ref = doc(collection(db, 'forumPosts'));
  const b = writeBatch(db);
  b.set(doc(db, 'limits', uid), { lastPostAt: serverTimestamp() }, { merge: true });
  b.set(ref, {
    authorUid: uid, displayName: (input.displayName.trim() || '…').slice(0, 40), topic: input.topic, emirate: input.emirate,
    language: input.language.slice(0, 3), title, body, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    hidden: false, deleted: false, isSample: false, upvotes: 0,
  });
  await b.commit();
  stamp('lastPostAt');
  return { id: ref.id };
}

export async function editPost(p: ForumPost, title: string, body: string) {
  const { db, uid } = need();
  if (!canEdit(p, uid)) throw fail('edit-window');
  const tt = title.trim();
  const bb = body.trim();
  checkLen(tt, LIMITS.titleMin, LIMITS.titleMax);
  checkLen(bb, 1, LIMITS.bodyMax);
  checkText(tt);
  checkText(bb);
  await updateDoc(doc(db, 'forumPosts', p.id), { title: tt, body: bb, updatedAt: serverTimestamp(), editedAt: serverTimestamp() });
}

/** Tombstone: kept so replies still make sense, text removed. Author or moderator. */
export async function deletePost(id: string) {
  const { db } = need();
  await updateDoc(doc(db, 'forumPosts', id), { deleted: true, title: '', body: '', updatedAt: serverTimestamp() });
}

export async function addReply(postId: string, displayName: string, text: string) {
  const { db, uid } = need();
  const body = text.trim();
  checkLen(body, 1, LIMITS.replyMax);
  checkText(body);
  tooSoon('lastReplyAt', 10);
  const b = writeBatch(db);
  b.set(doc(db, 'limits', uid), { lastReplyAt: serverTimestamp() }, { merge: true });
  b.set(doc(collection(db, 'forumPosts', postId, 'replies')), {
    authorUid: uid, displayName: (displayName.trim() || '…').slice(0, 40), body, createdAt: serverTimestamp(), deleted: false, isSample: false,
  });
  await b.commit();
  stamp('lastReplyAt');
}

export async function deleteReply(postId: string, replyId: string) {
  const { db } = need();
  await updateDoc(doc(db, 'forumPosts', postId, 'replies', replyId), { deleted: true, body: '' });
}

/** Upvote or remove my upvote: vote doc and counter change in one batch (rules check both). */
export async function setUpvote(postId: string, on: boolean) {
  const { db, uid } = need();
  const b = writeBatch(db);
  const vote = doc(db, 'forumPosts', postId, 'votes', uid);
  if (on) b.set(vote, { at: serverTimestamp() });
  else b.delete(vote);
  b.update(doc(db, 'forumPosts', postId), { upvotes: increment(on ? 1 : -1) });
  await b.commit();
}

export async function setSaved(postId: string, on: boolean) {
  const { db, uid } = need();
  const ref = doc(db, 'users', uid, 'saves', postId);
  if (on) await setDoc(ref, { at: serverTimestamp() });
  else await deleteDoc(ref);
}

// ---------- moderation ----------

async function audit(action: string, target: string, note: string) {
  const { db, uid } = need();
  await setDoc(doc(collection(db, 'auditLog')), { by: uid, action, target: target.slice(0, 200), note: note.slice(0, 500), at: serverTimestamp() });
}

export async function setHidden(postId: string, hidden: boolean, note = '') {
  const { db } = need();
  await updateDoc(doc(db, 'forumPosts', postId), { hidden, updatedAt: serverTimestamp() });
  await audit(hidden ? 'hidePost' : 'restorePost', `forumPosts/${postId}`, note);
}

export async function modDeletePost(postId: string, note = '') {
  await deletePost(postId);
  await audit('deletePost', `forumPosts/${postId}`, note);
}
export async function modDeleteReply(postId: string, replyId: string, note = '') {
  await deleteReply(postId, replyId);
  await audit('deleteReply', `forumPosts/${postId}/replies/${replyId}`, note);
}

export type ReportStatus = 'open' | 'inReview' | 'actioned' | 'dismissed';
export interface Report {
  id: string; reporter: string; targetType: 'user' | 'post' | 'reply'; target: string; reason: string; note: string;
  contextId: string | null; status: ReportStatus; assignee: string | null; createdAt: Date | null; slaHours: number;
}

export async function setReportStatus(id: string, status: ReportStatus, assignee: string | null, note = '') {
  const { db } = need();
  await updateDoc(doc(db, 'reports', id), { status, assignee });
  await audit(`report:${status}`, `reports/${id}`, note);
}

// ---------- live data ----------

function useLive<T>(subscribe: ((set: (v: T) => void, err: () => void) => () => void) | null, deps: unknown[]) {
  const [v, setV] = useState<{ data?: T; error: boolean }>({ error: false });
  useEffect(() => {
    if (!subscribe) return;
    setV({ error: false });
    return subscribe((data) => setV({ data, error: false }), () => setV({ error: true }));
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return v;
}

/** Newest visible posts (hidden ones are filtered by the query, as the rules require). */
export function usePosts() {
  const { user, status } = useAuth();
  return useLive<ForumPost[]>(user && status === 'ready' ? (set, err) =>
    onSnapshot(query(collection(fb()!.db, 'forumPosts'), where('hidden', '==', false), orderBy('createdAt', 'desc'), limit(CAP)),
      (s) => set(s.docs.map((d) => toPost(d.id, d.data()))), err) : null, [user?.uid, status]);
}

export type Sort = 'new' | 'helpful';
/** Filters, search and sort, all on device. */
export function filterPosts(list: ForumPost[], f: { topic?: Topic | null; emirate?: Emirate | null; q?: string; sort: Sort; showSample: boolean }) {
  const needle = (f.q ?? '').trim().toLowerCase();
  const out = list
    .filter((p) => !p.deleted)
    .filter((p) => f.showSample || !p.isSample)
    .filter((p) => !f.topic || p.topic === f.topic)
    .filter((p) => !f.emirate || p.emirate === f.emirate)
    .filter((p) => !needle || p.title.toLowerCase().includes(needle));
  const time = (p: ForumPost) => p.createdAt?.getTime() ?? Date.now();
  return out.sort((a, b) => (f.sort === 'helpful' ? b.upvotes - a.upvotes || time(b) - time(a) : time(b) - time(a)));
}

export function usePost(id: string) {
  const { user } = useAuth();
  return useLive<ForumPost | null>(user && id ? (set, err) =>
    onSnapshot(doc(fb()!.db, 'forumPosts', id), (s) => set(s.exists() ? toPost(s.id, s.data()) : null), err) : null, [id, user?.uid]);
}

export function useReplies(id: string, enabled: boolean) {
  return useLive<ForumReply[]>(enabled ? (set, err) =>
    onSnapshot(query(collection(fb()!.db, 'forumPosts', id, 'replies'), orderBy('createdAt', 'asc'), limit(500)),
      (s) => set(s.docs.map((d) => toReply(d.id, d.data()))), err) : null, [id, enabled]);
}

export function useMyVote(id: string) {
  const { user } = useAuth();
  return useLive<boolean>(user && id ? (set, err) =>
    onSnapshot(doc(fb()!.db, 'forumPosts', id, 'votes', user.uid), (s) => set(s.exists()), err) : null, [id, user?.uid]);
}

export function useSaved(id: string) {
  const { user } = useAuth();
  return useLive<boolean>(user && id ? (set, err) =>
    onSnapshot(doc(fb()!.db, 'users', user.uid, 'saves', id), (s) => set(s.exists()), err) : null, [id, user?.uid]);
}

/** Moderators: reports, oldest first (the queue). Status filtering is on device. */
export function useReports(enabled: boolean) {
  return useLive<Report[]>(enabled ? (set, err) =>
    onSnapshot(query(collection(fb()!.db, 'reports'), orderBy('createdAt', 'asc'), limit(CAP)),
      (s) => set(s.docs.map((d) => {
        const x = d.data();
        return {
          id: d.id, reporter: x.reporter, targetType: x.targetType, target: x.target, reason: x.reason, note: x.note ?? '',
          contextId: x.contextId ?? null, status: x.status, assignee: x.assignee ?? null, createdAt: toDate(x.createdAt), slaHours: x.slaHours ?? 24,
        } as Report;
      })), err) : null, [enabled]);
}

/** Moderators: hidden posts, to restore. */
export function useHiddenPosts(enabled: boolean) {
  return useLive<ForumPost[]>(enabled ? (set, err) =>
    onSnapshot(query(collection(fb()!.db, 'forumPosts'), where('hidden', '==', true), limit(CAP)),
      (s) => set(s.docs.map((d) => toPost(d.id, d.data()))), err) : null, [enabled]);
}

/** true / false once known, undefined while loading. Rules still decide every write. */
export function useIsMod() {
  const { user } = useAuth();
  const [mod, setMod] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    if (!user) { setMod(false); return; }
    setMod(undefined);
    myRole(user.uid).then((r) => { if (alive) setMod(r === 'moderator' || r === 'admin'); }).catch(() => { if (alive) setMod(false); });
    return () => { alive = false; };
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps
  return mod;
}
