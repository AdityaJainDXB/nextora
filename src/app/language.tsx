import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { languages } from '../../locales/meta';
import { colors, radius, space, touch } from '../../theme';
import { Button, T, Tag } from '../components/ui';
import { Screen } from '../components/layout';
import i18n, { deviceLanguage, unavailableReason } from '../lib/i18n';
import { useStore } from '../store/AppStore';
import { useAuth } from '../lib/auth';
import { saveLanguage } from '../lib/account';

export default function LanguageScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { state, update } = useStore();
  const { user, status } = useAuth();
  const suggested = deviceLanguage();
  const [pick, setPick] = useState(state.language ?? suggested);
  const { t } = useTranslation();
  // Preview the picked language on this screen before it is saved.
  const tp = i18n.getFixedT(pick);

  const confirm = () => {
    update((s) => ({ ...s, language: pick }));
    if (user && status === 'ready') saveLanguage(user.uid, pick).catch(() => {});
    if (from === 'settings') router.back();
    else router.replace('/welcome');
  };

  return (
    <Screen
      footer={<Button label={tp('lang.continue')} onPress={confirm} icon="arrow-forward" />}
    >
      <View style={{ gap: space.xs, marginTop: space.md }}>
        <T v="tiny" w="bold" color={colors.primary} lang="en">NEXTORA</T>
        <T v="h1" w="bold" lang={pick} accessibilityRole="header">{tp('lang.title')}</T>
        <T color={colors.textMuted} lang={pick}>{tp('lang.subtitle')}</T>
      </View>
      <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
        {languages.map((l) => {
          const reason = unavailableReason(l.code);
          const soon = reason !== null;
          const on = pick === l.code;
          // Selectable but not native-reviewed: only reachable in dev/preview builds.
          const testOnly = !soon && !l.released;
          const reasonLabel = reason ? tp(`lang.${reason}`) : testOnly ? tp('lang.testOnly') : '';
          return (
            <Pressable
              key={l.code}
              disabled={soon}
              onPress={() => setPick(l.code)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on, disabled: soon }}
              aria-checked={on}
              aria-disabled={soon}
              accessibilityLabel={`${l.nativeName}, ${l.englishName}${reasonLabel ? `, ${reasonLabel}` : ''}`}
              style={[styles.opt, on && styles.optOn, soon && styles.optSoon]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <T v="h2" w="semibold" lang={l.code} color={soon ? colors.textMuted : colors.text}>{l.nativeName}</T>
                <T v="tiny" lang="en" color={colors.textMuted}>{l.englishName}</T>
              </View>
              {l.code === suggested && !soon ? <Tag label={tp('lang.suggested')} tone="teal" /> : null}
              {reasonLabel ? <Tag label={reasonLabel} tone={testOnly ? 'warning' : 'muted'} /> : null}
              {!soon ? (
                <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? colors.primary : colors.border} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  opt: {
    minHeight: touch + 16, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md,
    paddingVertical: space.sm, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface,
  },
  optOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optSoon: { backgroundColor: colors.surfaceAlt, borderStyle: 'dashed' },
});
