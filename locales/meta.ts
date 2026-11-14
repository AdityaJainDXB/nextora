// Language configuration.
// - "active" languages are offered; "comingSoon" ones are listed greyed out.
// - An active language is pickable in production only when `released: true`,
//   which should be set only after a native-speaker review (docs/HUMAN_TASKS.md 4.1).
//   Development and preview builds can pick unreleased languages for testing.
// - "Reviewed by a human" shows only when both reviewedBy and reviewedOn are filled.
export type Script =
  | 'latin' | 'cyrillic' | 'arabic' | 'devanagari' | 'malayalam' | 'tamil' | 'bengali'
  | 'telugu' | 'gurmukhi' | 'gujarati' | 'kannada' | 'sinhala' | 'other';

export interface LanguageMeta {
  code: string;
  nativeName: string;
  englishName: string;
  status: 'active' | 'comingSoon';
  rtl: boolean;
  script: Script;
  released: boolean;
  reviewedBy: string | null;
  reviewedOn: string | null;
}

const l = (
  code: string, nativeName: string, englishName: string, script: Script,
  opts: { status?: LanguageMeta['status']; rtl?: boolean; released?: boolean } = {},
): LanguageMeta => ({
  code, nativeName, englishName, script,
  status: opts.status ?? 'active',
  rtl: opts.rtl ?? false,
  released: opts.released ?? false,
  reviewedBy: null,
  reviewedOn: null,
});

export const languages: LanguageMeta[] = [
  // English is the source language, so it ships released.
  l('en', 'English', 'English', 'latin', { released: true }),
  l('ar', 'العربية', 'Arabic', 'arabic', { rtl: true }),
  l('hi', 'हिन्दी', 'Hindi', 'devanagari'),
  l('ur', 'اردو', 'Urdu', 'arabic', { rtl: true }),
  l('ml', 'മലയാളം', 'Malayalam', 'malayalam'),
  l('ta', 'தமிழ்', 'Tamil', 'tamil'),
  l('te', 'తెలుగు', 'Telugu', 'telugu'),
  l('bn', 'বাংলা', 'Bengali', 'bengali'),
  l('pa', 'ਪੰਜਾਬੀ', 'Punjabi', 'gurmukhi'),
  l('gu', 'ગુજરાતી', 'Gujarati', 'gujarati'),
  l('mr', 'मराठी', 'Marathi', 'devanagari'),
  l('kn', 'ಕನ್ನಡ', 'Kannada', 'kannada'),
  l('si', 'සිංහල', 'Sinhala', 'sinhala'),
  l('ne', 'नेपाली', 'Nepali', 'devanagari'),
  l('tl', 'Tagalog', 'Tagalog', 'latin'),
  l('ru', 'Русский', 'Russian', 'cyrillic'),
  // Coming soon: listed, not selectable.
  l('ps', 'پښتو', 'Pashto', 'arabic', { status: 'comingSoon', rtl: true }),
  l('fa', 'فارسی', 'Persian', 'arabic', { status: 'comingSoon', rtl: true }),
  l('zh', '中文', 'Chinese', 'other', { status: 'comingSoon' }),
  l('fr', 'Français', 'French', 'latin', { status: 'comingSoon' }),
  l('id', 'Bahasa Indonesia', 'Indonesian', 'latin', { status: 'comingSoon' }),
  l('sw', 'Kiswahili', 'Swahili', 'latin', { status: 'comingSoon' }),
  l('am', 'አማርኛ', 'Amharic', 'other', { status: 'comingSoon' }),
];

/** Active languages. Used for "languages you speak" (matching), even if the UI isn't translated yet. */
export const activeLanguages = languages.filter((x) => x.status === 'active');
export const getLang = (code: string) => languages.find((x) => x.code === code) ?? languages[0];
