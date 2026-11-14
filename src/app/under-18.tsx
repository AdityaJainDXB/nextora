import React from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme';
import { Button, Empty, T } from '../components/ui';
import { Screen } from '../components/layout';

export default function UnderAge() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Empty
        icon="hand-left-outline"
        text={t('age.blocked')}
        action={<Button label={t('age.backToStart')} kind="secondary" onPress={() => router.replace('/welcome')} />}
      />
      <T v="small" color={colors.textMuted} center>{t('age.nothingStored')}</T>
    </Screen>
  );
}
