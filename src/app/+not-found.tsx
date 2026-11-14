import React from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Empty } from '../components/ui';
import { Screen } from '../components/layout';

/** Any unknown link lands here instead of a bare 404. */
export default function NotFound() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Empty icon="compass-outline" text={t('sys.notFound')}
        action={<Button label={t('sys.goHome')} icon="home-outline" onPress={() => router.replace('/')} />} />
    </Screen>
  );
}
