// Feature flags. AI features switch on only when the Gemini Worker is deployed
// (`npm run setup:worker` writes its public URL to config/worker.json). Each AI
// feature still needs the person's consent and can be switched off in Settings.
import Constants from 'expo-constants';

const workerUrl: unknown = Constants.expoConfig?.extra?.workerUrl;

export const flags = {
  /** True once a Worker URL is configured. */
  aiEnabled: typeof workerUrl === 'string' && workerUrl.startsWith('https://'),
};

/** Version of the consent texts. Bump it when the wording changes so users are asked again. */
export const CONSENT_VERSION = '2026-10-31-draft';
