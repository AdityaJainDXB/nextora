import React from 'react';
import { Image, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, radius, space } from '../../theme';
import { aiErrors } from '../../data/ai-errors-log';
import { useApps } from '../lib/content';
import { Card, Empty, IconButton, Row, T, Tag } from '../components/ui';
import { Screen } from '../components/layout';
import { useLang } from '../lib/lang';

export default function BuildNotes() {
  const { t } = useTranslation();
  const { isRTL } = useLang();
  const { items: apps } = useApps();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/me'));
  return (
    <Screen>
      <IconButton icon={isRTL ? 'arrow-forward' : 'arrow-back'} label={t('common.back')} onPress={back} />
      <T v="h1" w="bold" accessibilityRole="header">{t('build.title')}</T>
      <T color={colors.textMuted}>{t('build.subtitle')}</T>
      <T v="tiny" color={colors.textMuted}>{t('appv.englishOnly')}</T>
      {aiErrors.length === 0 ? <Empty text={t('build.empty')} /> : null}
      {aiErrors.map((e) => {
        const app = e.appId ? apps.find((a) => a.id === e.appId) : undefined;
        return (
          <Card key={e.id}>
            <Row style={{ justifyContent: 'space-between' }} wrap>
              <T v="tiny" w="semibold" color={colors.textMuted}>{t('build.date')}: <T v="tiny" lang="en">{e.date}</T></T>
              <Tag label={e.fixedBy === 'human' ? t('build.byHuman') : t('build.bySelf')} tone={e.fixedBy === 'human' ? 'teal' : 'warning'} />
            </Row>
            <View style={{ gap: 2 }}>
              <T v="small" w="semibold">{t('build.wrong')}</T>
              <T v="small" lang="en">{e.wrong}</T>
            </View>
            <View style={{ gap: 2 }}>
              <T v="small" w="semibold">{t('build.fixed')}</T>
              <T v="small" lang="en">{e.fixed}</T>
            </View>
            {e.screenshot ? <Image source={{ uri: e.screenshot }} style={{ width: '100%', height: 180, borderRadius: radius.md }} resizeMode="cover" /> : null}
            {app ? <T v="small" color={colors.primary} w="semibold">{t('build.linked', { name: app.name })}</T> : null}
          </Card>
        );
      })}
      <View style={{ height: space.md }} />
    </Screen>
  );
}
