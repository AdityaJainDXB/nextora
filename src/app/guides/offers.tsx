import React from 'react';
import { Linking, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, space } from '../../../theme';
import { Card, Row, T } from '../../components/ui';
import { Screen } from '../../components/layout';
import { GuideHeader } from '../../components/GuideScreens';
import { ContentBadges, SourceLine, StatusGate } from '../../components/ContentBadges';
import { isOfferLive, useContent } from '../../lib/guides';

const PROVIDER_OFFERS = [
  { name: 'e& UAE', url: 'https://prodnew.etisalat.ae/en/c/deals-for-you.html' },
  { name: 'du', url: 'https://www.du.ae/personal/at-home/offers' },
  { name: 'Smiles', url: 'https://smiles.ae/en/food/dine-in.html' },
];

export default function Offers() {
  const { t } = useTranslation();
  const data = useContent('offers');
  const live = data.items.filter((o) => isOfferLive(o)).sort((a, b) => a.validUntil.localeCompare(b.validUntil));
  const open = (url: string) => { void Linking.openURL(url).catch(() => {}); };

  return (
    <Screen>
      <GuideHeader title={t('offers.title')} />
      <T v="h2" w="semibold">{t('guides.officialLink')}</T>
      <T v="small" color={colors.textMuted}>{t('offers.partnerNote')}</T>
      <View style={{ gap: space.sm }}>
        {PROVIDER_OFFERS.map((p) => (
          <Card key={p.name} onPress={() => open(p.url)} a11y={`${p.name} ${t('offers.title')}`}>
            <Row>
              <T w="semibold" lang="en" style={{ flex: 1 }}>{p.name}</T>
              <T color={colors.primary}>↗</T>
            </Row>
          </Card>
        ))}
      </View>
      {live.length ? (
        <>
          <T v="h2" w="semibold">{t('offers.title')}</T>
          {live.map((o) => (
            <Card key={o.id}>
              <T w="semibold" lang="en">{o.title}</T>
              <T v="small" lang="en">{o.provider}</T>
              <ContentBadges a={o} />
              <T v="small" lang="en" color={colors.textMuted}>{o.body}</T>
              <T v="tiny" w="semibold">{t('offers.validUntil', { date: o.validUntil })}</T>
              <SourceLine source={o.source} />
            </Card>
          ))}
        </>
      ) : data.status === 'error' || data.status === 'notConfigured'
        ? <StatusGate status={data.status} empty onRetry={data.retry} emptyText={t('offers.empty')} />
        : data.status === 'loading'
          ? <StatusGate status={data.status} empty emptyText={t('offers.empty')} onRetry={data.retry} />
          : null}
    </Screen>
  );
}
