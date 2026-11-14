// Locale checks: same keys and placeholders as English, and no characters from
// another script mixed into a word (a real mistake caught during the build).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const flat = (o: Record<string, unknown>, p = ''): [string, string][] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' && v ? flat(v as Record<string, unknown>, `${p}${k}.`) : [[`${p}${k}`, String(v)]]));
const load = (c: string) => Object.fromEntries(flat(JSON.parse(readFileSync(`locales/${c}.json`, 'utf8'))));
const en = load('en');
const ph = (s: string) => (s.match(/{{\w+}}/g) ?? []).sort().join();

// The danda (U+0964/0965) is shared by Devanagari and Bengali, so it is not counted.
// Unicode blocks for each language's own script (Latin is allowed everywhere for official names).
const SCRIPTS: Record<string, RegExp> = {
  hi: /[\u0900-\u0963\u0966-\u097F]/, ne: /[\u0900-\u0963\u0966-\u097F]/, ar: /[\u0600-\u06FF]/, ur: /[\u0600-\u06FF]/,
  ml: /[\u0D00-\u0D7F]/, ta: /[\u0B80-\u0BFF]/, bn: /[\u0980-\u09FF]/, ru: /[\u0400-\u04FF]/, tl: /[A-Za-z]/,
};
const ALL = Object.values(SCRIPTS).filter((r) => r.source !== '[A-Za-z]');

describe.each(Object.keys(SCRIPTS))('locale %s', (code) => {
  const l = load(code);
  it('has exactly the English keys', () => {
    expect(Object.keys(l).sort()).toEqual(Object.keys(en).sort());
  });
  it('keeps every placeholder', () => {
    for (const k of Object.keys(en)) expect([k, ph(l[k])]).toEqual([k, ph(en[k])]);
  });
  it('never mixes another non-Latin script into its text', () => {
    const own = SCRIPTS[code];
    const foreign = ALL.filter((r) => r.source !== own.source);
    const bad = Object.entries(l).filter(([, v]) => foreign.some((r) => r.test(v)) && !/nativeName|lang\./.test(v));
    // Language names in their own script (picker, "speaks") are the only allowed exception, and they live in code, not locales.
    expect(bad.map(([k]) => k)).toEqual([]);
  });
});
