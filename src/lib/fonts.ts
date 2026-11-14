import { Platform } from 'react-native';
import * as Latin from '@expo-google-fonts/noto-sans';
import * as Arabic from '@expo-google-fonts/noto-sans-arabic';
import * as Devanagari from '@expo-google-fonts/noto-sans-devanagari';
import * as Malayalam from '@expo-google-fonts/noto-sans-malayalam';
import * as Tamil from '@expo-google-fonts/noto-sans-tamil';
import * as Bengali from '@expo-google-fonts/noto-sans-bengali';
import * as Telugu from '@expo-google-fonts/noto-sans-telugu';
import * as Gurmukhi from '@expo-google-fonts/noto-sans-gurmukhi';
import * as Gujarati from '@expo-google-fonts/noto-sans-gujarati';
import * as Kannada from '@expo-google-fonts/noto-sans-kannada';
import * as Sinhala from '@expo-google-fonts/noto-sans-sinhala';
import { getLang, type Script } from '../../locales/meta';

export type Weight = 'regular' | 'semibold' | 'bold';
const suffix: Record<Weight, string> = { regular: '400Regular', semibold: '600SemiBold', bold: '700Bold' };

// Noto Sans covers Latin and Cyrillic. "other" scripts use the system font.
const families: Record<Script, { name: string; mod: Record<string, unknown> } | null> = {
  latin: { name: 'NotoSans', mod: Latin },
  cyrillic: { name: 'NotoSans', mod: Latin },
  arabic: { name: 'NotoSansArabic', mod: Arabic },
  devanagari: { name: 'NotoSansDevanagari', mod: Devanagari },
  malayalam: { name: 'NotoSansMalayalam', mod: Malayalam },
  tamil: { name: 'NotoSansTamil', mod: Tamil },
  bengali: { name: 'NotoSansBengali', mod: Bengali },
  telugu: { name: 'NotoSansTelugu', mod: Telugu },
  gurmukhi: { name: 'NotoSansGurmukhi', mod: Gurmukhi },
  gujarati: { name: 'NotoSansGujarati', mod: Gujarati },
  kannada: { name: 'NotoSansKannada', mod: Kannada },
  sinhala: { name: 'NotoSansSinhala', mod: Sinhala },
  other: null,
};

const loaded = new Set<string>();

/**
 * Font files for one language plus Noto Sans Latin (official names such as
 * UAE PASS stay in English inside every language). Only these get loaded.
 */
export function fontsFor(code: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const fam of [families.latin, families[getLang(code).script]]) {
    if (!fam) continue;
    for (const w of Object.values(suffix)) {
      const key = `${fam.name}_${w}`;
      out[key] = fam.mod[key] as number;
    }
  }
  return out;
}

export function markLoaded(map: Record<string, number>) {
  Object.keys(map).forEach((k) => loaded.add(k));
}

/**
 * Font family for text in a language. If that script's font isn't loaded
 * (for example a language name shown in the picker), use the system font,
 * which renders every supported script, instead of risking empty boxes.
 */
export function fontFor(code: string, weight: Weight = 'regular'): string | undefined {
  const fam = families[getLang(code).script];
  const key = fam ? `${fam.name}_${suffix[weight]}` : null;
  const ok = key !== null && loaded.has(key);
  if (Platform.OS === 'web') {
    // Web: a fallback stack, so Latin names inside other scripts still use Noto Sans.
    return [ok ? key : null, `NotoSans_${suffix[weight]}`, 'system-ui', 'sans-serif'].filter(Boolean).join(', ');
  }
  return ok ? key! : undefined;
}
