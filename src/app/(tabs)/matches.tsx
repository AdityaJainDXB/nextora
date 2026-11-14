import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, radius, space, touch } from '../../../theme';
import { activeLanguages } from '../../../locales/meta';
import { PersonHeader, reasonText } from '../../components/PersonCard';
import { VerifyBanner } from '../../components/VerifyBanner';
import { Button, Card, Chip, Empty, Field, Loading, Row, Sheet, T, Tag, Toast, useToast } from '../../components/ui';
import { Screen, Segmented } from '../../components/layout';
import { useAuth } from '../../lib/auth';
import {
  connectErrorKey, requestConnection, searchDirectory, setDecision,
  useBlocks, useConnections, useDecisions, useMatchCandidates, usePublicProfiles, type Match,
} from '../../lib/connect';
import { saveSettings } from '../../lib/account';
import { useStore } from '../../store/AppStore';
import { ALL_EMIRATES, ALL_INTERESTS, type Decision, type Emirate, type Interest, type PublicProfile } from '../../store/types';

type Person = PublicProfile & { uid: string };
const labelTone = { strong: 'teal', possible: 'purple', weak: 'muted' } as const;

export default function Matches() {
  const { t } = useTranslation();
  const { verified } = useAuth();
  const [mode, setMode] = useState<'ai' | 'dir'>('ai');
  const [whyOpen, setWhyOpen] = useState(false);
  const [intro, setIntro] = useState<Person | null>(null);
  const [toast, showToast] = useToast();

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="h1" w="bold" accessibilityRole="header" style={{ flex: 1 }}>{t('match.title')}</T>
        <Pressable onPress={() => setWhyOpen(true)} accessibilityRole="button" accessibilityLabel={t('match.whySeeing')} style={styles.whyBtn}>
          <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
          <T v="small" w="semibold" color={colors.primary}>{t('match.whySeeing')}</T>
        </Pressable>
      </Row>
      {!verified ? (
        <>
          <VerifyBanner />
          <Empty icon="mail-unread-outline" text={t('match.verifyFirst')} />
        </>
      ) : (
        <>
          <Segmented
            label={t('match.title')}
            options={[{ key: 'ai', label: t('match.ai') }, { key: 'dir', label: t('match.directory') }]}
            value={mode}
            onChange={setMode}
          />
          {mode === 'ai' ? <Suggestions onAccept={setIntro} toast={showToast} onDirectory={() => setMode('dir')} /> : <Directory onConnect={setIntro} />}
        </>
      )}

      <Sheet visible={whyOpen} onClose={() => setWhyOpen(false)} title={t('match.whyTitle')}>
        <View style={{ gap: space.md }}>
          <T>{t('match.whyBodyLive')}</T>
          <T>{t('match.whyBody2')}</T>
          <T v="small" color={colors.textMuted}>{t('match.canBeWrong')}</T>
        </View>
      </Sheet>
      <IntroSheet profile={intro} onClose={() => setIntro(null)} onSent={() => { setIntro(null); showToast(t('match.requestSent')); }} />
      <Toast text={toast} />
    </Screen>
  );
}

