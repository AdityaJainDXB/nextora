import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, radius, space, touch } from '../../../theme';
import { TranslationBar } from '../../components/TranslationBar';
import { Avatar, Button, Chip, Empty, Field, IconButton, Loading, Row, Sheet, T, Toast, useToast } from '../../components/ui';
import { fontFor } from '../../lib/fonts';
import { useLang } from '../../lib/lang';
import { useAuth } from '../../lib/auth';
import {
  block, connectErrorKey, reportUser, sendMessage, setReveal,
  useConnection, useMessages, usePublicProfiles, useRevealedContact,
} from '../../lib/connect';

const REASONS = ['harassment', 'scam', 'impersonation', 'childSafety', 'hate', 'other'] as const;

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { shown, isRTL } = useLang();
  const { user } = useAuth();
  const conn = useConnection(id);
  const c = conn.data;
  const me = user?.uid ?? '';
  const other = c?.members.find((m) => m !== me);
  const people = usePublicProfiles(other ? [other] : []);
  const name = (other && people[other]?.displayName) || '…';
  const connected = c?.status === 'connected';
  const msgs = useMessages(id, !!c && (connected || c.status === 'blocked'));
  // Wait for the mutual reveal write to reach Firestore before subscribing to
  // the other person's contact doc; rules evaluate the committed connection.
  const bothAgreed = !!c && !c.pending && connected && !!other && c.reveal?.[me] === true && c.reveal?.[other] === true;
  const theirContact = useRevealedContact(id, other, bothAgreed);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sheet, setSheet] = useState<'share' | 'report' | 'block' | null>(null);
  const [contact, setContact] = useState('');
  const [reason, setReason] = useState<(typeof REASONS)[number] | null>(null);
  const [note, setNote] = useState('');
  const [toast, showToast] = useToast();
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/chats'));
  const fail = (e: unknown) => showToast(t(`authErr.${connectErrorKey(e)}`));

  if (conn.error) return <SafeAreaView style={styles.root}><Empty icon="alert-circle-outline" text={t('common.error')} /></SafeAreaView>;
  if (conn.data === undefined) return <SafeAreaView style={styles.root}><Loading /></SafeAreaView>;
  if (!c || !other) return <SafeAreaView style={styles.root}><IconButton icon={isRTL ? 'arrow-forward' : 'arrow-back'} label={t('common.back')} onPress={back} /><Empty icon="chatbubbles-outline" text={t('chat.empty')} /></SafeAreaView>;

  const send = async () => {
    const v = text.trim();
    if (!v || !connected) return;
    setSending(true);
    try { await sendMessage(id, v); setText(''); } catch (e) { fail(e); } finally { setSending(false); }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right', 'bottom']}>
      <TranslationBar />
      <View style={styles.frame}>
        {/* Header: display name only. Never contact fields. */}
        <Row style={styles.header} gap={space.sm}>
          <IconButton icon={isRTL ? 'arrow-forward' : 'arrow-back'} label={t('common.back')} onPress={back} />
          <Avatar initials={name.slice(0, 1).toUpperCase()} size={36} hue={people[other]?.role === 'volunteer' ? 'clay' : 'ink'} />
          <T w="semibold" style={{ flex: 1 }} numberOfLines={1}>{name}</T>
          <IconButton icon="flag-outline" label={t('chat.report')} onPress={() => setSheet('report')} />
          <IconButton icon="ban-outline" label={t('chat.block')} onPress={() => setSheet('block')} color={colors.danger} />
        </Row>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView ref={scroll} contentContainerStyle={{ padding: space.md, gap: space.sm }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
            <Row gap={space.xs} style={{ alignSelf: 'center', alignItems: 'flex-start' }}>
              <Ionicons name="lock-closed-outline" size={14} color={colors.accentText} />
              <T v="tiny" color={colors.textMuted} style={{ flex: 1 }}>{t('chat.displayNames')}</T>
            </Row>
            <View style={[styles.bubble, c.from === me ? styles.mine : styles.theirs]}>
              <T v="tiny" w="semibold" color={c.from === me ? colors.textOnDark : colors.textMuted}>{t('chat.introLabel')}</T>
              <T color={c.from === me ? colors.textOnDark : colors.text}>{c.intro}</T>
            </View>
            {c.status === 'pending' ? <T v="small" center color={colors.textMuted}>{c.from === me ? t('chat.pending', { name }) : t('chat.incoming', { name })}</T> : null}
            {c.status === 'declined' || c.status === 'blocked' ? <T v="small" center color={colors.textMuted}>{t('chat.closed')}</T> : null}
            {(msgs.data ?? []).map((m) => (
              <View key={m.id} style={[styles.bubble, m.from === me ? styles.mine : styles.theirs]}>
                <T color={m.from === me ? colors.textOnDark : colors.text}>{m.text}</T>
              </View>
            ))}

            {connected ? (
              <View style={styles.share}>
                <Row gap={space.xs} style={{ alignItems: 'flex-start' }}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.accentText} />
                  <T v="small" style={{ flex: 1 }}>{t('chat.shareExplain')}</T>
                </Row>
                {bothAgreed ? (
                  <T v="small" w="semibold" color={colors.accentText}>{t('chat.sharedContact', { name })}: {theirContact.data ?? '…'}</T>
                ) : c.reveal?.[me] ? (
                  <T v="small" color={colors.textMuted}>{t('chat.shareWaiting', { name })}</T>
                ) : null}
                {c.reveal?.[me] ? (
                  <Button small kind="ghost" label={t('chat.shareWithdraw')} onPress={() => setReveal(id, false).catch(fail)} />
                ) : (
                  <Button small kind="secondary" icon="people-outline" label={t('chat.share')} onPress={() => setSheet('share')} />
                )}
              </View>
            ) : null}
          </ScrollView>

          <Row style={styles.composer} gap={space.sm}>
            <TextInput
              value={text}
              onChangeText={setText}
              editable={connected}
              placeholder={t('chat.placeholder')}
              placeholderTextColor={colors.textMuted}
              accessibilityLabel={t('chat.placeholder')}
              onSubmitEditing={send}
              returnKeyType="send"
              maxLength={1000}
              style={[styles.input, { fontFamily: fontFor(shown), textAlign: isRTL ? 'right' : 'left' }]}
            />
            <Pressable
              onPress={send}
              disabled={!text.trim() || !connected || sending}
              accessibilityRole="button"
              accessibilityLabel={t('chat.send')}
              aria-disabled={!text.trim() || !connected || sending}
              style={[styles.sendBtn, (!text.trim() || !connected || sending) && { backgroundColor: colors.disabled }]}
            >
              <Ionicons name="send" size={18} color={colors.textOnDark} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
            </Pressable>
          </Row>
        </KeyboardAvoidingView>
      </View>

      <Sheet visible={sheet === 'share'} onClose={() => setSheet(null)} title={t('chat.share')}>
        <View style={{ gap: space.md }}>
          <T color={colors.textMuted}>{t('chat.shareExplain')}</T>
          <Field label={t('chat.contactLabel')} placeholder={t('chat.contactPlaceholder')} value={contact} onChangeText={setContact} maxLength={200} />
          <Button label={t('chat.share')} icon="people-outline" disabled={!contact.trim()}
            onPress={() => setReveal(id, true, contact.trim()).then(() => setSheet(null)).catch(fail)} />
        </View>
      </Sheet>
      <Sheet visible={sheet === 'report'} onClose={() => setSheet(null)} title={t('chat.reportTitle', { name })}>
        <View style={{ gap: space.md }}>
          <T color={colors.textMuted}>{t('chat.reportBodyLive')}</T>
          <Row wrap>{REASONS.map((r) => <Chip key={r} label={t(`report.${r}`)} selected={reason === r} onPress={() => setReason(r)} />)}</Row>
          <Field label={t('chat.reportReason')} value={note} onChangeText={setNote} multiline maxLength={1000} style={{ minHeight: 88 }} />
          <Button label={t('chat.report')} icon="flag-outline" disabled={!reason}
            onPress={() => reportUser(other, reason!, note, id).then(() => { setSheet(null); setNote(''); setReason(null); showToast(t('chat.reportSaved')); }).catch(fail)} />
        </View>
      </Sheet>
      <Sheet visible={sheet === 'block'} onClose={() => setSheet(null)} title={t('chat.blockTitle', { name })}>
        <View style={{ gap: space.md }}>
          <T>{t('chat.blockBody')}</T>
          <Button label={t('chat.block')} icon="ban-outline" kind="danger"
            onPress={() => block(me, other).then(() => { setSheet(null); router.replace('/chats'); }).catch(fail)} />
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
  bubble: { maxWidth: '85%', padding: 12, borderRadius: radius.lg, gap: 4 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  share: { backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: space.md, gap: space.sm, marginTop: space.sm },
  composer: { padding: space.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  input: { flex: 1, minHeight: touch, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: space.md, backgroundColor: colors.surface, color: colors.text, fontSize: 16 },
  sendBtn: { width: touch, height: touch, borderRadius: touch / 2, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
