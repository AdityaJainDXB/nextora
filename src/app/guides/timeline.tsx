import React from 'react';
import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, space, touch } from '../../../theme';
import { Card, Row, T } from '../../components/ui';
import { Screen } from '../../components/layout';
import { GuideHeader } from '../../components/GuideScreens';
import { ContentBadges, GuideDisclaimer, SourceLine, StatusGate } from '../../components/ContentBadges';
import { TIMELINE_PHASES, useContent } from '../../lib/guides';
import { useApps } from '../../lib/content';
import { useStore } from '../../store/AppStore';

/** Read-only relocation timeline, filtered to the user's persona. */
export default function Timeline() {
  const { t } = useTranslation();
  const { state } = useStore();
  const persona = state.profile?.persona ?? null;
  const data = useContent('timeline');
  const apps = useApps();
  const items = data.items.filter((i) => !persona || !Array.isArray(i.persona) || i.persona.length === 0 || i.persona.includes(persona));
  return (
    <Screen>
      <GuideHeader title={t('timeline.title')} intro={persona ? t('timeline.forPersona') : t('timeline.allPersonas')} />
      <GuideDisclaimer />
      {data.status === 'ready' && items.length > 0
        ? TIMELINE_PHASES.map((ph) => {
          const list = items.filter((i) => i.phase === ph);
          if (!list.length) return null;
          return (
            <React.Fragment key={ph}>
              <T v="h2" w="bold" accessibilityRole="header" style={{ marginTop: space.sm }}>{t(`timeline.phase_${ph}`)}</T>
              {list.map((i) => (
                <Card key={i.id}>
                  <T w="semibold" lang="en">{i.title}</T>
                  <ContentBadges a={i} />
                  <T v="small" lang="en" color={colors.textMuted}>{i.body}</T>
                  <SourceLine source={i.source} />
                  {(i.appIds ?? []).map((id) => {
                    const app = apps.items.find((a) => a.id === id);
                    if (!app) return null; // only link apps that exist in the reviewed Appverse
                    return (
                      <Pressable key={id} onPress={() => router.push(`/app/${id}`)} accessibilityRole="link"
                        accessibilityLabel={t('timeline.openApp', { name: app.name })} style={{ minHeight: touch, justifyContent: 'center' }}>
                        <Row><T v="small" w="semibold" color={colors.primary}>{t('timeline.openApp', { name: app.name })}</T></Row>
                      </Pressable>
                    );
                  })}
                </Card>
              ))}
            </React.Fragment>
          );
        })
        : <StatusGate status={data.status} empty={items.length === 0} emptyText={t('timeline.empty')} onRetry={data.retry} />}
    </Screen>
  );
}
