# nextora-ai (Cloudflare Worker)

The only path from the NEXTORA app to Gemini. Firebase stays on the free Spark plan (no Cloud Functions); this Worker holds the Gemini key as a secret.

## Routes
All `POST`, JSON, `Authorization: Bearer <Firebase ID token>`.

| Route | Body | Returns |
|---|---|---|
| `/ask` | `{question, lang, emirate?}` | `{text}`. Only UAE living topics, no legal/visa/medical/financial decisions, always points to the official source |
| `/translate` | `{text, target}` | `{text}`. Translation only; UAE PASS, DubaiNow, nol, DEWA, Emirates ID stay untranslated |
| `/transcribe` | `{audio (base64), mime, lang}` | `{text}`. Audio models only; audio is never stored or logged |

The `X-Model` response header names the model that answered.

## Security and limits
- Firebase ID token check: RS256 against Google's securetoken JWKS (cached per `Cache-Control`), `aud` in `FIREBASE_PROJECT_IDS`, `iss` must match, `exp`/`iat`, non-empty `sub`.
- `EMULATOR_MODE="true"` accepts unsigned emulator tokens, but only for `demo-*` project ids. Never turn it on in a deployed Worker.
- CORS: exact `ALLOWED_ORIGINS` only. Requests with no `Origin` header (the native app) are allowed.
- Size: `/ask` and `/translate` bodies up to 2 KB. `/transcribe` audio up to about 1 MB decoded. Larger requests get `413`.
- Rate limit: 20 requests per user per hour across all routes, then `429`.
- Errors: `401` bad/missing token, `403` origin, `413` size, `429` rate, `503 {"error":"unavailable"}` when every model fails.
- Model fallback: models are tried in order (at most 3). 404/429/500/503/8 s timeout moves to the next model; other errors stop. A model that returns 404 is skipped for 1 hour.
- Logs contain only `{route, status, model}`. No message text, audio, tokens or key.

## Deploy
```sh
cd worker && npm i                 # local dev deps (vitest, typescript)
npx wrangler kv namespace create RATE  # optional but recommended; paste the id into wrangler.toml
cd .. && node scripts/worker/setup.mjs # login, hidden key prompt, choose models, deploy, write config/worker.json
node scripts/worker/check.mjs          # NEXTORA_TEST_ID_TOKEN=... for the authed check
```
Set `ALLOWED_ORIGINS` in `wrangler.toml` to your real web origins before deploying. Model names are never hardcoded in `src/`; `setup.mjs` fills `GEMINI_MODELS` and `GEMINI_AUDIO_MODELS` from `models.list`.

Without the `RATE` KV binding the Worker uses per-isolate memory. That works, but the limits are best effort only (not shared across isolates).

## Free plan notes
- Workers Free: 100k requests/day, 10 ms CPU per request. Waiting on Gemini is I/O, so it does not count as CPU time.
- KV Free: 100k reads and 1k writes per day. Each successful request writes once to the rate counter, so about 1k AI calls/day fit before KV writes run out (after that, writes fail silently and the limit stops counting). Check this if usage grows.
- KV is eventually consistent, so the rate limit is approximate.

## Tests
`cd worker && npm test` (vitest, mocked fetch, RSA keys generated in the test). `npx tsc --noEmit -p worker` for types.
