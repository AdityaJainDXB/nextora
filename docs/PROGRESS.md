# Progress

Last updated 2026-10-31 after Firebase configuration and validation.

| Stage | Status | Evidence / remaining work |
|---|---|---|
| 1 Language, onboarding, checklist | IMPLEMENTED; CHECKS PASS | `npm run typecheck`, `npm run i18n:check` (16 languages, 722 keys). Native-speaker review remains outstanding. |
| 2 Accounts | IMPLEMENTED; RULES PASS | Email/Password is enabled in both Firebase projects. Production and dev Web app configs are now populated. Auth Users currently shows no registered users in either project, so create and verify a fresh test account in the app. |
| 3 Appverse content + progress sync | IMPLEMENTED; RULES PASS | Seed and sync flows exist. Reviewed production content still needs to be supplied in `data/seed/`. |
| 4 Matching and chats | IMPLEMENTED; RULES PASS | A current two-account Playwright run remains outstanding. |
| 5 Forum and moderation | IMPLEMENTED; RULES PASS | Topic and Emirate filters now use compact choice sheets. A current app-flow Playwright run remains outstanding. |
| 6 Ask NEXTORA via Worker | IMPLEMENTED; LOCAL CHECKS PASS; LIVE CHECK PARTIAL | 20 Worker tests and Worker typecheck pass; deployed unauthenticated `/ask` returns 401 as expected. A signed-in authenticated Gemini smoke needs a Firebase ID token from a test account. |
| 7 Seeding | SCRIPTS IMPLEMENTED; CONTENT OUTSTANDING | `data/seed/` is empty. Guide pages have all-Emirate search/link-outs; reviewed listings and events have not been supplied or loaded. |
| 8 Accessibility / translations | PARTIAL | i18n structure passes. Native-speaker and device accessibility review remain outstanding. |
| 9 Demo | WEB PREVIEW BUILT; DEVICE RUN OUTSTANDING | Production-configured web export is available locally at `http://localhost:5012/`. Expo Go / physical iPhone acceptance was not run; no usable iOS simulator runtime was available in this session. |

## Verified checks

- App TypeScript: pass (`npm run typecheck`).
- Locale parity: pass, 16 languages / 722 keys (`npm run i18n:check`).
- Firestore rules and app tests: **102/102 pass** by running Vitest against the already-running local Firestore emulator. The `npm test` wrapper could not start a second emulator because port 8080 was already occupied.
- Worker tests: **20/20 pass**; Worker typecheck passes.
- Live Worker smoke: unauthenticated `/ask` returned the expected 401. Authenticated `/ask` was skipped because no test ID token was available.
- Expo config: development and preview resolve to `nextora-dev-68159`; production resolves to `nextora-prod`; all three have Firebase config and the Worker URL.
- Production web bundle: exported successfully and served locally at `http://localhost:5012/`.
- Current two-account Playwright suite was not rerun: its shared `clearAll()` helper deletes the emulator Auth and Firestore datasets, so it requires a deliberately isolated emulator before execution.
