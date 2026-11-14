import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onIdTokenChanged, signOut, type User } from 'firebase/auth';
import { fb } from './firebase';
import { hasAccountDoc, loadProfile } from './account';
import { useStore } from '../store/AppStore';

/**
 * signedOut: no session. needsAge: signed in (email link) but no account doc yet,
 * so the age gate must run before anything is stored. ready: account exists.
 */
export type AuthStatus = 'loading' | 'off' | 'signedOut' | 'needsAge' | 'ready' | 'error';

interface AuthCtx {
  user: User | null;
  status: AuthStatus;
  verified: boolean;
  /** Re-check the account doc and profile (after the age gate or onboarding). */
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({ user: null, status: 'loading', verified: false, refresh: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { update } = useStore();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(fb() ? 'loading' : 'off');
  const [verified, setVerified] = useState(false);

  // A saved session can outlive its account (e.g. the test backend was reset).
  // Check each restored user once with the server; if the account is gone, sign out
  // so the person lands on the login screen instead of a stuck error.
  const checked = useRef<string | null>(null);
  const DEAD = ['auth/invalid-refresh-token', 'auth/user-token-expired', 'auth/user-not-found', 'auth/user-disabled', 'auth/invalid-user-token'];

  const sync = useCallback(async (u: User | null) => {
    if (u && checked.current !== u.uid) {
      checked.current = u.uid;
      try { await u.getIdToken(true); }
      catch (e) {
        if (DEAD.includes((e as { code?: string }).code ?? '')) {
          checked.current = null;
          await signOut(fb()!.auth).catch(() => {});
          return; // the listener fires again with null
        }
      }
    }
    if (!u) checked.current = null;
    setUser(u);
    setVerified(!!u?.emailVerified);
    if (!u) {
      // Signed out: drop the cached profile; keep the language choice.
      update((s) => ({ ...s, profile: null }));
      setStatus('signedOut');
      return;
    }
    try {
      if (!(await hasAccountDoc(u.uid))) { setStatus('needsAge'); return; }
      const remote = await loadProfile(u.uid);
      update((s) => ({ ...s, profile: remote }));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [update]);

  useEffect(() => {
    const s = fb();
    if (!s) return;
    // Id-token changes also fire after a forced refresh, so email verification updates here.
    return onIdTokenChanged(s.auth, (u) => { void sync(u); });
  }, [sync]);

  const refresh = useCallback(async () => {
    const u = fb()?.auth.currentUser ?? null;
    checked.current = null; // "Try again" re-checks the session with the server
    await sync(u);
  }, [sync]);

  const value = useMemo(() => ({ user, status, verified, refresh }), [user, status, verified, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
