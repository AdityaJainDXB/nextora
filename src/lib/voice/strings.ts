// Voice strings live in locales/fragments/voice.json until they are merged into the
// main locale files. Prefer i18n once the key exists there; fall back to the fragment.
import i18n from 'i18next';
import frag from '../../../locales/fragments/voice.json';

const ORDER = ['en', 'hi', 'ar', 'ur', 'ml', 'ta', 'bn', 'tl', 'ne', 'ru'];
type Key = keyof typeof frag;

export function vt(key: Key, lang: string): string {
  if (i18n.exists(key, { lng: lang })) return i18n.t(key, { lng: lang });
  const row = frag[key] as string[];
  const i = ORDER.indexOf(lang);
  return row[i >= 0 ? i : 0] ?? row[0];
}
