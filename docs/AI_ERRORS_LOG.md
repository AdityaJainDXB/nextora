# AI errors log

Real mistakes made while building NEXTORA, and how each was caught and fixed.
Entries e1 to e10 mirror `data/ai-errors-log.ts` (shown in the app under Settings > Build notes).
H1 and H2 were reported by the human on the team. No entries are invented.

Status key:
- **ai-self-check**: the AI caught and fixed its own mistake; a human has not yet confirmed the fix.
- **reported by the human**: a person found the problem and required the change.

| ID | Date | What the AI produced | Why it was wrong | How it was caught | Fix | Status |
|---|---|---|---|---|---|---|
| e1 | 2026-10-31 | Linked the UAE PASS Appverse entry to a "corrected after review" build note | That note did not exist, so a correction badge would have shown with no real correction behind it | AI self-check | Link removed; Appverse entries only link to log entries that describe a real correction | ai-self-check |
| e2 | 2026-10-31 | Ran `npx expo install` before project dependencies were installed | Expo could not detect the SDK version, so nothing was installed | AI self-check (command output) | Installed base dependencies first, then re-ran Expo install so versions match SDK 58 | ai-self-check |
| e3 | 2026-10-31 | Loading screen used the language-aware Text component before the language provider existed | App crashed on first launch ("useLang outside provider") | Automated Playwright run | Language hook falls back to English, left to right, until the provider is ready; two circular imports between UI files split | ai-self-check |
| e4 | 2026-10-31 | "I'd like to help" hero button used purple text on the aubergine background | Failed text contrast on a dark card | AI self-check; also reported by the human (see H1) | Light outline button style (white text, off-white border) for dark backgrounds | ai-self-check (human report H1 matches) |
| e5 | 2026-10-31 | In Arabic (right to left) the "I'm new here" arrow still pointed right | Points against the reading direction | AI self-check | Directional icons (arrows, chevrons, send) mirrored in right-to-left languages | ai-self-check |
| e6 | 2026-10-31 | Accept, Reject and Ignore buttons in a fixed row | Long Malayalam labels ran into each other on a phone-width screen | Playwright run in Malayalam | Row wraps and each button sizes to its label (a first fixed-width attempt still overflowed) | ai-self-check |
| e7 | 2026-10-31 | Tab guard treated "auth still loading" as "signed out" | Refreshing or deep-linking to a signed-in tab (e.g. /me) sent people back to the start; data export unreachable that way | Stage 2 end-to-end test | Tabs show a loading state until sign-in status is known, then redirect only if really signed out | ai-self-check |
| e8 | 2026-10-31 | Assumed empty config values arrive as null | Expo turns null into {} in the app config, so the Functions region became "[object Object]" and an empty Firebase config would have looked configured | Stage 2 end-to-end test | Config values accepted only when they are non-empty strings (`src/lib/firebase.ts`) | ai-self-check |
| e9 | 2026-10-31 | Checkboxes, radios and tabs set state with `accessibilityState` only | The web build does not expose it, so screen readers on web were never told the ticked/selected state | Stage 3 two-device sync test | Added matching aria-checked, aria-selected, aria-pressed and aria-disabled props | ai-self-check |
| e10 | 2026-10-31 | Put a Tamil letter inside a Malayalam word in report text | Malayalam readers would see a garbled word | AI self-check | Word corrected; automated test fails if a language file mixes letters from another script (`tests/locales.test.ts`) | ai-self-check |
| H1 | NOT VERIFIED (date not recorded) | Purple text on aubergine on the "I'd like to help" button | Failed contrast | **Reported by the human** | Purple moved to fills only; text on dark uses paper/off-white. Same issue as e4 | reported by the human |
| H2 | NOT VERIFIED (date not recorded) | First build showed only "Coming soon" cards | The roadmap scope was misread: later stages were treated as placeholders instead of being built | **Reported by the human** | The human required working features (login, forum and so on); the build was redone with real flows | reported by the human |

Team: when you review an ai-self-check entry, change `fixedBy` to `"human"` in `data/ai-errors-log.ts` and update this table.
