import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, space } from '../../../theme';
import { Card, Row, T } from '../../components/ui';
import { Screen } from '../../components/layout';
import { GuideHeader } from '../../components/GuideScreens';
import { useLang } from '../../lib/lang';

const cards: { key: string; href: Href; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'timeline', href: '/guides/timeline', icon: 'calendar-outline' },
  { key: 'property', href: '/guides/property', icon: 'home-outline' },
  { key: 'schools', href: '/guides/schools', icon: 'school-outline' },
  { key: 'offers', href: '/guides/offers', icon: 'pricetag-outline' },
  { key: 'services', href: '/guides/services', icon: 'construct-outline' },
  { key: 'events', href: '/events', icon: 'people-outline' },
  { key: 'explore', href: '/guides/explore', icon: 'compass-outline' },
];

export default function GuidesHub() {
  const { t } = useTranslation();
  const { isRTL } = useLang();
  return (
    <Screen>
      <GuideHeader title={t('guides.title')} intro={t('guides.intro')} />
      {cards.map((c) => (
        <Card key={c.key} onPress={() => router.push(c.href)} a11y={`${t(`guides.card_${c.key}`)}. ${t(`guides.card_${c.key}_hint`)}`}>
          <Row gap={space.md} style={{ minHeight: 44 }}>
            <Ionicons name={c.icon} size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <T w="semibold">{t(`guides.card_${c.key}`)}</T>
              <T v="small" color={colors.textMuted}>{t(`guides.card_${c.key}_hint`)}</T>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textMuted} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
