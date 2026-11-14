import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, space, touch } from '../../../theme';
import { getLang } from '../../../locales/meta';
import { Avatar, Button, Card, Field, Row, Sheet, T, Tag, Toast, ToggleRow, useToast } from '../../components/ui';
import { Screen } from '../../components/layout';
import { useLang } from '../../lib/lang';
import { useStore } from '../../store/AppStore';
import { useAuth } from '../../lib/auth';
import { backendMode } from '../../lib/firebase';
import { deleteMyAccount, errorKey, exportMyData, saveSettings, signOutHere } from '../../lib/account';
import { unblock, useBlocks, usePublicProfiles } from '../../lib/connect';
import type { Field as ProfileField } from '../../store/types';

const langNames = (codes: string[]) => codes.map((c) => getLang(c).nativeName).join(', ');

export default function Me() {
  const { t } = useTranslation();
  const { lang, isRTL } = useLang();
  const { state } = useStore();
  const me = state.profile!;

  const rows: { label: string; value: string; field?: ProfileField }[] = [
    { label: t('me.role'), value: me.role === 'volunteer' ? t('onb.roleHelp') : t('onb.roleNew') },
    ...(me.role === 'newcomer' ? [{ label: t('me.persona'), value: t(`persona.${me.persona}`) }] : []),
    { label: t('onb.emirate'), value: t(`emirates.${me.emirate}`), field: 'emirate' as ProfileField },
    ...(me.neighbourhood ? [{ label: t('onb.neighbourhood'), value: me.neighbourhood, field: 'neighbourhood' as ProfileField }] : []),
    { label: t('me.languages'), value: langNames(me.languages), field: 'languages' as ProfileField },
    { label: t('me.interests'), value: me.interests.map((i) => t(`interests.${i}`)).join(', ') || '—', field: 'interests' },
    { label: t('me.family'), value: me.family.map((f) => t(`family.${f}`)).join(', '), field: 'family' },
  ];

  const Link = ({ icon, label, value, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string; onPress: () => void }) => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={value ? `${label}, ${value}` : label} style={styles.link}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <T w="semibold" style={{ flex: 1 }}>{label}</T>
      {value ? <T v="small" color={colors.textMuted} lang={lang}>{value}</T> : null}
      <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textMuted} />
    </Pressable>
  );

  return (
    <Screen>
      <T v="h1" w="bold" accessibilityRole="header">{t('me.title')}</T>
      <Card>
        <Row gap={space.md}>
          <Avatar initials={me.displayName.slice(0, 1).toUpperCase()} />
          <T v="h2" w="bold" style={{ flex: 1 }}>{me.displayName}</T>
          <Button small kind="secondary" icon="create-outline" label={t('me.edit')} onPress={() => router.push({ pathname: '/onboarding', params: { edit: '1' } })} />
        </Row>
        {rows.map((r) => (
          <View key={r.label} style={styles.row}>
            <Row gap={space.xs}>
              <T v="tiny" w="semibold" color={colors.textMuted} style={{ flex: 1 }}>{r.label}</T>
              {r.field && !me.visibility[r.field] ? <Tag label={t('me.hiddenTag')} tone="warning" /> : null}
            </Row>
            <T v="small">{r.value}</T>
          </View>
        ))}
      </Card>

      <T v="h2" w="bold">{t('me.settings')}</T>
      <Card style={{ paddingVertical: space.xs }}>
        <Link icon="language-outline" label={t('me.language')} value={getLang(lang).nativeName} onPress={() => router.push({ pathname: '/language', params: { from: 'settings' } })} />
        <Link icon="shield-checkmark-outline" label={t('me.privacy')} onPress={() => router.push('/privacy')} />
        <Link icon="options-outline" label={t('consent.title')} onPress={() => router.push('/consent')} />
        <Link icon="construct-outline" label={t('me.buildNotes')} onPress={() => router.push('/build-notes')} />
      </Card>

      <AiSettings />

      <BlockedSection />

      <AccountSection />

    </Screen>
  );
}

