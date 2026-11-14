import React from 'react';
import { useTranslation } from 'react-i18next';
import { reviewState } from '../lib/content';
import { Tag } from './ui';

/** Human-oversight badge. Never says "verified" unless a reviewer and date are recorded. */
export function ReviewTag({ a }: { a: Parameters<typeof reviewState>[0] }) {
  const { t } = useTranslation();
  const r = reviewState(a);
  if (r === 'reviewed') return <Tag label={t('appv.reviewedOn', { date: a.reviewedOn })} tone="clay" />;
  if (r === 'needsRecheck') return <Tag label={t('appv.needsRecheck')} tone="warning" />;
  return <Tag label={t('appv.notReviewed')} />;
}
