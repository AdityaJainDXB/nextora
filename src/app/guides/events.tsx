import React, { useEffect, useState } from 'react';
import { Share, View } from 'react-native';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { colors, space } from '../../../theme';
import { Button, Card, Chip, Row, Sheet, T, Tag, Toast, useToast } from '../../components/ui';
import { Screen } from '../../components/layout';
import { GuideHeader } from '../../components/GuideScreens';
import { ContentBadges, SourceLine, StatusGate } from '../../components/ContentBadges';
import { useContent, type EventItem } from '../../lib/guides';
import { useAuth } from '../../lib/auth';
import { fb } from '../../lib/firebase';

type Rsvp = 'going' | 'maybe' | 'notNow';
const RSVPS: Rsvp[] = ['going', 'maybe', 'notNow'];

const icsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (m) => `\\${m}`);

/** RFC 5545 calendar file built only from the record's own fields. */
function buildIcs(e: EventItem): string {
  const start = icsDate(e.startsAt);
  const end = icsDate(e.endsAt ?? new Date(new Date(e.startsAt).getTime() + 60 * 60 * 1000).toISOString());
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NEXTORA//Events//EN', 'BEGIN:VEVENT',
    `UID:${e.id}@nextora`, `DTSTAMP:${icsDate(new Date().toISOString())}`, `DTSTART:${start}`, `DTEND:${end}`,
    `SUMMARY:${icsText(e.title)}`, `DESCRIPTION:${icsText(e.body)}`, `LOCATION:${icsText(e.place)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

const fmt = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString();
};

function Detail({ e, onClose }: { e: EventItem; onClose: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [mine, setMine] = useState<Rsvp | null>(null);
  const [toast, show] = useToast();
  const s = fb();

  useEffect(() => {
    if (!s || !user) return;
    return onSnapshot(doc(s.db, 'content', 'events', 'items', e.id, 'rsvps', user.uid),
      (d) => setMine(d.exists() ? (d.data().status as Rsvp) : null), () => setMine(null));
  }, [s, user, e.id]);

  const rsvp = async (r: Rsvp) => {
    if (!s || !user) return;
    try {
      await setDoc(doc(s.db, 'content', 'events', 'items', e.id, 'rsvps', user.uid), { status: r, at: serverTimestamp() });
      show(t('events.rsvpSaved'));
    } catch { show(t('common.error')); }
  };
  const addToCalendar = () => { void Share.share({ title: e.title, message: buildIcs(e) }).catch(() => show(t('common.error'))); };

  return (
    <Sheet visible onClose={onClose} title={e.title}>
      <View style={{ gap: space.md }}>
        {e.isSample ? <Tag label={t('events.sample')} tone="warning" /> : null}
        <ContentBadges a={e} />
        <T lang="en">{e.body}</T>
        <T v="small">{t('events.starts', { date: fmt(e.startsAt) })}</T>
        {e.endsAt ? <T v="small">{t('events.ends', { date: fmt(e.endsAt) })}</T> : null}
        <T v="small" lang="en">{t('events.where', { place: e.place })}</T>
        <SourceLine source={e.source} />
        <T w="semibold">{t('events.rsvpTitle')}</T>
        <Row wrap>
          {RSVPS.map((r) => <Chip key={r} label={t(`events.rsvp_${r}`)} selected={mine === r} onPress={() => { void rsvp(r); }} disabled={!user || !s} />)}
        </Row>
        <Button label={t('events.addToCalendar')} icon="calendar-outline" kind="secondary" onPress={addToCalendar} />
      </View>
      <Toast text={toast} />
    </Sheet>
  );
}

export default function Events() {
  const { t } = useTranslation();
  const data = useContent('events');
  const [open, setOpen] = useState<EventItem | null>(null);
  const now = Date.now();
  const upcoming = data.items
    .filter((e) => new Date(e.endsAt ?? e.startsAt).getTime() >= now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return (
    <Screen>
      <GuideHeader title={t('events.title')} intro={t('events.intro')} />
      {data.status === 'ready' && upcoming.length > 0
        ? upcoming.map((e) => (
          <Card key={e.id} onPress={() => setOpen(e)} a11y={`${e.title}, ${fmt(e.startsAt)}`}>
            <T w="semibold" lang="en">{e.title}</T>
            <Row wrap gap={space.xs}>
              {e.isSample ? <Tag label={t('events.sample')} tone="warning" /> : null}
              <Tag label={t(`events.emirate_${e.emirate}`)} tone="ink" />
            </Row>
            <T v="small" color={colors.textMuted}>{fmt(e.startsAt)}</T>
            <T v="small" lang="en" color={colors.textMuted}>{e.place}</T>
            <ContentBadges a={e} />
            <SourceLine source={e.source} />
          </Card>
        ))
        : <StatusGate status={data.status} empty={upcoming.length === 0} emptyText={t('events.empty')} onRetry={data.retry} />}
      {open ? <Detail e={open} onClose={() => setOpen(null)} /> : null}
    </Screen>
  );
}
