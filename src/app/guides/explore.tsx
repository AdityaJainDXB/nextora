import React, { useState } from 'react';
import { Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, space } from '../../../theme';
import { Card, Chip, Field, Row, T } from '../../components/ui';
import { Screen } from '../../components/layout';
import { EmiratePicker } from '../../components/EmiratePicker';
import { GuideHeader } from '../../components/GuideScreens';
import type { Emirate } from '../../store/types';
import { useStore } from '../../store/AppStore';

type Category = 'sights' | 'markets' | 'events';
const CATEGORIES: Category[] = ['sights', 'markets', 'events'];

const SOURCES: Record<Emirate, { name: string; domain: string; url: string }> = {
  abudhabi: { name: 'Experience Abu Dhabi', domain: 'visitabudhabi.ae', url: 'https://visitabudhabi.ae/en' },
  dubai: { name: 'Visit Dubai', domain: 'visitdubai.com', url: 'https://www.visitdubai.com/en' },
  sharjah: { name: 'Visit Sharjah', domain: 'visitsharjah.com', url: 'https://www.visitsharjah.com/' },
  ajman: { name: 'Ajman Tourism', domain: 'visit-ajman.ae', url: 'https://www.visit-ajman.ae/en' },
  uaq: { name: 'UAE Government', domain: 'u.ae', url: 'https://u.ae/en/about-the-uae/the-seven-emirates/umm-al-quwain' },
  rak: { name: 'Visit Ras Al Khaimah', domain: 'visitrasalkhaimah.com', url: 'https://visitrasalkhaimah.com/' },
  fujairah: { name: 'Fujairah Tourism', domain: 'tourism.fujairah.ae', url: 'https://tourism.fujairah.ae/home' },
};

const TOPICS: Record<Category, string> = {
  sights: 'attractions places to visit',
  markets: 'markets souks shopping',
  events: 'events calendar festivals',
};

export default function EmirateExploreGuide() {
  const { t } = useTranslation();
  const { state } = useStore();
  const [emirate, setEmirate] = useState<Emirate>(state.profile?.emirate ?? 'dubai');
  const [category, setCategory] = useState<Category>('sights');
  const [query, setQuery] = useState('');
  const source = SOURCES[emirate];
  const emirateName = t(`emirates.${emirate}`);

  const openSearch = () => {
    const keywords = [TOPICS[category], emirateName, query].filter(Boolean).join(' ');
    const url = `https://www.google.com/search?q=${encodeURIComponent(`site:${source.domain} ${keywords}`)}`;
    void Linking.openURL(url).catch(() => {});
  };
  const open = (url: string) => { void Linking.openURL(url).catch(() => {}); };

  return (
    <Screen>
      <GuideHeader title={t('explore.title')} intro={t('explore.intro')} />
      <T v="h2" w="semibold">{t('onb.emirate')}</T>
      <EmiratePicker value={emirate} onChange={setEmirate} />
      <Row wrap gap={space.xs}>
        {CATEGORIES.map((item) => (
          <Chip key={item} label={t(`explore.${item}`)} selected={category === item} onPress={() => setCategory(item)} />
        ))}
      </Row>
      <Field label={t('common.search')} placeholder={t('explore.searchHint')} value={query} onChangeText={setQuery} returnKeyType="search" onSubmitEditing={openSearch} />
      <Card onPress={openSearch} a11y={`${t('common.search')} ${t(`explore.${category}`)} ${emirateName}`}>
        <T w="semibold">{t('explore.searchOfficial', { category: t(`explore.${category}`), emirate: emirateName })}</T>
        <T v="small" color={colors.textMuted}>{source.name}</T>
      </Card>
      <Card onPress={() => open(source.url)} a11y={`${t('guides.officialLink')}: ${source.name}`}>
        <T w="semibold">{t('guides.officialLink')}</T>
        <T v="small" color={colors.textMuted}>{source.name}</T>
      </Card>
      {category === 'events' ? (
        <Card onPress={() => open('https://u.ae/en/media/events')} a11y={t('explore.uaeEvents')}>
          <T w="semibold">{t('explore.uaeEvents')}</T>
          <T v="small" color={colors.textMuted}>UAE Government · u.ae</T>
        </Card>
      ) : null}
      <T v="small" color={colors.textMuted}>{t('guides.disclaimer')}</T>
    </Screen>
  );
}
