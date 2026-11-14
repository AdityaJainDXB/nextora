import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, space } from '../../../theme';
import { VerifyBanner } from '../../components/VerifyBanner';
import { Button, Card, Chip, DateBadge, Empty, IconButton, Loading, Row, T, Tag } from '../../components/ui';
import { Screen } from '../../components/layout';
import { useAuth } from '../../lib/auth';
import { fmtWhen, useEvents } from '../../lib/events';
import { useLang } from '../../lib/lang';
import { useStore } from '../../store/AppStore';
import { ALL_EMIRATES, type Emirate } from '../../store/types';

/** Meetups hosted by guides in the community. */
export default function Events() {
  const { t } = useTranslation();
  const { verified } = useAuth();
  const { isRTL, shown } = useLang();
  const { state } = useStore();
  const ev = useEvents();
  const [emirate, setEmirate] = useState<Emirate | null>(null);
  const isGuide = state.profile?.role === 'volunteer';
  const list = (ev.data ?? []).filter((e) => !emirate || e.emirate === emirate).filter((e) => state.settings.showSample || !e.isSample);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  return (
    <Screen>
      <IconButton icon={isRTL ? 'arrow-forward' : 'arrow-back'} label={t('common.back')} onPress={back} />
      <T v="h1" w="bold" accessibilityRole="header">{t('events.meetups')}</T>
      <T color={colors.textMuted}>{t('events.meetupsIntro')}</T>
      {!verified ? <><VerifyBanner /><Empty icon="mail-unread-outline" text={t('match.verifyFirst')} /></> : (
        <>
          {isGuide ? <Button icon="add-circle-outline" label={t('events.host')} onPress={() => router.push('/events/new')} />
            : <T v="small" color={colors.textMuted}>{t('events.guidesHost')}</T>}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            <Chip label={t('appv.allEmirates')} selected={!emirate} onPress={() => setEmirate(null)} />
            {ALL_EMIRATES.map((e) => <Chip key={e} label={t(`emirates.${e}`)} selected={emirate === e} onPress={() => setEmirate(emirate === e ? null : e)} />)}
          </ScrollView>
          {ev.error ? <Empty icon="alert-circle-outline" text={t('common.error')} />
            : !ev.data ? <Loading />
            : list.length === 0 ? <Empty icon="calendar-outline" text={t('events.none')} />
            : list.map((e) => (
              <Card key={e.id} onPress={() => router.push(`/events/${e.id}`)} a11y={`${e.title}, ${fmtWhen(e.startsAt, shown)}`}>
                <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
                  <DateBadge date={e.startsAt} lang={shown} />
                  <View style={{ flex: 1, gap: space.xs }}>
                    <Row wrap gap={space.xs}>
                      <Tag label={t(`emirates.${e.emirate}`)} tone="purple" />
                      {e.status === 'cancelled' ? <Tag label={t('events.cancelled')} tone="danger" /> : null}
                      {e.isSample ? <Tag label={t('forum.sampleBadge')} tone="warning" /> : null}
                    </Row>
                    <T w="semibold">{e.title}</T>
                    <T v="small" color={colors.textMuted}>{e.startsAt.toLocaleTimeString(shown, { hour: '2-digit', minute: '2-digit' })} · {e.place}</T>
                    <T v="small" color={colors.textMuted}>{t('events.hostedBy', { name: e.hostName })}</T>
                  </View>
                </Row>
              </Card>
            ))}
        </>
      )}
      <View style={{ height: space.md }} />
    </Screen>
  );
}
