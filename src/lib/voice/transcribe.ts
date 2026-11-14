// Sends one short recording to the Worker's /transcribe and returns the text.
// Only audio + mime + language are sent. Nothing is stored on the device or here.
import { fb } from '../firebase';
import { workerUrl } from './availability';

export const MAX_AUDIO_BYTES = 1_000_000;

export type TranscribeResult = { text: string } | { error: 'unavailable' | 'failed' | 'tooLong' };

export async function transcribe(audio: string, mime: string, lang: string): Promise<TranscribeResult> {
  const url = workerUrl();
  const user = fb()?.auth.currentUser;
  if (!url || !user) return { error: 'unavailable' };
  try {
    const res = await fetch(`${url}/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify({ audio, mime, lang }),
    });
    if (res.status === 413) return { error: 'tooLong' };
    if (res.status === 503) return { error: 'unavailable' };
    if (!res.ok) return { error: 'failed' };
    const data = (await res.json()) as { text?: unknown };
    return { text: typeof data.text === 'string' ? data.text.trim() : '' };
  } catch {
    return { error: 'failed' };
  }
}
