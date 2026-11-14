import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme';

// Shape-only hero art: a rising sun over a skyline of simple blocks, with
// circles for people gathering. No photos.
export function HeroIllustration() {
  const { t } = useTranslation();
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rise, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [rise]);
  const towers = [44, 70, 54, 96, 62, 80, 48];
  return (
    <View accessible accessibilityLabel={t('a11y.illustration')} style={{ height: 180, justifyContent: 'flex-end', overflow: 'hidden' }}>
      <Animated.View
        style={{
          position: 'absolute', alignSelf: 'center', top: 10, width: 120, height: 120, borderRadius: 60,
          backgroundColor: colors.teal, opacity: 0.9,
          transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 6 }}>
        {towers.map((h, i) => (
          <View
            key={i}
            style={{
              width: 26, height: h, borderTopLeftRadius: i === 3 ? 13 : 4, borderTopRightRadius: i === 3 ? 13 : 4,
              backgroundColor: i % 2 ? '#2C3B5C' : '#3A4A6B',
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: -14 }}>
        {[colors.offWhite, colors.teal, '#8FA0C2', colors.offWhite].map((c, i) => (
          <View key={i} style={{ alignItems: 'center' }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: c }} />
            <View style={{ width: 26, height: 16, borderTopLeftRadius: 13, borderTopRightRadius: 13, backgroundColor: c, marginTop: 2 }} />
          </View>
        ))}
      </View>
    </View>
  );
}
