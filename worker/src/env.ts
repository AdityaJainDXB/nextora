export interface Env {
  FIREBASE_PROJECT_IDS: string;
  ALLOWED_ORIGINS: string;
  GEMINI_MODELS: string;
  GEMINI_AUDIO_MODELS: string;
  EMULATOR_MODE?: string;
  GEMINI_API_KEY: string;
  RATE?: KVNamespace;
}

export const list = (s: string | undefined): string[] =>
  (s ?? '').split(',').map((x) => x.trim()).filter((x) => x && x !== 'SETUP_FILLS_THIS');
