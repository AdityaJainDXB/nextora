import React, { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, space } from '../../../theme';
import { VerifyBanner } from '../../components/VerifyBanner';
import { Avatar, Button, Card, Empty, Loading, Row, T, Tag, Toast, useToast } from '../../components/ui';
import { Screen } from '../../components/layout';
import { useAuth } from '../../lib/auth';
import { connectErrorKey, respondConnection, useConnections, usePublicProfiles } from '../../lib/connect';

export default function Chats() {
  const { t } = useTranslation();
  const { user, verified } = useAuth();
  const conns = useConnections();
  const [toast, showToast] = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const me = user?.uid ?? '';
  const list = (conns.data ?? []).filter((c) => c.status === 'pending' || c.status === 'connected');
  const people = usePublicProfiles(list.map((c) => c.members.find((m) => m !== me)!));

  const respond = async (id: string, accept: boolean) => {
    setBusy(id);
    try { await respondConnection(id, accept); if (accept) router.push(`/chat/${id}`); }
    catch (e) { showToast(t(`authErr.${connectErrorKey(e)}`)); }
    finally { setBusy(null); }
  };

  return (
    <Screen>
      <T v="h1" w="bold" accessibilityRole="header">{t('chat.title')}</T>
      <Row gap={space.xs} style={{ alignItems: 'flex-start' }}>
        <Ionicons name="lock-closed-outline" size={16} color={colors.accentText} />
        <T v="small" color={colors.textMuted} style={{ flex: 1 }}>{t('chat.displayNames')}</T>
      </Row>
      {!verified ? <><VerifyBanner /><Empty icon="mail-unread-outline" text={t('match.verifyFirst')} /></>
        : conns.error ? <Empty icon="alert-circle-outline" text={t('common.error')} />
        : !conns.data ? <Loading />
        : list.length === 0 ? <Empty icon="chatbubbles-outline" text={t('chat.empty')} action={<Button label={t('match.title')} onPress={() => router.push('/matches')} kind="secondary" />} />
        : list.map((c) => {
          const otherId = c.members.find((m) => m !== me)!;
          const p = people[otherId];
          const name = p?.displayName ?? '…';
          const incoming = c.status === 'pending' && c.to === me;
          return (
            <Card key={c.id} onPress={incoming ? undefined : () => router.push(`/chat/${c.id}`)} a11y={t('a11y.openChat', { name })}>
              <Row gap={space.md}>
                <Avatar initials={name.slice(0, 1).toUpperCase()} hue={p?.role === 'volunteer' ? 'clay' : 'ink'} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Row gap={space.xs} wrap>
                    <T w="semibold">{name}</T>
                    {c.status === 'connected' ? <Tag label={t('match.connected')} tone="clay" />
                      : incoming ? <Tag label={t('chat.newRequest')} tone="ink" /> : <Tag label={t('match.pending')} tone="warning" />}
                  </Row>
                  {incoming ? <T v="small" color={colors.textMuted}>{t('chat.incoming', { name })}</T> : null}
                </View>
              </Row>
              {incoming ? (
                <>
                  <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: space.md }}><T v="small">{c.intro}</T></View>
                  <Row gap={space.sm} wrap>
                    <Button small icon="checkmark" label={t('match.accept')} disabled={busy === c.id} onPress={() => respond(c.id, true)} style={{ flexGrow: 1 }} />
                    <Button small kind="secondary" label={t('chat.decline')} disabled={busy === c.id} onPress={() => respond(c.id, false)} style={{ flexGrow: 1 }} />
                  </Row>
                </>
              ) : null}
            </Card>
          );
        })}
      <Toast text={toast} />
    </Screen>
  );
}
