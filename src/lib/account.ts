// Accounts: sign-up/in, the age gate, email verification and links, sign-out
// everywhere, export, deletion, and syncing profile and consents to Firestore.
import { Platform, Share } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  EmailAuthProvider, createUserWithEmailAndPassword, deleteUser, isSignInWithEmailLink, reauthenticateWithCredential,
  reload, sendEmailVerification, sendPasswordResetEmail, sendSignInLinkToEmail, signInWithEmailAndPassword,
  signInWithEmailLink, signOut, type User,
} from 'firebase/auth';
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { fb } from './firebase';
import { buildPublicProfile } from '../shared/publicProfile';
import type { ConsentKey, Profile } from '../store/types';

const EMAIL_KEY = 'nextora:emailForLink';
export const MIN_AGE = 18;

/** The age gate. Only the yes/no outcome is used; the age itself is never stored. */
export const isAdult = (age: number) => Number.isInteger(age) && age >= MIN_AGE && age < 130;

const need = () => {
  const s = fb();
  if (!s) throw Object.assign(new Error('Backend not set up'), { code: 'nextora/not-configured' });
  return s;
};

/** Friendly error key for the UI; never shows raw Firebase errors. */
export function errorKey(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/email-already-in-use': 'emailInUse',
    'auth/email-already-exists': 'emailInUse',
    'auth/invalid-email': 'invalidEmail',
    'auth/weak-password': 'weakPassword',
    'auth/password-does-not-meet-requirements': 'weakPassword',
    'auth/invalid-credential': 'wrongCredentials',
    'auth/wrong-password': 'wrongCredentials',
    'auth/user-not-found': 'wrongCredentials',
    'auth/too-many-requests': 'tooMany',
    'auth/network-request-failed': 'network',
    'auth/invalid-action-code': 'linkExpired',
    'auth/expired-action-code': 'linkExpired',
    'nextora/not-configured': 'notConfigured',
    'nextora/not-verified': 'notVerifiedYet',
    'auth/requires-recent-login': 'wrongCredentials',
    'auth/missing-password': 'wrongCredentials',
  };
  return map[code] ?? 'generic';
}

/** Creates users/{uid}. Call only right after the person passed the age gate. */
export async function createAccountDoc(uid: string, language: string) {
  const { db } = need();
  await setDoc(doc(db, 'users', uid), { ageConfirmedAt: serverTimestamp(), createdAt: serverTimestamp(), language });
}

export async function hasAccountDoc(uid: string) {
  const { db } = need();
  return (await getDoc(doc(db, 'users', uid))).exists();
}

export async function signUpWithEmail(email: string, password: string, language: string) {
  const { auth } = need();
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await createAccountDoc(cred.user.uid, language);
  await sendEmailVerification(cred.user);
  return cred.user;
}

export async function signInWithEmail(email: string, password: string) {
  const { auth } = need();
  return (await signInWithEmailAndPassword(auth, email.trim(), password)).user;
}

export async function sendReset(email: string) {
  const { auth } = need();
  await sendPasswordResetEmail(auth, email.trim());
}

export async function resendVerification(user: User) {
  await sendEmailVerification(user);
}

/** Reloads the user and forces a fresh token so rules see email_verified. */
export async function refreshVerification(user: User) {
  await reload(user);
  await user.getIdToken(true);
  return user.emailVerified;
}

// ---- Email link ----

/** Where the sign-in link returns to. On native this needs a configured link domain. */
function linkUrl(): string | null {
  if (Platform.OS === 'web') return `${window.location.origin}/auth-link`;
  const domain: unknown = Constants.expoConfig?.extra?.emailLinkDomain;
  // Expo turns a null config value into {}, so check for a real string.
  return typeof domain === 'string' && domain ? `https://${domain}/auth-link` : null;
}

export const emailLinkAvailable = () => linkUrl() !== null;

export async function sendEmailLink(email: string) {
  const { auth } = need();
  const url = linkUrl();
  if (!url) throw Object.assign(new Error('link domain'), { code: 'nextora/not-configured' });
  await sendSignInLinkToEmail(auth, email.trim(), { url, handleCodeInApp: true });
  await AsyncStorage.setItem(EMAIL_KEY, email.trim());
}

