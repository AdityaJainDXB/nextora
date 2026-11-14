import '../../globals.css';
import '../lib/i18n';
import { GluestackUIProvider } from '../components/gs/gluestack-ui-provider';
import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppStoreProvider, useStore } from '../store/AppStore';
import { LangProvider, useLang } from '../lib/lang';
import { AuthProvider } from '../lib/auth';
import { ContentProvider } from '../lib/content';
import { ProgressSync } from '../lib/progress';
import { fontsFor, markLoaded } from '../lib/fonts';
import { deviceLanguage } from '../lib/i18n';
import { Button, ErrorState, Loading, Sheet, T } from '../components/ui';
import { colors, space } from '../../theme';
import { BackendStatus } from '../components/BackendStatus';
import { router, type ErrorBoundaryProps } from 'expo-router';

function RestartPrompt() {
  const { t } = useTranslation();
  const { needsRestart, dismissRestart, restart } = useLang();
  return (
    <Sheet visible={needsRestart} onClose={dismissRestart} title={t('rtl.title')}>
      <View style={{ gap: space.md }}>
        <T>{t('rtl.body')}</T>
        <Button label={t('rtl.now')} onPress={restart} icon="refresh" />
        <Button label={t('rtl.later')} onPress={dismissRestart} kind="ghost" />
      </View>
    </Sheet>
  );
}

function Gate() {
  const reducedMotion = useReducedMotion();
  const { state, ready, loadError, retryLoad } = useStore();
  // Load fonts only for the active language (plus Latin for official names).
  const lang = state.language ?? deviceLanguage();
  const [fontsReadyFor, setFontsReadyFor] = useState<string | null>(null);
  useEffect(() => {
    if (!ready) return;
    const map = fontsFor(lang);
    let alive = true;
    Font.loadAsync(map)
      .then(() => markLoaded(map))
      .catch(() => {}) // fall back to system fonts rather than block the app
      .finally(() => alive && setFontsReadyFor(lang));
    return () => { alive = false; };
  }, [lang, ready]);
  if (loadError) return <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}><ErrorState onRetry={retryLoad} /></View>;
  // Only block on the very first font load; later language switches keep the UI up.
  if (!ready || fontsReadyFor === null) return <View style={{ flex: 1, backgroundColor: colors.bg }}><Loading /></View>;
  return (
    <GluestackUIProvider mode="light">
    <LangProvider>
      <AuthProvider>
      <ContentProvider>
      <ProgressSync />
      <StatusBar style="dark" />
      {/* Platform push for going deeper (keeps the iOS back swipe); a fade when Reduce Motion is on. */}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: reducedMotion ? 'fade' : 'default' }} />
      <BackendStatus />
      <RestartPrompt />
      </ContentProvider>
      </AuthProvider>
    </LangProvider>
    </GluestackUIProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppStoreProvider>
        <Gate />
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}

/** Expo Router calls this when a screen throws, so one bad screen never kills the app. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: space.lg, gap: space.md }}>
      <T v="h2" w="bold" center>{t('sys.crash')}</T>
      <Button label={t('sys.retry')} icon="refresh" onPress={retry} />
      <Button kind="ghost" label={t('sys.goHome')} onPress={() => { retry(); router.replace('/'); }} />
    </View>
  );
}
