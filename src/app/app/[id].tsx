import React from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, radius, space, touch } from '../../../theme';
import { useApps } from '../../lib/content';
import { useProgress } from '../../lib/progress';
import { ReviewTag } from '../../components/ReviewTag';
import { aiErrors } from '../../../data/ai-errors-log';
import { Button, Card, Empty, IconButton, Loading, Row, T, Tag, TextBadge } from '../../components/ui';
import { Screen } from '../../components/layout';
import { useLang } from '../../lib/lang';
import { useStore } from '../../store/AppStore';

export default function AppDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { isRTL } = useLang();
  const { state } = useStore();
  const { toggleSetup } = useProgress();
  const content = useApps();
  const app = content.items.find((a) => a.id === id);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/appverse'));
  const BackBtn = <IconButton icon={isRTL ? 'arrow-forward' : 'arrow-back'} label={t('common.back')} onPress={back} />;

  if (!app && content.status === 'loading') return <Screen><Loading /></Screen>;
  if (!app) {
    return (
      <Screen>
        {BackBtn}
        <Empty icon="alert-circle-outline" text={t('common.error')} action={<Button label={t('common.back')} onPress={back} kind="secondary" />} />
      </Screen>
    );
  }

  const steps = state.appSetup[app.id] ?? app.setup.map(() => false);
  const toggle = (i: number) => toggleSetup(app.id, i, app.setup.length);
  const log = app.errorLogId ? aiErrors.find((e) => e.id === app.errorLogId) : null;

  return (
    <Screen>
      {BackBtn}
      <Row gap={space.md}>
        <TextBadge text={app.badge} size={64} />
        <View style={{ flex: 1, gap: 4 }}>
          <T v="h1" w="bold" lang="en" accessibilityRole="header">{app.name}</T>
          <Tag label={t(`appv.cat_${app.category}`)} tone="purple" />
        </View>
      </Row>
      <ReviewTag a={app} />

      {app.category === 'government' ? (
        <Row style={styles.warn} gap={space.sm}>
          <Ionicons name="information-circle" size={20} color={colors.warning} />
          <T v="small" color={colors.warning} style={{ flex: 1 }}>{t('appv.disclaimerGov')}</T>
        </Row>
      ) : null}

      <Card>
        <T w="semibold">{t('appv.why')}</T>
        <T color={colors.textMuted} lang="en">{app.why}</T>
      </Card>

      <Card>
        <T w="semibold">{t('appv.features')}</T>
        {app.features.map((f) => (
          <Row key={f} gap={space.sm}>
            <Ionicons name="ellipse" size={6} color={colors.primary} />
            <T v="small" lang="en" style={{ flex: 1 }}>{f}</T>
          </Row>
        ))}
      </Card>

      {app.needsUaeInfo !== null ? (
        <Card>
          <T w="semibold">{t('appv.needsUae')}</T>
          <T lang={app.needsUaeInfoNote ? 'en' : undefined}>
            {app.needsUaeInfo ? t('appv.yes') : t('appv.no')}
            {app.needsUaeInfoNote ? ` (${app.needsUaeInfoNote})` : ''}
          </T>
        </Card>
      ) : null}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T w="semibold">{t('appv.setup')}</T>
          <T v="small" color={colors.textMuted}>{t('appv.setupProgress', { done: steps.filter(Boolean).length, total: app.setup.length })}</T>
        </Row>
        {app.setup.map((s, i) => (
          <Pressable
            key={s}
            onPress={() => toggle(i)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!steps[i] }}
            aria-checked={!!steps[i]}
            accessibilityLabel={s}
            style={styles.step}
          >
            <Ionicons name={steps[i] ? 'checkbox' : 'square-outline'} size={24} color={steps[i] ? colors.accentText : colors.textMuted} />
            <T lang="en" style={[{ flex: 1 }, steps[i] && { textDecorationLine: 'line-through', color: colors.textMuted }]}>{s}</T>
          </Pressable>
        ))}
      </Card>

      {app.fees ? (
        <Card>
          <T w="semibold">{t('appv.fees')}</T>
          <T lang="en">{app.fees}</T>
        </Card>
      ) : null}
      {/* Official links only; each is hidden when null. */}
      {app.iosUrl ? <Button label={t('appv.iosLink')} icon="logo-apple-appstore" onPress={() => Linking.openURL(app.iosUrl!)} kind="secondary" /> : null}
      {app.androidUrl ? <Button label={t('appv.androidLink')} icon="logo-google-playstore" onPress={() => Linking.openURL(app.androidUrl!)} kind="secondary" /> : null}
      {app.webUrl ? <Button label={t('appv.officialLink')} icon="open-outline" onPress={() => Linking.openURL(app.webUrl!)} kind="secondary" /> : null}

      {log ? (
        <Pressable onPress={() => router.push('/build-notes')} accessibilityRole="link" style={styles.link}>
          <T v="small" w="semibold" color={colors.primary}>{t('appv.correction')}</T>
        </Pressable>
      ) : null}

      <T v="small" color={colors.textMuted} center>{t('appv.confirm')}</T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  warn: { backgroundColor: colors.warningSoft, borderRadius: radius.md, padding: space.md, alignItems: 'flex-start' },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: touch },
  link: { minHeight: touch, justifyContent: 'center' },
});
