// Whether voice typing can run right now. Honest "not available yet" when the
// Worker isn't configured or the assistant is switched off.
import Constants from 'expo-constants';
import type { AppState } from '../../store/AppStore';

export const workerUrl = (): string | null => {
  const u: unknown = Constants.expoConfig?.extra?.workerUrl;
  return typeof u === 'string' && u.startsWith('https://') ? u : null;
};

export type VoiceAvailability = 'ok' | 'notAvailable' | 'needConsent';

export function voiceAvailability(state: AppState): VoiceAvailability {
  if (!workerUrl() || !state.settings.assistantOn) return 'notAvailable';
  // 'aiVoice' is not yet in ConsentKey; read it loosely until the consent screen adds it.
  const c = (state.consents as Record<string, { granted?: boolean } | undefined>).aiVoice;
  return c?.granted === true ? 'ok' : 'needConsent';
}
