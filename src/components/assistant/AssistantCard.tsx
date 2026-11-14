// Voice Assistant Card for iOS/Android. Same motion values as the web original
// (transitions.dev): stream fade 350ms cubic-bezier(.22,1,.36,1), status swap 150ms
// ease-in-out over 4px, voice bars 900ms down to 0.35, bubble float 4000ms over 3px,
// press 0.95 over 150ms. The system "reduce motion" setting turns all of it off.
// The bottom glow stands in for voice-glow, which needs a browser canvas; while
// recording it follows expo-audio metering.
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { colors, palette, radius } from '../../../theme';
import { Avatar, T } from '../ui';
import type { AssistantCardProps } from './types';

const smoothOut = Easing.bezier(0.22, 1, 0.36, 1);
const inOut = Easing.inOut(Easing.ease);

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

function Word({ text, reduce, lang }: { text: string; reduce: boolean; lang: string }) {
  const o = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (!reduce) Animated.timing(o, { toValue: 1, duration: 350, easing: smoothOut, useNativeDriver: true }).start();
  }, [o, reduce]);
  return <Animated.Text style={[styles.word, { opacity: o }]}><T v="small" lang={lang}>{text} </T></Animated.Text>;
}

function SwapText({ value, reduce }: { value: string; reduce: boolean }) {
  const [shown, setShown] = useState(value);
  const a = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (value === shown) return;
    if (reduce) { setShown(value); return; }
    Animated.timing(a, { toValue: 0, duration: 150, easing: inOut, useNativeDriver: true }).start(() => {
      setShown(value);
      a.setValue(-1); // enter from below
      Animated.timing(a, { toValue: 1, duration: 150, easing: inOut, useNativeDriver: true }).start();
    });
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const opacity = a.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 0, 1] });
  const translateY = a.interpolate({ inputRange: [-1, 0, 1], outputRange: [4, -4, 0] });
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }} accessibilityLiveRegion="polite">
      <T v="tiny" color={colors.textMuted} center>{shown}</T>
    </Animated.View>
  );
}

const BAR_H = [6, 12, 18, 12, 6];
// CSS uses negative delays (start part-way through the cycle); a positive stagger of
// the same fraction gives the same offset between bars.
const BAR_PHASE = [0, 0.3, 0.6, 0.15, 0.45];

function Bar({ h, phase, live, reduce }: { h: number; phase: number; live: boolean; reduce: boolean }) {
  const s = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!live || reduce) { s.stopAnimation(); s.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(s, { toValue: 0.35, duration: 450, easing: inOut, useNativeDriver: true }),
      Animated.timing(s, { toValue: 1, duration: 450, easing: inOut, useNativeDriver: true }),
    ]));
    const t = setTimeout(() => loop.start(), phase * 900);
    return () => { clearTimeout(t); loop.stop(); };
  }, [live, reduce, phase, s]);
  return <Animated.View style={[styles.bar, { height: h, transform: [{ scaleY: s }] }]} />;
}

function Bars({ live, reduce }: { live: boolean; reduce: boolean }) {
  return (
    <View style={styles.bars}>
      {BAR_H.map((h, i) => <Bar key={i} h={h} phase={BAR_PHASE[i]} live={live} reduce={reduce} />)}
    </View>
  );
}

export function AssistantCard(p: AssistantCardProps) {
  const reduce = useReduceMotion();
  const live = p.phase === 'listening';
  const float = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: 2000, easing: inOut, useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 2000, easing: inOut, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [float, reduce]);

  // While recording with metering, the glow follows the real voice level (0.35..1);
  // otherwise it uses the phase values. Reduced motion keeps a steady glow.
  const metered = p.phase === 'listening' && typeof p.level === 'number' && !reduce;
  useEffect(() => {
    if (metered) return;
    const to = p.phase === 'idle' ? 0 : p.phase === 'thinking' ? 0.7 : 1;
    Animated.timing(glow, { toValue: to, duration: reduce ? 0 : 400, easing: smoothOut, useNativeDriver: true }).start();
  }, [p.phase, glow, reduce, metered]);
  useEffect(() => {
    if (!metered) return;
    Animated.timing(glow, { toValue: 0.35 + 0.65 * (p.level as number), duration: 100, easing: smoothOut, useNativeDriver: true }).start();
  }, [metered, p.level, glow]);

  const pressTo = (v: number) => () => {
    if (!reduce) Animated.timing(press, { toValue: v, duration: 150, easing: smoothOut, useNativeDriver: true }).start();
  };

  return (
    <View style={styles.card}>
      {/* Voice glow rising from the bottom of the card. */}
      <Animated.View pointerEvents="none" style={[styles.glowWrap, { opacity: glow }]}>
        <View style={[styles.glow, { backgroundColor: palette.teal, opacity: 0.10, height: 90 }]} />
        <View style={[styles.glow, { backgroundColor: palette.teal, opacity: 0.16, height: 36 }]} />
      </Animated.View>

      <View style={styles.top}>
        <Avatar initials="NX" hue="aubergine" size={32} />
        <View style={{ flex: 1 }}>
          <T w="semibold" lang={p.lang}>{p.name}</T>
          <T v="tiny" color={colors.textMuted} lang={p.lang}>{p.meta}</T>
        </View>
      </View>
      <View style={styles.divider} />

      <View style={styles.body}>
        <Animated.View style={{ transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }], alignItems: 'flex-start' }}>
          <View style={styles.bubble}><T v="small" lang={p.lang}>{p.greeting}</T></View>
        </Animated.View>
        <View key={p.runKey} style={styles.transcript} accessibilityLiveRegion="polite">
          {p.words.map((w, i) => <Word key={i} text={w} reduce={reduce} lang={p.lang} />)}
        </View>
      </View>

      <View style={styles.bottom}>
        <SwapText value={p.caption} reduce={reduce} />
        <Animated.View style={{ transform: [{ scale: press }] }}>
          <Pressable
            onPress={p.onMic}
            onPressIn={pressTo(0.95)}
            onPressOut={pressTo(1)}
            accessibilityRole="button"
            accessibilityLabel={p.micLabel}
            accessibilityState={{ selected: live }}
            aria-pressed={live}
            style={[styles.mic, live && { borderColor: colors.primary }]}
          >
            <Bars live={live} reduce={reduce} />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%', maxWidth: 360, minHeight: 340, alignSelf: 'center', borderRadius: 24, overflow: 'hidden',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.navy, shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 2,
  },
  glowWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  glow: { position: 'absolute', left: -20, right: -20, bottom: -10, borderTopLeftRadius: 200, borderTopRightRadius: 200 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 24, opacity: 0.7 },
  body: { padding: 24, paddingBottom: 0, gap: 16 },
  bubble: { maxWidth: 260, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18, borderBottomLeftRadius: 4, backgroundColor: colors.primarySoft, marginStart: 8 },
  transcript: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', paddingStart: 32 },
  word: {},
  bottom: { marginTop: 'auto', padding: 24, paddingTop: 16, alignItems: 'center', gap: 12 },
  mic: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: colors.border,
  },
  bars: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 20 },
  bar: { width: 2, borderRadius: radius.sm, backgroundColor: colors.text },
});
