import React, { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, space } from '../../theme';
import { Button, Card, Field, IconButton, Row, Sheet, T } from '../components/ui';
import { Screen } from '../components/layout';
import { useLang } from '../lib/lang';
import { useStore } from '../store/AppStore';
import { useAuth } from '../lib/auth';
import { deleteMyAccount, errorKey } from '../lib/account';

const SECTIONS: { key: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'stored', icon: 'phone-portrait-outline' },
  { key: 'shared', icon: 'eye-outline' },
  { key: 'contact', icon: 'call-outline' },
  { key: 'ai', icon: 'chatbubble-ellipses-outline' },
];

export default function Privacy() {
  const { t } = useTranslation();
  const { isRTL } = useLang();
  const { reset } = useStore();
  const [confirm, setConfirm] = useState(false);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const { user } = useAuth();
  const [err, setErr] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const del = async () => {
    setErr(null);
    if (user) {
      try { await deleteMyAccount(password); } catch (e) { setConfirm(false); setErr(t(`authErr.${errorKey(e)}`)); return; }
    }
    setConfirm(false);
    await reset();
    router.replace('/language');
  };

  return (
    <Screen>
      <IconButton icon={isRTL ? 'arrow-forward' : 'arrow-back'} label={t('common.back')} onPress={back} />
      <T v="h1" w="bold" accessibilityRole="header">{t('privacy.title')}</T>
      {SECTIONS.map((s) => (
        <Card key={s.key}>
          <Row gap={space.sm}>
            <Ionicons name={s.icon} size={20} color={colors.primary} />
            <T w="semibold" style={{ flex: 1 }}>{t(`privacy.${s.key}Title`)}</T>
          </Row>
          <T v="small" color={colors.textMuted}>{t(`privacy.${s.key}Body`)}</T>
        </Card>
      ))}
      {err ? <T color={colors.danger}>{err}</T> : null}
      <Button label={t('privacy.delete')} kind="danger" icon="trash-outline" onPress={() => setConfirm(true)} />
      <Sheet visible={confirm} onClose={() => setConfirm(false)} title={t('privacy.deleteConfirmTitle')}>
        <View style={{ gap: space.md }}>
          <T>{t('privacy.deleteConfirmBody')}</T>
          {user ? <Field label={t('account.passwordToConfirm')} value={password} onChangeText={setPassword} secureTextEntry /> : null}
          <Button label={t('privacy.deleteConfirm')} kind="danger" icon="trash-outline" onPress={del} disabled={!!user && password.length < 6} />
          <Button label={t('common.cancel')} kind="ghost" onPress={() => setConfirm(false)} />
        </View>
      </Sheet>
    </Screen>
  );
}