/** AI-driven features can be switched off; the app keeps working without them. */
function AiSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { state, update } = useStore();
  const set = (k: 'matchingOn' | 'assistantOn', v: boolean) => {
    update((x) => ({ ...x, settings: { ...x.settings, [k]: v } }));
    if (user) saveSettings(user.uid, { [k]: v }).catch(() => {});
  };
  return (
    <>
      <T v="h2" w="bold">{t('settings.aiTitle')}</T>
      <Card>
        <ToggleRow label={t('settings.matching')} hint={t('settings.matchingHint')} value={state.settings.matchingOn} onChange={(v) => set('matchingOn', v)} />
        <ToggleRow label={t('settings.assistant')} hint={t('settings.assistantHint')} value={state.settings.assistantOn} onChange={(v) => set('assistantOn', v)} />
      </Card>
    </>
  );
}

/** People I blocked, with Unblock. */
function BlockedSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const blocks = useBlocks();
  const ids = blocks.data ?? [];
  const people = usePublicProfiles(ids);
  return (
    <>
      <T v="h2" w="bold">{t('me.blockedList')}</T>
      <Card>
        {ids.length === 0 ? <T v="small" color={colors.textMuted}>{t('me.noneBlocked')}</T> : null}
        {ids.map((id) => (
          <Row key={id} gap={space.sm}>
            <T style={{ flex: 1 }}>{people[id]?.displayName ?? t('me.someone')}</T>
            <Button small kind="ghost" label={t('chat.unblock')} onPress={() => user && unblock(user.uid, id).catch(() => {})} />
          </Row>
        ))}
      </Card>
    </>
  );
}

/** Sign-in state and data rights: sign out, everywhere, export, delete. */
function AccountSection() {
  const { t } = useTranslation();
  const { user, verified } = useAuth();
  const { reset } = useStore();
  const [confirm, setConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, showToast] = useToast();

  const run = async (fn: () => Promise<void>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      if (ok) showToast(ok);
    } catch (e) {
      showToast(t(`authErr.${errorKey(e)}`));
    } finally {
      setBusy(false);
    }
  };

  const del = () => run(async () => {
    await deleteMyAccount(password);
    setConfirm(false);
    await reset(); // also clear everything kept on this device
    router.replace('/language');
  });

  return (
    <>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="h2" w="bold">{t('account.title')}</T>
        {backendMode === 'local' ? <Tag label={t('auth.localBackend')} tone="warning" /> : null}
      </Row>
      <Card>
        <T v="small" color={colors.textMuted}>{t('account.signedInAs')}</T>
        <T lang="en">{user?.email ?? '—'}</T>
        <Tag label={verified ? t('account.verified') : t('account.notVerified')} tone={verified ? 'clay' : 'warning'} />
        <T v="tiny" color={colors.textMuted}>{t('account.emailPrivate')}</T>
        <View style={{ gap: space.sm, marginTop: space.sm }}>
          <Button kind="secondary" icon="log-out-outline" label={t('account.signOut')} disabled={busy} onPress={() => run(async () => { await signOutHere(); router.replace('/'); })} />
          <Button kind="secondary" icon="download-outline" label={t('account.export')} disabled={busy} onPress={() => run(exportMyData, t('account.exported'))} />
          <Button kind="danger" icon="trash-outline" label={t('account.delete')} disabled={busy} onPress={() => setConfirm(true)} />
        </View>
      </Card>
      <Sheet visible={confirm} onClose={() => setConfirm(false)} title={t('account.deleteTitle')}>
        <View style={{ gap: space.md }}>
          <T>{t('account.deleteBody')}</T>
          <Field label={t('account.passwordToConfirm')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
          <Button kind="danger" icon="trash-outline" label={t('account.deleteConfirm')} disabled={busy || password.length < 6} onPress={del} />
          <Button kind="ghost" label={t('common.cancel')} onPress={() => setConfirm(false)} />
        </View>
      </Sheet>
      <Toast text={toast} />
    </>
  );
}

const styles = StyleSheet.create({
  row: { paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.border, gap: 2 },
  link: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: touch + 8 },
});
