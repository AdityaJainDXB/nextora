# NEXTORA V7: human tasks (demo list)

Everything here needs a person. The AI will not create, guess or fake any of it.
All items are on **free** plans. Never paste a key or password into chat, an issue or the repo.

Status: `[ ]` not started, `[x]` done (add who and when).

| # | Task | Why | Link | Cost | Done when | Status |
|---|---|---|---|---|---|---|
| 1 | Install **Expo Go** on the iPhone (App Store, search "Expo Go") | The demo runs in Expo Go by scanning a QR code; no app build needed | App Store | Free | Expo Go opens on the phone | [ ] |
| 2 | Create a free **Cloudflare** account, then run `npx wrangler login` | The Gemini key lives only in a Cloudflare Worker, never in the app | https://dash.cloudflare.com/sign-up | Free plan | `npx wrangler whoami` shows your account | [ ] |
| 3 | Create a **Gemini API key** in Google AI Studio | Powers Ask NEXTORA through the worker | https://aistudio.google.com/apikey | Free tier (limits NOT VERIFIED) | A key is shown in AI Studio (do not copy it anywhere but the terminal prompt in step 4) | [ ] |
| 4 | Run `npm run setup:worker` | Deploys the worker and stores the key with `wrangler secret put GEMINI_API_KEY` (hidden prompt) | — | Free | `npm run check:worker` passes with a Firebase ID token | [ ] |
| 5 | Run `firebase login`, then `npm run deploy:rules -- --project nextora-dev-68159` | Puts the V7 security rules live; the script runs the tests first and stops if any fail | https://console.firebase.google.com | Spark (free) | Command ends with "Deploy complete"; Firestore > Rules in the console shows the new date | [ ] |
| 6 | Put the public web config for `nextora-dev-68159` into `config/firebase.dev.json` | The app reads it to reach Firebase (it is public, not a secret) | Firebase console > Project settings > Your apps > Web | Free | The app no longer shows "Backend not set up". NOTE: the V7 brief points to `docs/FIREBASE_CONFIG.md`, but that file **does not exist yet** | [ ] |
| 7 | Sign up test users in the app (email + password) | Needed for matching, chats, forum and the moderator | — | Free | Users appear in Firebase console > Authentication | [ ] |
| 8 | Set the **moderator role** (steps below) | Moderation powers come only from `roles/{uid}`, set by a human | Firebase console > Firestore | Free | That user sees moderator actions in the app | [ ] |
| 9 | Supply **real content** (`data/seed/*.json`) and **native-speaker reviews** | The app shows only checked content; production offers only reviewed languages | — | Free | `npm run seed:content -- --env dev` loads your files; in `locales/meta.ts` each reviewed language has `reviewedBy`, `reviewedOn` and `released: true` | [ ] |

## Step 8 in detail: make a user a moderator

1. Firebase console > project `nextora-dev-68159` > **Authentication** > Users. Copy the **User UID** of the test user.
2. Go to **Firestore Database** > Data.
3. Click **Start collection** (or open `roles` if it exists). Collection ID: `roles`.
4. Document ID: paste the UID.
5. Add field: name `role`, type **string**, value `moderator`. Save.
6. In the app, sign out and back in as that user.

## Deferred (not in the demo)

| Item | Reason |
|---|---|
| Google sign-in | Needs a native module, so a development build; does not work in Expo Go |
| Email-link sign-in | Needs deep links / a link domain on native |
| Sign in with Apple | **PAID-LATER**: Apple Developer Program, $99/yr. Behind a feature flag |
| FCM push notifications | Needs a development build and APNs setup |
| App Check | Needs native attestation providers / dev build |
| EAS builds | Not needed for an Expo Go demo |
| Store listing | Needs paid developer accounts and builds |
| Legal docs (privacy policy, terms) | Need a qualified person to write and approve them |
| Blaze plan | Pay-as-you-go; V7 stays on free Spark (no Cloud Functions, no Storage) |
