// Web: the browser's own speech recognition for the transcript, plus a microphone
// stream from voice-glow so the glow follows the real voice level. Nothing is
// recorded or uploaded here; only the final text is sent, and only if the person sends it.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMicrophone } from 'voice-glow';
import type { VoiceError, VoiceInput } from './types';

// BCP-47 tags for recognition. Tagalog uses fil-PH.
const LOCALE: Record<string, string> = {
  en: 'en-AE', ar: 'ar-AE', hi: 'hi-IN', ur: 'ur-PK', ml: 'ml-IN', ta: 'ta-IN', bn: 'bn-IN',
  tl: 'fil-PH', ne: 'ne-NP', ru: 'ru-RU',
};

type Recognition = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
};

const Ctor: (new () => Recognition) | undefined =
  typeof window !== 'undefined'
    ? ((window as unknown as Record<string, unknown>).SpeechRecognition ??
       (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as (new () => Recognition) | undefined
    : undefined;

export function useVoiceInput(): VoiceInput {
  const mic = useMicrophone();
  const rec = useRef<Recognition | null>(null);
  const text = useRef('');
  const ended = useRef<((s: string) => void) | null>(null);
  const [listening, setListening] = useState(false);
  const [words, setWords] = useState<string[]>([]);
  const [error, setError] = useState<VoiceError>(null);

  useEffect(() => () => rec.current?.abort(), []);

  const start = useCallback((lang: string) => {
    if (!Ctor) return;
    setError(null);
    setWords([]);
    text.current = '';
    mic.start(); // glow input; recognition asks for the mic on its own as well
    const r = new Ctor();
    r.lang = LOCALE[lang] ?? 'en-AE';
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      let s = '';
      for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript;
      text.current = s.trim();
      setWords(text.current ? text.current.split(/\s+/) : []);
    };
    r.onerror = (e) => setError(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denied' : 'failed');
    r.onend = () => {
      setListening(false);
      mic.stop();
      ended.current?.(text.current);
      ended.current = null;
    };
    rec.current = r;
    setListening(true);
    r.start();
  }, [mic]);

  const stop = useCallback(() => new Promise<string>((resolve) => {
    if (!rec.current || !listening) return resolve(text.current);
    ended.current = resolve;
    rec.current.stop();
  }), [listening]);

  return { supported: !!Ctor, listening, transcribing: false, words, stream: mic.stream, level: null, error, start, stop };
}
