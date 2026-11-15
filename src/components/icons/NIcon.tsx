import React from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';
import { ICONS, type IconName, type IconTone } from './registry';

/** The picture has room round it for its soft shadow; at 28/24 it matches an icon of `size`. */
const PAD = 28 / 24;

/** Decorative: the text next to an icon (or the tab's accessibility label) names it. */
export function NIcon({ name, tone = 'ink', size = 24, style }: { name: IconName; tone?: IconTone; size?: number; style?: StyleProp<ImageStyle> }) {
  const box = Math.round(size * PAD);
  return (
    <Image
      source={ICONS[name][tone]}
      style={[{ width: box, height: box }, style]}
      resizeMode="contain"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
