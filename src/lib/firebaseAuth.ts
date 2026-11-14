// iOS/Android: keep the session in AsyncStorage so people stay signed in.
// Metro resolves @firebase/auth's React Native build, which exports
// getReactNativePersistence; the default typings don't declare it.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeAuth, getAuth, type Auth, type Persistence } from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

export function makeAuth(app: FirebaseApp): Auth {
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    return getAuth(app); // already initialised (fast refresh)
  }
}
