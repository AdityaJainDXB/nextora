# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

One Expo / React Native codebase (Expo SDK 58, Expo Router) that should feel native on each OS: iOS conventions on iPhone, Material conventions on Android. The iPhone in Expo Go is the primary demo device. A web build (react-native-web, deployed to Vercel) also exists.

## Users

**Primary: newcomers to the UAE.** People in their first days or weeks after arriving, or moving between emirates. They have to learn many official apps and services at once, often in a language that is not their first, and often with no one nearby to ask. Sub-groups confirmed in the docs: individuals just arrived, families with children (two adults may share progress), and people moving between emirates.

**Secondary: residents who help.** Long-term residents who want community, and volunteer guides who offer help, host small meetups and answer forum questions. When the needs of newcomers and helpers conflict, newcomers come first.

Adults only: under-18s are blocked at sign-up.

## Product Purpose

NEXTORA turns the scattered first steps of settling in the UAE into one guided path, then connects newcomers with people who speak their language. Tagline: **Arrive. Settle. Thrive. Belong.**

Success has two horizons:
1. **Now:** a convincing live phone demo of the pitch build (judges, investors, press).
2. **Next:** real newcomers and volunteers using it, then store release.

## Positioning

A free, multilingual companion that combines an ordered "First 48 hours" checklist linking to official providers, human-reviewed guides, and a moderated community of volunteer residents, with privacy enforced by security rules rather than promises. Everything is honest by construction: content carries its review status, AI output is labelled, and empty sections say they are empty.

## Operating Context

- Used on a phone, often in the first hours after arrival, in the user's own language and script.
- Official apps and websites are the destination: the checklist and Appverse link out to App Store, Google Play or provider sites.
- Location is used only on request ("Find a doctor near me" opens Google Maps).
- Community runs through matching, mutual-consent chats, a forum and small meetups; contact details are revealed only when both people agree.
- Moderators are assigned by a person in the Firebase console (`roles/{uid}`).

## Capabilities and Constraints

**Capabilities:** language-first onboarding; persona-ordered "First 48 hours" checklist with progress sync; Appverse (official apps, emirate filter); guides (timeline, schools, property, services, events, offers, explore); on-device matching from interests, emirate and languages, with per-field profile visibility; mutual-consent chat with block and report; forum and meetups; Ask NEXTORA assistant by text and voice through a Cloudflare Worker (Gemini); read-aloud; consent log and privacy choices.

**Hard constraints:**
- Free plans only: Firebase Spark (Auth + Firestore, no Cloud Functions, no Storage), Cloudflare Worker free plan.
- Must run in **Expo Go**: only packages Expo Go bundles; no custom native modules.
- All data enforcement lives in `firestore.rules`.
- No invented content: no URLs, fees, dates, statistics, people or testimonials that a person has not supplied. Seed content comes only from `data/seed/*.json`.
- Analytics, notifications and AI features are off by default.

**Terminology:** NEXTORA (all caps), Appverse, "First 48 hours", Ask NEXTORA, guides (volunteers) vs. guides (content screens), "Human-reviewed" / "Not yet reviewed" / "Needs re-check", "AI-translated", "AI-generated, may be wrong".

**Deferred:** Google / email-link / Apple sign-in, push, App Check, EAS builds, store listing, legal docs.

## Brand Commitments

- Name **NEXTORA** and tagline **Arrive. Settle. Thrive. Belong.**
- Voice: plain, calm, honest. Short sentences a second-language reader can follow. Never overclaims; states limits openly ("not set up yet", "no verified guides yet").
- 16 active languages, each in its own script; Arabic and Urdu are right-to-left. Noto Sans families are bundled per script. Only native-speaker-reviewed languages are released in production (`locales/meta.ts`); currently English only.
- App icons and splash in `assets/`.

## Evidence on Hand

- Press kit: `press/NEXTORA_Press_Kit.md` (+ `.docx`) and UI screenshots in `press/photos/` (home, ask, events, forum, matches).
- Problem and audience write-up: `docs/PROBLEM_AND_EMPATHY.md`.
- Test evidence: rules, locale and unit tests, worker tests (`docs/PLAN.md`, `docs/PROGRESS.md`).
- Contrast audit: `docs/CONTRAST.md`. Real AI mistakes found during the build: `docs/AI_ERRORS_LOG.md`.

**Absent, never fabricate:** statistics, user numbers, testimonials, partners, reviewed seed content, native-speaker reviews, store listings, legal documents.

## Product Principles

1. **Newcomer first.** Every screen should be usable by someone tired, new, and reading in a second language.
2. **Honest over impressive.** Show review status, label AI, and prefer an honest empty state to sample content.
3. **Privacy is a default, not a setting.** Nothing personal is shared until the person chooses to share it.
4. **Point to the official source.** NEXTORA guides people to official apps and services; it does not replace them.
5. **Every language is a first-class citizen.** Layouts must hold up in every supported script and in right-to-left.

## Accessibility & Inclusion

- WCAG AA contrast for all text pairs (audited in `docs/CONTRAST.md`; keep it passing).
- Full RTL support for Arabic and Urdu; script-specific fonts; text must survive longer translations.
- Voice typing and read-aloud for people who prefer speaking or listening.
- Large touch targets (a `touch` token exists in `theme/`).
