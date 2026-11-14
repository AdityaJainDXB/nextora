import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, space } from '../../../theme';
import { activeLanguages } from '../../../locales/meta';
import { Button, Chip, Field, IconButton, Loading, Row, T } from '../../components/ui';
import { Screen } from '../../components/layout';
import { connectErrorKey } from '../../lib/connect';
import { checkEvent, editEvent, hostEvent, useEvent, type EventInput } from '../../lib/events';
import { useLang } from '../../lib/lang';
import { useStore } from '../../store/AppStore';
import { ALL_EMIRATES, type Emirate } from '../../store/types';

// Times offered for a meetup start, every 30 minutes from 07:00 to 22:00.
const TIMES = Array.from({ length: 31 }, (_, i) => 7 * 60 + i * 30);
const DURATIONS = [60, 90, 120, 180, 240];

const atTime = (day: Date, minutes: number) => {
  const d = new Date(day);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
};

/** Host (or edit) a meetup. Guides only; the rules enforce it too. */
export default function HostEvent() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t } = useTranslation();
  const { isRTL, shown, lang } = useLang();
  const { state } = useStore();
  const existing = useEvent(id ?? '__none__');
  const editing = !!id;
  const days = useMemo(() => Array.from({ length: 30 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; }), []);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [place, setPlace] = useState('');
  const [emirate, setEmirate] = useState<Emirate>(state.profile?.emirate ?? 'dubai');
  const [language, setLanguage] = useState(lang);
  const [day, setDay] = useState(1);
  const [time, setTime] = useState(18 * 60);
  const [duration, setDuration] = useState(120);
  const [capacity, setCapacity] = useState('20');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Editing: start from the saved event.
  useEffect(() => {
    const e = existing.data;
    if (!editing || !e) return;
    setTitle(e.title); setBody(e.body); setPlace(e.place); setEmirate(e.emirate); setLanguage(e.language);
    const d0 = new Date(e.startsAt); d0.setHours(0, 0, 0, 0);
    setDay(Math.max(0, days.findIndex((d) => d.getTime() === d0.getTime())));
    setTime(e.startsAt.getHours() * 60 + e.startsAt.getMinutes());
    setDuration(Math.round((e.endsAt.getTime() - e.startsAt.getTime()) / 60000));
    setCapacity(String(e.capacity));
  }, [existing.data?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const back = () => (router.canGoBack() ? router.back() : router.replace('/events'));
  if (state.profile?.role !== 'volunteer') {
    return <Screen><IconButton icon={isRTL ? 'arrow-forward' : 'arrow-back'} label={t('common.back')} onPress={back} /><T>{t('events.guidesHost')}</T></Screen>;
  }
  if (editing && existing.data === undefined) return <Screen><Loading /></Screen>;

  const startsAt = atTime(days[day], time);
  const input: EventInput = {
    title, body, place, emirate, language, startsAt, endsAt: new Date(startsAt.getTime() + duration * 60000),
    capacity: Number.parseInt(capacity, 10) || 0,
  };

  const save = async () => {
    const problem = checkEvent(input);
    if (problem) return setErr(t(problem));
    setBusy(true);
    setErr(null);
    try {
      if (editing) { await editEvent(id!, input); router.back(); }
      else { const newId = await hostEvent(input, state.profile!.displayName); router.replace(`/events/${newId}`); }
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      setErr(code.startsWith('nextora/events.') || code.startsWith('nextora/authErr.') ? t(code.slice(8)) : t(`authErr.${connectErrorKey(e)}`));
    } finally { setBusy(false); }
  };

  const Picker = ({ title: label, children }: { title: string; children: React.ReactNode }) => (
    <View style={{ gap: space.xs }}>
      <T v="small" w="semibold">{label}</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>{children}</ScrollView>
    </View>
  );
  const hhmm = (m: number) => atTime(new Date(), m).toLocaleTimeString(shown, { hour: '2-digit', minute: '2-digit' });

  return (
    <Screen footer={<View style={{ gap: space.sm }}>
      {err ? <T v="small" color={colors.danger} center>{err}</T> : null}
      <Button label={editing ? t('common.save') : t('events.publish')} icon="checkmark" disabled={busy} onPress={save} />
    </View>}>
      <IconButton icon={isRTL ? 'arrow-forward' : 'arrow-back'} label={t('common.back')} onPress={back} />
      <T v="h1" w="bold" accessibilityRole="header">{editing ? t('events.editTitle') : t('events.host')}</T>
      <T v="small" color={colors.textMuted}>{t('events.hostRules')}</T>
      <Field label={t('events.fTitle')} value={title} onChangeText={setTitle} maxLength={100} />
      <Field label={t('events.fBody')} value={body} onChangeText={setBody} multiline maxLength={2000} style={{ minHeight: 110 }} />
      <Field label={t('events.fPlace')} hint={t('events.fPlaceHint')} value={place} onChangeText={setPlace} maxLength={160} />
      <Picker title={t('onb.emirate')}>
        {ALL_EMIRATES.map((e) => <Chip key={e} label={t(`emirates.${e}`)} selected={emirate === e} onPress={() => setEmirate(e)} />)}
      </Picker>
      <Picker title={t('events.fDay')}>
        {days.map((d, i) => <Chip key={i} label={d.toLocaleDateString(shown, { weekday: 'short', day: 'numeric', month: 'short' })} selected={day === i} onPress={() => setDay(i)} />)}
      </Picker>
      <Picker title={t('events.fTime')}>
        {TIMES.map((m) => <Chip key={m} label={hhmm(m)} selected={time === m} onPress={() => setTime(m)} />)}
      </Picker>
      <Picker title={t('events.fDuration')}>
        {DURATIONS.map((m) => <Chip key={m} label={t('events.minutes', { n: m })} selected={duration === m} onPress={() => setDuration(m)} />)}
      </Picker>
      <Picker title={t('events.fLanguage')}>
        {activeLanguages.map((l) => <Chip key={l.code} label={l.nativeName} selected={language === l.code} onPress={() => setLanguage(l.code)} />)}
      </Picker>
      <Field label={t('events.fCapacity')} hint={t('events.fCapacityHint')} value={capacity} onChangeText={(v) => setCapacity(v.replace(/[^0-9]/g, '').slice(0, 3))} keyboardType="number-pad" />
      <Row style={{ height: space.md }}>{null}</Row>
    </Screen>
  );
}
