// Speaker button that reads text aloud with the device's own voices (expo-speech,
// works in Expo Go). It only appears when the device has a voice for the language,
// matched by language prefix (e.g. "hi" matches "hi-IN"). Nothing leaves the device.
import React, { useEffect, useState } from 'react';
import * as Speech from 'expo-speech';
import { IconButton } from './ui';
import { vt } from '../lib/voice/strings';

const PREFIX: Record<string, string[]> = { tl: ['fil', 'tl'] };

let cache: Speech.Voice[] | null = null;
async function voices(): Promise<Speech.Voice[]> {
  if (cache && cache.length) return cache;
  try { cache = await Speech.getAvailableVoicesAsync(); } catch { cache = []; }
  return cache;
}

export function findVoice(list: Speech.Voice[], lang: string): Speech.Voice | undefined {
  const prefixes = PREFIX[lang] ?? [lang];
  return list.find((v) => {
    const l = (v.language ?? '').toLowerCase().replace('_', '-');
    return prefixes.some((p) => l === p || l.startsWith(p + '-'));
  });
}

/** Read-aloud button. `lang` is the app language code of `text` (en, hi, ar, ...). */
export function ReadAloud({ text, lang, uiLang }: { text: string; lang: string; uiLang?: string }) {
  const [voice, setVoice] = useState<Speech.Voice | null>(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    let live = true;
    voices().then((l) => { if (live) setVoice(findVoice(l, lang) ?? null); });
    return () => { live = false; };
  }, [lang]);

  useEffect(() => () => { if (speaking) Speech.stop(); }, [speaking]);

  if (!voice || !text.trim()) return null;
  const ui = uiLang ?? lang;
  const onPress = () => {
    if (speaking) { Speech.stop(); setSpeaking(false); return; }
    setSpeaking(true);
    Speech.speak(text, {
      language: voice.language,
      voice: voice.identifier,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };
  return (
    <IconButton
      icon={speaking ? 'stop-circle-outline' : 'volume-high-outline'}
      label={vt(speaking ? 'voice.stopReading' : 'voice.readAloud', ui)}
      onPress={onPress}
    />
  );
}
