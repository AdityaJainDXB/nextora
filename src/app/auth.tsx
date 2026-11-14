import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, radius, space } from '../../theme';
import { AgeGate } from '../components/AgeGate';
import { Button, Empty, Field, IconButton, Row, T, Tag } from '../components/ui';
import { Screen, Segmented } from '../components/layout';
import {
  emailLinkAvailable, errorKey, sendEmailLink, sendReset, signInWithEmail, signUpWithEmail,
} from '../lib/account';
import { useAuth } from '../lib/auth';
import { backendMode } from '../lib/firebase';
import { useLang } from '../lib/lang';
import { useStore } from '../store/AppStore';

type Mode = 'signup' | 'signin';

export default function AuthScreen() {
  const params = useLocalSearchParams<{ mode?: Mode }>();
  const { t } = useTranslation();
  const { isRTL, lang } = useLang();
  const { refresh } = useAuth();
  const [mode, setMode] = useState<Mode>(params.mode === 'signin' ? 'signin' : 'signup');
  // Sign-up asks for age before anything else; nothing is created before it passes.
  const [agePassed, setAgePassed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/welcome'));

  const run = async (fn: () => Promise<unknown>, okText?: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      if (okText) setMsg({ tone: 'ok', text: okText });
    } catch (e) {
      const key = errorKey(e);
      const code = (e as { code?: unknown })?.code;
      // Firebase errors are intentionally translated instead of showing raw server
      // messages, which may contain user data. Include only a sanitized code when
      // a new/unmapped backend error needs diagnosis.
      const safeCode = key === 'generic' && typeof code === 'string' && /^[a-z0-9/-]+$/i.test(code)
        ? ` [${code}]`
        : '';
      setMsg({ tone: 'err', text: `${t(`authErr.${key}`)}${safeCode}` });
    } finally {
      setBusy(false);
    }
  };

  const BackBtn = <IconButton icon={isRTL ? 'arrow-forward' : 'arrow-back'} label={t('common.back')} onPress={back} />;

  if (backendMode === 'off') {
    return (
      <Screen>
        {BackBtn}
        <Empty icon="cloud-offline-outline" text={t('auth.notSetUp')} />
      </Screen>
    );
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const pwOk = password.length >= 8;

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        {BackBtn}
        {backendMode === 'local' ? <Tag label={t('auth.localBackend')} tone="warning" /> : null}
      </Row>

      <Segmented
        label={t('auth.title')}
        options={[{ key: 'signup', label: t('auth.signUp') }, { key: 'signin', label: t('auth.signIn') }]}
        value={mode}
        onChange={(m) => { setMode(m); setMsg(null); }}
      />

      {mode === 'signup' && !agePassed ? (
        <AgeGate onPass={() => setAgePassed(true)} onUnderAge={() => router.replace('/under-18')} />
      ) : (
        <View style={{ gap: space.md }}>
          <T v="h1" w="bold" accessibilityRole="header">{mode === 'signup' ? t('auth.createTitle') : t('auth.welcomeBack')}</T>

          {/* Apple and Google sign-in need native modules that Expo Go doesn't include, so they are
              shown disabled with "Coming soon". Email and password is the only working sign-in. */}
          {(['apple', 'google'] as const).map((p) => (
            <View key={p} style={{ gap: space.xs }}>
              <Button label={t(`auth.${p}`)} icon={p === 'apple' ? 'logo-apple' : 'logo-google'} kind="secondary" disabled
                a11y={`${t(`auth.${p}`)}, ${t('lang.comingSoon')}`} onPress={() => {}} />
              <Tag label={t('lang.comingSoon')} />
            </View>
          ))}

          <Row gap={space.sm}>
            <View style={styles.rule} />
            <T v="small" color={colors.textMuted}>{t('auth.or')}</T>
            <View style={styles.rule} />
          </Row>

          <Field label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" inputMode="email" />
          <Field
            label={t('auth.password')}
            hint={mode === 'signup' ? t('auth.passwordHint') : undefined}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
          <Button
            label={mode === 'signup' ? t('auth.create') : t('auth.signIn')}
            disabled={!emailOk || !pwOk || busy}
            onPress={() =>
              run(async () => {
                if (mode === 'signup') await signUpWithEmail(email, password, lang);
                else await signInWithEmail(email, password);
                await refresh();
                router.replace('/');
              })
            }
          />

          <Button
            small
            kind="ghost"
            icon="mail-outline"
            label={t('auth.emailLink')}
            disabled={!emailOk || busy}
            onPress={() =>
              emailLinkAvailable()
                ? run(() => sendEmailLink(email), t('auth.linkSent'))
                : setMsg({ tone: 'err', text: t('auth.linkNotConfigured') })
            }
          />
          {mode === 'signin' ? (
            <Button small kind="ghost" icon="key-outline" label={t('auth.forgot')} disabled={!emailOk || busy} onPress={() => run(() => sendReset(email), t('auth.resetSent'))} />
          ) : null}
        </View>
      )}

      {msg ? (
        <Row gap={space.xs} style={[styles.msg, { backgroundColor: msg.tone === 'ok' ? colors.accentSoft : colors.dangerSoft }]}>
          <Ionicons name={msg.tone === 'ok' ? 'checkmark-circle-outline' : 'alert-circle-outline'} size={18} color={msg.tone === 'ok' ? colors.accentText : colors.danger} />
          <T v="small" color={msg.tone === 'ok' ? colors.accentText : colors.danger} style={{ flex: 1 }} accessibilityRole="text">{msg.text}</T>
        </Row>
      ) : null}

    </Screen>
  );
}

const styles = StyleSheet.create({
  rule: { flex: 1, height: 1, backgroundColor: colors.border },
  msg: { padding: space.md, borderRadius: radius.md, alignItems: 'flex-start' },
});
