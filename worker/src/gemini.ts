import type { Env } from './env';
import { sget, sput } from './store';

export const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
export const TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 3;
const RETRYABLE = new Set([404, 429, 500, 503]);

export interface GenRequest {
  systemInstruction: string;
  parts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }>;
}
export type GenResult = { ok: true; text: string; model: string } | { ok: false; status: number };

export async function generate(env: Env, models: string[], req: GenRequest): Promise<GenResult> {
  let attempts = 0;
  for (const model of models) {
    if (attempts >= MAX_ATTEMPTS) break;
    if (await sget(env, `dead:${model}`)) continue;
    attempts++;
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${GEMINI_BASE}${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        signal: ctl.signal,
        headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.systemInstruction }] },
          contents: [{ role: 'user', parts: req.parts }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        }),
      });
      if (res.ok) {
        const j = (await res.json()) as any;
        const text = (j?.candidates?.[0]?.content?.parts ?? [])
          .map((p: any) => (typeof p?.text === 'string' ? p.text : '')).join('').trim();
        if (text) return { ok: true, text, model };
        continue; // empty/blocked answer: try next model
      }
      if (res.status === 404) await sput(env, `dead:${model}`, '1', 3600);
      if (!RETRYABLE.has(res.status)) return { ok: false, status: res.status };
    } catch {
      // timeout / network: next model
    } finally {
      clearTimeout(t);
    }
  }
  return { ok: false, status: 503 };
}
