import { list, type Env } from './env';
import { verifyIdToken } from './auth';
import { takeRate } from './store';
import { generate, type GenRequest } from './gemini';
import { askSystem, translateSystem, transcribeSystem } from './prompts';

export type { Env } from './env';

const TEXT_LIMIT = 2 * 1024;
const AUDIO_LIMIT = 1024 * 1024; // decoded bytes
const AUDIO_BODY_LIMIT = Math.ceil(AUDIO_LIMIT * 4 / 3) + 4096;
const LANG_RE = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})?$/;
const MIME_RE = /^audio\/[a-z0-9.+-]{1,40}$/;

function log(route: string, status: number, model?: string): void {
  // Never log content, tokens, keys or audio.
  console.log(JSON.stringify({ route, status, model: model ?? null }));
}

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Expose-Headers': 'X-Model',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

function json(status: number, body: unknown, origin: string | null, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders(origin), ...extra },
  });
}

const str = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() && v.length <= max ? v : null;

type Built = { req: GenRequest; audio: boolean } | { error: number };

function build(route: string, b: any): Built {
  if (route === '/ask') {
    const q = str(b?.question, TEXT_LIMIT);
    const lang = str(b?.lang, 20);
    const emirate = b?.emirate === undefined ? undefined : str(b.emirate, 40);
    if (!q || !lang || !LANG_RE.test(lang) || emirate === null) return { error: 400 };
    return { audio: false, req: { systemInstruction: askSystem(lang, emirate), parts: [{ text: q }] } };
  }
  if (route === '/translate') {
    const t = str(b?.text, TEXT_LIMIT);
    const target = str(b?.target, 20);
    if (!t || !target || !LANG_RE.test(target)) return { error: 400 };
    return { audio: false, req: { systemInstruction: translateSystem(target), parts: [{ text: t }] } };
  }
  const audio = str(b?.audio, AUDIO_BODY_LIMIT);
  const mime = str(b?.mime, 60);
  const lang = str(b?.lang, 20);
  if (!audio || !mime || !MIME_RE.test(mime) || !lang || !LANG_RE.test(lang)) return { error: 400 };
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(audio)) return { error: 400 };
  if (Math.floor((audio.length * 3) / 4) > AUDIO_LIMIT) return { error: 413 };
  return {
    audio: true,
    req: {
      systemInstruction: transcribeSystem(lang),
      parts: [{ inline_data: { mime_type: mime, data: audio } }, { text: 'Transcribe this audio.' }],
    },
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const route = url.pathname;
    const origin = request.headers.get('Origin');

    if (origin !== null && !list(env.ALLOWED_ORIGINS).includes(origin)) {
      log(route, 403);
      return json(403, { error: 'forbidden_origin' }, null);
    }
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (!['/ask', '/translate', '/transcribe'].includes(route)) return json(404, { error: 'not_found' }, origin);
    if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin);

    const m = /^Bearer\s+(\S+)$/.exec(request.headers.get('Authorization') ?? '');
    const uid = m ? await verifyIdToken(m[1], env) : null;
    if (!uid) {
      log(route, 401);
      return json(401, { error: 'unauthorized' }, origin);
    }

    const limit = route === '/transcribe' ? AUDIO_BODY_LIMIT : TEXT_LIMIT;
    const declared = Number(request.headers.get('content-length') ?? '0');
    if (declared > limit) {
      log(route, 413);
      return json(413, { error: 'too_large' }, origin);
    }
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > limit) {
      log(route, 413);
      return json(413, { error: 'too_large' }, origin);
    }
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      log(route, 400);
      return json(400, { error: 'bad_request' }, origin);
    }
    const built = build(route, body);
    if ('error' in built) {
      log(route, built.error);
      return json(built.error, { error: built.error === 413 ? 'too_large' : 'bad_request' }, origin);
    }

    if (!(await takeRate(env, uid))) {
      log(route, 429);
      return json(429, { error: 'rate_limited' }, origin, { 'Retry-After': '3600' });
    }

    const models = list(built.audio ? env.GEMINI_AUDIO_MODELS : env.GEMINI_MODELS);
    const r = await generate(env, models, built.req);
    if (!r.ok) {
      log(route, 503);
      return json(503, { error: 'unavailable' }, origin);
    }
    log(route, 200, r.model);
    return json(200, { text: r.text }, origin, { 'X-Model': r.model });
  },
};