export async function completeEmailLink(href: string, typedEmail?: string) {
  const { auth } = need();
  if (!isSignInWithEmailLink(auth, href)) throw Object.assign(new Error('bad link'), { code: 'auth/invalid-action-code' });
  const email = typedEmail?.trim() || (await AsyncStorage.getItem(EMAIL_KEY));
  if (!email) return null; // ask the person to type the email they used
  const cred = await signInWithEmailLink(auth, email, href);
  await AsyncStorage.removeItem(EMAIL_KEY);
  return cred.user;
}

/**
 * A new account from an email link failed the age gate: remove the auth user
 * straight away so nothing about them is kept.
 */
export async function discardUnderAgeAccount(user: User) {
  const { auth } = need();
  try { await deleteUser(user); } finally { await signOut(auth).catch(() => {}); }
}

// ---- Session ----

export async function signOutHere() {
  const s = fb();
  if (s) await signOut(s.auth);
}

// ---- Data rights ----

/** Everything stored about me, read with my own permissions, as JSON. */
export async function exportMyData(): Promise<void> {
  const { db, auth } = need();
  const u = auth.currentUser!;
  const one = async (path: string) => { const d = await getDoc(doc(db, path)).catch(() => null); return d?.exists() ? d.data() : null; };
  const many = async (path: string) => (await getDocs(collection(db, path)).catch(() => null))?.docs.map((d) => ({ id: d.id, ...d.data() })) ?? [];
  const conns = (await getDocs(query(collection(db, 'connections'), where('members', 'array-contains', u.uid))).catch(() => null))?.docs ?? [];
  const data = {
    exportedAt: new Date().toISOString(),
    account: { uid: u.uid, email: u.email, emailVerified: u.emailVerified, createdAt: u.metadata.creationTime },
    user: await one(`users/${u.uid}`),
    privateProfile: await one(`users/${u.uid}/private/profile`),
    publicProfile: await one(`publicProfiles/${u.uid}`),
    progress: await many(`users/${u.uid}/progress`),
    consentLog: await many(`users/${u.uid}/consentLog`),
    matchDecisions: await many(`matchDecisions/${u.uid}/items`),
    blocks: await many(`blocks/${u.uid}/blocked`),
    connections: await Promise.all(conns.map(async (c) => ({
      id: c.id, ...c.data(),
      myMessages: (await many(`chats/${c.id}/messages`)).filter((m) => (m as { from?: string }).from === u.uid),
    }))),
  };
  const json = JSON.stringify(data, null, 2);
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nextora-my-data.json';
    a.click();
    URL.revokeObjectURL(url);
  } else {
    await Share.share({ title: 'nextora-my-data.json', message: json });
  }
}

/**
 * Deletes the account from the device (no server code on the free plan):
 * re-checks the password, deletes my documents, my conversations and their
 * messages, then the sign-in itself.
 */
export async function deleteMyAccount(password: string) {
  const { db, auth } = need();
  const u = auth.currentUser!;
  await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email ?? '', password));
  const uid = u.uid;
  const wipe = async (path: string) => {
    const snap = await getDocs(collection(db, path)).catch(() => null);
    await Promise.all((snap?.docs ?? []).map((d) => deleteDoc(d.ref)));
  };
  // Conversations: contact docs, every message, then the connection.
  const conns = await getDocs(query(collection(db, 'connections'), where('members', 'array-contains', uid)));
  for (const c of conns.docs) {
    await wipe(`chats/${c.id}/messages`);
    // Listing this collection can be denied after a conversation is blocked:
    // members may delete contact docs, but can read the other person's doc only
    // while both have agreed and the connection is still connected. The parent
    // record gives us both document IDs, so delete those known paths directly.
    const members = (c.data().members as string[] | undefined) ?? [];
    await Promise.all(members.map((member) => deleteDoc(doc(db, 'connections', c.id, 'contact', member)).catch(() => {})));
    await deleteDoc(c.ref);
  }
  // Meetups I host (their RSVP docs first).
  const hosted = await getDocs(query(collection(db, 'events'), where('hostUid', '==', uid), limit(100))).catch(() => null);
  for (const e of hosted?.docs ?? []) {
    await wipe(`events/${e.id}/rsvps`);
    await deleteDoc(e.ref);
  }
  await wipe(`users/${uid}/progress`);
  await wipe(`users/${uid}/consentLog`);
  await wipe(`users/${uid}/notifications`);
  await wipe(`matchDecisions/${uid}/items`);
  await wipe(`blocks/${uid}/blocked`);
  for (const path of [`users/${uid}/private/profile`, `publicProfiles/${uid}`, `limits/${uid}`, `users/${uid}`]) {
    await deleteDoc(doc(db, path)).catch(() => {});
  }
  await deleteUser(u);
}

