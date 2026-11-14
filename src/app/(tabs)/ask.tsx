import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, radius, space, touch } from '../../../theme';
import { AssistantCard } from '../../components/assistant/AssistantCard';
import { ReadAloud } from '../../components/ReadAloud';
import { Button, Row, T, Tag } from '../../components/ui';
import { Screen } from '../../components/layout';
import { askNextora, type AskResult, type Source } from '../../lib/assistant';
import { appEnv } from '../../lib/firebase';
import { fontFor } from '../../lib/fonts';
import { CONSENT_VERSION } from '../../lib/flags';
import { useLang } from '../../lib/lang';
import { useVoiceInput } from '../../lib/voice/useVoiceInput';
import { voiceAvailability } from '../../lib/voice/availability';
import { vt } from '../../lib/voice/strings';
import type { VoiceError, VoicePhase } from '../../lib/voice/types';
import { useStore } from '../../store/AppStore';

type Msg =
  | { id: number; from: 'me'; text: string; spoken: boolean }
  | { id: number; from: 'agent'; result: AskResult; question: string };

let nextId = 1;

/** "Ask NEXTORA": talk or type. Kept in memory for this session only. */
export default function Ask() {
  const { t } = useTranslation();
  const { lang, shown, isRTL } = useLang();
  const { state, update } = useStore();
  const voice = useVoiceInput();
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [runKey, setRunKey] = useState(0);
  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>(() => appEnv === 'demo' ? [
    { id: nextId++, from: 'me', text: 'What should I arrange during my first week in Dubai?', spoken: false },
    { id: nextId++, from: 'agent', question: 'What should I arrange during my first week in Dubai?', result: {
      status: 'answer', text: 'Demo reply: start with a neighbourhood orientation, review your housing paperwork, and check official sources for current visa and service requirements. This sample is for demonstration only.',
      sources: [{ id: 'demo-guide', title: 'Demo newcomer guide', type: 'demo' }],
    } },
    { id: nextId++, from: 'me', text: 'Are there community meetups?', spoken: false },
    { id: nextId++, from: 'agent', question: 'Are there community meetups?', result: {
      status: 'answer', text: 'Demo reply: open Events to browse sample meetups, then check each organizer and venue before making plans. Demo events are fictional.',
      sources: [{ id: 'demo-events', title: 'Demo events', type: 'demo' }],
    } },
  ] : []);
  const [hint, setHint] = useState<string | null>(null);
  // Voice problems shown with a "type instead" (and consent) action.
  const [voiceMsg, setVoiceMsg] = useState<{ text: string; consent?: boolean } | null>(null);
  // True when the text in the box came from voice typing (shows the AI label).
  const [fromVoice, setFromVoice] = useState(false);
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const wasListening = useRef(false);

  const consented = state.consents.aiAssistant?.granted === true && state.consents.aiAssistant.version === CONSENT_VERSION;

  const send = async (q: string, spoken: boolean) => {
    const question = q.trim();
    if (!question) { setPhase('idle'); return; }
    setMsgs((m) => [...m, { id: nextId++, from: 'me', text: question, spoken }]);
    setPhase('thinking');
    const result = await askNextora(question, lang, consented);
    setMsgs((m) => [...m, { id: nextId++, from: 'agent', result, question }]);
    setPhase('idle');
  };

  const availability = voiceAvailability(state);

  // Voice typing never sends: the words go into the editable box for the person to check.
  const fill = (heard: string) => {
    setPhase('idle');
    const q = heard.trim();
    if (!q) return;
    setText((cur) => (cur.trim() ? `${cur.trim()} ${q}` : q).slice(0, 500));
    setFromVoice(true);
    setHint(vt('voice.checkAndSend', lang));
    input.current?.focus();
  };

  // Recognition (web) or the 30 s limit (native) ended the turn on its own.
  useEffect(() => {
    if (wasListening.current && !voice.listening && phase === 'listening') {
      if (voice.transcribing) setPhase('thinking');
      else fill(voice.words.join(' '));
    }
    wasListening.current = voice.listening;
  }, [voice.listening]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopping = useRef(false);
  // Native auto-stop: transcription finished after the recorder stopped by itself.
  const wasTranscribing = useRef(false);
  useEffect(() => {
    if (wasTranscribing.current && !voice.transcribing && phase === 'thinking' && !stopping.current) fill(voice.words.join(' '));
    wasTranscribing.current = voice.transcribing;
  }, [voice.transcribing]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map: Partial<Record<NonNullable<VoiceError>, string>> = {
      denied: vt('voice.micDenied', lang), failed: vt('voice.failed', lang), tooLong: vt('voice.tooLong', lang),
      noText: vt('voice.noText', lang), unavailable: vt('voice.notAvailable', lang),
    };
    if (voice.error) { setVoiceMsg({ text: map[voice.error] ?? vt('voice.failed', lang) }); setHint(null); setPhase('idle'); }
  }, [voice.error, lang]);

  const typeInstead = () => { setVoiceMsg(null); setHint(null); input.current?.focus(); };

  const onMic = async () => {
    if (!voice.supported || availability === 'notAvailable') {
      setVoiceMsg({ text: voice.supported ? vt('voice.notAvailable', lang) : t('assistant.voiceUnsupported') });
      input.current?.focus();
      return;
    }
    if (availability === 'needConsent') { setVoiceMsg({ text: vt('voice.needConsent', lang), consent: true }); return; }
    if (phase === 'listening') {
      // Leave "listening" first so the auto-end effect doesn't handle the same words twice.
      setPhase('thinking');
      stopping.current = true;
      const heard = await voice.stop();
      stopping.current = false;
      fill(heard);
      return;
    }
    if (phase === 'thinking') return;
    setHint(null);
    setVoiceMsg(null);
    setRunKey((k) => k + 1);
    setPhase('listening');
    voice.start(lang);
  };

  const caption =
    hint ??
    (phase === 'listening'
      ? (Platform.OS !== 'web' ? vt('voice.recording', lang) : t('assistant.listening'))
      : phase === 'thinking'
        ? (voice.transcribing ? vt('voice.transcribing', lang) : t('assistant.thinking'))
        : t('assistant.tapToSpeak'));

  const submit = () => { send(text, fromVoice); setText(''); setFromVoice(false); setHint(null); };

  const report = (m: Extract<Msg, { from: 'agent' }>, kind: 'notHelpful' | 'error') => {
    // Stage 10 sends these to the aiErrorReports queue; until then they stay on this device.
    update((s) => ({ ...s, reports: [...s.reports, { kind: 'assistant', target: kind, note: m.question, lang, at: Date.now() }] }));
  };

  return (
    <Screen
      footer={
        <Row gap={space.sm}>
          <TextInput
            ref={input}
            value={text}
            onChangeText={(v) => { setText(v); if (!v) setFromVoice(false); }}
            placeholder={t('assistant.placeholder')}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={t('assistant.placeholder')}
            onSubmitEditing={submit}
            returnKeyType="send"
            maxLength={500}
            style={[styles.input, { fontFamily: fontFor(shown), textAlign: isRTL ? 'right' : 'left' }]}
          />
          <Pressable
            onPress={submit}
            disabled={!text.trim() || phase === 'thinking'}
            accessibilityRole="button"
            accessibilityLabel={t('assistant.send')}
            style={[styles.sendBtn, (!text.trim() || phase === 'thinking') && { backgroundColor: colors.disabled }]}
          >
            <Ionicons name="arrow-up" size={20} color={colors.textOnDark} />
          </Pressable>
        </Row>
      }
    >
      <T v="h1" w="bold" accessibilityRole="header">{t('assistant.title')}</T>
      <AssistantCard
        phase={phase}
        words={voice.words}
        runKey={runKey}
        caption={caption}
        greeting={t('assistant.greeting')}
        name="NEXTORA"
        meta={t('assistant.meta')}
        micLabel={phase === 'listening' ? t('assistant.micStop') : t('assistant.micStart')}
        onMic={onMic}
        stream={voice.stream}
        level={voice.level}
        lang={shown}
        rtl={isRTL}
      />
      {fromVoice && text ? (
        <Tag label={vt('voice.typingLabel', lang)} tone="warning" />
      ) : null}
      {voiceMsg ? (
        <View style={[styles.bubble, styles.theirs, { maxWidth: '100%' }]} accessibilityLiveRegion="polite">
          <T>{voiceMsg.text}</T>
          <Row wrap gap={space.sm}>
            {voiceMsg.consent ? (
              <Button small kind="secondary" icon="options-outline" label={vt('voice.openConsent', lang)} onPress={() => router.push('/consent')} />
            ) : null}
            <Button small kind="ghost" icon="create-outline" label={vt('voice.typeInstead', lang)} onPress={typeInstead} />
          </Row>
        </View>
      ) : null}
      {Platform.OS !== 'web' && availability === 'ok' && phase === 'idle' && !voiceMsg ? (
        <T v="tiny" color={colors.textMuted}>{vt('voice.micReason', lang)}</T>
      ) : null}
      <Row gap={space.xs} style={{ alignItems: 'flex-start' }}>
        <Ionicons name="lock-closed-outline" size={14} color={colors.accentText} style={{ marginTop: 3 }} />
        <T v="tiny" color={colors.textMuted} style={{ flex: 1 }}>{t('assistant.privacyNote')}</T>
      </Row>

      <View style={{ gap: space.sm }} accessibilityLiveRegion="polite">
        {msgs.map((m) =>
          m.from === 'me' ? (
            <View key={m.id} style={[styles.bubble, styles.mine]}>
              {m.spoken ? <Ionicons name="mic-outline" size={14} color={colors.textOnDark} /> : null}
              <T color={colors.textOnDark}>{m.text}</T>
            </View>
          ) : (
            <AgentReply key={m.id} result={m.result} lang={lang} onReport={(k) => report(m, k)} />
          ),
        )}
      </View>
    </Screen>
  );
}

