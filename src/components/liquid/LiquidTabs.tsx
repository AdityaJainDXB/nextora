import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { DUR, EASE_IN_OUT } from '../../lib/motion';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, touch } from '../../../theme';
import { T } from '../ui';
import type { LiquidTabsProps } from './types';

/**
 * Native: same API as the web Liquid Navbar (which needs DOM + WebGL), drawn as a
 * glassy pill whose active drop springs to the selected item.
 */
export function LiquidTabs({ items, value, onChange, tone = 'light', compact, ariaLabel }: LiquidTabsProps) {
  const [layouts, setLayouts] = useState<Record<string, { x: number; w: number }>>({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const placed = useSharedValue(false);
  const reduced = useReducedMotion();
  const dark = tone === 'dark';

  // The drop glides between tabs (250ms ease-in-out, UI thread). First placement and
  // Reduce Motion jump straight there; tabs are peers, so nothing overshoots.
  useEffect(() => {
    const l = layouts[value];
    if (!l) return;
    if (!placed.get() || reduced) {
      x.set(l.x);
      w.set(l.w);
      placed.set(true);
      return;
    }
    const cfg = { duration: DUR.move, easing: EASE_IN_OUT };
    x.set(withTiming(l.x, cfg));
    w.set(withTiming(l.w, cfg));
  }, [value, layouts, x, w, placed, reduced]);

  // Absolute and childless, so animating width re-lays-out nothing and keeps the round ends.
  const dropStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }], width: w.get(), opacity: placed.get() ? 1 : 0 }));

  const onLayout = (key: string) => (e: LayoutChangeEvent) => {
    const { x: lx, width } = e.nativeEvent.layout;
    setLayouts((s) => ({ ...s, [key]: { x: lx, w: width } }));
  };

  return (
    <View accessibilityRole="tablist" accessibilityLabel={ariaLabel} style={[styles.pill, dark ? styles.pillDark : styles.pillLight]}>
      <Animated.View pointerEvents="none" style={[styles.drop, dropStyle, dark && { backgroundColor: 'rgba(255,255,255,0.18)' }]} />
      {items.map((it) => {
        const on = it.key === value;
        const fg = dark ? (on ? colors.textOnDark : colors.textOnDarkMuted) : on ? colors.night : colors.textMuted;
        return (
          <Pressable
            key={it.key}
            onLayout={onLayout(it.key)}
            onPress={() => onChange(it.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            aria-selected={on}
            accessibilityLabel={it.label}
            style={styles.item}
          >
            {it.icon ? <Ionicons name={it.icon} size={20} color={fg} /> : null}
            {/* Every tab keeps its label: icons alone are guesswork for a newcomer. */}
            {!compact ? <T v="tiny" w={on ? 'semibold' : 'regular'} color={fg} center numberOfLines={1} style={styles.label}>{it.label}</T> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', padding: 4, borderRadius: radius.pill, alignSelf: 'stretch' },
  pillLight: { backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: colors.border },
  pillDark: { backgroundColor: colors.glassOnDark, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  drop: {
    position: 'absolute', top: 4, bottom: 4, left: 0, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: colors.border,
  },
  item: { flexGrow: 1, flexBasis: 0, minWidth: touch, minHeight: touch + 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 1, borderRadius: radius.pill, gap: 2 },
  label: { fontSize: 11, lineHeight: 14, maxWidth: '100%' },
});
