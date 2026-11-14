import React from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { colors } from '../../theme';
import { useTranslation } from 'react-i18next';
import { Button, ErrorState, Loading } from '../components/ui';
import { signOutHere } from '../lib/account';
import { useAuth } from '../lib/auth';
import { useStore } from '../store/AppStore';

/** Entry: sends people to the right step for their real account state. */
export default function Index() {
  const { state } = useStore();
  const { status, refresh } = useAuth();
  const { t } = useTranslation();
  if (!state.language) return <Redirect href="/language" />;
  if (status === 'loading') return <View style={{ flex: 1, backgroundColor: colors.bg }}><Loading /></View>;
  if (status === 'error') return <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}><ErrorState onRetry={refresh} /><Button kind="ghost" label={t('account.signOut')} onPress={() => { void signOutHere(); }} style={{ alignSelf: 'center' }} /></View>;
  if (status === 'off' || status === 'signedOut') return <Redirect href="/welcome" />;
  if (status === 'needsAge') return <Redirect href="/age" />;
  if (!state.profile) return <Redirect href="/onboarding" />;
  return <Redirect href="/home" />;
}
