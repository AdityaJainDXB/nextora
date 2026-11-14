// Live, human-supplied guide content: content/<type>/items in Firestore, loaded only by
// scripts/seedGuides.ts from data/seed/<type>.json. The app never invents records.
import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { fb } from './firebase';
import { useAuth } from './auth';
import type { Emirate, Persona } from '../store/types';

export interface Reviewed {
  id: string;
  source: string | null;
  reviewedBy: string | null;
  reviewedOn: string | null;
  nextReviewDue: string | null;
}

export type TimelinePhase = 'before' | 'first48h' | 'firstMonth' | 'first90days';
export const TIMELINE_PHASES: TimelinePhase[] = ['before', 'first48h', 'firstMonth', 'first90days'];
export interface TimelineItem extends Reviewed { phase: TimelinePhase; persona: Persona[]; title: string; body: string; appIds: string[] }

export type PropertySection = 'platforms' | 'checklist' | 'questions';
export const PROPERTY_SECTIONS: PropertySection[] = ['platforms', 'checklist', 'questions'];
export interface PropertyItem extends Reviewed { section: PropertySection; title: string; body: string; officialUrl: string | null }

export type SchoolKind = 'guide' | 'curriculum' | 'documents' | 'questions';
export const SCHOOL_KINDS: SchoolKind[] = ['guide', 'curriculum', 'documents', 'questions'];
/** No rankings or ratings, by design. */
export interface SchoolItem extends Reviewed { kind: SchoolKind; title: string; body: string; officialUrl: string | null }

export interface OfferItem extends Reviewed { title: string; provider: string; body: string; validUntil: string; source: string }

export interface EventItem extends Reviewed {
  title: string; body: string; emirate: Emirate; startsAt: string; endsAt: string | null;
  place: string; hostUid: string | null; isSample: boolean;
}

export type ServiceCategory = 'movers' | 'simInternet' | 'healthcare' | 'banking' | 'legal';
export const SERVICE_CATEGORIES: ServiceCategory[] = ['movers', 'simInternet', 'healthcare', 'banking', 'legal'];
export interface ServiceItem extends Reviewed { category: ServiceCategory; name: string; body: string; officialUrl: string | null }

export interface ContentTypes {
  timeline: TimelineItem; property: PropertyItem; schools: SchoolItem;
  offers: OfferItem; events: EventItem; services: ServiceItem;
}
export type GuideType = keyof ContentTypes;

export type GuideStatus = 'notConfigured' | 'loading' | 'ready' | 'error';
export interface GuideState<T> { status: GuideStatus; items: T[]; retry: () => void }

/** Live listener on content/<type>/items, only while signed in. */
export function useContent<K extends GuideType>(type: K): GuideState<ContentTypes[K]> {
  const { status: auth } = useAuth();
  const [nonce, setNonce] = useState(0);
  const [st, setSt] = useState<{ status: GuideStatus; items: ContentTypes[K][] }>({ status: fb() ? 'loading' : 'notConfigured', items: [] });
  useEffect(() => {
    const s = fb();
    if (!s) { setSt({ status: 'notConfigured', items: [] }); return; }
    if (auth !== 'ready') return;
    setSt((x) => ({ ...x, status: 'loading' }));
    return onSnapshot(
      collection(s.db, 'content', type, 'items'),
      (snap) => setSt({ status: 'ready', items: snap.docs.map((d) => ({ ...(d.data() as ContentTypes[K]), id: d.id })) }),
      () => setSt((x) => ({ ...x, status: 'error' })),
    );
  }, [auth, type, nonce]);
  return { ...st, retry: () => setNonce((n) => n + 1) };
}

/** Local YYYY-MM-DD for today. */
export const todayIso = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Offers are shown only until their validUntil date (inclusive). */
export const isOfferLive = (o: Pick<OfferItem, 'validUntil'>, today = todayIso()) =>
  typeof o.validUntil === 'string' && o.validUntil >= today;