function AgentReply({ result, lang, onReport }: { result: AskResult; lang: string; onReport: (k: 'notHelpful' | 'error') => void }) {
  const { t } = useTranslation();
  const [done, setDone] = useState(false);
  if (result.status !== 'answer') {
    // Never a made-up answer: say why there's none and offer the manual route.
    const body = {
      unavailable: t('assistant.unavailable'),
      backendNotConfigured: t('auth.notSetUp'),
      noConsent: t('assistant.noConsent'),
      rateLimited: t('assistant.rateLimited'),
      error: t('assistant.error'),
    }[result.status];
    return (
      <View style={[styles.bubble, styles.theirs]}>
        <T>{body}</T>
        <Row wrap gap={space.sm}>
          {result.status === 'noConsent' ? (
            <Button small kind="secondary" icon="options-outline" label={t('consent.title')} onPress={() => router.push('/consent')} />
          ) : null}
          <Button small kind="ghost" icon="search-outline" label={t('assistant.manual')} onPress={() => router.push('/appverse')} />
        </Row>
      </View>
    );
  }
  return (
    <View style={[styles.bubble, styles.theirs]}>
      <Row gap={space.sm} style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Tag label={t('assistant.aiLabel')} tone="warning" />
        <ReadAloud text={result.text} lang={lang} />
      </Row>
      <T>{result.text}</T>
      {result.sources.length ? (
        <T v="small" color={colors.textMuted}>{t('assistant.sources')} {result.sources.map((s: Source) => s.title).join(', ')}</T>
      ) : null}
      {done ? (
        <T v="small" color={colors.accentText}>{t('assistant.reported')}</T>
      ) : (
        <Row wrap gap={space.sm}>
          <Button small kind="ghost" icon="thumbs-down-outline" label={t('assistant.notHelpful')} onPress={() => { onReport('notHelpful'); setDone(true); }} />
          <Button small kind="ghost" icon="flag-outline" label={t('assistant.reportError')} onPress={() => { onReport('error'); setDone(true); }} />
          <Button small kind="ghost" icon="search-outline" label={t('assistant.manual')} onPress={() => router.push('/appverse')} />
        </Row>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '88%', padding: 12, borderRadius: radius.lg, gap: space.xs },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 6 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  input: {
    flex: 1, minHeight: touch, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill,
    paddingHorizontal: space.md, backgroundColor: colors.surface, color: colors.text, fontSize: 16,
  },
  sendBtn: { width: touch, height: touch, borderRadius: touch / 2, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
