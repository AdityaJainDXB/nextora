import type { VoicePhase } from '../../lib/voice/types';

export interface AssistantCardProps {
  phase: VoicePhase;
  /** Words of the person's own spoken question, streamed as they're recognised. */
  words: string[];
  /** Changes on every new voice turn, so the transcript restarts. */
  runKey: number;
  caption: string;
  greeting: string;
  name: string;
  meta: string;
  micLabel: string;
  onMic: () => void;
  /** Live microphone stream (web), drives the glow. */
  stream: unknown;
  /** Live input level 0..1 from recording metering (native), else null. */
  level?: number | null;
  lang: string;
  rtl: boolean;
}
