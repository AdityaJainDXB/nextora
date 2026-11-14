# Voice tests (V7 §16)

Status as of 2026-10-31. Nothing below was tested on a real device or with real speech.
Code was checked only with `npx tsc --noEmit` and `npx expo-doctor`, and both passed.
Every cell stays **NOT VERIFIED** until a person runs the steps and writes the result here.

| Language | Speech-to-text tested? (iOS / Android / Web) | Read-aloud voice available? (iOS / Android) |
|---|---|---|
| en | NOT VERIFIED / NOT VERIFIED / NOT VERIFIED | NOT VERIFIED / NOT VERIFIED |
| hi | NOT VERIFIED / NOT VERIFIED / NOT VERIFIED | NOT VERIFIED / NOT VERIFIED |
| ar | NOT VERIFIED / NOT VERIFIED / NOT VERIFIED | NOT VERIFIED / NOT VERIFIED |
| ur | NOT VERIFIED / NOT VERIFIED / NOT VERIFIED | NOT VERIFIED / NOT VERIFIED |
| ml | NOT VERIFIED / NOT VERIFIED / NOT VERIFIED | NOT VERIFIED / NOT VERIFIED |
| ta | NOT VERIFIED / NOT VERIFIED / NOT VERIFIED | NOT VERIFIED / NOT VERIFIED |

Write the result as `yes (device, OS version, date)`, `no (what happened)`, or `NOT VERIFIED`.

## Before you start
1. Set up and deploy the Worker with a `POST /transcribe` route that accepts `{audio, mime, lang}` and returns `{text}`. Then run `npm run setup:worker` so `extra.workerUrl` is set.
2. Sign in to the app, because voice typing needs a Firebase ID token.
3. Grant the `aiVoice` consent. Until the consent screen lists it, voice shows "Voice typing needs your permission first."
4. Leave Settings, then Assistant, switched on.
5. Run `npm start` (Expo Go) and open the app on a real phone. The iOS Simulator's microphone is unreliable.

## Speech-to-text (per language)
1. In the app, switch the language to the one you are testing.
2. Open the Ask tab and tap the mic.
3. On the first tap, the system asks for the microphone. Allow it.
4. Say this sentence, which is about 5 seconds long: "How do I renew my residence visa?" (say it in the test language).
5. Tap the mic again. The caption should say "Turning your voice into text…".
6. Check the results:
   - The words appear in the text box. The box can be edited, and **nothing is sent automatically**.
   - The tag "Voice typing by AI, check the words" is shown.
   - The text matches what you said. Write down any wrong words.
   - The message goes out only when you press Send.
7. **Auto-stop:** tap the mic and keep talking for more than 30 s. Recording should stop by itself and the text should fill in.
8. **Denied:** turn off microphone access in the phone settings, then tap the mic. You should see "The microphone is off…" with a "Type instead" button. Tapping it should focus the box.
9. **Not configured:** build without a Worker URL, or turn off the assistant setting. Tapping the mic should show "Voice typing is not available yet." with "Type instead".
10. **No audio is kept:** after a turn, the recording file should be gone. In a debug session, `new File(recorder.uri).exists` should be false.
11. **Glow (native):** while you talk, the bottom glow should get brighter and dimmer with your voice. With Reduce Motion on, the glow should stay steady.
12. **Web:** use Chrome. The browser's own SpeechRecognition runs, and the words still go into the box without being sent.

## Read-aloud (per language)
1. In the app, switch the language and ask any question so you get an answer.
2. Check whether a speaker icon appears next to the "AI" tag on the answer:
   - **Icon shown:** the device has a voice for that language. Tap it, check that it reads aloud in that language, then tap again to stop.
   - **No icon:** the device has no voice whose language starts with that code. Write `no`.
3. To list the device's voices, run `Speech.getAvailableVoicesAsync()` in a debug session and record the matching `language` values, for example `hi-IN` or `ar-SA`.
