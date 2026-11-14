# NEXTORA V7 setup

Copy-paste in order. One command per block. Free plans only.
Projects: `nextora-dev-68159` (dev), `nextora-prod` (prod, Firestore in me-central1).

## 1. Install tools (once)

Node.js LTS from https://nodejs.org (version requirement NOT VERIFIED; use the current LTS).

```bash
npm install -g firebase-tools
```

The Firebase emulators also need Java (JDK 11 or newer, per Firebase docs; NOT VERIFIED for your version).

Wrangler is run with `npx`, so no global install is needed.

## 2. Install project dependencies

```bash
npm install
```

## 3. Choose the environment

- `config/firebase.dev.json` is used by default (`npx expo start`, APP_ENV `development`).
- `config/firebase.prod.json` is used when `APP_ENV=production`.
- `USE_EMULATORS=1` (never in production) points the app at local emulators, project `demo-nextora`, which cannot reach real Firebase.
- The checked-in Firebase config files start empty. Until you fill the dev config or use the local emulators, sign-in is intentionally unavailable. The Gemini Worker URL alone cannot sign users in; Ask NEXTORA sends a Firebase ID token to the Worker.

## 4. Local testing (optional, no accounts needed)

Terminal 1:

```bash
npm run emulators
```

Terminal 2:

```bash
npm run start:local
```

Run all rules and unit tests:

```bash
npm test
```

## 5. Firebase config

Firebase console > `nextora-dev-68159` > Project settings > Your apps > Web. Copy the values into `config/firebase.dev.json` (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`). This config is public, not a secret. Restart Expo after saving it.
NOTE: `docs/FIREBASE_CONFIG.md`, referenced in the V7 brief, does not exist yet.

## 6. Deploy security rules

```bash
firebase login
```

`.firebaserc` defaults to `demo-nextora`, so name the real project:

```bash
npm run deploy:rules -- --project nextora-dev-68159
```

This runs `npm test` first and deploys rules and indexes only if every test passes.

## 7. Cloudflare Worker (Gemini)

```bash
npx wrangler login
```

```bash
npm run setup:worker
```

It asks for `GEMINI_API_KEY` in a hidden terminal prompt (`wrangler secret put`). Paste the key from https://aistudio.google.com/apikey there only.

```bash
npm run check:worker
```

Restart the Expo server and reload Expo Go after setup so the app receives the updated Worker URL. The Worker and setup/check scripts are implemented. Deployment still requires an authenticated Cloudflare account and a Gemini API key supplied through the hidden terminal prompt.

## 8. Seed content

Put checked content in `data/seed/*.json`, then (asks for a moderator sign-in; password hidden):

```bash
npm run seed:content -- --env dev
```

Sample content for the demo:

```bash
npm run seed:sample
```

Remove it:

```bash
npm run seed:sample -- --remove
```

## 9. Moderator role

Sign up a user in the app, then in Firestore console create `roles/{uid}` with field `role` = `moderator` (string). Full steps: [HUMAN_TASKS.md](HUMAN_TASKS.md#step-8-in-detail-make-a-user-a-moderator).

## 10. Run on the iPhone

```bash
npm run ios
```

`npm run ios` and `npm run android` explicitly open Expo Go. Use `npm run start:dev-client` only after installing a custom development build; that command asks Expo CLI to redirect into the custom runtime.

Scan the QR code with the iPhone camera; it opens in Expo Go. If the phone and computer are on different networks:

```bash
npx expo start --tunnel
```

Demo sign-in is email + password only.
