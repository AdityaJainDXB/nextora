import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { colors, space } from '../../theme';
import { getLang } from '../../locales/meta';
import type { Reason } from '../lib/connect';
import type { PublicProfile } from '../store/types';
import { Avatar, Row, T, Tag } from './ui';

export const langNames = (codes: string[] = []) => codes.map((c) => getLang(c).nativeName).join(', ');

export function reasonText(t: TFunction, r: Reason): string {
  switch (r.kind) {
    case 'lang': return t('match.rLang', { list: langNames(r.langs) });
    case 'emirate': return t('match.rEmirate', { emirate: t(`emirates.${r.emirate}`) });
    case 'interests': return t('match.rInterests', { list: r.items.map((i) => t(`interests.${i}`)).join(', ') });
    case 'family': return t('match.rFamily', { list: r.items.map((i) => t(`family.${i}`)).join(', ') });
    case 'persona': return t('match.rPersona', { persona: t(`persona.${r.persona}`) });
  }
}

/** A person as others see them: display name and visible fields only. */
export function PersonHeader({ p, right }: { p: PublicProfile; right?: React.ReactNode }) {
  const { t } = useTranslation();
  const place = [p.neighbourhood, p.emirate ? t(`emirates.${p.emirate}`) : null].filter(Boolean).join(', ');
  return (
    <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
      <Avatar initials={p.displayName.slice(0, 1).toUpperCase()} hue={p.role === 'volunteer' ? 'clay' : 'ink'} />
      <View style={{ flex: 1, gap: 2 }}>
        <Row gap={space.xs} wrap>
          <T w="semibold">{p.displayName}</T>
          <Tag label={p.role === 'volunteer' ? t('match.guide') : t('match.newcomer')} tone={p.role === 'volunteer' ? 'clay' : 'ink'} />
          {p.isTeam ? <Tag label={t('match.team')} tone="ink" /> : null}
        </Row>
        {place ? <T v="small" color={colors.textMuted}>{place}</T> : null}
        {p.languages?.length ? <T v="small" color={colors.textMuted}>{t('match.speaks')}: {langNames(p.languages)}</T> : null}
      </View>
      {right}
    </Row>
  );
}
