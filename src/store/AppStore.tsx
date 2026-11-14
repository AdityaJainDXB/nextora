import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ConsentEntry, ConsentKey, Persona, Profile, Report, Role } from './types';

// Local, on-device state. From Stage 2 the profile, progress, reports and the
// consent log also sync to Firestore for the signed-in user.
const KEY = 'nextora:v5';

export interface AppState {
  language: string | null;
  profile: Profile | null;
  checklist: Record<string, boolean>;
  appSetup: Record<string, boolean[]>;
  reports: Report[];
  consents: Partial<Record<ConsentKey, ConsentEntry>>;
  /** Append-only. Uploaded to Firestore consentLog once accounts exist (Stage 2). */
  consentLog: (ConsentEntry & { key: ConsentKey })[];
  /** Role and persona picked on the hero, carried through sign-up into onboarding. */
  pending: { role: Role; persona: Persona } | null;
  /** Switches for AI-driven features; the app works fully with both off. */
  settings: { matchingOn: boolean; assistantOn: boolean; showSample: boolean };
}

export const initialState: AppState = {
  language: null,
  profile: null,
  checklist: {},
  appSetup: {},
  reports: [],
  consents: {},
  consentLog: [],
  pending: null,
  settings: { matchingOn: true, assistantOn: true, showSample: true },
};

interface Ctx {
  state: AppState;
  ready: boolean;
  loadError: boolean;
  update: (fn: (s: AppState) => AppState) => void;
  reset: () => Promise<void>;
  retryLoad: () => void;
}

const StoreContext = createContext<Ctx | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setState({ ...initialState, ...JSON.parse(raw) });
        loaded.current = true;
        setLoadError(false);
        setReady(true);
      })
      .catch(() => setLoadError(true));
  }, [attempt]);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);
  const reset = useCallback(async () => {
    await AsyncStorage.removeItem(KEY);
    setState(initialState);
  }, []);

  const value = useMemo(
    () => ({ state, ready, loadError, update, reset, retryLoad: () => setAttempt((a) => a + 1) }),
    [state, ready, loadError, update, reset],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore outside provider');
  return ctx;
}

/** Record a consent choice. Everything defaults to off; nothing is granted implicitly. */
export function setConsent(s: AppState, key: ConsentKey, granted: boolean, version: string): AppState {
  const entry: ConsentEntry = { granted, version, at: Date.now() };
  return { ...s, consents: { ...s.consents, [key]: entry }, consentLog: [...s.consentLog, { key, ...entry }] };
}
