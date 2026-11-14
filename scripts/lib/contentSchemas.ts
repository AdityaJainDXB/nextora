// Validators for guide content types. Same strictness as validateApp: source
// required, links https or null, review pair, ISO dates, no unknown fields.
import { EMIRATES, PERSONAS } from './contentSchema';

export const GUIDE_TYPES = ['timeline', 'property', 'schools', 'offers', 'events', 'services'] as const;
export type GuideType = (typeof GUIDE_TYPES)[number];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
const isStr = (v: unknown, max = 500): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isHttpsOrNull = (v: unknown) => v === null || (typeof v === 'string' && /^https:\/\/[^\s]+$/.test(v));
const oneOf = (list: readonly string[], v: unknown) => typeof v === 'string' && list.includes(v);
const isDate = (v: unknown) => typeof v === 'string' && ISO_DATE.test(v) && !isNaN(Date.parse(v));
const isDateTime = (v: unknown) => typeof v === 'string' && ISO_DATETIME.test(v) && !isNaN(Date.parse(v));

const COMMON = ['id', 'source', 'reviewedBy', 'reviewedOn', 'nextReviewDue'];
const FIELDS: Record<GuideType, string[]> = {
  timeline: ['phase', 'persona', 'title', 'body', 'appIds'],
  property: ['section', 'title', 'body', 'officialUrl'],
  schools: ['kind', 'title', 'body', 'officialUrl'],
  offers: ['title', 'provider', 'body', 'validUntil'],
  events: ['title', 'body', 'emirate', 'startsAt', 'endsAt', 'place', 'hostUid', 'isSample'],
  services: ['category', 'name', 'body', 'officialUrl'],
};

/** Returns a list of problems; empty means the record is valid. */
export function validateGuide(type: GuideType, e: Record<string, unknown>): string[] {
  const p: string[] = [];
  const need = (ok: boolean, msg: string) => { if (!ok) p.push(msg); };
  need(typeof e.id === 'string' && /^[a-z0-9-]{2,60}$/.test(e.id), 'id: lowercase letters, digits and dashes');
  need(isStr(e.source, 300), 'source: required (where this information comes from)');
  need((e.reviewedBy === null) === (e.reviewedOn === null), 'reviewedBy and reviewedOn: both set or both null');
  need(e.reviewedBy === null || isStr(e.reviewedBy, 80), 'reviewedBy: a person\'s name or null');
  for (const k of ['reviewedOn', 'nextReviewDue']) need(e[k] === null || isDate(e[k]), `${k}: YYYY-MM-DD or null`);
  const title = () => need(isStr(e.title, 120), 'title: required');
  const body = () => need(isStr(e.body, 2000), 'body: required');
  const url = () => need(isHttpsOrNull(e.officialUrl), 'officialUrl: an official https URL you supplied, or null');

  switch (type) {
    case 'timeline':
      need(oneOf(['before', 'first48h', 'firstMonth', 'first90days'], e.phase), 'phase: before, first48h, firstMonth or first90days');
      need(Array.isArray(e.persona) && (e.persona as unknown[]).every((x) => oneOf(PERSONAS, x)), `persona: list of ${PERSONAS.join(', ')}`);
      title(); body();
      need(Array.isArray(e.appIds) && (e.appIds as unknown[]).length <= 10 && (e.appIds as unknown[]).every((x) => typeof x === 'string' && /^[a-z0-9-]{2,40}$/.test(x)), 'appIds: up to 10 Appverse ids');
      break;
    case 'property':
      need(oneOf(['platforms', 'checklist', 'questions'], e.section), 'section: platforms, checklist or questions');
      title(); body(); url();
      break;
    case 'schools':
      need(oneOf(['guide', 'curriculum', 'documents', 'questions'], e.kind), 'kind: guide, curriculum, documents or questions');
      title(); body(); url();
      break;
    case 'offers':
      title(); body();
      need(isStr(e.provider, 80), 'provider: required');
      need(isDate(e.validUntil), 'validUntil: required, YYYY-MM-DD');
      break;
    case 'events':
      title(); body();
      need(oneOf(EMIRATES, e.emirate), `emirate: one of ${EMIRATES.join(', ')}`);
      need(isDateTime(e.startsAt), 'startsAt: ISO date-time with timezone');
      need(e.endsAt === null || isDateTime(e.endsAt), 'endsAt: ISO date-time with timezone, or null');
      if (isDateTime(e.startsAt) && isDateTime(e.endsAt)) need(Date.parse(e.endsAt as string) >= Date.parse(e.startsAt as string), 'endsAt: must not be before startsAt');
      need(isStr(e.place, 200), 'place: required (text)');
      need(e.hostUid === null || isStr(e.hostUid, 128), 'hostUid: string or null');
      need(typeof e.isSample === 'boolean', 'isSample: true or false');
      break;
    case 'services':
      need(oneOf(['movers', 'simInternet', 'healthcare', 'banking', 'legal'], e.category), 'category: movers, simInternet, healthcare, banking or legal');
      need(isStr(e.name, 80), 'name: required (official name)');
      body(); url();
      break;
  }
  const allowed = new Set([...COMMON, ...FIELDS[type]]);
  for (const k of Object.keys(e)) need(allowed.has(k), `unknown field "${k}" (ratings, rankings, prices or counts are not accepted)`);
  return p;
}
