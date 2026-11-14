// Web: the SDK's default browser persistence (IndexedDB).
import { getAuth, type Auth } from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';

export const makeAuth = (app: FirebaseApp): Auth => getAuth(app);
