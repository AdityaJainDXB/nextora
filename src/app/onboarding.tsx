import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, radius, space, touch } from '../../theme';
import { activeLanguages } from '../../locales/meta';
import { Button, Chip, Field, Progress, Row, T, ToggleRow } from '../components/ui';
import { Screen } from '../components/layout';
import { useLang } from '../lib/lang';
import { errorKey, saveProfile } from '../lib/account';
import { useAuth } from '../lib/auth';
import { useStore } from '../store/AppStore';
import {
  ALL_EMIRATES, ALL_FAMILY, ALL_INTERESTS, ALL_PERSONAS, ALL_REASONS,
  type Field as F, type Persona, type Profile, type Role,
} from '../store/types';
import { personaIcon } from '../lib/personas';

type Step = 'role' | 'persona' | 'location' | 'interests' | 'family' | 'languages';

const blank = (role: Role, persona: Persona, lang: string): Profile => ({
  displayName: '',
  role,
  persona,
  emirate: 'dubai',
  neighbourhood: '',
  interests: [],
  family: [],
  languages: lang === 'en' ? ['en'] : [lang, 'en'],
  visibility: { emirate: true, neighbourhood: false, interests: true, family: true, languages: true },
  reason: null,
});

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export default function Onboarding() {
  const params = useLocalSearchParams<{ edit?: string }>();
  const { t } = useTranslation();
  const { lang } = useLang();
  const { state, update } = useStore();
  const { user } = useAuth();
  const editing = params.edit === '1' && !!state.profile;
  // Role and persona picked on the hero are carried through sign-up.
  const pending = state.pending;
  const [p, setP] = useState<Profile>(() =>
    editing ? state.profile! : blank(pending?.role ?? 'newcomer', pending?.persona ?? 'justArrived', lang),
  );
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const steps: Step[] = p.role === 'volunteer'
    ? ['role', 'location', 'interests', 'family', 'languages']
    : ['role', 'persona', 'location', 'interests', 'family', 'languages'];
  // Coming from the hero, role (and persona) are already chosen.
  const firstStep = editing || !pending ? 0 : steps.indexOf('location');
  const [i, setI] = useState(firstStep);
  const step = steps[Math.min(i, steps.length - 1)];

  const set = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }));
  const vis = (f: F, v: boolean) => setP((x) => ({ ...x, visibility: { ...x.visibility, [f]: v } }));

  const valid =
    step === 'location' ? p.displayName.trim().length > 0
      : step === 'languages' ? p.languages.length > 0
        : step === 'family' ? p.family.length > 0
          : true;
  const blockedMsg = step === 'location' ? t('onb.needName') : t('onb.needOne');

  const next = async () => {
    if (i < steps.length - 1) return setI(i + 1);
    if (!user) return router.replace('/');
    const final = { ...p, displayName: p.displayName.trim() };
    setSaving(true);
    setSaveErr(null);
    try {
      // Saved to Firestore first; a function then publishes only the visible fields.
      await saveProfile(user.uid, final);
      update((s) => ({ ...s, profile: final, pending: null }));
      if (editing) router.back();
      else router.replace('/home');
    } catch (e) {
      setSaveErr(t(`authErr.${errorKey(e)}`));
    } finally {
      setSaving(false);
    }
  };
  const back = () => {
    if (i > 0) setI(i - 1);
    else if (router.canGoBack()) router.back();
  };

  const VisToggle = ({ f }: { f: F }) => (
    <View style={styles.vis}>
      <ToggleRow
        label={p.visibility[f] ? t('onb.visible') : t('onb.hidden')}
        hint={t('onb.visibilityHint')}
        value={p.visibility[f]}
        onChange={(v) => vis(f, v)}
      />
    </View>
  );

  return (
    <Screen
      footer={
        <View style={{ gap: space.sm }}>
          {!valid ? <T v="small" color={colors.warning} center>{blockedMsg}</T> : null}
          {saveErr ? <T v="small" color={colors.danger} center>{saveErr}</T> : null}
          <Row gap={space.sm}>
            <Button label={t('common.back')} onPress={back} kind="secondary" style={{ flex: 1 }} />
            <Button label={i === steps.length - 1 ? t('onb.finish') : t('common.next')} onPress={next} disabled={!valid || saving} style={{ flex: 2 }} />
          </Row>
        </View>
      }
    >
      <View style={{ gap: space.sm }}>
        <T v="small" color={colors.textMuted}>{t('onb.stepOf', { n: i + 1, total: steps.length })}</T>
        <Progress value={(i + 1) / steps.length} label={t('onb.stepOf', { n: i + 1, total: steps.length })} />
      </View>

      {step === 'role' && (
        <>
          <T v="h1" w="bold" accessibilityRole="header">{t('onb.roleTitle')}</T>
          {(['newcomer', 'volunteer'] as Role[]).map((r) => (
            <Option
              key={r}
              on={p.role === r}
              icon={r === 'newcomer' ? 'airplane-outline' : 'hand-left-outline'}
              title={t(r === 'newcomer' ? 'onb.roleNew' : 'onb.roleHelp')}
              desc={t(r === 'newcomer' ? 'onb.roleNewDesc' : 'onb.roleHelpDesc')}
              onPress={() => set({ role: r, persona: r === 'volunteer' ? 'belong' : p.persona })}
            />
          ))}
        </>
      )}

      {step === 'persona' && (
        <>
          <T v="h1" w="bold" accessibilityRole="header">{t('persona.title')}</T>
          <T color={colors.textMuted}>{t('persona.subtitle')}</T>
          {ALL_PERSONAS.map((x) => (
            <Option key={x} on={p.persona === x} icon={personaIcon[x]} title={t(`persona.${x}`)} desc={t(`persona.${x}Desc`)} onPress={() => set({ persona: x })} />
          ))}
        </>
      )}

      {step === 'location' && (
        <>
          <T v="h1" w="bold" accessibilityRole="header">{t('onb.locationTitle')}</T>
          <Field
            label={t('onb.nameLabel')}
            hint={t('onb.nameHint')}
            placeholder={t('onb.namePlaceholder')}
            value={p.displayName}
            onChangeText={(v) => set({ displayName: v.slice(0, 24) })}
            autoCapitalize="words"
          />
          <T v="small" w="semibold">{t('onb.emirate')}</T>
          <Row wrap>
            {ALL_EMIRATES.map((e) => (
              <Chip key={e} label={t(`emirates.${e}`)} selected={p.emirate === e} onPress={() => set({ emirate: e })} />
            ))}
          </Row>
          <VisToggle f="emirate" />
          <Field
            label={`${t('onb.neighbourhood')} (${t('common.optional')})`}
            placeholder={t('onb.neighbourhoodPlaceholder')}
            value={p.neighbourhood}
            onChangeText={(v) => set({ neighbourhood: v.slice(0, 40) })}
          />
          <VisToggle f="neighbourhood" />
          {p.role === 'newcomer' ? (
            <>
              <T v="small" w="semibold">{t('onb.reasonTitle')} ({t('common.optional')})</T>
              <Row wrap>
                {ALL_REASONS.map((r) => (
                  <Chip key={r} label={t(`reason.${r}`)} selected={p.reason === r} onPress={() => set({ reason: p.reason === r ? null : r })} />
                ))}
              </Row>
              <T v="tiny" color={colors.textMuted}>{t('onb.reasonPrivate')}</T>
            </>
          ) : null}
        </>
      )}

      {step === 'interests' && (
        <>
          <T v="h1" w="bold" accessibilityRole="header">{t('onb.interestsTitle')}</T>
          <Row wrap>
            {ALL_INTERESTS.map((x) => (
              <Chip key={x} label={t(`interests.${x}`)} selected={p.interests.includes(x)} onPress={() => set({ interests: toggle(p.interests, x) })} />
            ))}
          </Row>
          <VisToggle f="interests" />
        </>
      )}

      {step === 'family' && (
        <>
          <T v="h1" w="bold" accessibilityRole="header">{t('onb.familyTitle')}</T>
          <Row wrap>
            {ALL_FAMILY.map((x) => (
              <Chip
                key={x}
                label={t(`family.${x}`)}
                selected={p.family.includes(x)}
                onPress={() =>
                  set({ family: x === 'none' ? ['none'] : toggle(p.family.filter((f) => f !== 'none'), x) })
                }
              />
            ))}
          </Row>
          <VisToggle f="family" />
        </>
      )}

      {step === 'languages' && (
        <>
          <T v="h1" w="bold" accessibilityRole="header">{t('onb.languagesTitle')}</T>
          <Row gap={space.xs} style={{ alignItems: 'flex-start' }}>
            <Ionicons name="information-circle-outline" size={18} color={colors.accentText} />
            <T v="small" color={colors.textMuted} style={{ flex: 1 }}>{t('onb.languagesHint')}</T>
          </Row>
          <Row wrap>
            {activeLanguages.map((l) => (
              <Chip key={l.code} label={l.nativeName} selected={p.languages.includes(l.code)} onPress={() => set({ languages: toggle(p.languages, l.code) })} />
            ))}
          </Row>
          <VisToggle f="languages" />
        </>
      )}
    </Screen>
  );
}

function Option({ on, icon, title, desc, onPress }: { on: boolean; icon: keyof typeof Ionicons.glyphMap; title: string; desc: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      aria-checked={on}
      accessibilityLabel={`${title}. ${desc}`}
      style={[styles.opt, on && styles.optOn]}
    >
      <View style={styles.optIcon}><Ionicons name={icon} size={22} color={colors.primary} /></View>
      <View style={{ flex: 1 }}>
        <T w="semibold">{title}</T>
        <T v="small" color={colors.textMuted}>{desc}</T>
      </View>
      <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? colors.primary : colors.border} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  opt: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, minHeight: touch,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface,
  },
  optOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  vis: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.xs },
});
