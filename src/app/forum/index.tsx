import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, space } from '../../../theme';
import { VerifyBanner } from '../../components/VerifyBanner';
import { Button, Card, Chip, Empty, Field, IconButton, Loading, Row, Sheet, T, Tag } from '../../components/ui';
import { Screen, Segmented } from '../../components/layout';
import { useAuth } from '../../lib/auth';
import { useLang } from '../../lib/lang';
import { filterPosts, TOPICS, useIsMod, usePosts, type Sort, type Topic } from '../../lib/forum';
import { useStore } from '../../store/AppStore';
import { ALL_EMIRATES, type Emirate } from '../../store/types';

export default function ForumList() {
  const { t } = useTranslation();
  const { isRTL } = useLang();
  const { status, verified } = useAuth();
  const { state } = useStore();
  const isMod = useIsMod();
  const posts = usePosts();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [emirate, setEmirate] = useState<Emirate | null>(null);
  const [sort, setSort] = useState<Sort>('new');
  const [q, setQ] = useState('');
  const [filterSheet, setFilterSheet] = useState<'topic' | 'emirate' | null>(null);
  const showSample = state.settings.showSample;
  const list = useMemo(() => filterPosts(posts.data ?? [], { topic, emirate, q, sort, showSample }), [posts.data, topic, emirate, q, sort, showSample]);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  return (
    <Screen>
      <Row gap={space.sm}>
        <IconButton icon={isRTL ? 'arrow-forward' : 'arrow-back'} label={t('common.back')} onPress={back} />
        <T v="h1" w="bold" accessibilityRole="header" style={{ flex: 1 }}>{t('forum.title')}</T>
        {isMod ? <IconButton icon="shield-checkmark-outline" label={t('mod.title')} onPress={() => router.push('/moderation')} /> : null}
      </Row>
      <T v="small" color={colors.textMuted}>{t('forum.subtitle')}</T>
      {!verified && status === 'ready' ? <VerifyBanner /> : null}
      <Button label={t('forum.newPost')} icon="create-outline" disabled={!verified} onPress={() => router.push('/forum/new')}
        a11y={verified ? t('forum.newPost') : t('forum.verifyToPost')} />

      <Field label={t('forum.search')} placeholder={t('forum.searchPlaceholder')} value={q} onChangeText={setQ} returnKeyType="search" maxLength={120} />
      <Row wrap gap={space.sm}>
        <Button small kind="secondary" icon="chevron-down" label={`${t('forum.topic')}: ${topic ? t(`topic.${topic}`) : t('common.all')}`} onPress={() => setFilterSheet('topic')} />
        <Button small kind="secondary" icon="chevron-down" label={`${t('forum.emirate')}: ${emirate ? t(`emirates.${emirate}`) : t('common.all')}`} onPress={() => setFilterSheet('emirate')} />
      </Row>
      <Sheet visible={filterSheet !== null} onClose={() => setFilterSheet(null)} title={filterSheet === 'topic' ? t('forum.topic') : t('forum.emirate')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, paddingBottom: space.md }}>
          {filterSheet === 'topic' ? <>
            <Chip label={t('common.all')} selected={!topic} onPress={() => { setTopic(null); setFilterSheet(null); }} />
            {TOPICS.map((k) => <Chip key={k} label={t(`topic.${k}`)} selected={topic === k} onPress={() => { setTopic(topic === k ? null : k); setFilterSheet(null); }} />)}
          </> : <>
            <Chip label={t('common.all')} selected={!emirate} onPress={() => { setEmirate(null); setFilterSheet(null); }} />
            {ALL_EMIRATES.map((k) => <Chip key={k} label={t(`emirates.${k}`)} selected={emirate === k} onPress={() => { setEmirate(emirate === k ? null : k); setFilterSheet(null); }} />)}
          </>}
        </View>
      </Sheet>
      <Segmented label={t('forum.sort')} value={sort} onChange={setSort}
        options={[{ key: 'new', label: t('forum.sortNew') }, { key: 'helpful', label: t('forum.sortHelpful') }]} />

      <View style={{ gap: space.sm, marginTop: space.sm }}>
        {status !== 'ready' ? <Empty icon="person-circle-outline" text={t('forum.signInFirst')} />
          : posts.error ? <Empty icon="alert-circle-outline" text={t('forum.loadError')} />
          : !posts.data ? <Loading />
          : list.length === 0 ? (
            <Empty icon="chatbubbles-outline" text={q || topic || emirate ? t('forum.noMatches') : t('forum.empty')}
              action={verified ? <Button kind="secondary" label={t('forum.newPost')} onPress={() => router.push('/forum/new')} /> : undefined} />
          ) : list.map((p) => (
            <Card key={p.id} onPress={() => router.push(`/forum/${p.id}`)}
              a11y={`${p.title}. ${t(`topic.${p.topic}`)}, ${t(`emirates.${p.emirate}`)}. ${t('forum.upvotesCount', { count: p.upvotes })}`}>
              <Row wrap gap={space.xs}>
                <Tag label={t(`topic.${p.topic}`)} tone="ink" />
                <Tag label={t(`emirates.${p.emirate}`)} tone="clay" />
                {p.isSample ? <Tag label={t('forum.sampleBadge')} tone="warning" /> : null}
              </Row>
              <T w="semibold" lang={p.language} numberOfLines={2}>{p.title}</T>
              <Row gap={space.xs}>
                <T v="tiny" color={colors.textMuted} style={{ flex: 1 }} numberOfLines={1}>{p.displayName}</T>
                <Ionicons name="arrow-up-circle-outline" size={16} color={colors.textMuted} />
                <T v="tiny" color={colors.textMuted}>{p.upvotes}</T>
              </Row>
            </Card>
          ))}
      </View>
    </Screen>
  );
}
