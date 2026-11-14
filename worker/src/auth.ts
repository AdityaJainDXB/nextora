import { list, type Env } from './env';

export const JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

interface Jwk extends JsonWebKey { kid?: string }
let jwksCache: { keys: Map<string, CryptoKey>; exp: number } | null = null;

export function resetJwksCache(): void {
  jwksCache = null;
}

async function getKeys(): Promise<Map<string, CryptoKey>> {
  if (jwksCache && jwksCache.exp > Date.now()) return jwksCache.keys;
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error('jwks');
  const body = (await res.json()) as { keys: Jwk[] };
  const m = /max-age=(\d+)/.exec(res.headers.get('cache-control') ?? '');
  const maxAge = m ? parseInt(m[1], 10) : 300;
  const keys = new Map<string, CryptoKey>();
  for (const k of body.keys ?? []) {
    if (!k.kid) continue;
    keys.set(
      k.kid,
      await crypto.subtle.importKey('jwk', { kty: k.kty, n: k.n, e: k.e, alg: 'RS256', ext: true },
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']),
    );
  }
  jwksCache = { keys, exp: Date.now() + maxAge * 1000 };
  return keys;
}

function b64urlBytes(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}
const b64urlJson = (s: string): any => JSON.parse(new TextDecoder().decode(b64urlBytes(s)));

/** Returns the uid (sub) or null if the token is invalid for any reason. */
export async function verifyIdToken(token: string, env: Env): Promise<string | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const header = b64urlJson(parts[0]);
    const p = b64urlJson(parts[1]);
    const aud = typeof p.aud === 'string' ? p.aud : '';
    const now = Math.floor(Date.now() / 1000);
    if (!list(env.FIREBASE_PROJECT_IDS).includes(aud)) return null;
    if (p.iss !== `https://securetoken.google.com/${aud}`) return null;
    if (typeof p.exp !== 'number' || p.exp <= now) return null;
    if (typeof p.iat !== 'number' || p.iat > now + 60) return null;
    if (typeof p.sub !== 'string' || !p.sub || p.sub.length > 128) return null;

    if (header.alg === 'none') {
      // Firebase Auth emulator tokens are unsigned. Accept ONLY in emulator mode for demo-* projects.
      return env.EMULATOR_MODE === 'true' && aud.startsWith('demo-') ? p.sub : null;
    }
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') return null;
    const key = (await getKeys()).get(header.kid);
    if (!key) return null;
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlBytes(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    return ok ? p.sub : null;
  } catch {
    return null;
  }
}
