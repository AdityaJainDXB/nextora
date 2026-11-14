export type VoicePhase = 'idle' | 'listening' | 'thinking';

export type VoiceError = 'denied' | 'failed' | 'tooLong' | 'noText' | 'unavailable' | null;

export interface VoiceInput {
  /** False when this platform/build can't do speech-to-text at all. */
  supported: boolean;
  listening: boolean;
  /** True while a finished recording is being turned into text (native only). */
  transcribing: boolean;
  /** Words recognised so far in this turn, in order. */
  words: string[];
  /** Live microphone stream for the glow (web only), else null. */
  stream: unknown;
  /** Live input level 0..1 from recording metering (native only), else null. */
  level: number | null;
  error: VoiceError;
  start: (lang: string) => void;
  /** Stop listening; resolves with the final transcript ('' on error). */
  stop: () => Promise<string>;
}
