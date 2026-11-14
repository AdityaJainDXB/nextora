import React, { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, space } from '../../theme';
import { isAdult } from '../lib/account';
import { Button, Field, T } from './ui';

/**
 * Asks for age. 18 or over calls onPass; under 18 calls onUnderAge.
 * The number itself is never stored or sent anywhere.
 */
export function AgeGate({ onPass, onUnderAge, busy }: { onPass: () => void; onUnderAge: () => void; busy?: boolean }) {
  const { t } = useTranslation();
  const [age, setAge] = useState('');
  const n = Number(age);
  const valid = /^\d{1,3}$/.test(age) && n > 0 && n < 130;

  return (
    <View style={{ gap: space.md }}>
      <T v="h1" w="bold" accessibilityRole="header">{t('age.title')}</T>
      <T color={colors.textMuted}>{t('age.body')}</T>
      <Field
        label={t('age.label')}
        placeholder={t('age.placeholder')}
        value={age}
        onChangeText={(v) => setAge(v.replace(/[^0-9]/g, '').slice(0, 3))}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={3}
        returnKeyType="done"
      />
      <Button
        label={t('common.continue')}
        disabled={!valid || busy}
        onPress={() => (isAdult(n) ? onPass() : onUnderAge())}
      />
      <T v="tiny" color={colors.textMuted}>{t('age.privacy')}</T>
    </View>
  );
}
