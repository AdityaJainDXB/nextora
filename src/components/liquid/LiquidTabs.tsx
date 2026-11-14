import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
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
  const x = useRef(new Animated.Value(0)).current;
  const w = useRef(new Animated.Value(0)).current;
  const dark = tone === 'dark';

  useEffect(() => {
    const l = layouts[value];
    if (!l) return;
    Animated.parallel([
      Animated.spring(x, { toValue: l.x, useNativeDriver: false, friction: 8, tension: 90 }),
      Animated.spring(w, { toValue: l.w, useNativeDriver: false, friction: 8, tension: 90 }),
    ]).start();
  }, [value, layouts, x, w]);

  const onLayout = (key: string) => (e: LayoutChangeEvent) => {
    const { x: lx, width } = e.nativeEvent.layout;
    setLayouts((s) => ({ ...s, [key]: { x: lx, w: width } }));
  };

  return (
    <View accessibilityRole="tablist" accessibilityLabel={ariaLabel} style={[styles.pill, dark ? styles.pillDark : styles.pillLight]}>
      <Animated.View pointerEvents="none" style={[styles.drop, { left: x, width: w }, dark && { backgroundColor: 'rgba(255,255,255,0.18)' }]} />
      {items.map((it) => {
        const on = it.key === value;
        const fg = dark ? (on ? colors.textOnDark : colors.textOnDarkMuted) : on ? colors.navy : colors.textMuted;
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
            {/* With many tabs only the active one shows its label, so nothing is cut off. */}
            {!compact && (on || items.length <= 3) ? <T v="tiny" w="semibold" color={fg} center>{it.label}</T> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', padding: 6, borderRadius: radius.pill, gap: 2, alignSelf: 'stretch' },
  pillLight: { backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: colors.border },
  pillDark: { backgroundColor: 'rgba(15,27,61,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  drop: {
    position: 'absolute', top: 6, bottom: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: colors.border,
  },
  item: { flexGrow: 1, flexBasis: 0, minWidth: touch, minHeight: touch + 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, borderRadius: radius.pill, gap: 2 },
});
