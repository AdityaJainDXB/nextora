import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DevSettings, I18nManager, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import i18n, { isSelectable } from './i18n';
import { getLang } from '../../locales/meta';
import { useStore } from '../store/AppStore';

interface LangCtx {
  /** The user's chosen language. */
  lang: string;
  /** The language currently rendered (English while "See English original" is on). */
  shown: string;
  isRTL: boolean;
  showOriginal: boolean;
  setShowOriginal: (v: boolean) => void;
  needsRestart: boolean;
  dismissRestart: () => void;
  restart: () => void;
}

const Ctx = createContext<LangCtx | null>(null);
const noop = () => {};
const fallback: LangCtx = {
  lang: 'en', shown: 'en', isRTL: false, showOriginal: false, setShowOriginal: noop,
  needsRestart: false, dismissRestart: noop, restart: noop,
};

export function LangProvider({ children }: { children: React.ReactNode }) {
  const { state } = useStore();
  // A saved language that is no longer selectable (for example unreleased in production) falls back to English.
  const lang = state.language && isSelectable(state.language) ? state.language : 'en';
  const [showOriginal, setShowOriginal] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const shown = showOriginal ? 'en' : lang;
  const rtl = getLang(lang).rtl;

  useEffect(() => {
    i18n.changeLanguage(shown);
  }, [shown]);

  useEffect(() => {
    setShowOriginal(false);
    setDismissed(false);
    if (Platform.OS === 'web') {
      // The web build flips instantly: CSS flexbox follows the document direction.
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    } else {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(rtl);
    }
  }, [lang, rtl]);

  // Native layout direction only changes after a reload.
  const needsRestart = Platform.OS !== 'web' && I18nManager.isRTL !== rtl && !dismissed;

  const restart = () => {
    Updates.reloadAsync().catch(() => DevSettings.reload());
  };

  const value = useMemo(
    () => ({
      lang, shown, isRTL: rtl, showOriginal, setShowOriginal,
      needsRestart, dismissRestart: () => setDismissed(true), restart,
    }),
    [lang, shown, rtl, showOriginal, needsRestart],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang() {
  // Outside the provider (the loading screen) render English, left to right.
  return useContext(Ctx) ?? fallback;
}
