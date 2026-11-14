import type { Env } from './env';

/**
 * Small key/value store. Uses the KV binding `RATE` when bound; otherwise an
 * in-memory Map per isolate. The memory fallback is best-effort only: it is not
 * shared across isolates or regions and resets on eviction. Bind KV in production.
 * KV is eventually consistent, so limits are approximate either way.
 */
const mem = new Map<string, { v: string; exp: number }>();

export function resetMemoryStore(): void {
  mem.clear();
}

export async function sget(env: Env, key: string): Promise<string | null> {
  if (env.RATE) return env.RATE.get(key);
  const e = mem.get(key);
  if (!e) return null;
  if (e.exp < Date.now()) {
    mem.delete(key);
    return null;
  }
  return e.v;
}

export async function sput(env: Env, key: string, v: string, ttlSec: number): Promise<void> {
  if (env.RATE) {
    // KV write quota exhaustion must not break requests.
    try { await env.RATE.put(key, v, { expirationTtl: Math.max(60, ttlSec) }); } catch { /* ignore */ }
    return;
  }
  mem.set(key, { v, exp: Date.now() + ttlSec * 1000 });
}

export const RATE_LIMIT = 20;

/** Returns true if allowed (and counts the call), false if over the hourly limit. */
export async function takeRate(env: Env, uid: string): Promise<boolean> {
  const bucket = Math.floor(Date.now() / 3_600_000);
  const key = `rate:${uid}:${bucket}`;
  const n = parseInt((await sget(env, key)) ?? '0', 10) || 0;
  if (n >= RATE_LIMIT) return false;
  await sput(env, key, String(n + 1), 3600);
  return true;
}
