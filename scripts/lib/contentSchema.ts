// Validation for admin-managed content. Enforces the honesty rules in code:
// every entry names a source; links are https or null; review fields come as a
// pair; nothing that looks like a rating, price or user count sneaks in unlabelled.

export const APP_CATEGORIES = [
  'food', 'transport', 'shopping', 'property', 'government', 'banking',
  'telecom', 'healthcare', 'education', 'parking', 'entertainment',
] as const;
export const EMIRATES = ['abudhabi', 'dubai', 'sharjah', 'ajman', 'uaq', 'rak', 'fujairah'] as const;
export const PERSONAS = ['justArrived', 'family', 'moving', 'belong'] as const;

export interface AppSeed {
  id: string;
  name: string;
  badge: string;
  category: (typeof APP_CATEGORIES)[number];
  why: string;
  features: string[];
  needsUaeInfo: boolean | null;
  needsUaeInfoNote: string | null;
  iosUrl: string | null;
  androidUrl: string | null;
  webUrl: string | null;
  fees: string | null;
  setup: string[];
  suggestedFor: (typeof PERSONAS)[number][];
  emirates: (typeof EMIRATES)[number][] | null;
  source: string;
  reviewedBy: string | null;
  reviewedOn: string | null;
  nextReviewDue: string | null;
  errorLogId: string | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isStr = (v: unknown, max = 500): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isHttpsOrNull = (v: unknown) => v === null || (typeof v === 'string' && /^https:\/\/[^\s]+$/.test(v));
const isStrList = (v: unknown, max: number) => Array.isArray(v) && v.length <= max && v.every((x) => isStr(x, 200));
const oneOf = <T extends readonly string[]>(list: T, v: unknown): v is T[number] => typeof v === 'string' && (list as readonly string[]).includes(v);

/** Returns a list of problems; empty means the entry is valid. */
export function validateApp(e: Record<string, unknown>): string[] {
  const p: string[] = [];
  const need = (ok: boolean, msg: string) => { if (!ok) p.push(msg); };
  need(typeof e.id === 'string' && /^[a-z0-9-]{2,40}$/.test(e.id), 'id: lowercase letters, digits and dashes');
  need(isStr(e.name, 60), 'name: required (official name, never translated)');
  need(typeof e.badge === 'string' && /^[A-Za-z0-9]{1,3}$/.test(e.badge), 'badge: 1-3 letters (no logos)');
  need(oneOf(APP_CATEGORIES, e.category), `category: one of ${APP_CATEGORIES.join(', ')}`);
  need(isStr(e.why, 300), 'why: required');
  need(isStrList(e.features, 8), 'features: up to 8 short strings');
  need(e.needsUaeInfo === null || typeof e.needsUaeInfo === 'boolean', 'needsUaeInfo: true, false or null');
  need(e.needsUaeInfoNote === null || isStr(e.needsUaeInfoNote, 120), 'needsUaeInfoNote: string or null');
  for (const k of ['iosUrl', 'androidUrl', 'webUrl']) need(isHttpsOrNull(e[k]), `${k}: an official https URL you supplied, or null`);
  need(e.fees === null || isStr(e.fees, 200), 'fees: only if supplied, else null');
  need(isStrList(e.setup, 10), 'setup: up to 10 steps');
  need(Array.isArray(e.suggestedFor) && (e.suggestedFor as unknown[]).every((x) => oneOf(PERSONAS, x)), 'suggestedFor: personas');
  need(e.emirates === null || (Array.isArray(e.emirates) && (e.emirates as unknown[]).every((x) => oneOf(EMIRATES, x))), 'emirates: list or null (all)');
  need(isStr(e.source, 300), 'source: required (where this information comes from)');
  const reviewPair = (e.reviewedBy === null) === (e.reviewedOn === null);
  need(reviewPair, 'reviewedBy and reviewedOn: both set or both null');
  need(e.reviewedBy === null || isStr(e.reviewedBy, 80), 'reviewedBy: a person\'s name or null');
  for (const k of ['reviewedOn', 'nextReviewDue']) need(e[k] === null || (typeof e[k] === 'string' && ISO_DATE.test(e[k] as string)), `${k}: YYYY-MM-DD or null`);
  need(e.errorLogId === null || isStr(e.errorLogId, 20), 'errorLogId: string or null');
  const allowed = new Set(['id', 'name', 'badge', 'category', 'why', 'features', 'needsUaeInfo', 'needsUaeInfoNote',
    'iosUrl', 'androidUrl', 'webUrl', 'fees', 'setup', 'suggestedFor', 'emirates', 'source', 'reviewedBy', 'reviewedOn',
    'nextReviewDue', 'errorLogId']);
  for (const k of Object.keys(e)) need(allowed.has(k), `unknown field "${k}" (ratings, prices or counts are not accepted)`);
  return p;
}
