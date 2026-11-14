import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, space } from '../../theme';
import { TranslationBar } from './TranslationBar';
import { LiquidTabs } from './liquid/LiquidTabs';
import { styles } from './ui';

export function Screen({
  children, scroll = true, padded = true, dark = false, footer,
}: { children: React.ReactNode; scroll?: boolean; padded?: boolean; dark?: boolean; footer?: React.ReactNode }) {
  const bg = dark ? colors.aubergine : colors.bg;
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[padded && styles.pad, { paddingBottom: space.xxl }]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, padded && styles.pad]}>{children}</View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top', 'left', 'right']}>
      <TranslationBar dark={dark} />
      <View style={styles.frame}>{body}</View>
      {footer ? <View style={[styles.footer, { backgroundColor: bg }]}>{footer}</View> : null}
    </SafeAreaView>
  );
}

/** Segmented switch, drawn with the liquid navbar (web) or its native fallback. */
export function Segmented<K extends string>({ options, value, onChange, label }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void; label: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <LiquidTabs items={options} value={value} onChange={(k) => onChange(k as K)} ariaLabel={label} compact={false} />
    </View>
  );
}

