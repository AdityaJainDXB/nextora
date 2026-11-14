// iOS/Android (works in Expo Go): record a short clip with expo-audio (max 30 s,
// stops on its own), read it as base64, send it once to the Worker's /transcribe,
// then delete the file straight away. Audio is never kept or stored anywhere.
// The text goes into the editable box; the person must press Send themselves.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AudioQuality, IOSOutputFormat, requestRecordingPermissionsAsync, setAudioModeAsync,
  useAudioRecorder, useAudioRecorderState, type RecordingOptions,
} from 'expo-audio';
import { File } from 'expo-file-system';
import { MAX_AUDIO_BYTES, transcribe } from './transcribe';
import type { VoiceError, VoiceInput } from './types';

const MAX_SECONDS = 30;

// Mono AAC at 32 kbps: 30 s is about 120 KB, well under the 1 MB limit.
const OPTIONS: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 32000,
  isMeteringEnabled: true,
  android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: { outputFormat: IOSOutputFormat.MPEG4AAC, audioQuality: AudioQuality.MEDIUM },
  web: { mimeType: 'audio/webm', bitsPerSecond: 32000 },
};

function removeFile(uri: string | null) {
  if (!uri) return;
  try { const f = new File(uri); if (f.exists) f.delete(); } catch { /* already gone */ }
}

export function useVoiceInput(): VoiceInput {
  const recorder = useAudioRecorder(OPTIONS);
  const rs = useAudioRecorderState(recorder, 100);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [words, setWords] = useState<string[]>([]);
  const [error, setError] = useState<VoiceError>(null);
  const lang = useRef('en');
  const pending = useRef<Promise<string> | null>(null);

  const finish = useCallback((): Promise<string> => {
    if (pending.current) return pending.current;
    const run = (async () => {
      let uri: string | null = null;
      try {
        if (recorder.isRecording) await recorder.stop();
        uri = recorder.uri;
        setListening(false);
        if (!uri) { setError('failed'); return ''; }
        setTranscribing(true);
        const file = new File(uri);
        if ((file.size ?? 0) > MAX_AUDIO_BYTES) { setError('tooLong'); return ''; }
        const audio = await file.base64();
        removeFile(uri); // delete before the network call finishes; we hold the bytes in memory only
        uri = null;
        const r = await transcribe(audio, 'audio/mp4', lang.current);
        if ('error' in r) { setError(r.error); return ''; }
        if (!r.text) { setError('noText'); return ''; }
        setWords(r.text.split(/\s+/));
        return r.text;
      } catch {
        setError('failed');
        return '';
      } finally {
        removeFile(uri);
        setListening(false);
        setTranscribing(false);
        setAudioModeAsync({ allowsRecording: false }).catch(() => {});
        pending.current = null;
      }
    })();
    pending.current = run;
    return run;
  }, [recorder]);

  // The 30 s limit stops the recorder on its own: finish the turn then.
  useEffect(() => {
    if (listening && !rs.isRecording && rs.durationMillis > 0) finish();
  }, [listening, rs.isRecording]); // eslint-disable-line react-hooks/exhaustive-deps

  // Never leave a recording or file behind when the screen closes.
  useEffect(() => () => {
    const uri = recorder.uri;
    if (recorder.isRecording) recorder.stop().catch(() => {}).finally(() => removeFile(uri));
    else removeFile(uri);
  }, [recorder]);

  const start = useCallback(async (l: string) => {
    lang.current = l;
    setError(null);
    setWords([]);
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) { setError('denied'); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record({ forDuration: MAX_SECONDS });
      setListening(true);
    } catch {
      setError('failed');
    }
  }, [recorder]);

  const stop = useCallback(() => (listening || pending.current ? finish() : Promise.resolve('')), [listening, finish]);

  // Metering is dBFS (about -160..0). Map -60..0 dB to 0..1 for the glow.
  const db = rs.metering;
  const level = listening && typeof db === 'number' ? Math.max(0, Math.min(1, (db + 60) / 60)) : null;

  return { supported: true, listening, transcribing, words, stream: null, level, error, start: (l) => { start(l); }, stop };
}
