import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, radius, space, touch } from '../../../theme';
import { TranslationBar } from '../../components/TranslationBar';
import { VerifyBanner } from '../../components/VerifyBanner';
import { Button, Chip, Empty, Field, IconButton, Loading, Row, Sheet, T, Tag, Toast, useToast } from '../../components/ui';
import { fontFor } from '../../lib/fonts';
import { useLang } from '../../lib/lang';
import { useAuth } from '../../lib/auth';
import { reportUser } from '../../lib/connect';
import {
  addReply, canEdit, deletePost, deleteReply, editPost, forumErrorKey, LIMITS, modDeletePost, modDeleteReply, setHidden,
  setSaved, setUpvote, useIsMod, useMyVote, usePost, useReplies, useSaved,
} from '../../lib/forum';
import { useStore } from '../../store/AppStore';

const REASONS = ['harassment', 'scam', 'impersonation', 'childSafety', 'hate', 'other'] as const;
type ReportTarget = { kind: 'post' | 'reply'; uid: string; id: string };

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { shown, isRTL } = useLang();
  const { user, verified } = useAuth();
  const { state } = useStore();
  const isMod = useIsMod() === true;
  const post = usePost(id);
  const p = post.data;
  const replies = useReplies(id, !!p);
  const voted = useMyVote(id).data === true;
  const saved = useSaved(id).data === true;
  const me = user?.uid ?? '';

  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<'report' | 'edit' | 'delete' | null>(null);
  const [target, setTarget] = useState<ReportTarget | null>(null);
  const [reason, setReason] = useState<(typeof REASONS)[number] | null>(null);
  const [note, setNote] = useState('');
  const [eTitle, setETitle] = useState('');
  const [eBody, setEBody] = useState('');
  const [toast, showToast] = useToast();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/forum'));
  const fail = (e: unknown) => showToast(t(forumErrorKey(e)));
  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try { await fn(); if (ok) showToast(ok); } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const bar = (
    <Row style={styles.header} gap={space.sm}>
      <IconButton icon={isRTL ? 'arrow-forward' : 'arrow-back'} label={t('common.back')} onPress={back} />
      <T w="semibold" style={{ flex: 1 }} numberOfLines={1}>{t('forum.title')}</T>
    </Row>
  );
  if (post.error) return <SafeAreaView style={styles.root}>{bar}<Empty icon="alert-circle-outline" text={t('forum.loadError')} /></SafeAreaView>;
  if (post.data === undefined) return <SafeAreaView style={styles.root}>{bar}<Loading /></SafeAreaView>;
  if (!p) return <SafeAreaView style={styles.root}>{bar}<Empty icon="document-outline" text={t('forum.notFound')} /></SafeAreaView>;

  const mine = p.authorUid === me;
  const editable = canEdit(p, me);
  const openReport = (tg: ReportTarget) => { setTarget(tg); setReason(null); setNote(''); setSheet('report'); };
  const send = () => {
    const v = text.trim();
    if (!v || !verified || p.deleted) return;
    void run(async () => { await addReply(id, state.profile?.displayName ?? '', v); setText(''); });
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right', 'bottom']}>
      <TranslationBar />
      <View style={styles.frame}>
        {bar}
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md }} keyboardShouldPersistTaps="handled">
            <Row wrap gap={space.xs}>
              <Tag label={t(`topic.${p.topic}`)} tone="purple" />
              <Tag label={t(`emirates.${p.emirate}`)} tone="teal" />
              {p.isSample ? <Tag label={t('forum.sampleBadge')} tone="warning" /> : null}
              {p.hidden ? <Tag label={t('forum.hiddenBadge')} tone="danger" /> : null}
            </Row>
            {p.deleted ? <T color={colors.textMuted}>{t('forum.deletedPost')}</T> : (
              <>
                <T v="h2" w="bold" accessibilityRole="header" lang={p.language}>{p.title}</T>
                <T v="tiny" color={colors.textMuted}>{p.displayName}{p.editedAt ? ` · ${t('forum.edited')}` : ''}</T>
                <T lang={p.language}>{p.body}</T>
              </>
            )}
            {p.isSample ? <T v="tiny" color={colors.textMuted}>{t('forum.sampleNote')}</T> : null}

            {!p.deleted ? (
              <Row wrap gap={space.xs}>
                <Chip icon="arrow-up-circle-outline" label={t('forum.upvote', { count: p.upvotes })} selected={voted}
                  disabled={!verified || busy} onPress={() => run(() => setUpvote(id, !voted))} />
                <Chip icon="bookmark-outline" label={saved ? t('forum.saved') : t('forum.save')} selected={saved}
                  onPress={() => run(() => setSaved(id, !saved))} />
                {!mine ? <Chip icon="flag-outline" label={t('forum.report')} onPress={() => openReport({ kind: 'post', uid: p.authorUid, id })} /> : null}
                {editable ? <Chip icon="create-outline" label={t('common.edit')} onPress={() => { setETitle(p.title); setEBody(p.body); setSheet('edit'); }} /> : null}
                {mine || isMod ? <Chip icon="trash-outline" label={t('forum.delete')} onPress={() => setSheet('delete')} /> : null}
                {isMod ? <Chip icon={p.hidden ? 'eye-outline' : 'eye-off-outline'} label={p.hidden ? t('mod.restore') : t('mod.hide')}
                  onPress={() => run(() => setHidden(id, !p.hidden), p.hidden ? t('mod.restored') : t('mod.hidden'))} /> : null}
              </Row>
            ) : null}

            <T w="semibold" accessibilityRole="header">{t('forum.replies')}</T>
            {replies.error ? <Empty icon="alert-circle-outline" text={t('forum.loadError')} />
              : !replies.data ? <Loading />
              : replies.data.length === 0 ? <T v="small" color={colors.textMuted}>{t('forum.noReplies')}</T>
              : replies.data.map((r) => (
                <View key={r.id} style={styles.reply}>
                  <Row gap={space.xs}>
                    <T v="tiny" w="semibold" color={colors.textMuted} style={{ flex: 1 }} numberOfLines={1}>{r.displayName}</T>
                    {r.isSample ? <Tag label={t('forum.sampleBadge')} tone="warning" /> : null}
                  </Row>
                  {r.deleted ? <T v="small" color={colors.textMuted}>{t('forum.deletedReply')}</T> : <T>{r.body}</T>}
                  {!r.deleted ? (
                    <Row gap={space.xs}>
                      {r.authorUid !== me ? <IconButton icon="flag-outline" label={t('forum.reportReply')} onPress={() => openReport({ kind: 'reply', uid: r.authorUid, id: r.id })} /> : null}
                      {r.authorUid === me || isMod ? <IconButton icon="trash-outline" label={t('forum.deleteReply')}
                        onPress={() => run(() => (r.authorUid === me ? deleteReply(id, r.id) : modDeleteReply(id, r.id)))} color={colors.danger} /> : null}
                    </Row>
                  ) : null}
                </View>
              ))}
            {!verified ? <VerifyBanner /> : null}
          </ScrollView>

          {!p.deleted ? (
            <Row style={styles.composer} gap={space.sm}>
              <TextInput
                value={text} onChangeText={setText} editable={verified}
                placeholder={verified ? t('forum.replyPlaceholder') : t('forum.verifyToPost')}
                placeholderTextColor={colors.textMuted} accessibilityLabel={t('forum.replyPlaceholder')}
                multiline maxLength={LIMITS.replyMax}
                style={[styles.input, { fontFamily: fontFor(shown), textAlign: isRTL ? 'right' : 'left' }]}
              />
              <Pressable onPress={send} disabled={!text.trim() || !verified || busy} accessibilityRole="button"
                accessibilityLabel={t('forum.sendReply')} accessibilityState={{ disabled: !text.trim() || !verified || busy }}
                style={[styles.sendBtn, (!text.trim() || !verified || busy) && { backgroundColor: colors.disabled }]}>
                <Ionicons name="send" size={18} color={colors.textOnDark} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
              </Pressable>
            </Row>
          ) : null}
        </KeyboardAvoidingView>
      </View>

      <Sheet visible={sheet === 'report'} onClose={() => setSheet(null)} title={target?.kind === 'reply' ? t('forum.reportReply') : t('forum.reportPost')}>
        <View style={{ gap: space.md }}>
          <T color={colors.textMuted}>{t('forum.reportBody')}</T>
          <Row wrap>{REASONS.map((r) => <Chip key={r} label={t(`report.${r}`)} selected={reason === r} onPress={() => setReason(r)} />)}</Row>
          <Field label={t('forum.reportNote')} value={note} onChangeText={setNote} multiline maxLength={1000} style={{ minHeight: 88 }} />
          <Button label={t('forum.report')} icon="flag-outline" disabled={!reason || !target || busy}
            onPress={() => run(async () => {
              await reportUser(target!.uid, reason!, note, target!.kind === 'post' ? id : `${id}/${target!.id}`, target!.kind);
              setSheet(null);
            }, t('forum.reportSaved'))} />
        </View>
      </Sheet>
      <Sheet visible={sheet === 'edit'} onClose={() => setSheet(null)} title={t('forum.editTitle')}>
        <View style={{ gap: space.md }}>
          <T v="small" color={colors.textMuted}>{t('forum.editWindow')}</T>
          <Field label={t('forum.postTitle')} value={eTitle} onChangeText={setETitle} maxLength={LIMITS.titleMax} />
          <Field label={t('forum.postBody')} value={eBody} onChangeText={setEBody} multiline maxLength={LIMITS.bodyMax} style={{ minHeight: 120 }} />
          <Button label={t('common.save')} disabled={busy} onPress={() => run(async () => { await editPost(p, eTitle, eBody); setSheet(null); })} />
        </View>
      </Sheet>
      <Sheet visible={sheet === 'delete'} onClose={() => setSheet(null)} title={t('forum.deleteTitle')}>
        <View style={{ gap: space.md }}>
          <T>{t('forum.deleteBody')}</T>
          <Button label={t('forum.delete')} icon="trash-outline" kind="danger" disabled={busy}
            onPress={() => run(async () => { await (mine ? deletePost(id) : modDeletePost(id)); setSheet(null); })} />
          <Button label={t('common.cancel')} kind="ghost" onPress={() => setSheet(null)} />
        </View>
      </Sheet>
      <Toast text={toast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  frame: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { paddingHorizontal: space.sm, borderBottomWidth: 1, borderBottomColor: colors.border, minHeight: 56 },
  reply: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space.md, gap: space.xs },
  composer: { padding: space.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg, alignItems: 'flex-end' },
  input: { flex: 1, minHeight: touch, maxHeight: 140, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: space.md, paddingVertical: 10, backgroundColor: colors.surface, color: colors.text, fontSize: 16 },
  sendBtn: { width: touch, height: touch, borderRadius: touch / 2, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
