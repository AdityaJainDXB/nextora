// Design tokens. All colours used in components come from here.
// Names match DESIGN.md: Harbour Ink, Night, Paper, Desert Clay.
export const palette = {
  ink: '#16233F',
  night: '#141A26',
  paper: '#F7F5F0',
  clay: '#B4532A',
};

export const colors = {
  ...palette,
  bg: palette.paper,
  surface: '#FFFFFF',
  surfaceAlt: '#EFEBE3',
  text: palette.night,
  textMuted: '#545B6B', // 6.3:1 on paper (docs/CONTRAST.md)
  textOnDark: '#FFFFFF',
  textOnDarkMuted: '#C9D0DE', // 10.1:1 on ink
  border: '#E2DDD3',
  primary: palette.ink, // white text on ink passes AA
  primarySoft: '#E6EAF2',
  accent: palette.clay,
  accentText: '#8A3A18', // clay darkened for AA text on light bg
  accentSoft: '#F4E6DD',
  success: '#126B63',
  warning: '#8A5A00',
  warningSoft: '#FFF2D6',
  danger: '#B3261E',
  dangerSoft: '#FBE4E2',
  // Disabled/unavailable text: #6B6878 is 5.0:1 on paper, so 'coming soon' names stay readable.
  disabled: '#6B6878',
  // Clay lightened for text on the dark ink background (welcome, dark bars).
  accentOnDark: '#F0B08E',
  // Translucent fills (no hex form, so the contrast tool skips them).
  accentOnDarkSoft: 'rgba(240,176,142,0.14)', // accentOnDark at 14%: trust strip on ink
  glassOnDark: 'rgba(20,26,38,0.35)', // night at 35%: dark tab pill on ink
  scrim: 'rgba(22,35,63,0.45)', // ink at 45%: behind bottom sheets
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
  shadowColor: palette.night,
  shadowOpacity: 0,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 0,
};
