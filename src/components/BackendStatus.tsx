import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, radius, space } from '../../theme';
import { emulatorHost, usingEmulators } from '../lib/firebase';
import { Button, Row, T } from './ui';

/** Local/demo mode only: pings the emulators so a dead backend shows one clear
 *  message instead of scattered "something went wrong" errors. */
async function reachable(): Promise<boolean> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 4000);
  try { await fetch(`http://${emulatorHost()}:9099/`, { signal: ctl.signal }); return true; }
  catch { return false; }
  finally { clearTimeout(timer); }
}

export function BackendStatus() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [down, setDown] = useState(false);
  const check = useCallback(() => { reachable().then((ok) => setDown(!ok)); }, []);
  useEffect(() => {
    if (!usingEmulators) return;
    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, [check]);
  if (!down) return null;
  return (
    <View accessibilityRole="alert" style={{ position: 'absolute', top: insets.top + space.sm, left: space.md, right: space.md, zIndex: 50,
      backgroundColor: colors.warningSoft, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: colors.warning }}>
      <Row gap={space.sm}>
        <T v="small" style={{ flex: 1 }} color={colors.text}>{t('sys.offline')}</T>
        <Button small kind="secondary" label={t('sys.retry')} onPress={check} />
      </Row>
    </View>
  );
}
