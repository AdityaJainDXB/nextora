import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { generateKeyPairSync, createSign, type KeyObject } from 'node:crypto';
import worker, { type Env } from '../src/index';
import { JWKS_URL, resetJwksCache } from '../src/auth';
import { resetMemoryStore } from '../src/store';

const KID = 'test-kid';
let priv: KeyObject;
let jwk: any;
const SECRET = 'TEST_KEY_DO_NOT_LOG_123';

const b64u = (b: Buffer | string) => Buffer.from(b).toString('base64url');

function sign(payload: Record<string, unknown>, opts: { alg?: string } = {}): string {
  const now = Math.floor(Date.now() / 1000);
  const p = { iss: 'https://securetoken.google.com/nextora-dev-68159', aud: 'nextora-dev-68159',
    sub: 'user1', iat: now - 10, exp: now + 3600, ...payload };
  if (opts.alg === 'none') return `${b64u(JSON.stringify({ alg: 'none', typ: 'JWT' }))}.${b64u(JSON.stringify(p))}.`;
  const h = b64u(JSON.stringify({ alg: 'RS256', kid: KID, typ: 'JWT' }));
  const body = `${h}.${b64u(JSON.stringify(p))}`;
  const s = createSign('RSA-SHA256').update(body).sign(priv);
  return `${body}.${b64u(s)}`;
}

function env(over: Partial<Env> = {}): Env {
  return {
    FIREBASE_PROJECT_IDS: 'nextora-dev-68159,nextora-prod',
    ALLOWED_ORIGINS: 'https://app.example.com',
    GEMINI_MODELS: 'model-a,model-b,model-c,model-d',
    GEMINI_AUDIO_MODELS: 'audio-a,audio-b',
    EMULATOR_MODE: 'false',
    GEMINI_API_KEY: SECRET,
    ...over,
  };
}

type Gem = (model: string) => Response | Promise<Response>;
let gemini: Gem;
const okGem = (text = 'hello') => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });

function call(path: string, body: unknown, headers: Record<string, string> = {}, e = env()) {
  return worker.fetch(new Request(`https://w.test${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }), e);
}
const auth = (t = sign({})) => ({ Authorization: `Bearer ${t}` });
const ask = { question: 'How do I top up my nol card?', lang: 'en' };

beforeAll(() => {
  const kp = generateKeyPairSync('rsa', { modulusLength: 2048 });
  priv = kp.privateKey;
  jwk = { ...kp.publicKey.export({ format: 'jwk' }), kid: KID, alg: 'RS256', use: 'sig' };
});

let logs: string[];
beforeEach(() => {
  resetJwksCache();
  resetMemoryStore();
  gemini = () => okGem();
  logs = [];
  vi.spyOn(console, 'log').mockImplementation((...a) => { logs.push(a.join(' ')); });
  vi.spyOn(console, 'error').mockImplementation((...a) => { logs.push(a.join(' ')); });
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const u = String(input instanceof Request ? input.url : input);
    if (u === JWKS_URL) return new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'cache-control': 'public, max-age=3600' } });
    const m = /models\/([^:]+):generateContent/.exec(u);
    if (m) {
      expect((init?.headers as any)['x-goog-api-key']).toBe(SECRET);
      return gemini(decodeURIComponent(m[1]));
    }
    throw new Error('unexpected fetch ' + u);
  }));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('auth', () => {
  it('401 without token', async () => {
    expect((await call('/ask', ask)).status).toBe(401);
  });
  it('200 with valid token and X-Model', async () => {
    const r = await call('/ask', ask, auth());
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ text: 'hello' });
    expect(r.headers.get('X-Model')).toBe('model-a');
  });
  it('401 bad aud', async () => {
    const t = sign({ aud: 'other-proj', iss: 'https://securetoken.google.com/other-proj' });
    expect((await call('/ask', ask, auth(t))).status).toBe(401);
  });
  it('401 bad iss', async () => {
    expect((await call('/ask', ask, auth(sign({ iss: 'https://evil' })))).status).toBe(401);
  });
  it('401 expired', async () => {
    const now = Math.floor(Date.now() / 1000);
    expect((await call('/ask', ask, auth(sign({ exp: now - 5, iat: now - 4000 })))).status).toBe(401);
  });
  it('401 empty sub', async () => {
    expect((await call('/ask', ask, auth(sign({ sub: '' })))).status).toBe(401);
  });
  it('401 tampered signature', async () => {
    const t = sign({});
    const [h, , s] = t.split('.');
    const forged = `${h}.${b64u(JSON.stringify({ ...JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString()), sub: 'admin' }))}.${s}`;
    expect((await call('/ask', ask, auth(forged))).status).toBe(401);
  });
  it('emulator token rejected when EMULATOR_MODE false', async () => {
    const t = sign({ aud: 'demo-x', iss: 'https://securetoken.google.com/demo-x' }, { alg: 'none' });
    const e = env({ FIREBASE_PROJECT_IDS: 'demo-x' });
    expect((await call('/ask', ask, auth(t), e)).status).toBe(401);
  });
  it('emulator token accepted only for demo-* when EMULATOR_MODE true', async () => {
    const e = env({ FIREBASE_PROJECT_IDS: 'demo-x,nextora-dev-68159', EMULATOR_MODE: 'true' });
    const demo = sign({ aud: 'demo-x', iss: 'https://securetoken.google.com/demo-x' }, { alg: 'none' });
    expect((await call('/ask', ask, auth(demo), e)).status).toBe(200);
    expect((await call('/ask', ask, auth(sign({}, { alg: 'none' })), e)).status).toBe(401);
  });
});

describe('limits', () => {
  it('413 on /ask body over 2 KB', async () => {
    expect((await call('/ask', { question: 'x'.repeat(2100), lang: 'en' }, auth())).status).toBe(413);
  });
  it('413 on /translate body over 2 KB', async () => {
    expect((await call('/translate', { text: 'x'.repeat(2100), target: 'ar' }, auth())).status).toBe(413);
  });
  it('413 on audio over 1 MB', async () => {
    const audio = Buffer.alloc(1024 * 1024 + 10).toString('base64');
    expect((await call('/transcribe', { audio, mime: 'audio/m4a', lang: 'en' }, auth())).status).toBe(413);
  });
  it('transcribe uses audio models only', async () => {
    const seen: string[] = [];
    gemini = (m) => { seen.push(m); return okGem('transcript'); };
    const r = await call('/transcribe', { audio: Buffer.from('abc').toString('base64'), mime: 'audio/m4a', lang: 'en' }, auth());
    expect(r.status).toBe(200);
    expect(seen).toEqual(['audio-a']);
  });
  it('429 on the 21st call across routes', async () => {
    for (let i = 0; i < 20; i++) {
      const r = i % 2 ? await call('/translate', { text: 'hi', target: 'ar' }, auth()) : await call('/ask', ask, auth());
      expect(r.status).toBe(200);
    }
    expect((await call('/ask', ask, auth())).status).toBe(429);
    // other user unaffected
    expect((await call('/ask', ask, auth(sign({ sub: 'user2' })))).status).toBe(200);
  });
});

describe('model fallback', () => {
  it('skips a 404 model, returns X-Model of next, and caches it dead', async () => {
    const seen: string[] = [];
    gemini = (m) => { seen.push(m); return m === 'model-a' ? new Response('{}', { status: 404 }) : okGem(); };
    const r = await call('/ask', ask, auth());
    expect(r.status).toBe(200);
    expect(r.headers.get('X-Model')).toBe('model-b');
    await call('/ask', ask, auth());
    expect(seen).toEqual(['model-a', 'model-b', 'model-b']);
  });
  it('503 when all fail, max 3 attempts', async () => {
    const seen: string[] = [];
    gemini = (m) => { seen.push(m); return new Response('{}', { status: 503 }); };
    const r = await call('/ask', ask, auth());
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ error: 'unavailable' });
    expect(seen.length).toBe(3);
  });
  it('does not retry on 400', async () => {
    const seen: string[] = [];
    gemini = (m) => { seen.push(m); return new Response('{}', { status: 400 }); };
    expect((await call('/ask', ask, auth())).status).toBe(503);
    expect(seen).toEqual(['model-a']);
  });
});

describe('cors & logging', () => {
  it('403 for disallowed origin', async () => {
    expect((await call('/ask', ask, { ...auth(), Origin: 'https://evil.com' })).status).toBe(403);
  });
  it('allowed origin gets CORS headers', async () => {
    const r = await call('/ask', ask, { ...auth(), Origin: 'https://app.example.com' });
    expect(r.status).toBe(200);
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com');
  });
  it('logs no content, token or key', async () => {
    const t = sign({});
    await call('/ask', { question: 'SECRET_QUESTION_TEXT', lang: 'en' }, auth(t));
    gemini = () => okGem('SECRET_ANSWER');
    await call('/translate', { text: 'SECRET_TRANSLATE', target: 'ar' }, auth(t));
    await call('/transcribe', { audio: Buffer.from('SECRETAUDIO').toString('base64'), mime: 'audio/m4a', lang: 'en' }, auth(t));
    const all = logs.join('\n');
    expect(logs.length).toBeGreaterThan(0);
    for (const s of ['SECRET_QUESTION_TEXT', 'SECRET_ANSWER', 'SECRET_TRANSLATE', Buffer.from('SECRETAUDIO').toString('base64'), SECRET, t])
      expect(all).not.toContain(s);
    expect(JSON.parse(logs[0])).toEqual({ route: '/ask', status: 200, model: 'model-a' });
  });
});
