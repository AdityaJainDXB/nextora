// Firebase JS SDK on the free Spark plan (Auth + Firestore, no Cloud Functions).
// Works in Expo Go, so the app runs straight from a QR code. Three modes:
//  - configured: the public config in config/firebase.<env>.json is filled in
//  - local: USE_EMULATORS=1 in a non-production build, talking to the Firebase
//    Local Emulator Suite on this computer (`npm run emulators`), project demo-nextora
//  - off: neither; backend features show "not set up yet" instead of crashing
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator, getFirestore, initializeFirestore, memoryLocalCache, persistentLocalCache,
  persistentMultipleTabManager, type Firestore,
} from 'firebase/firestore';
import { makeAuth } from './firebaseAuth';

const extra = Constants.expoConfig?.extra ?? {};
// Expo's config serialisation turns null into {}, so only non-empty strings count as set.
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.length > 0 ? v : undefined);
const raw = (extra.firebase ?? {}) as Record<string, unknown>;
const cfg: Partial<FirebaseOptions> = Object.fromEntries(
  Object.entries(raw).map(([k, v]) => [k, str(v)]).filter(([, v]) => v !== undefined),
);

export const appEnv: string = extra.appEnv ?? 'development';
export const usingEmulators: boolean = extra.useEmulators === true;
export const isFirebaseConfigured = usingEmulators || Boolean(cfg.apiKey && cfg.projectId && cfg.appId);
export const backendMode: 'configured' | 'local' | 'off' = usingEmulators ? 'local' : isFirebaseConfigured ? 'configured' : 'off';

// demo-* project ids are understood by the emulators and can never reach real Firebase.
const EMULATOR_CONFIG: FirebaseOptions = {
  apiKey: 'demo-key', authDomain: 'demo-nextora.firebaseapp.com', projectId: 'demo-nextora', appId: 'demo-app',
  storageBucket: 'demo-nextora.appspot.com',
};

/** Host the emulators run on, as seen from this device. */
export function emulatorHost(): string {
  if (Platform.OS === 'web') return typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  // Expo Go on a phone: the computer running Metro also runs the emulators.
  const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (metroHost) return metroHost;
  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
}

interface Services { app: FirebaseApp; auth: Auth; db: Firestore }
let services: Services | null = null;

/** Firebase services, or null when the backend is off. */
export function fb(): Services | null {
  if (!isFirebaseConfigured) return null;
  if (services) return services;
  const app = getApps().length ? getApp() : initializeApp(usingEmulators ? EMULATOR_CONFIG : (cfg as FirebaseOptions));
  const auth = makeAuth(app);
  // Offline: web keeps a persistent IndexedDB cache; the JS SDK on iOS/Android has memory cache only.
  let db: Firestore;
  try {
    db = initializeFirestore(app, {
      localCache: Platform.OS === 'web' ? persistentLocalCache({ tabManager: persistentMultipleTabManager() }) : memoryLocalCache(),
    });
  } catch {
    db = getFirestore(app); // already initialised (fast refresh)
  }
  if (usingEmulators) {
    const host = emulatorHost();
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
  }
  services = { app, auth, db };
  return services;
}

/** Kept for code that only needs the app. */
export const firebaseApp = (): FirebaseApp | null => fb()?.app ?? null;
