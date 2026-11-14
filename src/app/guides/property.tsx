import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, space } from '../../../theme';
import { Card, Chip, Field, Row, T } from '../../components/ui';
import { Screen } from '../../components/layout';
import { EmiratePicker } from '../../components/EmiratePicker';
import { GroupedGuideBody, GuideHeader } from '../../components/GuideScreens';
import { PROPERTY_SECTIONS, useContent } from '../../lib/guides';
import { useStore } from '../../store/AppStore';
import type { Emirate } from '../../store/types';

type SearchMode = 'rent' | 'buy';

export default function PropertyGuide() {
  const { t } = useTranslation();
  const { state } = useStore();
  const [emirate, setEmirate] = useState<Emirate>(state.profile?.emirate ?? 'dubai');
  const [mode, setMode] = useState<SearchMode>('rent');
  const [query, setQuery] = useState('');
  const data = useContent('property');
  const emirateName = t(`emirates.${emirate}`);
  const openSearch = (domain: string) => {
    const action = mode === 'rent' ? 'rent' : 'buy';
    const q = [action, 'property', emirateName, query].filter(Boolean).join(' ');
    const url = `https://www.google.com/search?q=${encodeURIComponent(`site:${domain} ${q}`)}`;
    void Linking.openURL(url).catch(() => {});
  };

  return (
    <Screen>
      <GuideHeader title={t('property.title')} intro={t('property.intro')} />
      <T v="h2" w="semibold">{t('onb.emirate')}</T>
      <EmiratePicker value={emirate} onChange={setEmirate} />
      <Row wrap gap={space.xs}>
          <Chip label={t('property.rent')} selected={mode === 'rent'} onPress={() => setMode('rent')} />
          <Chip label={t('property.buy')} selected={mode === 'buy'} onPress={() => setMode('buy')} />
        </Row>
      <Field label={t('common.search')} placeholder={t('common.search')} value={query} onChangeText={setQuery} returnKeyType="search" />
      <T v="small" color={colors.textMuted}>{t('property.searchNote')}</T>
      {[
          { name: 'Property Finder', domain: 'propertyfinder.ae' },
          { name: 'Bayut', domain: 'bayut.com' },
        ].map((provider) => (
          <Card key={provider.domain} onPress={() => openSearch(provider.domain)} a11y={`${provider.name}, ${t(mode === 'rent' ? 'property.rent' : 'property.buy')}, ${emirateName}`}>
            <Row gap={space.md}>
              <View style={{ flex: 1 }}>
                <T w="semibold" lang="en">{provider.name}</T>
                <T v="small" color={colors.textMuted}>{emirateName} · {t(mode === 'rent' ? 'property.rent' : 'property.buy')}</T>
              </View>
              <T color={colors.primary}>{t('common.search')} ↗</T>
            </Row>
          </Card>
        ))}
      <GroupedGuideBody data={data} groups={PROPERTY_SECTIONS}
          groupOf={(r) => r.section} groupLabel={(g) => t(`property.section_${g}`)} emptyText={t('property.empty')} disclaimer />
    </Screen>
  );
}
