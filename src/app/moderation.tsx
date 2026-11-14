import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, space } from '../../theme';
import { Button, Card, Chip, Empty, Field, IconButton, Loading, Row, T, Tag, Toast, useToast } from '../components/ui';
import { Screen, Segmented } from '../components/layout';
import { useAuth } from '../lib/auth';
import { useLang } from '../lib/lang';
import {
  forumErrorKey, setHidden, setReportStatus, useHiddenPosts, useIsMod, useReports, type Report, type ReportStatus,
} from '../lib/forum';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
type Tab = 'queue' | 'closed' | 'hidden';
const ACTIONS: ReportStatus[] = ['inReview', 'actioned', 'dismissed'];

export default function Moderation() {
  const { t } = useTranslation();
  const { isRTL } = useLang();
  const { user } = useAuth();
  const isMod = useIsMod();
  const reports = useReports(isMod === true);
  const hidden = useHiddenPosts(isMod === true);
  const [tab, setTab] = useState<Tab>('queue');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, showToast] = useToast();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/home'));
  const me = user?.uid ?? '';

  const list = useMemo(() => (reports.data ?? []).filter((r) =>
    tab === 'queue' ? r.status === 'open' || r.status === 'inReview' : r.status === 'actioned' || r.status === 'dismissed'), [reports.data, tab]);

  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try { await fn(); showToast(t('mod.done')); } catch (e) { showToast(t(forumErrorKey(e))); } finally { setBusy(null); }
  };
  const postIdOf = (r: Report) => (r.targetType === 'post' || r.targetType === 'reply') && r.contextId ? r.contextId.split('/')[0] : null;
  const overdue = (r: Report) => !!r.createdAt && Date.now() > r.createdAt.getTime() + r.slaHours * 3600 * 1000;

  const header = (
    <Row gap={space.sm}>
      <IconButton icon={isRTL ? 'arrow-forward' : 'arrow-back'} label={t('common.back')} onPress={back} />
      <T v="h1" w="bold" accessibilityRole="header" style={{ flex: 1 }}>{t('mod.title')}</T>
    </Row>
  );
  if (isMod === undefined) return <Screen>{header}<Loading /></Screen>;
  if (!isMod) return <Screen>{header}<Empty icon="lock-closed-outline" text={t('mod.notAllowed')} /></Screen>;

  return (
    <Screen>
      {header}
      <Segmented label={t('mod.title')} value={tab} onChange={setTab}
        options={[{ key: 'queue', label: t('mod.queue') }, { key: 'closed', label: t('mod.closed') }, { key: 'hidden', label: t('mod.hiddenPosts') }]} />
      <View style={{ gap: space.sm, marginTop: space.sm }}>
        {tab === 'hidden' ? (
          hidden.error ? <Empty icon="alert-circle-outline" text={t('forum.loadError')} />
            : !hidden.data ? <Loading />
            : hidden.data.length === 0 ? <Empty icon="eye-outline" text={t('mod.noHidden')} />
            : hidden.data.map((p) => (
              <Card key={p.id}>
                <T w="semibold" numberOfLines={2}>{p.deleted ? t('forum.deletedPost') : p.title}</T>
                <T v="tiny" color={colors.textMuted}>{p.displayName} · {t(`topic.${p.topic}`)}</T>
                <Row wrap gap={space.xs}>
                  <Button small kind="secondary" label={t('mod.open')} onPress={() => router.push(`/forum/${p.id}`)} />
                  <Button small label={t('mod.restore')} disabled={busy === p.id} onPress={() => act(p.id, () => setHidden(p.id, false))} />
                </Row>
              </Card>
            ))
        ) : reports.error ? <Empty icon="alert-circle-outline" text={t('forum.loadError')} />
          : !reports.data ? <Loading />
          : list.length === 0 ? <Empty icon="checkmark-done-outline" text={tab === 'queue' ? t('mod.emptyQueue') : t('mod.emptyClosed')} />
          : list.map((r) => {
            const pid = postIdOf(r);
            const note = notes[r.id] ?? '';
            return (
              <Card key={r.id}>
                <Row wrap gap={space.xs}>
                  <Tag label={t(`report.${r.reason}`)} tone={r.reason === 'childSafety' ? 'danger' : 'purple'} />
                  <Tag label={t(`mod.type${cap(r.targetType)}`)} />
                  <Tag label={t(`mod.status${cap(r.status)}`)} tone="teal" />
                  {overdue(r) && tab === 'queue' ? <Tag label={t('mod.overdue')} tone="danger" /> : null}
                </Row>
                {r.note ? <T v="small">{r.note}</T> : null}
                <T v="tiny" color={colors.textMuted}>
                  {r.createdAt?.toLocaleString() ?? '…'} · {r.assignee ? (r.assignee === me ? t('mod.assignedToMe') : t('mod.assigned')) : t('mod.unassigned')}
                </T>
                <Field label={t('mod.note')} value={note} onChangeText={(v) => setNotes((n) => ({ ...n, [r.id]: v }))} maxLength={500} />
                <Row wrap gap={space.xs}>
                  {r.assignee !== me ? <Chip label={t('mod.assignMe')} onPress={() => act(r.id, () => setReportStatus(r.id, r.status === 'open' ? 'inReview' : r.status, me, note))} /> : null}
                  {ACTIONS.filter((s) => s !== r.status).map((s) => (
                    <Chip key={s} label={t(`mod.set${cap(s)}`)} disabled={busy === r.id}
                      onPress={() => act(r.id, () => setReportStatus(r.id, s, r.assignee ?? me, note))} />
                  ))}
                </Row>
                {pid ? (
                  <Row wrap gap={space.xs}>
                    <Button small kind="secondary" label={t('mod.open')} onPress={() => router.push(`/forum/${pid}`)} />
                    <Button small kind="danger" label={t('mod.hide')} disabled={busy === r.id} onPress={() => act(r.id, () => setHidden(pid, true, `report ${r.id}`))} />
                  </Row>
                ) : null}
              </Card>
            );
          })}
      </View>
      <Toast text={toast} />
    </Screen>
  );
}
