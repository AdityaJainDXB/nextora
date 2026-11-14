import React, { useState } from 'react';
import { Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../../theme';
import { Card, Field, T } from '../../components/ui';
import { Screen } from '../../components/layout';
import { EmiratePicker } from '../../components/EmiratePicker';
import { GroupedGuideBody, GuideHeader } from '../../components/GuideScreens';
import { SCHOOL_KINDS, useContent } from '../../lib/guides';
import type { Emirate } from '../../store/types';
import { useStore } from '../../store/AppStore';

const AUTHORITY: Record<Emirate, { name: string; domain: string; url: string }> = {
  abudhabi: { name: 'ADEK', domain: 'adek.gov.ae', url: 'https://adek.gov.ae/Education-System/Private-Schools' },
  dubai: { name: 'KHDA', domain: 'web.khda.gov.ae', url: 'https://web.khda.gov.ae/en/Education-Directory/schools' },
  sharjah: { name: 'SPEA', domain: 'spea.shj.ae', url: 'https://spea.shj.ae/en/education-institutes/schools' },
  ajman: { name: 'UAE Ministry of Education', domain: 'u.ae', url: 'https://u.ae/en/information-and-services/education/school-education-k-12/find-schools-in-the-uae' },
  uaq: { name: 'UAE Ministry of Education', domain: 'u.ae', url: 'https://u.ae/en/information-and-services/education/school-education-k-12/find-schools-in-the-uae' },
  rak: { name: 'RAK Department of Knowledge', domain: 'dok.rak.ae', url: 'https://dok.rak.ae/schools/' },
  fujairah: { name: 'UAE Ministry of Education', domain: 'u.ae', url: 'https://u.ae/en/information-and-services/education/school-education-k-12/find-schools-in-the-uae' },
};

export default function SchoolsGuide() {
  const { t } = useTranslation();
  const { state } = useStore();
  const [emirate, setEmirate] = useState<Emirate>(state.profile?.emirate ?? 'dubai');
  const [query, setQuery] = useState('');
  const data = useContent('schools');
  const authority = AUTHORITY[emirate];
  const emirateName = t(`emirates.${emirate}`);
  const openSearch = () => {
    const q = [authority.name, 'school directory', emirateName, query].filter(Boolean).join(' ');
    void Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(`site:${authority.domain} ${q}`)}`).catch(() => {});
  };

  return (
    <Screen>
      <GuideHeader title={t('schools.title')} intro={t('schools.intro')} />
      <T v="h2" w="semibold">{t('onb.emirate')}</T>
      <EmiratePicker value={emirate} onChange={setEmirate} />
      <Field label={t('common.search')} placeholder={t('common.search')} value={query} onChangeText={setQuery} returnKeyType="search" />
      <Card onPress={openSearch} a11y={`${t('common.search')} ${authority.name} ${emirateName} schools`}>
        <T w="semibold">{authority.name} · {emirateName}</T>
        <T v="small" color={colors.textMuted}>{t('common.search')}</T>
      </Card>
      <Card onPress={() => { void Linking.openURL(authority.url).catch(() => {}); }} a11y={t('guides.officialLink')}>
        <T w="semibold">{t('guides.officialLink')}</T>
        <T v="small" color={colors.textMuted}>{authority.name}</T>
      </Card>
      <GroupedGuideBody data={data} groups={SCHOOL_KINDS}
        groupOf={(r) => r.kind} groupLabel={(g) => t(`schools.kind_${g}`)} emptyText={t('schools.empty')} disclaimer />
    </Screen>
  );
}