function Suggestions({ onAccept, toast, onDirectory }: { onAccept: (p: Person) => void; toast: (s: string) => void; onDirectory: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { state, update } = useStore();
  const blocks = useBlocks();
  const matchingOn = state.settings.matchingOn;
  const cands = useMatchCandidates(state.profile, blocks.data, matchingOn);
  const decisions = useDecisions();
  const conns = useConnections();
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const busy = false;
  const items = cands.data ?? [];
  const profiles = usePublicProfiles(items.map((m) => m.uid));
  const connected = new Set((conns.data ?? []).flatMap((c) => c.members));
  const dec = decisions.data ?? {};
  const open = items.filter((m) => !dec[m.uid] && !connected.has(m.uid) && profiles[m.uid]);
  const hidden = items.filter((m) => (dec[m.uid] === 'rejected' || dec[m.uid] === 'ignored') && profiles[m.uid]);

  const decide = (uid: string, d: Decision | null) => {
    if (user) setDecision(user.uid, uid, d).catch(() => toast(t('common.error')));
  };

  // Matching can be switched off entirely; the directory keeps working without it.
  if (!matchingOn) {
    return (
      <Empty icon="toggle-outline" text={t('match.off')} action={
        <Row wrap gap={space.sm}>
          <Button kind="secondary" label={t('match.turnOn')} onPress={() => {
            update((x) => ({ ...x, settings: { ...x.settings, matchingOn: true } }));
            if (user) saveSettings(user.uid, { matchingOn: true }).catch(() => {});
          }} />
          <Button kind="ghost" label={t('match.directory')} onPress={onDirectory} />
        </Row>
      } />
    );
  }
  if (cands.error) return <Empty icon="alert-circle-outline" text={t('common.error')} action={<Button kind="secondary" label={t('common.retry')} onPress={cands.regenerate} />} />;
  if (!cands.data) return <Loading />;

  return (
    <>
      <Row gap={space.xs} style={{ alignItems: 'flex-start' }}>
        <Ionicons name="people-outline" size={16} color={colors.accentText} />
        <T v="small" color={colors.textMuted} style={{ flex: 1 }}>{t('match.canBeWrong')}</T>
      </Row>
      <Row wrap gap={space.sm}>
        <Button small kind="secondary" icon="refresh" label={t('match.regenerate')} disabled={busy}
          onPress={() => { cands.regenerate(); toast(t('match.regenerated')); }} />
        <Button small kind="ghost" icon="eye-outline" label={t('match.reviewHidden', { n: hidden.length })} onPress={() => setHiddenOpen(true)} />
      </Row>

      {open.length === 0 ? (
        <Empty icon="people-outline" text={t('match.emptyLive')} action={<Button label={t('match.directory')} onPress={onDirectory} kind="secondary" />} />
      ) : (
        open.slice(0, 20).map((m) => <MatchCard key={m.uid} m={m} p={profiles[m.uid]} onAccept={onAccept} onDecide={decide} />)
      )}

      <Sheet visible={hiddenOpen} onClose={() => setHiddenOpen(false)} title={t('match.hiddenTitle')}>
        <View style={{ gap: space.sm }}>
          {hidden.length === 0 ? <T color={colors.textMuted}>{t('match.hiddenEmpty')}</T> : null}
          {hidden.map((m) => (
            <Card key={m.uid}>
              <PersonHeader p={profiles[m.uid]} right={<Tag label={dec[m.uid] === 'rejected' ? t('match.rejected') : t('match.ignored')} />} />
              <Button small kind="secondary" icon="arrow-undo-outline" label={t('match.undo')} onPress={() => decide(m.uid, null)} />
            </Card>
          ))}
        </View>
      </Sheet>
    </>
  );
}

function MatchCard({ m, p, onAccept, onDecide }: { m: Match; p: Person; onAccept: (p: Person) => void; onDecide: (uid: string, d: Decision) => void }) {
  const { t } = useTranslation();
  return (
    <Card>
      <PersonHeader p={p} right={<Tag label={t(`match.${m.label}`)} tone={labelTone[m.label]} />} />
      <View style={styles.why}>
        <T v="small" w="semibold">{t('match.why')}</T>
        {m.reasons.length ? m.reasons.map((r, i) => (
          <Row key={i} gap={space.xs} style={{ alignItems: 'flex-start' }}>
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.accentText} style={{ marginTop: 3 }} />
            <T v="small" style={{ flex: 1 }}>{reasonText(t, r)}</T>
          </Row>
        )) : <T v="small" color={colors.textMuted}>{t('match.rNone')}</T>}
      </View>
      <T v="tiny" w="semibold" color={colors.textMuted}>{t('match.disclaimer')}</T>
      {/* Wraps so long labels never overflow. */}
      <View style={{ gap: space.sm }}>
        <Button label={t('match.accept')} icon="checkmark" onPress={() => onAccept(p)} />
        <Row gap={space.sm}>
          <Button label={t('match.reject')} kind="secondary" onPress={() => onDecide(m.uid, 'rejected')} style={{ flex: 1 }} />
          <Button label={t('match.ignore')} kind="ghost" onPress={() => onDecide(m.uid, 'ignored')} style={{ flex: 1 }} />
        </Row>
      </View>
    </Card>
  );
}

