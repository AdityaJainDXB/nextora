import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, radius, space, touch } from '../../theme';
import { getLang } from '../../locales/meta';
import { HeroIllustration } from '../components/Illustration';
import { Button, Row, Sheet, T } from '../components/ui';
import { Screen } from '../components/layout';
import { useLang } from '../lib/lang';
import { useStore } from '../store/AppStore';
import { ALL_PERSONAS, type Persona } from '../store/types';
import { personaIcon } from '../lib/personas';

export default function Welcome() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const { update } = useStore();

  const choose = (p: Persona) => {
    setOpen(false);
    update((s) => ({ ...s, pending: { role: 'newcomer', persona: p } }));
    router.push({ pathname: '/auth', params: { mode: 'signup' } });
  };

  return (
    <Screen dark>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="small" w="bold" lang="en" color={colors.textOnDark} style={{ letterSpacing: 2 }}>NEXTORA</T>
        <Pressable
          onPress={() => router.push({ pathname: '/language', params: { from: 'settings' } })}
          accessibilityRole="button"
          accessibilityLabel={t('me.language')}
          style={styles.langBtn}
        >
          <Ionicons name="language-outline" size={18} color={colors.textOnDark} />
          <T v="small" w="semibold" color={colors.textOnDark} lang={lang}>{getLang(lang).nativeName}</T>
        </Pressable>
      </Row>

      <HeroIllustration />

      <View style={{ gap: space.sm }}>
        <T v="display" w="bold" color={colors.textOnDark} accessibilityRole="header">{t('hero.headline')}</T>
        <T color={colors.textOnDarkMuted}>{t('hero.value')}</T>
        <T v="small" w="semibold" color={colors.accentOnDark}>{t('hero.tagline')}</T>
      </View>

      <View style={{ gap: space.sm }}>
        <Button label={t('hero.new')} onPress={() => setOpen(true)} icon="arrow-forward" kind="light" />
        <Button
          label={t('hero.help')}
          onPress={() => {
            update((s) => ({ ...s, pending: { role: 'volunteer', persona: 'belong' } }));
            router.push({ pathname: '/auth', params: { mode: 'signup' } });
          }}
          icon="hand-left-outline"
          kind="outlineLight"
        />
      </View>

      <Button
        label={t('auth.haveAccount')}
        kind="ghost"
        onPress={() => router.push({ pathname: '/auth', params: { mode: 'signin' } })}
        style={{ alignSelf: 'center' }}
        textColor={colors.accentOnDark}
      />

      <Row style={styles.trust} gap={space.sm}>
        <Ionicons name="shield-checkmark-outline" size={22} color={colors.accentOnDark} />
        <T v="small" color={colors.textOnDark} style={{ flex: 1 }}>{t('hero.trust')}</T>
      </Row>

      <Sheet visible={open} onClose={() => setOpen(false)} title={t('persona.title')}>
        <View style={{ gap: space.sm }}>
          <T color={colors.textMuted}>{t('persona.subtitle')}</T>
          {ALL_PERSONAS.map((p) => (
            <Pressable
              key={p}
              onPress={() => choose(p)}
              accessibilityRole="button"
              accessibilityLabel={`${t(`persona.${p}`)}. ${t(`persona.${p}Desc`)}`}
              style={({ pressed }) => [styles.persona, pressed && { borderColor: colors.primary }]}
            >
              <View style={styles.pIcon}><Ionicons name={personaIcon[p]} size={22} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <T w="semibold">{t(`persona.${p}`)}</T>
                <T v="small" color={colors.textMuted}>{t(`persona.${p}Desc`)}</T>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} style={{ transform: [{ scaleX: getLang(lang).rtl ? -1 : 1 }] }} />
            </Pressable>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  langBtn: {
    minHeight: touch, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12,
    borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  trust: { backgroundColor: colors.accentOnDarkSoft, borderRadius: radius.md, padding: space.md, alignItems: 'flex-start' },
  persona: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, minHeight: touch,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface,
  },
  pIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
