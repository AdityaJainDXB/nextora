import React, { useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { colors, space } from '../../theme';
import { checklistActions, type Provider } from '../../data/checklistActions';
import { Button, Row, T, Tag } from './ui';

const enc = encodeURIComponent;

/** App Store search (iOS app) or Google Play search; no app ids are guessed. */
function storeLinks(term: string) {
  return {
    appStore: Platform.OS === 'ios'
      ? `itms-apps://search.itunes.apple.com/WebObjects/MZSearch.woa/wa/search?media=software&term=${enc(term)}`
      : `https://www.apple.com/ae/search/${enc(term)}?src=serp`,
    googlePlay: `https://play.google.com/store/search?q=${enc(term)}&c=apps`,
  };
}

const open = (url: string) => Linking.openURL(url).catch(() => {});

function ProviderRow({ p }: { p: Provider }) {
  const { t } = useTranslation();
  const s = p.appSearch ? storeLinks(p.appSearch) : null;
  return (
    <View style={{ gap: space.xs, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
      <T w="semibold" lang="en">{p.name}</T>
      <Row wrap gap={space.sm}>
        {s ? <Button small kind="secondary" icon="logo-apple-appstore" label={t('actions.appStore')} a11y={`${t('actions.appStore')}: ${p.name}`} onPress={() => open(s.appStore)} /> : null}
        {s ? <Button small kind="secondary" icon="logo-google-playstore" label={t('actions.googlePlay')} a11y={`${t('actions.googlePlay')}: ${p.name}`} onPress={() => open(s.googlePlay)} /> : null}
        {p.website ? <Button small kind="ghost" icon="open-outline" label={t('actions.website')} a11y={`${t('actions.website')}: ${p.name}`} onPress={() => open(p.website!)} /> : null}
      </Row>
    </View>
  );
}

/** Opens Google Maps for `query` near the person, asking for location once (never stored or sent to NEXTORA). */
async function openNearby(query: string) {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.granted) {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      return open(`https://www.google.com/maps/search/${enc(query)}/@${latitude.toFixed(5)},${longitude.toFixed(5)},14z`);
    }
  } catch { /* fall through to a plain search */ }
  // Without permission Google Maps uses its own idea of "near me".
  return open(`https://www.google.com/maps/search/?api=1&query=${enc(`${query} near me`)}`);
}

export function ChecklistActions({ id }: { id: string }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const a = checklistActions[id];
  if (!a) return null;
  const reviewed = !!(a.reviewedBy && a.reviewedOn);
  return (
    <View style={{ gap: space.sm, marginTop: space.xs }}>
      {a.maps?.length ? (
        <View style={{ gap: space.xs }}>
          <Row wrap gap={space.sm}>
            {a.maps.map((m) => (
              <Button key={m.query} small icon="location-outline" label={t(m.labelKey)} disabled={busy}
                onPress={async () => { setBusy(true); await openNearby(m.query); setBusy(false); }} />
            ))}
          </Row>
          <T v="tiny" color={colors.textMuted}>{t('actions.locationWhy')}</T>
        </View>
      ) : null}
      {a.providers?.map((p) => <ProviderRow key={p.name} p={p} />)}
      {a.providers?.length ? (
        <Row wrap gap={space.xs}>
          <Tag label={reviewed ? t('appv.reviewedOn', { date: a.reviewedOn }) : t('actions.notChecked')} tone={reviewed ? 'teal' : 'warning'} />
          <T v="tiny" color={colors.textMuted} style={{ flex: 1 }}>{t('appv.confirm')}</T>
        </Row>
      ) : null}
    </View>
  );
}