function IntroSheet({ profile, onClose, onSent }: { profile: Person | null; onClose: () => void; onSent: () => void }) {
  const { t } = useTranslation();
  const { state } = useStore();
  const def = state.profile?.role === 'volunteer' ? t('match.introDefaultGuide') : t('match.introDefault');
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (profile) { setText(def); setErr(null); } }, [profile, def]);
  return (
    <Sheet visible={!!profile} onClose={onClose} title={t('match.introTitle')}>
      {profile ? (
        <View style={{ gap: space.md }}>
          <PersonHeader p={profile} />
          <Field label={t('chat.placeholder')} value={text} onChangeText={setText} multiline maxLength={500} style={{ minHeight: 88 }} />
          <T v="small" color={colors.textMuted}>{t('match.introHint')}</T>
          {err ? <T v="small" color={colors.danger}>{err}</T> : null}
          <Button label={t('match.send')} icon="send" disabled={busy || !text.trim()}
            onPress={async () => {
              setBusy(true);
              try { await requestConnection(profile.uid, text.trim()); onSent(); } catch (e) { setErr(t(`authErr.${connectErrorKey(e)}`)); } finally { setBusy(false); }
            }} />
        </View>
      ) : null}
    </Sheet>
  );
}

/** Manual directory. Plain filters, no AI. */
function Directory({ onConnect }: { onConnect: (p: Person) => void }) {
  const { t } = useTranslation();
  const conns = useConnections();
  const blocks = useBlocks();
  const [q, setQ] = useState('');
  const [emirate, setEmirate] = useState<Emirate | null>(null);
  const [role, setRole] = useState<'newcomer' | 'volunteer' | null>(null);
  const [interest, setInterest] = useState<Interest | null>(null);
  const [lang, setLang] = useState<string | null>(null);
  const [res, setRes] = useState<{ items?: Person[]; error?: string }>({});

  useEffect(() => {
    let alive = true;
    setRes({});
    const timer = setTimeout(() => {
      if (!blocks.data) return;
      searchDirectory({ q: q || undefined, emirate: emirate ?? undefined, role: role ?? undefined, interest: interest ?? undefined, language: lang ?? undefined }, blocks.data)
        .then((r) => { if (alive) setRes({ items: r.items }); })
        .catch((e) => { if (alive) setRes({ error: connectErrorKey(e) }); });
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [q, emirate, role, interest, lang, blocks.data]);

  const connFor = (uid: string) => (conns.data ?? []).find((c) => c.members.includes(uid));
  const FilterRow = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={{ gap: space.xs }}>
      <T v="small" w="semibold">{title}</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>{children}</ScrollView>
    </View>
  );

  return (
    <View style={{ gap: space.md }}>
      <Field label={t('common.search')} placeholder={t('match.searchPlaceholder')} value={q} onChangeText={setQ} />
      <FilterRow title={t('match.filterRole')}>
        {(['volunteer', 'newcomer'] as const).map((r) => (
          <Chip key={r} label={r === 'volunteer' ? t('match.guide') : t('match.newcomer')} selected={role === r} onPress={() => setRole(role === r ? null : r)} />
        ))}
      </FilterRow>
      <FilterRow title={t('match.filterEmirate')}>
        {ALL_EMIRATES.map((e) => <Chip key={e} label={t(`emirates.${e}`)} selected={emirate === e} onPress={() => setEmirate(emirate === e ? null : e)} />)}
      </FilterRow>
      <FilterRow title={t('match.filterLanguage')}>
        {activeLanguages.map((l) => <Chip key={l.code} label={l.nativeName} selected={lang === l.code} onPress={() => setLang(lang === l.code ? null : l.code)} />)}
      </FilterRow>
      <FilterRow title={t('match.filterInterest')}>
        {ALL_INTERESTS.map((i) => <Chip key={i} label={t(`interests.${i}`)} selected={interest === i} onPress={() => setInterest(interest === i ? null : i)} />)}
      </FilterRow>
      {res.error ? <Empty icon="alert-circle-outline" text={t(`authErr.${res.error}`)} /> : !res.items ? <Loading /> : res.items.length === 0 ? (
        <Empty icon="search-outline" text={t('match.dirEmptyLive')} />
      ) : res.items.map((p) => {
        const c = connFor(p.uid);
        return (
          <Card key={p.uid}>
            <PersonHeader p={p} />
            {p.interests?.length ? <Row wrap gap={space.xs}>{p.interests.map((i) => <Tag key={i} label={t(`interests.${i}`)} />)}</Row> : null}
            {c ? (
              <Button small kind="secondary" icon="chatbubbles-outline" label={c.status === 'connected' ? t('match.connected') : t('match.pending')} onPress={() => router.push(`/chat/${c.id}`)} />
            ) : (
              <Button small icon="person-add-outline" label={t('match.introTitle')} onPress={() => onConnect(p)} />
            )}
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  whyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: touch, paddingHorizontal: space.xs, flexShrink: 1 },
  why: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: space.md, gap: space.xs },
});
