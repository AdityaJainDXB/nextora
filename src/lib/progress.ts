// "First 48 hours" and app setup progress, synced across the person's devices
// through users/{uid}/progress/{checklist,appSetup}. Changes apply locally first,
// then write to Firestore (the SDK queues writes while offline).
import { useEffect, useRef } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { fb } from './firebase';
import { useAuth } from './auth';
import { useStore } from '../store/AppStore';

type Kind = 'checklist' | 'appSetup';

function write(uid: string, kind: Kind, items: Record<string, unknown>) {
  const s = fb();
  if (!s) return Promise.resolve();
  return setDoc(doc(s.db, 'users', uid, 'progress', kind), { items, updatedAt: serverTimestamp() }, { merge: true });
}

/** Keeps the local store in step with Firestore while signed in. Renders nothing. */
export function ProgressSync() {
  const { user, status } = useAuth();
  const { state, update } = useStore();
  const local = useRef(state);
  local.current = state;

  useEffect(() => {
    const s = fb();
    if (!s || !user || status !== 'ready') return;
    const uid = user.uid;
    const unsubs = (['checklist', 'appSetup'] as Kind[]).map((kind) => {
      let first = true;
      return onSnapshot(doc(s.db, 'users', uid, 'progress', kind), (snap) => {
        const remote = (snap.data()?.items ?? {}) as Record<string, never>;
        const mine = local.current[kind] as Record<string, unknown>;
        if (first) {
          first = false;
          // Ticks made on this device before sync: upload the ones the server doesn't have.
          const missing = Object.fromEntries(Object.entries(mine).filter(([k]) => !(k in remote)));
          if (Object.keys(missing).length) void write(uid, kind, missing).catch(() => {});
          update((st) => ({ ...st, [kind]: { ...mine, ...remote } }));
          return;
        }
        update((st) => ({ ...st, [kind]: { ...st[kind], ...remote } }));
      });
    });
    return () => unsubs.forEach((u) => u());
  }, [user, status, update]);

  return null;
}

/** Tick helpers used by Home and the app detail screen. */
export function useProgress() {
  const { user } = useAuth();
  const { state, update } = useStore();

  const toggleChecklist = (id: string) => {
    const v = !state.checklist[id];
    update((s) => ({ ...s, checklist: { ...s.checklist, [id]: v } }));
    if (user) void write(user.uid, 'checklist', { [id]: v }).catch(() => {});
  };

  const toggleSetup = (appId: string, i: number, total: number) => {
    const cur = state.appSetup[appId] ?? Array.from({ length: total }, () => false);
    const next = cur.map((v, j) => (j === i ? !v : v));
    update((s) => ({ ...s, appSetup: { ...s.appSetup, [appId]: next } }));
    if (user) void write(user.uid, 'appSetup', { [appId]: next }).catch(() => {});
  };

  return { checklist: state.checklist, appSetup: state.appSetup, toggleChecklist, toggleSetup };
}
