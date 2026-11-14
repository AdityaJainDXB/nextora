# NEXTORA — Press Kit

**Arrive. Settle. Thrive. Belong.**
A free, multilingual companion app for people who have just moved to the UAE, and for the residents who volunteer to help them.

*Status: working prototype (pitch build). Not yet on the App Store or Google Play.*

---

## Pitch email (ready to send)

**Subject:** UAE-built app helps newcomers settle in, in 16 languages

Dear [Editor's name],

My name is [Your name], and I am [age / school or university / city, e.g. "a student developer in Dubai"]. I have built **NEXTORA**, a free mobile app that helps people who have just arrived in the UAE get through their first days and find a community. It works in 16 languages, including Arabic, Hindi, Urdu, Malayalam, Tamil, Bengali, Tagalog and Nepali.

Moving to the UAE means learning many official apps and services at once, often in a second language and without anyone nearby to ask. NEXTORA turns that into one guided list. It also connects newcomers with volunteer residents who speak their language, through a moderated forum, small community meetups and safe one-to-one chats.

The app is a working prototype. I would be glad to give your team a live demo on a phone, share screenshots, or talk about why I built it and how it keeps users safe.

Thank you for your time.

Kind regards,
[Your name]
[Phone] · [Email] · [City, UAE]

---

## One-paragraph summary

NEXTORA is a mobile app for newcomers to the UAE. On day one it shows a "First 48 hours" checklist ordered for the person's situation: getting a SIM card, the key government apps, finding a doctor nearby, and so on. Each step has direct links to the official app or website. Newcomers can then find people who speak their language, ask questions in a community forum, join small meetups hosted by volunteer guides, and ask an AI assistant everyday questions by text or voice. The app works in 16 languages, with full right-to-left support for Arabic and Urdu, and is built around privacy: no phone numbers or emails are shared until both people agree.

## The problem

- People arriving in the UAE, or moving between emirates, have to learn many apps and services at once.
- Information is spread across many places and often assumes you already know how things work.
- Many newcomers are working in a language that is not their first, and have no one nearby to ask.

*(We have deliberately not quoted statistics we have not sourced.)*

## What the app does

| Feature | What it means for a newcomer |
|---|---|
| **First 48 hours checklist** | A step-by-step list ordered for their situation (just arrived, family, moving between emirates). Each step links to the official provider's App Store page, Google Play page or website. |
| **Find a doctor near me** | One tap opens Google Maps with nearby clinics, using the phone's location only when the user allows it. |
| **Guides for living here** | Plain-language guides on timelines, schools, property and services, each clearly marked as reviewed or not yet reviewed. |
| **People who speak your language** | Matching runs on the phone, from interests, emirate and languages. Users choose which profile details are visible. |
| **Community forum** | Ask once, and the answer helps the next person too. Posts that include phone numbers, emails or links are blocked automatically. |
| **Meetups** | Volunteer guides can host small community events. Newcomers RSVP and add them to their calendar. |
| **Safe chat** | Chat starts only after both people accept. Contact details are revealed only when both choose to share them. Users can block and report. |
| **AI assistant (text and voice)** | Ask everyday questions in your own language and get answers labelled "AI-generated, may be wrong". Only the question is sent, never the person's name or chats. |
| **16 languages** | English, Arabic, Hindi, Urdu, Malayalam, Tamil, Bengali, Tagalog, Nepali, Russian, Gujarati, Kannada, Marathi, Punjabi, Sinhala and Telugu, each in its own script. |

## Safety and privacy, built in

- **Adults only:** sign-up checks the user is 18 or over, and the age itself is never stored.
- **No contact details by default:** phone numbers and emails stay hidden until both people agree.
- **Automatic filtering:** posts and messages containing phone numbers, emails or links are refused.
- **Moderation:** users can report people, posts and events, and moderators can hide content.
- **Off by default:** AI features, analytics and notifications stay off until the user switches them on.
- **Your data, your choice:** users can export their data or delete their account from inside the app.

## Honesty by design

- AI translations are labelled "AI-translated" until a native speaker reviews them.
- Guide content carries a review badge ("Human-reviewed", "Not yet reviewed" or "Needs re-check").
- The app never invents fees, dates or official links. Where content isn't ready, the app says so plainly.
- A public log records real mistakes made by AI tools during the build and how each one was fixed.

## How it is built (for technology coverage)

- **App:** React Native with Expo, one codebase for iPhone and Android.
- **Accounts and data:** Firebase. All security rules are enforced on the server side, and more than 100 automated tests check them.
- **AI:** Google Gemini, reached through a Cloudflare Worker, so the AI key never sits inside the app.
- **Cost:** designed to run entirely on free plans.
- **Design:** gluestack UI components, with colour contrast checked against accessibility standards.

## Where it stands today

- **Working prototype:** it runs on real phones through Expo Go and has been tested end to end.
- **Not yet on the stores:** it has not been submitted to the App Store or Google Play.
- **Translations:** most of the 16 translations are AI-produced and awaiting review by native speakers. English is the only fully reviewed language.
- **Next steps:** native-speaker review of translations, human review of guide content, recruiting volunteer guides, then store submission.

## What we're looking for

- Coverage that helps newcomers and residents hear about the project
- Native speakers who can review a language
- Volunteer guides
- Community organisations, schools or employers who welcome new arrivals

## Photos

Screenshots from the app are in the `photos` folder. They show the demo version, with fictional sample content clearly labelled.

| File | Shows |
|---|---|
| `ui-home.png` | First 48 hours checklist with official app links |
| `ui-forum.png` | Community forum with topics and emirates |
| `ui-events.png` | Community meetups with dates |
| `ui-ask.png` | AI assistant with voice and text |
| `ui-matches.png` | Finding people who share your languages and interests |

A live demo on a phone is available on request.

## Contact

[Your name] · [Phone] · [Email] · [City, UAE]
