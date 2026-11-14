import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, space } from '../../theme';
import { Card, IconButton, Row, T } from './ui';
import { Screen } from './layout';
import { useLang } from '../lib/lang';
import { ContentBadges, GuideDisclaimer, OfficialLink, SourceLine, StatusGate } from './ContentBadges';
import type { GuideState, Reviewed } from '../lib/guides';

export function GuideHeader({ title, intro }: { title: string; intro?: string }) {
  const { t } = useTranslation();
  const { isRTL } = useLang();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/guides'));
  return (
    <>
      <Row>
        <IconButton icon={isRTL ? 'arrow-forward' : 'arrow-back'} label={t('common.back')} onPress={back} />
        <T v="h1" w="bold" accessibilityRole="header" style={{ flex: 1 }}>{title}</T>
      </Row>
      {intro ? <T color={colors.textMuted}>{intro}</T> : null}
    </>
  );
}

type Rec = Reviewed & { title?: string; name?: string; body: string; officialUrl?: string | null };

export function RecordCard({ r }: { r: Rec }) {
  return (
    <Card>
      <T w="semibold" lang="en">{r.title ?? r.name}</T>
      <ContentBadges a={r} />
      <T v="small" lang="en" color={colors.textMuted}>{r.body}</T>
      <SourceLine source={r.source} />
      <OfficialLink url={r.officialUrl ?? null} />
    </Card>
  );
}

/** Reusable grouped content body for guide screens that add search controls. */
export function GroupedGuideBody<R extends Rec, G extends string>({
  data, groups, groupOf, groupLabel, emptyText, disclaimer,
}: {
  data: GuideState<R>; groups: G[]; groupOf: (r: R) => G;
  groupLabel: (g: G) => string; emptyText: string; disclaimer?: boolean;
}) {
  const gate = <StatusGate status={data.status} empty={data.items.length === 0} emptyText={emptyText} onRetry={data.retry} />;
  const showList = data.status === 'ready' && data.items.length > 0;
  return (
    <View style={{ gap: space.sm }}>
      {disclaimer ? <GuideDisclaimer /> : null}
      {showList
        ? groups.map((g) => {
          const items = data.items.filter((r) => groupOf(r) === g);
          if (!items.length) return null;
          return (
            <React.Fragment key={g}>
              <T v="h2" w="bold" accessibilityRole="header" style={{ marginTop: space.sm }}>{groupLabel(g)}</T>
              {items.map((r) => <RecordCard key={r.id} r={r} />)}
            </React.Fragment>
          );
        })
        : gate}
    </View>
  );
}

/** A guide screen whose records are grouped by one key (section / kind / category). */
export function GroupedGuide<R extends Rec, G extends string>({
  title, intro, data, groups, groupOf, groupLabel, emptyText, disclaimer,
}: {
  title: string; intro?: string; data: GuideState<R>; groups: G[]; groupOf: (r: R) => G;
  groupLabel: (g: G) => string; emptyText: string; disclaimer?: boolean;
}) {
  return (
    <Screen>
      <GuideHeader title={title} intro={intro} />
      <GroupedGuideBody data={data} groups={groups} groupOf={groupOf} groupLabel={groupLabel} emptyText={emptyText} disclaimer={disclaimer} />
    </Screen>
  );
}
