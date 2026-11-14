import type { ExpoConfig } from 'expo/config';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// APP_ENV is set per EAS build profile (eas.json). Local `npx expo start` uses "development".
const APP_ENV = (process.env.APP_ENV ?? 'development') as 'development' | 'preview' | 'production' | 'demo';
const isProd = APP_ENV === 'production';
const isDemo = APP_ENV === 'demo';

// Public Firebase web config only. No service accounts or AI keys ever go here.
// Read JSON at runtime instead of importing it so Expo's config loader works
// consistently across Node versions that require JSON import attributes.
const configDir = dirname(fileURLToPath(import.meta.url));
const firebaseConfigPath = join(configDir, 'config', isProd ? 'firebase.prod.json' : isDemo ? 'firebase.demo.json' : 'firebase.dev.json');
const { _comment, ...firebase } = JSON.parse(readFileSync(firebaseConfigPath, 'utf8')) as Record<string, unknown>;

// Slots from docs/HUMAN_TASKS.md 1.1-1.3. Replace once the accounts exist.
const IOS_BUNDLE_ID = process.env.IOS_BUNDLE_ID ?? 'com.nextora.app';
const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE ?? 'com.nextora.app';
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID ?? null;
// Cloud Functions region; must match the Firestore region (docs/HUMAN_TASKS.md 1.8).
const FUNCTIONS_REGION = process.env.FUNCTIONS_REGION ?? null;
// Domain for email sign-in links on iOS/Android (docs/HUMAN_TASKS.md 2.6). Web works without it.
const EMAIL_LINK_DOMAIN = process.env.EMAIL_LINK_DOMAIN ?? null;
// Local Firebase Emulator Suite (npm run emulators). Never on in production builds.
const USE_EMULATORS = isDemo || (!isProd && process.env.USE_EMULATORS === '1');

// Public Worker URL written by `npm run setup:worker` (no secrets). Resolve from this
// config file, not the CLI working directory, so all Expo entry points read the same value.
const workerConfigPath = join(configDir, 'config', 'worker.json');
const workerConfig = existsSync(workerConfigPath) ? JSON.parse(readFileSync(workerConfigPath, 'utf8')) : {};
const WORKER_URL = typeof workerConfig.url === 'string' && workerConfig.url.startsWith('https://')
  ? workerConfig.url
  : null;

const config: ExpoConfig = {
  name: isProd ? 'NEXTORA' : `NEXTORA (${APP_ENV.toUpperCase()})`,
  slug: 'nextora',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'nextora',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: false,
    bundleIdentifier: isProd ? IOS_BUNDLE_ID : `${IOS_BUNDLE_ID}.${APP_ENV}`,
    // The app only uses standard HTTPS/TLS. Re-check this before any store submission.
    config: { usesNonExemptEncryption: false },
  },
  android: {
    package: isProd ? ANDROID_PACKAGE : `${ANDROID_PACKAGE}.${APP_ENV}`,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: { favicon: './assets/favicon.png', bundler: 'metro', output: 'single' },
  plugins: ['expo-router', 'expo-localization', 'expo-font'],
  extra: {
    appEnv: APP_ENV,
    supportsRTL: true,
    firebase,
    functionsRegion: FUNCTIONS_REGION,
    useEmulators: USE_EMULATORS,
    workerUrl: WORKER_URL,
    emailLinkDomain: EMAIL_LINK_DOMAIN,
    // Unreleased (not yet native-reviewed) languages are pickable only outside production.
    showUnreleasedLanguages: !isProd,
    ...(EAS_PROJECT_ID ? { eas: { projectId: EAS_PROJECT_ID } } : {}),
  },
};

export default config;
