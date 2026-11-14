import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, radius, space } from '../../../theme';
import { Button, Card, Chip, DateBadge, Empty, Field, IconButton, Loading, Row, Sheet, T, Tag, Toast, useToast } from '../../components/ui';
import { Screen } from '../../components/layout';
import { useAuth } from '../../lib/auth';
import { connectErrorKey, reportUser } from '../../lib/connect';
import {
  addToCalendar, cancelEvent, fmtWhen, goingCount, myRsvp, rsvp, setHidden, useEvent, type Rsvp,
} from '../../lib/events';
import { useLang } from '../../lib/lang';
import { useIsMod } from '../../lib/forum';

const REASONS = ['harassment', 'scam', 'impersonation', 'childSafety', 'hate', 'other'] as const;

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isRTL, shown } = useLang();
  const isMod = useIsMod();
  const ev = useEvent(id);
  const e = ev.data;
  const [mine, setMine] = useState<Rsvp | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [sheet, setSheet] = useState<'report' | 'cancel' | null>(null);
  const [reason, setReason] = useState<(typeof REASONS)[number] | null>(null);
  const [note, setNote] = useState('');
  const [toast, showToast] = useToast();
  const isHost = !!e && e.hostUid === user?.uid;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/events'));
  const fail = (err: unknown) => showToast(t(`authErr.${connectErrorKey(err)}`));

  useEffect(() => { if (e) myRsvp(e.id).then(setMine).catch(() => {}); }, [e?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (isHost) goingCount(id).then(setCount); }, [isHost, id, mine]);

  if (ev.data === undefined) return <Screen><Loading /></Screen>;
  if (!e) return <Screen><IconButton icon={isRTL ? 'arrow-forward' : 'arrow-back'} label={t('common.back')} onPress={back} /><Empty icon="calendar-outline" text={t('events.notFound')} /></Screen>;

  const choose = (s: Rsvp) => {
    const next = mine === s ? null : s;
    setMine(next);
    rsvp(e.id, next).catch((err) => { setMine(mine); fail(err); });
  };

  return (
    <Screen>
      <IconButton icon={isRTL ? 'arrow-forward' : 'arrow-back'} label={t('common.back')} onPress={back} />
      <Row wrap gap={space.xs}>
        <Tag label={t(`emirates.${e.emirate}`)} tone="purple" />
        {e.status === 'cancelled' ? <Tag label={t('events.cancelled')} tone="danger" /> : null}
        {e.hidden ? <Tag label={t('events.hiddenByMod')} tone="warning" /> : null}
        {e.isSample ? <Tag label={t('forum.sampleBadge')} tone="warning" /> : null}
      </Row>
      <T v="h1" w="bold" accessibilityRole="header">{e.title}</T>
      <Card>
        <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
        <DateBadge date={e.startsAt} lang={shown} />
        <View style={{ flex: 1, gap: space.xs }}>
        <T w="semibold">{fmtWhen(e.startsAt, shown)} – {e.endsAt.toLocaleTimeString(shown, { hour: '2-digit', minute: '2-digit' })}</T>
        <T color={colors.textMuted}>{e.place}</T>
        <T v="small" color={colors.textMuted}>{t('events.hostedBy', { name: e.hostName })}</T>
        {e.capacity > 0 ? <T v="small" color={colors.textMuted}>{t('events.capacity', { n: e.capacity })}</T> : null}
        </View>
        </Row>
      </Card>
      <T>{e.body}</T>
      <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: space.md }}>
        <T v="small">{t('events.safety')}</T>
      </View>

      {e.status === 'scheduled' ? (
        <>
          <T w="semibold">{t('events.rsvpTitle')}</T>
          <Row wrap>
            {(['going', 'maybe', 'notNow'] as Rsvp[]).map((s) => <Chip key={s} label={t(`events.${s}`)} selected={mine === s} onPress={() => choose(s)} />)}
          </Row>
          <Button kind="secondary" icon="calendar-outline" label={t('events.addCalendar')} onPress={() => addToCalendar(e).catch(() => {})} />
        </>
      ) : null}

      {isHost ? (
        <Card>
          <T w="semibold">{t('events.forHost')}</T>
          <T v="small" color={colors.textMuted}>{count === null ? '…' : t('events.goingCount', { n: count })}</T>
          {e.status === 'scheduled' ? (
            <Row wrap gap={space.sm}>
              <Button small kind="secondary" icon="create-outline" label={t('common.edit')} onPress={() => router.push({ pathname: '/events/new', params: { id: e.id } })} />
              <Button small kind="danger" icon="close-circle-outline" label={t('events.cancel')} onPress={() => setSheet('cancel')} />
            </Row>
          ) : null}
        </Card>
      ) : (
        <Button kind="ghost" icon="flag-outline" label={t('events.report')} onPress={() => setSheet('report')} />
      )}
      {isMod ? (
        <Button kind="secondary" icon="eye-off-outline" label={e.hidden ? t('events.restore') : t('events.hide')}
          onPress={() => setHidden(e.id, !e.hidden).catch(fail)} />
      ) : null}

      <Sheet visible={sheet === 'cancel'} onClose={() => setSheet(null)} title={t('events.cancelTitle')}>
        <View style={{ gap: space.md }}>
          <T>{t('events.cancelBody')}</T>
          <Button kind="danger" label={t('events.cancel')} onPress={() => cancelEvent(e.id).then(() => setSheet(null)).catch(fail)} />
          <Button kind="ghost" label={t('common.back')} onPress={() => setSheet(null)} />
        </View>
      </Sheet>
      <Sheet visible={sheet === 'report'} onClose={() => setSheet(null)} title={t('events.report')}>
        <View style={{ gap: space.md }}>
          <T color={colors.textMuted}>{t('chat.reportBodyLive')}</T>
          <Row wrap>{REASONS.map((r) => <Chip key={r} label={t(`report.${r}`)} selected={reason === r} onPress={() => setReason(r)} />)}</Row>
          <Field label={t('chat.reportReason')} value={note} onChangeText={setNote} multiline maxLength={1000} style={{ minHeight: 88 }} />
          <Button label={t('chat.report')} icon="flag-outline" disabled={!reason}
            onPress={() => reportUser(e.id, reason!, note, e.id, 'event').then(() => { setSheet(null); showToast(t('chat.reportSaved')); }).catch(fail)} />
        </View>
      </Sheet>
      <Toast text={toast} />
    </Screen>
  );
}
