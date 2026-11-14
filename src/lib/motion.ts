// Motion tokens. Curves and durations follow DESIGN.md: quick, ease-out, no bounce
// unless a finger threw something. Everything here runs on the UI thread (Reanimated).
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Easing, FadeInDown, FadeOutDown, FadeIn, Keyframe, SlideInDown, css, cubicBezier } from 'react-native-reanimated';

export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
export const EASE_SHEET = Easing.bezier(0.32, 0.72, 0, 1);

// Same curves as CSS strings, for Reanimated CSS transitions.
export const CSS_EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

export const DUR = { press: 120, state: 180, move: 250, enter: 300 } as const;

// Reanimated CSS transitions: declared once, typed by css.create.
export const motion = css.create({
  /** Press feedback: a 3% shrink in 120ms while the finger is down. */
  press: {
    transitionProperty: 'transform',
    transitionDuration: `${DUR.press}ms`,
    transitionTimingFunction: CSS_EASE_OUT,
  },
  /** Colour/state change (chips, checklist cards) at 180ms, plus press scale. */
  state: {
    transitionProperty: ['backgroundColor', 'borderColor', 'transform'],
    transitionDuration: [`${DUR.state}ms`, `${DUR.state}ms`, `${DUR.press}ms`],
    transitionTimingFunction: CSS_EASE_OUT,
  },
  /** Progress fill grows over 400ms. */
  width: {
    transitionProperty: 'width',
    transitionDuration: '400ms',
    transitionTimingFunction: CSS_EASE_OUT,
  },
});
export const pressTransition = motion.press;
export const stateTransition = motion.state;
export const pressedScale = { transform: [{ scale: 0.97 }] } as const;
export const restScale = { transform: [{ scale: 1 }] } as const;

// Layout-animation builders live at module scope so they are not rebuilt per render.
export const TOAST_ENTER = FadeInDown.duration(DUR.enter).easing(EASE_OUT);
export const TOAST_EXIT = FadeOutDown.duration(240).easing(EASE_OUT);
export const SHEET_ENTER = SlideInDown.duration(DUR.enter).easing(EASE_SHEET);
export const FADE_ENTER = FadeIn.duration(DUR.state).easing(EASE_OUT);

/** The checkmark pops in from 60%, never from nothing. */
export const CHECK_ENTER = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.6 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: EASE_OUT },
}).duration(DUR.state);

/** Staggered rise for first-run content (welcome screen only). */
export const riseIn = (index: number) =>
  FadeInDown.duration(DUR.enter + 60).delay(120 + index * 60).easing(EASE_OUT);

// Haptics are a bonus, never the only feedback; the web has none.
const hapticsOn = Platform.OS === 'ios' || Platform.OS === 'android';
export const haptic = {
  tick: () => { if (hapticsOn) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); },
  done: () => { if (hapticsOn) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
};
