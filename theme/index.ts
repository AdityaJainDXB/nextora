// Design tokens. All colours used in components come from here.
export const palette = {
  aubergine: '#16233F',
  navy: '#141A26',
  offWhite: '#F7F5F0',
  purple: '#16233F',
  teal: '#B4532A',
};

export const colors = {
  ...palette,
  bg: palette.offWhite,
  surface: '#FFFFFF',
  surfaceAlt: '#EFEBE3',
  text: palette.navy,
  textMuted: '#545B6B', // 7.4:1 on off-white
  textOnDark: '#FFFFFF',
  textOnDarkMuted: '#C9D0DE', // 9.6:1 on aubergine
  border: '#E2DDD3',
  primary: palette.purple, // 5.9:1 with white text
  primarySoft: '#E6EAF2',
  accent: palette.teal,
  accentText: '#8A3A18', // teal darkened for AA text on light bg
  accentSoft: '#F4E6DD',
  success: '#126B63',
  warning: '#8A5A00',
  warningSoft: '#FFF2D6',
  danger: '#B3261E',
  dangerSoft: '#FBE4E2',
  // Disabled/unavailable text: #6B6878 is 5.1:1 on off-white, so 'coming soon' names stay readable.
  disabled: '#6B6878',
  // Terracotta lightened for text on the dark ink background (welcome, dark bars).
  accentOnDark: '#F0B08E',
};

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const radius = { sm: 6, md: 10, lg: 12, pill: 999 };
export const touch = 44;

export const type = {
  display: { fontSize: 30, lineHeight: 40 },
  h1: { fontSize: 24, lineHeight: 34 },
  h2: { fontSize: 19, lineHeight: 28 },
  body: { fontSize: 16, lineHeight: 25 },
  small: { fontSize: 14, lineHeight: 21 },
  tiny: { fontSize: 12, lineHeight: 18 },
};

export const shadow = {
  shadowColor: palette.navy,
  shadowOpacity: 0,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 0,
};
