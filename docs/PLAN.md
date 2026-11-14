# Plan (V7)

V7 runs on free plans only: Firebase Spark (Auth + Firestore; no Cloud Functions, no Storage), Gemini only through a Cloudflare Worker, and a demo in Expo Go on an iPhone. Projects: `nextora-dev-68159` (dev) and `nextora-prod` (Firestore in me-central1).

Status is conservative: "done" only where there is test evidence. Details in [PROGRESS.md](PROGRESS.md).

| Stage | Scope | Status |
|---|---|---|
| 1 | Language first, onboarding, checklist, Appverse shell, privacy choices | Done (locale tests pass) |
| 2 | Accounts: email + password, age gate, profile, account controls, consent log | Done on emulators (e2e passed earlier) |
| 3 | Appverse content from Firestore, progress sync | Done on emulators (e2e passed earlier) |
| 4 | Matching and chats | Implemented; current V7 two-account e2e not run in this audit |
| 5 | Community / forum and moderation (human-set `roles/{uid}`) | Implemented; rules tested, UI e2e not run in this audit |
| 6 | Ask NEXTORA through the Cloudflare Worker | Worker is deployed and the Gemini secret is configured; unauthenticated smoke passes, authenticated Gemini call unverified |
| 7 | Seeding: real content and sample content (`seed:content`, `seed:sample`) | Scripts implemented; reviewed real seed data not supplied |
| 8 | Accessibility and translation review | Contrast fixes applied for audited text pairs; native-speaker reviews remain outstanding |
| 9 | Demo readiness on iPhone via Expo Go | Blocked on Firebase configuration and a physical-device run |

## Done
- App, rules, locale, and unit suite: 102/102 tests pass against the existing Firestore emulator (`demo-nextora`).
- Worker suite: 20/20 tests pass; Worker typecheck passes.
- App typecheck passes; i18n check passes (16 languages, 710 keys).

## Remaining
1. Configure Firebase dev/prod projects and verify deployed Firestore rules.
2. Run an authenticated Worker smoke check with a Firebase ID token; deployment and secret are already present.
3. Run the two-account Playwright suite against isolated emulators.
4. Supply reviewed content and native-speaker language reviews.
5. Complete the physical iPhone Expo Go demo.

## Deferred
Google sign-in, email-link sign-in, Sign in with Apple, push, App Check, EAS builds, store listing, legal docs, Blaze. Reasons in HUMAN_TASKS.md.
