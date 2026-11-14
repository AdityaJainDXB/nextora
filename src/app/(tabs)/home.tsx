import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, radius, space, touch } from '../../../theme';
import { checklistFor } from '../../../data/checklist';
import { useApps } from '../../lib/content';
import { useProgress } from '../../lib/progress';
import { Button, Card, Progress, Row, T, Tag } from '../../components/ui';
import { Screen } from '../../components/layout';
import { useStore } from '../../store/AppStore';
import { VerifyBanner } from '../../components/VerifyBanner';
import { ChecklistActions } from '../../components/ChecklistActions';

export default function Home() {
  const { t } = useTranslation();
  const { state } = useStore();
  const me = state.profile!;
  const items = checklistFor(me.role, me.persona);
  const { items: apps } = useApps();
  const done = items.filter((i) => state.checklist[i.id]).length;
  const personaLabel = me.role === 'volunteer' ? t('persona.volunteer') : t(`persona.${me.persona}`);

  const { toggleChecklist: toggle } = useProgress();

  return (
    <Screen>
      <VerifyBanner />
      <View style={styles.header}>
        <T v="small" color={colors.textOnDarkMuted}>{t('home.greeting', { name: me.displayName })}</T>
        <T v="h1" w="bold" color={colors.textOnDark} accessibilityRole="header">{t('home.title')}</T>
        <T v="small" color={colors.textOnDarkMuted}>{t('home.subtitle', { persona: personaLabel })}</T>
        <View style={{ gap: space.xs, marginTop: space.sm }}>
          <Progress value={items.length ? done / items.length : 0} label={t('a11y.progress', { done, total: items.length })} />
          <T v="small" w="semibold" color={colors.textOnDark}>
            {done === items.length ? t('home.allDone') : t('home.progress', { done, total: items.length })}
          </T>
        </View>
      </View>

      <View style={{ gap: space.sm }}>
        {items.map((it, idx) => {
          const on = !!state.checklist[it.id];
          const app = it.appId ? apps.find((a) => a.id === it.appId) : undefined;
          return (
            <Card key={it.id} style={on && { backgroundColor: colors.accentSoft, borderColor: colors.accent }}>
              <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
                <Pressable
                  onPress={() => toggle(it.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  aria-checked={on}
                  accessibilityLabel={`${t(`check.${it.id}`)}. ${on ? t('home.markUndone') : t('home.markDone')}`}
                  style={[styles.check, on && styles.checkOn]}
                >
                  {on ? <Ionicons name="checkmark" size={22} color={colors.textOnDark} /> : <T v="small" w="bold" color={colors.textMuted} lang="en">{idx + 1}</T>}
                </Pressable>
                <View style={{ flex: 1, gap: space.xs }}>
                  <Row gap={space.xs}>
                    <Ionicons name={it.icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.primary} />
                    <T w="semibold" style={[{ flex: 1 }, on && { textDecorationLine: 'line-through', color: colors.textMuted }]}>{t(`check.${it.id}`)}</T>
                  </Row>
                  <T v="small" color={colors.textMuted}>{t(`check.${it.id}Desc`)}</T>
                  {it.official ? <Tag label={`${t('appv.officialName')}: ${it.official}`} tone="ink" /> : null}
                  <ChecklistActions id={it.id} />
                  {app ? (
                    <Pressable onPress={() => router.push(`/app/${app.id}`)} accessibilityRole="link" accessibilityLabel={t('a11y.openApp', { name: app.name })} style={styles.link}>
                      <T v="small" w="semibold" color={colors.primary}>{t('home.related', { name: app.name })}</T>
                    </Pressable>
                  ) : null}
                  {it.id === 'guide' || it.id === 'firstNewcomer' ? (
                    <Pressable onPress={() => router.push('/matches')} accessibilityRole="link" style={styles.link}>
                      <T v="small" w="semibold" color={colors.primary}>{t('home.matchesCta')}</T>
                    </Pressable>
                  ) : null}
                  {it.id === 'privacyRead' ? (
                    <Pressable onPress={() => router.push('/privacy')} accessibilityRole="link" style={styles.link}>
                      <T v="small" w="semibold" color={colors.primary}>{t('me.privacy')}</T>
                    </Pressable>
                  ) : null}
                </View>
              </Row>
            </Card>
          );
        })}
      </View>
      <Button label={t('home.matchesCta')} onPress={() => router.push('/matches')} icon="people-outline" kind="secondary" />
      <Button label={t('home.guides')} onPress={() => router.push('/guides')} icon="map-outline" kind="secondary" />
      <Button label={t('home.forum')} onPress={() => router.push('/forum')} icon="chatbox-ellipses-outline" kind="secondary" />
      <Button label={t('events.meetups')} onPress={() => router.push('/events')} icon="calendar-outline" kind="secondary" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: space.lg, gap: space.xs },
  check: {
    width: touch, height: touch, borderRadius: touch / 2, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
  },
  checkOn: { backgroundColor: colors.accentText, borderColor: colors.accentText },
  link: { minHeight: touch, justifyContent: 'center' },
});
