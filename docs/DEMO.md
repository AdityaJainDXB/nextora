# NEXTORA demo build

The demo has its own app IDs and always connects to the Firebase Auth and Firestore emulators (`demo-nextora`). It does not connect to the development or production Firebase projects. Its forum posts, chat, match profiles, events, Appverse cards, and Ask replies are fictional sample data.

## Demo sign-in

- Email: `demo@nextora.app`
- Password: `NextoraDemo2026!`

These credentials exist only in the local Auth emulator. Do not use this password for any real account.

## Run locally

1. Start the isolated backend: `npm run demo:backend`
2. In another terminal, seed the fake account and sample content: `npm run demo:seed`
3. Start the demo app: `npm run start:demo` (Metro port 8085)

The iOS simulator and physical phone must be able to reach the computer running the emulators. For a physical phone, keep it on the same network as Metro and the emulator host.

## Build separately

Use `eas build --profile demo --platform ios` for an iOS simulator build, or `eas build --profile demo --platform android` for an Android APK. The app IDs end in `.demo`; production keeps `com.nextora.app`.

The Ask screen includes a prefilled fictional conversation and answers new prompts with an explicit local demo response. It does not call Gemini or the Cloudflare Worker.
