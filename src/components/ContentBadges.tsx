import React from 'react';
import { Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, space } from '../../theme';
import { reviewState } from '../lib/content';
import type { Reviewed } from '../lib/guides';
import { Button, Empty, ErrorState, Loading, Row, T, Tag } from './ui';
import type { GuideStatus } from '../lib/guides';

/** Review badge for guide records. "Human-reviewed" only with a reviewer and a date. */
export function ContentBadges({ a }: { a: Reviewed }) {
  const { t } = useTranslation();
  const r = reviewState(a);
  return (
    <Row wrap gap={space.xs}>
      {r === 'reviewed' ? <Tag label={t('guides.reviewedOn', { date: a.reviewedOn })} tone="teal" /> : null}
      {r === 'needsRecheck' ? <Tag label={t('guides.reviewedOn', { date: a.reviewedOn })} tone="teal" /> : null}
      {r === 'needsRecheck' ? <Tag label={t('guides.outOfDate')} tone="warning" /> : null}
      {r === 'notReviewed' ? <Tag label={t('guides.notReviewed')} /> : null}
    </Row>
  );
}

export function SourceLine({ source }: { source: string | null }) {
  const { t } = useTranslation();
  if (!source) return null;
  return <T v="tiny" color={colors.textMuted}>{t('guides.source', { source })}</T>;
}

/** Shown on government, visa and relocation content. */
export function GuideDisclaimer() {
  const { t } = useTranslation();
  return (
    <Row style={s.warn} gap={space.sm}>
      <Ionicons name="information-circle" size={20} color={colors.warning} />
      <T v="small" color={colors.warning} style={{ flex: 1 }}>{t('guides.disclaimer')}</T>
    </Row>
  );
}

export function OfficialLink({ url }: { url: string | null }) {
  const { t } = useTranslation();
  if (!url) return null;
  return <Button small kind="secondary" icon="open-outline" label={t('guides.officialLink')} onPress={() => { void Linking.openURL(url); }} />;
}

/** Loading / error / not configured / empty, or null when content should render. */
export function StatusGate({ status, empty, emptyText, onRetry }: { status: GuideStatus; empty: boolean; emptyText: string; onRetry: () => void }) {
  const { t } = useTranslation();
  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorState onRetry={onRetry} />;
  if (status === 'notConfigured') return <Empty icon="cloud-offline-outline" text={t('guides.notConfigured')} />;
  if (empty) return <Empty icon="document-text-outline" text={emptyText} />;
  return null;
}

const s = StyleSheet.create({
  warn: { backgroundColor: colors.warningSoft, borderRadius: radius.md, padding: space.md, alignItems: 'flex-start' },
});
