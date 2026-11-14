import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, radius, space } from '../../theme';
import { Card, IconButton, Row, T, Tag, ToggleRow } from '../components/ui';
import { Screen } from '../components/layout';
import { CONSENT_VERSION, flags } from '../lib/flags';
import { useLang } from '../lib/lang';
import { setConsent, useStore } from '../store/AppStore';
import { useAuth } from '../lib/auth';
import { logConsent } from '../lib/account';
import type { ConsentKey } from '../store/types';

const GENERAL: ConsentKey[] = ['analytics', 'notifications'];
const AI: ConsentKey[] = ['aiTranslate', 'aiAssist', 'aiAssistant'];

/** Privacy choices. Every switch starts off, and every change is logged with the text version. */
export default function Consent() {
  const { t } = useTranslation();
  const { isRTL } = useLang();
  const { state, update } = useStore();
  const { user } = useAuth();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const Item = ({ k }: { k: ConsentKey }) => {
    const entry = state.consents[k];
    // A choice made under an older text version no longer counts.
    const on = !!entry?.granted && entry.version === CONSENT_VERSION;
    return (
      <View style={{ gap: space.xs }}>
        <ToggleRow
          label={t(`consent.${k}`)}
          hint={t(`consent.${k}Body`)}
          value={on}
          onChange={(v) => {
            update((s) => setConsent(s, k, v, CONSENT_VERSION));
            if (user) logConsent(user.uid, k, v, CONSENT_VERSION).catch(() => {});
          }}
        />
      </View>
    );
  };

  return (
    <Screen>
      <IconButton icon={isRTL ? 'arrow-forward' : 'arrow-back'} label={t('common.back')} onPress={back} />
      <T v="h1" w="bold" accessibilityRole="header">{t('consent.title')}</T>
      <T color={colors.textMuted}>{t('consent.subtitle')}</T>

      <Card>
        {GENERAL.map((k) => <Item key={k} k={k} />)}
      </Card>

      <T v="h2" w="bold">{t('consent.aiTitle')}</T>
      <Row gap={space.sm} style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: space.md, alignItems: 'flex-start' }}>
        <Ionicons name="information-circle-outline" size={20} color={colors.accentText} />
        <T v="small" style={{ flex: 1 }}>{t('consent.aiProvider')}</T>
      </Row>
      {!flags.aiEnabled ? <Tag label={t('consent.aiUnavailable')} tone="warning" /> : null}
      <Card>
        {AI.map((k) => <Item key={k} k={k} />)}
      </Card>

      <T v="tiny" color={colors.textMuted}>{t('consent.version', { version: CONSENT_VERSION })}</T>
    </Screen>
  );
}
