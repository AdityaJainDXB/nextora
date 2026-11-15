# NEXTORA

**Arrive. Settle. Thrive. Belong.** A multilingual companion for people who recently moved to the UAE, and for residents who volunteer to guide them.

> **Pitch build, not yet submitted to stores.** Runs in **Expo Go** on free plans only: Firebase Spark (Auth + Firestore) and a Cloudflare Worker for Gemini.

**Live site:** https://nextora-psi.vercel.app (Vercel, the main site). **Mirror:** https://adityajaindxb.github.io/nextora/ (GitHub Pages). Every push to `main` deploys to both, and a workflow checks that Vercel has the same commit as Pages.

> Vercel's project setting **Auto-assign custom domains** must stay on. If it is off, builds finish "staged" and the main address keeps an old version; the *Check Vercel matches main* workflow then fails.

## Run it on your phone

```bash
npm install
```

```bash
npm run emulators
```

```bash
npm run start:local
```

Scan the QR code with the iPhone Camera (Expo Go). Phone and computer must be on the same Wi-Fi; otherwise add `--tunnel`. `start:local` uses the Firebase Local Emulator Suite on this computer. To use the real `nextora-dev-68159` project, put its public web config in `config/firebase.dev.json` and run `npx expo start`. Full steps: [docs/SETUP.md](docs/SETUP.md). Things only a person can do: [docs/HUMAN_TASKS.md](docs/HUMAN_TASKS.md).

## Architecture (free tier)

| Concern | How |
|---|---|
| Accounts | Firebase Auth (email + password in the Expo Go demo) |
| Data and security | Firestore; **all** enforcement in `firestore.rules` (no Cloud Functions) |
| Matching | On the device, from a capped Firestore query; can be switched off |
| Contact details | Readable only after both people agree (rules) |
| Moderators | `roles/{uid}` set by a person in the Firebase console |
| AI (assistant, translate, voice typing) | `worker/` Cloudflare Worker: verifies the Firebase ID token, rate-limits, calls Gemini; the key is only a Worker secret |
| Content | Only from `data/seed/*.json` a person supplied; every record has source and review fields |

## Tests

```bash
npm test
```

```bash
npm run test:worker
```

`npm test` runs the Firestore rules tests, locale checks and unit tests against the emulator. End-to-end browser scripts are in `e2e/`.

## Where things are

- `src/app/` screens (Expo Router), `src/lib/` app logic, `src/shared/` pure code shared with tests
- `firestore.rules`, `tests/` rules and unit tests
- `worker/` Gemini proxy, `scripts/` seed and setup scripts
- `locales/` 16 languages (`locales/meta.ts` controls release and human review)
- `docs/` setup, human tasks, progress, AI errors log, contrast report, audits
- `archive/functions-v5/` the earlier Cloud Functions version, kept for reference only

## Honesty

The AI-written translations are labelled "AI-translated". No URLs, fees, dates or statistics are invented; empty sections say so. The AI errors log (`docs/AI_ERRORS_LOG.md`) lists only real mistakes found during the build.
