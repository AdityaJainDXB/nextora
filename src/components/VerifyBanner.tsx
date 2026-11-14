import React, { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, space } from '../../theme';
import { errorKey, refreshVerification, resendVerification, verifyViaEmulator } from '../lib/account';
import { backendMode } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { Button, Row, T } from './ui';

/** Email must be verified before posting or messaging (enforced by rules on those features). */
export function VerifyBanner() {
  const { t } = useTranslation();
  const { user, verified } = useAuth();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') { setNote(null); return; }
      if (!user || verified) return;
      // Firebase changes emailVerified on the user record after the link is
      // opened. Refresh that record when the person returns from Mail/browser.
      void refreshVerification(user).catch(() => {});
    });
    return () => subscription.remove();
  }, [user, verified]);
  if (!user || verified) return null;

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); setNote(ok); } catch (e) { setNote(t(`authErr.${errorKey(e)}`)); } finally { setBusy(false); }
  };

  return (
    <View style={{ backgroundColor: colors.warningSoft, borderRadius: radius.md, padding: space.md, gap: space.sm }}>
      <Row gap={space.sm} style={{ alignItems: 'flex-start' }}>
        <Ionicons name="mail-unread-outline" size={20} color={colors.warning} />
        <T v="small" color={colors.warning} style={{ flex: 1 }}>{t('verify.body', { email: user.email ?? '' })}{backendMode === 'local' ? ` ${t('verify.localNote')}` : ''}</T>
      </Row>
      <Row wrap gap={space.sm}>
        <Button small kind="secondary" label={t('verify.done')} disabled={busy}
          onPress={() => act(async () => { if (!(await refreshVerification(user))) throw Object.assign(new Error(), { code: 'nextora/not-verified' }); }, t('verify.thanks'))} />
        {backendMode === 'local' ? (
          <Button small icon="checkmark-done-outline" label={t('verify.localVerify')} disabled={busy}
            onPress={() => act(async () => { if (!(await verifyViaEmulator(user))) throw Object.assign(new Error(), { code: 'nextora/not-verified' }); }, t('verify.thanks'))} />
        ) : null}
        {backendMode !== 'local' ? (
          <Button small kind="ghost" label={t('verify.resend')} disabled={busy} onPress={() => act(() => resendVerification(user), t('verify.sent'))} />
        ) : null}
      </Row>
      {note ? <T v="small" color={colors.text}>{note}</T> : null}
    </View>
  );
}
