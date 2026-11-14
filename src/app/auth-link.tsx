import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, space } from '../../theme';
import { Button, Field, Loading, T } from '../components/ui';
import { Screen } from '../components/layout';
import { completeEmailLink, errorKey } from '../lib/account';
import { useAuth } from '../lib/auth';

/** Landing page for the email sign-in link. */
export default function AuthLink() {
  const { t } = useTranslation();
  const { refresh } = useAuth();
  const url = Linking.useURL();
  const href = Platform.OS === 'web' ? (typeof window !== 'undefined' ? window.location.href : null) : url;
  const [needEmail, setNeedEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const finish = async (typed?: string) => {
    if (!href) return;
    setErr(null);
    try {
      const user = await completeEmailLink(href, typed);
      if (!user) { setNeedEmail(true); return; }
      await refresh();
      router.replace('/'); // new accounts go through the age step from there
    } catch (e) {
      setErr(t(`authErr.${errorKey(e)}`));
    }
  };

  useEffect(() => { void finish(); }, [href]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen>
      {err ? (
        <View style={{ gap: space.md }}>
          <T color={colors.danger}>{err}</T>
          <Button label={t('auth.title')} onPress={() => router.replace('/auth?mode=signin')} kind="secondary" />
        </View>
      ) : needEmail ? (
        <View style={{ gap: space.md }}>
          <T>{t('auth.confirmEmail')}</T>
          <Field label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Button label={t('common.continue')} onPress={() => finish(email)} />
        </View>
      ) : (
        <Loading />
      )}
    </Screen>
  );
}
