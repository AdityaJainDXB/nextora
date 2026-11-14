import React from 'react';
import { ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Chip } from './ui';
import { ALL_EMIRATES, type Emirate } from '../store/types';

export function EmiratePicker({ value, onChange }: { value: Emirate; onChange: (value: Emirate) => void }) {
  const { t } = useTranslation();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {ALL_EMIRATES.map((emirate) => (
        <Chip key={emirate} label={t(`emirates.${emirate}`)} selected={value === emirate} onPress={() => onChange(emirate)} />
      ))}
    </ScrollView>
  );
}
