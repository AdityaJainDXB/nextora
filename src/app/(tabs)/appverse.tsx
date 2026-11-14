import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, space } from '../../../theme';
import { categories, useApps, type AppCategory } from '../../lib/content';
import { ReviewTag } from '../../components/ReviewTag';
import { Card, Chip, Empty, Field, Loading, Row, T, Tag, TextBadge } from '../../components/ui';
import { Screen, Segmented } from '../../components/layout';
import { useLang } from '../../lib/lang';
import { useStore } from '../../store/AppStore';
import { ALL_EMIRATES, type Emirate } from '../../store/types';

export default function Appverse() {
  const { t } = useTranslation();
  const { shown } = useLang();
  const { state } = useStore();
  const me = state.profile!;
  const [mode, setMode] = useState<'ai' | 'all'>('ai');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<AppCategory | null>(null);
  const [emirate, setEmirate] = useState<Emirate | null>(null);
  const { items: apps, status } = useApps();

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return apps.filter((a) => {
      if (mode === 'ai' && me.role === 'newcomer' && !a.suggestedFor.includes(me.persona)) return false;
      if (cat && a.category !== cat) return false;
      if (emirate && a.emirates && !a.emirates.includes(emirate)) return false;
      if (needle && !`${a.name} ${a.why} ${a.features.join(' ')} ${t(`appv.cat_${a.category}`)}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [apps, mode, q, cat, emirate, me, t]);

  return (
    <Screen>
      <T v="h1" w="bold" accessibilityRole="header">{t('appv.title')}</T>
      <T color={colors.textMuted}>{t('appv.subtitle')}</T>
      <Segmented
        label={t('appv.title')}
        options={[{ key: 'ai', label: t('appv.ai') }, { key: 'all', label: t('appv.all') }]}
        value={mode}
        onChange={setMode}
      />
      {mode === 'ai' ? (
        <Row gap={space.xs} style={{ alignItems: 'flex-start' }}>
          <Ionicons name="compass-outline" size={16} color={colors.accentText} />
          <T v="small" color={colors.textMuted} style={{ flex: 1 }}>
            {me.role === 'newcomer' ? `${t('appv.aiReason', { persona: t(`persona.${me.persona}`) })}. ` : ''}{t('appv.aiNote')}
          </T>
        </Row>
      ) : null}
      <Field label={t('common.search')} placeholder={t('appv.searchPlaceholder')} value={q} onChangeText={setQ} returnKeyType="search" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        <Chip label={t('common.all')} selected={cat === null} onPress={() => setCat(null)} />
        {categories.map((c) => (
          <Chip key={c} label={t(`appv.cat_${c}`)} selected={cat === c} onPress={() => setCat(cat === c ? null : c)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        <Chip label={t('appv.allEmirates')} selected={emirate === null} onPress={() => setEmirate(null)} />
        {ALL_EMIRATES.map((e) => (
          <Chip key={e} label={t(`emirates.${e}`)} selected={emirate === e} onPress={() => setEmirate(emirate === e ? null : e)} />
        ))}
      </ScrollView>
      {shown !== 'en' ? <T v="tiny" color={colors.textMuted}>{t('appv.englishOnly')}</T> : null}

      {status === 'loading' ? (
        <Loading />
      ) : status === 'error' ? (
        <Empty icon="alert-circle-outline" text={t('common.error')} />
      ) : list.length === 0 ? (
        // No entries at all means nothing verified has been published yet: say so, don't invent any.
        <Empty icon={apps.length ? 'search-outline' : 'document-text-outline'} text={apps.length ? t('appv.empty') : t('appv.noContent')} />
      ) : (
        <View style={{ gap: space.sm }}>
          {list.map((a) => {
            const steps = state.appSetup[a.id] ?? [];
            const doneSteps = steps.filter(Boolean).length;
            return (
              <Card key={a.id} onPress={() => router.push(`/app/${a.id}`)} a11y={t('a11y.openApp', { name: a.name })}>
                <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
                  <TextBadge text={a.badge} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <T w="semibold" lang="en">{a.name}</T>
                    <Tag label={t(`appv.cat_${a.category}`)} tone="ink" />
                    <T v="small" color={colors.textMuted} lang="en">{a.why}</T>
                    <Row wrap gap={space.xs}>
                      <ReviewTag a={a} />
                      {doneSteps > 0 ? <Tag label={t('appv.setupProgress', { done: doneSteps, total: a.setup.length })} tone="clay" /> : null}
                    </Row>
                  </View>
                </Row>
              </Card>
            );
          })}
        </View>
      )}
      <T v="tiny" color={colors.textMuted} center>{t('appv.confirm')}</T>
    </Screen>
  );
}
