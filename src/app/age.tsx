import React, { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme';
import { AgeGate } from '../components/AgeGate';
import { T } from '../components/ui';
import { Screen } from '../components/layout';
import { createAccountDoc, discardUnderAgeAccount, errorKey } from '../lib/account';
import { useAuth } from '../lib/auth';
import { useStore } from '../store/AppStore';

/** Age gate for accounts that were created by an email link (no account doc yet). */
export default function AgeStep() {
  const { t } = useTranslation();
  const { user, refresh } = useAuth();
  const { state } = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pass = async () => {
    if (!user) return router.replace('/');
    setBusy(true);
    try {
      await createAccountDoc(user.uid, state.language ?? 'en');
      await refresh();
      router.replace('/');
    } catch (e) {
      setErr(t(`authErr.${errorKey(e)}`));
    } finally {
      setBusy(false);
    }
  };
  const fail = async () => {
    // Remove the just-created sign-in so nothing about this person is kept.
    if (user) await discardUnderAgeAccount(user).catch(() => {});
    router.replace('/under-18');
  };

  return (
    <Screen>
      <AgeGate onPass={pass} onUnderAge={fail} busy={busy} />
      {err ? <T color={colors.danger}>{err}</T> : null}
    </Screen>
  );
}