// ---- Profile and consents ----

/** Private profile and its public mirror in one batch; the rules check they match. */
export async function saveProfile(uid: string, p: Profile) {
  const { db } = need();
  const role = await getDoc(doc(db, 'roles', uid)).then((d) => (d.exists() ? d.data().role : null)).catch(() => null);
  const data: Record<string, unknown> = {
    displayName: p.displayName.trim(), role: p.role, persona: p.persona, emirate: p.emirate,
    neighbourhood: p.neighbourhood.trim(), interests: p.interests, family: p.family, languages: p.languages,
    visibility: p.visibility, updatedAt: serverTimestamp(),
  };
  if (p.reason) data.reason = p.reason;
  const pub = buildPublicProfile({ ...p, displayName: p.displayName.trim(), neighbourhood: p.neighbourhood.trim(), reason: p.reason ?? undefined }, role === 'team');
  const b = writeBatch(db);
  b.set(doc(db, 'users', uid, 'private', 'profile'), data);
  b.set(doc(db, 'publicProfiles', uid), { ...pub, updatedAt: serverTimestamp() });
  await b.commit();
}

export async function loadProfile(uid: string): Promise<Profile | null> {
  const { db } = need();
  const snap = await getDoc(doc(db, 'users', uid, 'private', 'profile'));
  if (!snap.exists()) return null;
  const { updatedAt: _u, ...rest } = snap.data();
  return { reason: null, ...rest } as Profile;
}

export async function logConsent(uid: string, key: ConsentKey, granted: boolean, version: string) {
  const { db } = need();
  await addDoc(collection(db, 'users', uid, 'consentLog'), { key, granted, version, at: serverTimestamp() });
  await updateDoc(doc(db, 'users', uid), { [`consents.${key}`]: { granted, version } });
}

export async function saveLanguage(uid: string, language: string) {
  const { db } = need();
  await updateDoc(doc(db, 'users', uid), { language });
}

export async function reportTranslation(uid: string, screen: string, note: string, lang: string) {
  const { db } = need();
  await addDoc(collection(db, 'translationReports'), { uid, screen: screen.slice(0, 120), note: note.slice(0, 1000), lang, at: serverTimestamp() });
}

export async function saveSettings(uid: string, patch: Partial<{ matchingOn: boolean; assistantOn: boolean; showSample: boolean }>) {
  const { db } = need();
  await updateDoc(doc(db, 'users', uid), patch);
}

/** Moderator / team role, set by a person in the Firebase console (roles/{uid}). */
export async function myRole(uid: string): Promise<string | null> {
  const s = fb();
  if (!s) return null;
  const d = await getDoc(doc(s.db, 'roles', uid)).catch(() => null);
  return d?.exists() ? (d.data().role as string) : null;
}

/**
 * Local test backend only: the Auth emulator never sends real email, it records
 * the link. This opens that recorded link, which verifies the address exactly as
 * clicking the email would. Never used against a real Firebase project.
 */
export async function verifyViaEmulator(user: User): Promise<boolean> {
  const { usingEmulators, emulatorHost } = await import('./firebase');
  if (!usingEmulators) return false;
  const base = `http://${emulatorHost()}:9099`;
  const res = await fetch(`${base}/emulator/v1/projects/demo-nextora/oobCodes`);
  const { oobCodes } = (await res.json()) as { oobCodes: { email: string; requestType: string; oobLink: string }[] };
  const link = oobCodes.filter((c) => c.email === user.email && c.requestType === 'VERIFY_EMAIL').pop()?.oobLink;
  if (!link) return false;
  await fetch(link.replace('127.0.0.1', emulatorHost()).replace('localhost', emulatorHost()));
  return refreshVerification(user);
}
