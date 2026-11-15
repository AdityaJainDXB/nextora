import React from 'react';
import { View } from 'react-native';
import { Redirect, Tabs, router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { Ionicons } from '@expo/vector-icons';
import { colors, space } from '../../../theme';
import { LiquidTabs } from '../../components/liquid/LiquidTabs';
import { Loading, Tag } from '../../components/ui';
import { useStore } from '../../store/AppStore';
import { useAuth } from '../../lib/auth';
import { appEnv } from '../../lib/firebase';

const TABS: { name: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { name: 'home', icon: 'checkbox-outline' },
  { name: 'appverse', icon: 'apps-outline' },
  { name: 'ask', icon: 'sparkles-outline' },
  { name: 'matches', icon: 'people-outline' },
  { name: 'chats', icon: 'chatbubbles-outline' },
  { name: 'me', icon: 'person-circle-outline' },
];

export default function TabsLayout() {
  const { t } = useTranslation();
  const { state } = useStore();
  const insets = useSafeAreaInsets();
  const { status } = useAuth();
  // Wait for auth to settle, so a refresh or deep link keeps its route.
  if (status === 'loading') return <View style={{ flex: 1, backgroundColor: colors.bg }}><Loading /></View>;
  // Tabs are only for signed-in people with a finished profile.
  if (status !== 'ready' || !state.profile) return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      tabBar={({ state: nav }) => (
        <View style={{ paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: Math.max(insets.bottom, space.sm), backgroundColor: colors.bg, alignItems: 'center', gap: space.xs }}>
          {appEnv === 'demo' ? <Tag label="DEMO · fictional sample data" tone="warning" /> : null}
          <LiquidTabs
            ariaLabel={t('a11y.mainNav')}
            items={TABS.map((x) => ({ key: x.name, label: t(`tabs.${x.name}`), icon: x.icon }))}
            value={nav.routes[nav.index].name}
            onChange={(k) => router.navigate(`/${k}` as Href)}
          />
        </View>
      )}
    >
      {TABS.map((x) => (
        <Tabs.Screen key={x.name} name={x.name} options={{ title: t(`tabs.${x.name}`) }} />
      ))}
    </Tabs>
  );
}
