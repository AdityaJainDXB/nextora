# Tier 1 gate (V5 Stage 5)

Run on 2026-10-31 against the Firebase Local Emulator Suite (web build at phone
size, Playwright, verifying stored data through the emulator REST APIs).

| Gate item | Result | Evidence |
|---|---|---|
| Sign up with email + password | PASS | stage2 e2e: "auth user created" |
| Sign up with email link | PARTIAL | web flow built; native needs `EMAIL_LINK_DOMAIN` (not run end to end) |
| Sign up with Google / Apple | NOT VERIFIED | buttons show "not set up yet"; needs developer accounts |
| Verify email | PASS | stage2/4: oob link opened, banner cleared, token refreshed |
| Onboarding, edit profile | PASS | stage2: private profile saved, hidden fields not published |
| Switch en / hi / ar | PASS | gate-lang: 14/14 (RTL for ar, Noto fonts, saved to account) |
| Checklist syncs across two devices | PASS | stage3: two browser contexts, live both ways |
| Match, accept, chat between two real accounts | PASS | stage4: 19/19 |
| Mutual contact reveal | PASS | stage4: one-sided offer reveals nothing; both → both see |
| Block | PASS | stage4: conversation closed, removed from directory |
| Delete account (data actually gone) | PASS | stage2 + stage4: auth user, docs, connections and messages removed |
| Rules tests | PASS | 70/70 (`npm test`) |
| Real iOS and Android devices | NOT VERIFIED | needs a person with phones (docs/HUMAN_TASKS.md section 5) |

The gate is passed for everything that can run without physical devices and
developer accounts. The device run stays open as a human task.
