// Computes WCAG 2.x contrast ratios for NEXTORA text/background pairs.
// Run: node docs/tools/contrast.mjs   (reads theme/index.ts, prints a markdown table)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = readFileSync(join(root, 'theme', 'index.ts'), 'utf8');
const hex = {};
for (const m of src.matchAll(/(\w+):\s*'(#[0-9A-Fa-f]{6})'/g)) hex[m[1]] = m[2];
for (const m of src.matchAll(/(\w+):\s*palette\.(\w+)/g)) hex[m[1]] = hex[m[2]];
hex.white = '#FFFFFF';

const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (h) => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// [fg, bg, where used, large-text-only?]
const pairs = [
  ['text', 'bg', 'most screens'], ['text', 'surface', 'cards, ask.tsx, chat/[id].tsx'],
  ['text', 'surfaceAlt', 'language.tsx, onboarding.tsx'], ['text', 'primarySoft', 'selected rows (language.tsx, onboarding.tsx)'],
  ['text', 'accentSoft', 'ticked checklist card (home.tsx), chat bubble (chat/[id].tsx)'],
  ['textMuted', 'bg', 'most screens'], ['textMuted', 'surface', 'cards'], ['textMuted', 'surfaceAlt', 'me.tsx, chats.tsx, matches.tsx, consent.tsx'],
  ['textMuted', 'primarySoft', 'selected rows'], ['textMuted', 'accentSoft', 'chat/[id].tsx intro label'],
  ['textOnDark', 'ink', 'hero (welcome.tsx, home.tsx)'], ['textOnDarkMuted', 'ink', 'welcome.tsx, home.tsx'],
  ['textOnDark', 'primary', 'primary button, sent chat bubble'], ['textOnDark', 'primary', 'chat/[id].tsx intro label on own bubble'],
  ['textOnDark', 'night', 'toast (ui.tsx)'], ['textOnDark', 'danger', 'danger button'], ['textOnDark', 'accentText', 'done check circle (home.tsx)'],
  ['primary', 'bg', 'links/icons (me.tsx, privacy.tsx, build-notes.tsx)'], ['primary', 'surface', 'cards, app/[id].tsx'],
  ['primary', 'primarySoft', 'selected rows (language.tsx, onboarding.tsx)'], ['primary', 'surfaceAlt', 'language.tsx'],
  ['accentText', 'bg', 'appverse.tsx, consent.tsx, auth.tsx'], ['accentText', 'surface', 'cards'], ['accentText', 'accentSoft', 'badges'],
  ['warning', 'warningSoft', 'app/[id].tsx, onboarding.tsx'], ['warning', 'bg', 'onboarding.tsx'],
  ['danger', 'dangerSoft', 'error banners'], ['danger', 'bg', 'age.tsx, auth.tsx, privacy.tsx'], ['danger', 'surface', 'matches.tsx, chat/[id].tsx'],
  ['accentOnDark', 'ink', 'welcome.tsx tagline + outline button text, TranslationBar.tsx (dark)'],
  ['disabled', 'surface', 'language.tsx "coming soon" names, ui.tsx disabled icon'], ['disabled', 'bg', 'language.tsx'],
  ['textOnDark', 'disabled', 'disabled send button icon (ask.tsx, chat/[id].tsx)'],
];

console.log('| Text | Background | Ratio | Body (4.5) | Large (3.0) | Where used |');
console.log('|---|---|---|---|---|---|');
for (const [f, b, where] of pairs) {
  const r = ratio(hex[f], hex[b]);
  console.log(`| ${f} ${hex[f]} | ${b} ${hex[b]} | ${r.toFixed(2)}:1 | ${r >= 4.5 ? 'PASS' : '**FAIL**'} | ${r >= 3 ? 'PASS' : '**FAIL**'} | ${where} |`);
}
