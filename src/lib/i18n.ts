import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Constants from 'expo-constants';
import { getLocales } from 'expo-localization';
import { getLang } from '../../locales/meta';
import en from '../../locales/en.json';
import ar from '../../locales/ar.json';
import hi from '../../locales/hi.json';
import ur from '../../locales/ur.json';
import ml from '../../locales/ml.json';
import ta from '../../locales/ta.json';
import bn from '../../locales/bn.json';
import tl from '../../locales/tl.json';
import ne from '../../locales/ne.json';
import ru from '../../locales/ru.json';

// te, pa, gu, mr, kn, si have no UI translation yet (V5 Stage 11).
const resources = { en, ar, hi, ur, ml, ta, bn, tl, ne, ru };

i18n.use(initReactI18next).init({
  resources: Object.fromEntries(Object.entries(resources).map(([k, v]) => [k, { translation: v }])),
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

const showUnreleased: boolean = Constants.expoConfig?.extra?.showUnreleasedLanguages ?? false;

export const hasTranslation = (code: string) => code in resources;

/** Why a language can't be picked, or null if it can. */
export function unavailableReason(code: string): 'comingSoon' | 'notTranslated' | 'notReleased' | null {
  const meta = getLang(code);
  if (meta.status === 'comingSoon') return 'comingSoon';
  if (!hasTranslation(code)) return 'notTranslated';
  if (!meta.released && !showUnreleased) return 'notReleased';
  return null;
}

export const isSelectable = (code: string) => unavailableReason(code) === null;

/** Device language if it can be picked. Filipino devices report "fil". */
export function deviceLanguage(): string {
  for (const loc of getLocales()) {
    const code = loc.languageCode === 'fil' ? 'tl' : loc.languageCode;
    if (code && isSelectable(code)) return code;
  }
  return 'en';
}

export default i18n;
