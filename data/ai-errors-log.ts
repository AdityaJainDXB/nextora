// AI errors log, rendered in Settings > Build notes. Only real issues from this
// build. `fixedBy` is honest: "human" only when a person made or confirmed the fix;
// "ai-self-check" when the AI caught and fixed its own mistake and a human has
// not confirmed it yet. Team: change to "human" after you review an entry.
export interface AiErrorEntry {
  id: string;
  wrong: string;
  fixed: string;
  date: string; // YYYY-MM-DD
  fixedBy: 'human' | 'ai-self-check';
  screenshot: string | null;
  appId: string | null; // linked Appverse entry, if any
}

export const aiErrors: AiErrorEntry[] = [
  {
    id: 'e1',
    wrong: 'Linked the UAE PASS Appverse entry to a "corrected after review" build note that did not exist, which would have shown a correction badge with no real correction behind it.',
    fixed: 'Removed the link. Appverse entries now only link to log entries that describe a real correction.',
    date: '2026-10-31',
    fixedBy: 'ai-self-check',
    screenshot: null,
    appId: null,
  },
  {
    id: 'e2',
    wrong: 'Ran "npx expo install" before the project dependencies were installed, so the Expo SDK version could not be detected and nothing was installed.',
    fixed: 'Installed the base dependencies first, then re-ran the Expo install so versions match SDK 58.',
    date: '2026-10-31',
    fixedBy: 'ai-self-check',
    screenshot: null,
    appId: null,
  },
  {
    id: 'e3',
    wrong: 'The loading screen used the language-aware Text component before the language provider existed, so the app crashed on first launch ("useLang outside provider"). Found by the automated Playwright run.',
    fixed: 'The language hook now falls back to English, left to right, until the provider is ready. Two circular imports between UI files were split at the same time.',
    date: '2026-10-31',
    fixedBy: 'ai-self-check',
    screenshot: null,
    appId: null,
  },
  {
    id: 'e4',
    wrong: 'Low-contrast text on a dark card: the "I\'d like to help" button on the hero used purple text on the aubergine background.',
    fixed: 'Added a light outline button style (white text, off-white border) for dark backgrounds.',
    date: '2026-10-31',
    fixedBy: 'ai-self-check',
    screenshot: null,
    appId: null,
  },
  {
    id: 'e5',
    wrong: 'In Arabic (right to left) the "I\'m new here" arrow still pointed right, against the reading direction.',
    fixed: 'Directional icons (arrows, chevrons, send) are mirrored in right-to-left languages.',
    date: '2026-10-31',
    fixedBy: 'ai-self-check',
    screenshot: null,
    appId: null,
  },
  {
    id: 'e6',
    wrong: 'The Accept, Reject and Ignore buttons sat in a fixed row, so long Malayalam labels ran into each other on a phone-width screen.',
    fixed: 'The button row now wraps and each button sizes to its label (a first attempt with a fixed width still overflowed). Caught by the Playwright run in Malayalam.',
    date: '2026-10-31',
    fixedBy: 'ai-self-check',
    screenshot: null,
    appId: null,
  },
  {
    id: 'e7',
    wrong: 'Refreshing or deep-linking to a signed-in tab (for example /me) sent people back to the start, because the tab guard treated "auth still loading" as "signed out". Data export could not be reached that way.',
    fixed: 'Tabs show a loading state until sign-in status is known, then redirect only if the person really is signed out. Caught by the Stage 2 end-to-end test.',
    date: '2026-10-31',
    fixedBy: 'ai-self-check',
    screenshot: null,
    appId: null,
  },
  {
    id: 'e8',
    wrong: 'Assumed empty config values arrive as null. Expo turns null into {} in the app config, so the Functions region became "[object Object]" (export failed) and an empty Firebase config would have looked configured.',
    fixed: 'Config values are only accepted when they are non-empty strings. Caught by the Stage 2 end-to-end test.',
    date: '2026-10-31',
    fixedBy: 'ai-self-check',
    screenshot: null,
    appId: null,
  },
  {
    id: 'e9',
    wrong: 'Checkboxes, radio buttons and tabs set their state with accessibilityState only, which the web build does not expose, so screen readers on web were never told whether an item was ticked or selected.',
    fixed: 'Added the matching aria-checked, aria-selected, aria-pressed and aria-disabled props everywhere. Caught by the Stage 3 two-device sync test.',
    date: '2026-10-31',
    fixedBy: 'ai-self-check',
    screenshot: null,
    appId: null,
  },
  {
    id: 'e10',
    wrong: 'While writing the Malayalam report text, the AI put a Tamil letter inside a Malayalam word, which would have shown a garbled word to Malayalam readers.',
    fixed: 'Corrected the word and added an automated test that fails if any language file mixes in letters from another script.',
    date: '2026-10-31',
    fixedBy: 'ai-self-check',
    screenshot: null,
    appId: null,
  },
];
