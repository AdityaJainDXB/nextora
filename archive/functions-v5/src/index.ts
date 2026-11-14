// NEXTORA Cloud Functions (2nd gen). Stage 2: profile publishing, account
// deletion, data export and sign-out-everywhere.
import { createHash } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { buildPublicProfile, type PrivateProfile } from './publicProfile.js';
import { computeMatches } from './connect.js';

export {
  refreshMatches, dailyMatchRefresh, searchDirectory, requestConnection, respondConnection,
  sendMessage, setReveal, reportUser, onBlockCreated,
} from './connect.js';

initializeApp();
const db = getFirestore();

// Region comes from the FUNCTIONS_REGION env at deploy time (docs/HUMAN_TASKS.md 1.8).
setGlobalOptions({ region: process.env.FUNCTIONS_REGION || 'us-central1', maxInstances: 10 });

// App Check is enforced in deployed projects. The local emulator has no App Check.
const enforceAppCheck = process.env.FUNCTIONS_EMULATOR !== 'true';

/** Hash used in audit entries so a deleted account's id isn't kept in clear. */
const hashUid = (uid: string) => createHash('sha256').update(`nextora:${uid}`).digest('hex').slice(0, 24);

function requireUser(req: CallableRequest): string {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  return req.auth.uid;
}

// ---- Publish visible profile fields ----
export const onPrivateProfileWritten = onDocumentWritten('users/{uid}/private/profile', async (event) => {
  const uid = event.params.uid;
  const after = event.data?.after;
  const pub = db.doc(`publicProfiles/${uid}`);
  if (!after?.exists) {
    await pub.delete();
    return;
  }
  const user = await getAuth().getUser(uid).catch(() => null);
  if (!user) return; // account deleted meanwhile
  const isTeam = user.customClaims?.team === true;
  await pub.set({ ...buildPublicProfile(after.data() as PrivateProfile, isTeam), updatedAt: FieldValue.serverTimestamp() });
  // Fresh suggestions whenever the profile changes.
  await computeMatches(uid).catch((e) => logger.warn('match compute failed', { reason: (e as Error).message }));
});

// ---- Sign out on every device ----
export const signOutEverywhere = onCall({ enforceAppCheck }, async (req) => {
  const uid = requireUser(req);
  await getAuth().revokeRefreshTokens(uid);
  return { ok: true };
});

// ---- Export: everything stored about the caller, as JSON ----
export const exportMyData = onCall({ enforceAppCheck }, async (req) => {
  const uid = requireUser(req);
  const user = await getAuth().getUser(uid);
  const snap = async (path: string) => {
    const d = await db.doc(path).get();
    return d.exists ? d.data() : null;
  };
  const col = async (path: string) => (await db.collection(path).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
  return {
    exportedAt: new Date().toISOString(),
    account: { uid, email: user.email ?? null, emailVerified: user.emailVerified, createdAt: user.metadata.creationTime },
    user: await snap(`users/${uid}`),
    privateProfile: await snap(`users/${uid}/private/profile`),
    publicProfile: await snap(`publicProfiles/${uid}`),
    progress: await col(`users/${uid}/progress`),
    consentLog: await col(`users/${uid}/consentLog`),
    blocks: await col(`blocks/${uid}/blocked`),
  };
});

// ---- Delete account: hard-delete data, files and the auth user ----
export const deleteAccount = onCall({ enforceAppCheck }, async (req) => {
  const uid = requireUser(req);
  // Revoke first so access ends immediately, even if a later step is slow.
  await getAuth().revokeRefreshTokens(uid);

  await db.recursiveDelete(db.doc(`users/${uid}`));
  await db.doc(`publicProfiles/${uid}`).delete();
  await db.recursiveDelete(db.doc(`blocks/${uid}`));
  await db.doc(`matchCandidates/${uid}`).delete();
  await db.recursiveDelete(db.doc(`matchDecisions/${uid}`));
  await db.doc(`rateLimits/${uid}`).delete();
  // Connections and their chats (messages by both people in that conversation).
  const conns = await db.collection('connections').where('members', 'array-contains', uid).get();
  for (const c of conns.docs) {
    await db.recursiveDelete(db.doc(`chats/${c.id}`));
    await db.recursiveDelete(c.ref);
  }
  // Remove this user from other people's block lists too (each block doc stores the blocked uid).
  const blockedBy = await db.collectionGroup('blocked').where('uid', '==', uid).get();
  await Promise.all(blockedBy.docs.map((d) => d.ref.delete()));
  // Files under users/{uid}/ (avatars). No bucket in some emulator setups: skip quietly.
  try {
    await getStorage().bucket().deleteFiles({ prefix: `users/${uid}/` });
  } catch (e) {
    logger.warn('storage cleanup skipped', { reason: (e as Error).message });
  }

  await getAuth().deleteUser(uid);
  await db.collection('auditLog').add({
    action: 'account.delete',
    subject: hashUid(uid),
    actor: 'self',
    at: FieldValue.serverTimestamp(),
  });
  return { ok: true };
});
