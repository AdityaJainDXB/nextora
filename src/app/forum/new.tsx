import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { colors, radius, space } from '../../../theme';
import { VerifyBanner } from '../../components/VerifyBanner';
import { Button, Chip, Empty, Field, IconButton, Row, T, Toast, useToast } from '../../components/ui';
import { Screen } from '../../components/layout';
import { useAuth } from '../../lib/auth';
import { useLang } from '../../lib/lang';
import { createPost, forumErrorKey, LIMITS, SCAM_TOPICS, TOPICS, type Topic } from '../../lib/forum';
import { useStore } from '../../store/AppStore';
import { ALL_EMIRATES, type Emirate } from '../../store/types';

const RULES_KEY = 'nextora:forumRulesSeen';
const RULES = ['rule1', 'rule2', 'rule3', 'rule4', 'rule5'] as const;

export default function NewPost() {
  const { t } = useTranslation();
  const { lang, isRTL } = useLang();
  const { verified, status } = useAuth();
  const { state } = useStore();
  const params = useLocalSearchParams<{ topic?: string }>();
  const [rulesOk, setRulesOk] = useState<boolean | null>(null);
  const [topic, setTopic] = useState<Topic | null>(TOPICS.includes(params.topic as Topic) ? (params.topic as Topic) : null);
  const [emirate, setEmirate] = useState<Emirate | null>(state.profile?.emirate ?? null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, showToast] = useToast();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/forum'));

  React.useEffect(() => {
    AsyncStorage.getItem(RULES_KEY).then((v) => setRulesOk(v === '1')).catch(() => setRulesOk(false));
  }, []);
  const acceptRules = () => { setRulesOk(true); AsyncStorage.setItem(RULES_KEY, '1').catch(() => {}); };

  const tt = title.trim();
  const ready = !!topic && !!emirate && tt.length >= LIMITS.titleMin && tt.length <= LIMITS.titleMax && body.trim().length >= 1 && !busy;
  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      const { id } = await createPost({ displayName: state.profile?.displayName ?? '', topic: topic!, emirate: emirate!, language: lang, title, body });
      router.replace(`/forum/${id}`);
    } catch (e) { showToast(t(forumErrorKey(e))); } finally { setBusy(false); }
  };

  const header = (
    <Row gap={space.sm}>
      <IconButton icon={isRTL ? 'arrow-forward' : 'arrow-back'} label={t('common.back')} onPress={back} />
      <T v="h2" w="bold" accessibilityRole="header" style={{ flex: 1 }}>{t('forum.newPost')}</T>
    </Row>
  );

  if (status !== 'ready') return <Screen>{header}<Empty icon="person-circle-outline" text={t('forum.signInFirst')} /></Screen>;
  if (!verified) return <Screen>{header}<VerifyBanner /><Empty icon="mail-unread-outline" text={t('forum.verifyToPost')} /></Screen>;
  if (rulesOk === null) return <Screen>{header}</Screen>;
  if (!rulesOk) {
    return (
      <Screen>
        {header}
        <T v="h2" w="semibold" accessibilityRole="header">{t('forum.rulesTitle')}</T>
        <View style={{ gap: space.sm }}>
          {RULES.map((r) => (
            <Row key={r} gap={space.sm} style={{ alignItems: 'flex-start' }}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.accentText} />
              <T style={{ flex: 1 }}>{t(`forum.${r}`)}</T>
            </Row>
          ))}
        </View>
        <Button label={t('forum.rulesAgree')} onPress={acceptRules} />
      </Screen>
    );
  }

  return (
    <Screen footer={<Button label={busy ? t('common.loading') : t('forum.publish')} icon="send" disabled={!ready} onPress={submit} />}>
      {header}
      <T v="small" w="semibold">{t('forum.topic')}</T>
      <Row wrap gap={space.xs}>
        {TOPICS.map((k) => <Chip key={k} label={t(`topic.${k}`)} selected={topic === k} onPress={() => setTopic(k)} />)}
      </Row>
      {topic && SCAM_TOPICS.includes(topic) ? (
        <View style={{ backgroundColor: colors.warningSoft, borderRadius: radius.md, padding: space.md, gap: space.xs }} accessibilityRole="alert">
          <Row gap={space.xs}>
            <Ionicons name="warning-outline" size={18} color={colors.warning} />
            <T w="semibold" color={colors.warning} style={{ flex: 1 }}>{t('forum.scamTitle')}</T>
          </Row>
          <T v="small">{t('forum.scamBody')}</T>
        </View>
      ) : null}
      <T v="small" w="semibold">{t('forum.emirate')}</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.xs }}>
        {ALL_EMIRATES.map((k) => <Chip key={k} label={t(`emirates.${k}`)} selected={emirate === k} onPress={() => setEmirate(k)} />)}
      </ScrollView>
      <Field label={t('forum.postTitle')} hint={t('forum.titleHint', { min: LIMITS.titleMin, max: LIMITS.titleMax })}
        value={title} onChangeText={setTitle} maxLength={LIMITS.titleMax} />
      <Field label={t('forum.postBody')} hint={t('forum.bodyHint')} value={body} onChangeText={setBody}
        multiline maxLength={LIMITS.bodyMax} style={{ minHeight: 160, textAlignVertical: 'top' }} />
      <T v="tiny" color={colors.textMuted}>{t('forum.noContactNote')}</T>
      <Toast text={toast} />
    </Screen>
  );
}
