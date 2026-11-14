// "Ask NEXTORA" client. Answers come only from the Cloudflare Worker (worker/),
// which verifies the Firebase ID token and calls Gemini with a key the app never
// sees. Until the Worker URL is configured (npm run setup:worker), the assistant
// says it isn't available and never fabricates an answer.
import Constants from 'expo-constants';
import { appEnv, fb, isFirebaseConfigured } from './firebase';
import { flags } from './flags';

export interface Source { id: string; title: string; type: string }

export type AskResult =
  | { status: 'answer'; text: string; sources: Source[] }
  | { status: 'unavailable' }
  | { status: 'backendNotConfigured' }
  | { status: 'noConsent' }
  | { status: 'rateLimited' }
  | { status: 'error' };

const workerUrl = (): string | null => {
  const u: unknown = Constants.expoConfig?.extra?.workerUrl;
  return typeof u === 'string' && u.startsWith('https://') ? u : null;
};

/** Only the question (plus app language) is sent: never name, contact details or chat history. */
export async function askNextora(question: string, lang: string, consented: boolean): Promise<AskResult> {
  if (appEnv === 'demo') {
    return {
      status: 'answer',
      text: 'Demo reply: NEXTORA can help you explore community advice, local guides, and newcomer resources. This sample response is generated locally and is not a live AI answer.',
      sources: [{ id: 'demo-community', title: 'Demo community content', type: 'demo' }],
    };
  }
  const url = workerUrl();
  if (!flags.aiEnabled || !url) return { status: 'unavailable' };
  const services = fb();
  if (!isFirebaseConfigured || !services) return { status: 'backendNotConfigured' };
  const user = services.auth.currentUser;
  if (!user) return { status: 'error' };
  if (!consented) return { status: 'noConsent' };
  try {
    const res = await fetch(`${url}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify({ question: question.slice(0, 500), lang }),
    });
    if (res.status === 429) return { status: 'rateLimited' };
    if (res.status === 503) return { status: 'unavailable' };
    if (!res.ok) return { status: 'error' };
    const data = (await res.json()) as { text: string; sources?: Source[] };
    return { status: 'answer', text: data.text, sources: data.sources ?? [] };
  } catch {
    return { status: 'error' };
  }
}
