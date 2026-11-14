import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, radius, space, touch } from '../../theme';
import { getLang } from '../../locales/meta';
import { useLang } from '../lib/lang';
import { useStore } from '../store/AppStore';
import { useAuth } from '../lib/auth';
import { reportTranslation } from '../lib/account';
import { Button, Field, Row, Sheet, T } from './ui';

/** Shown on every non-English screen: AI label, English original toggle, report. */
export function TranslationBar({ dark }: { dark?: boolean }) {
  const { t } = useTranslation();
  const { lang, showOriginal, setShowOriginal } = useLang();
  const { update } = useStore();
  const { user } = useAuth();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  if (lang === 'en') return null;

  const meta = getLang(lang);
  const reviewed = !!(meta.reviewedBy && meta.reviewedOn);
  const fg = dark ? colors.textOnDark : colors.text;

  const save = () => {
    if (user) reportTranslation(user.uid, path, note.trim(), lang).catch(() => {});
    update((s) => ({ ...s, reports: [...s.reports, { kind: 'translation', target: path, note: note.trim(), lang, at: Date.now() }] }));
    setSaved(true);
    setNote('');
  };

  return (
    <View style={[styles.bar, { backgroundColor: dark ? 'rgba(255,255,255,0.08)' : colors.surfaceAlt }]}>
      <Row gap={space.xs} style={{ flexShrink: 1 }}>
        <Ionicons name="language-outline" size={14} color={dark ? colors.accentOnDark : colors.accentText} />
        <T v="tiny" w="semibold" color={fg}>
          {reviewed ? `${t('ai.reviewed')}: ${meta.reviewedBy}, ${meta.reviewedOn}` : t('ai.translated')}
        </T>
      </Row>
      <Row gap={space.xs} wrap style={{ justifyContent: 'flex-end', flexShrink: 1 }}>
        <Pressable
          onPress={() => setShowOriginal(!showOriginal)}
          accessibilityRole="switch"
          accessibilityState={{ checked: showOriginal }}
          aria-checked={showOriginal}
          accessibilityLabel={t('ai.seeOriginal')}
          style={styles.link}
        >
          <T v="tiny" w="semibold" color={dark ? colors.accentOnDark : colors.primary}>
            {showOriginal ? t('ai.showTranslation') : t('ai.seeOriginal')}
          </T>
        </Pressable>
        <Pressable onPress={() => { setSaved(false); setOpen(true); }} accessibilityRole="button" accessibilityLabel={t('ai.report')} style={styles.link}>
          <Ionicons name="flag-outline" size={16} color={dark ? colors.accentOnDark : colors.primary} />
        </Pressable>
      </Row>
      <Sheet visible={open} onClose={() => setOpen(false)} title={t('ai.reportTitle')}>
        <View style={{ gap: space.md }}>
          {saved ? (
            <T accessibilityRole="text">{t('ai.reportSaved')}</T>
          ) : (
            <>
              <T color={colors.textMuted}>{t('ai.reportBody')}</T>
              <Field label={t('ai.reportPlaceholder')} value={note} onChangeText={setNote} multiline style={{ minHeight: 88 }} />
              <Button label={t('ai.reportSubmit')} onPress={save} icon="flag-outline" />
            </>
          )}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm,
    paddingHorizontal: space.md, minHeight: touch, borderRadius: radius.sm,
  },
  link: { minHeight: touch, minWidth: touch, justifyContent: 'center', alignItems: 'center', paddingHorizontal: space.xs },
});
