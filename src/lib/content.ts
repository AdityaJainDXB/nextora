// Admin-managed content (Appverse etc.). V5 rule: factual entries come only from
// Firestore `content/apps/items`, loaded by scripts/seedContent.ts from data/seed/*.json
// that a person supplied. The app never ships or invents entries of its own.
import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { fb } from './firebase';
import { useAuth } from './auth';
import type { Emirate, Persona } from '../store/types';

export type AppCategory =
  | 'food' | 'transport' | 'shopping' | 'property' | 'government' | 'banking'
  | 'telecom' | 'healthcare' | 'education' | 'parking' | 'entertainment';

export const categories: AppCategory[] = [
  'food', 'transport', 'shopping', 'property', 'government', 'banking',
  'telecom', 'healthcare', 'education', 'parking', 'entertainment',
];

export interface AppEntry {
  id: string;
  name: string; // official name, never translated
  badge: string; // text badge in place of a logo
  category: AppCategory;
  why: string;
  features: string[];
  needsUaeInfo: boolean | null;
  needsUaeInfoNote: string | null;
  iosUrl: string | null;
  androidUrl: string | null;
  webUrl: string | null;
  fees: string | null;
  setup: string[];
  suggestedFor: Persona[];
  /** Emirates where it applies; null means all seven. */
  emirates: Emirate[] | null;
  source: string | null;
  reviewedBy: string | null;
  reviewedOn: string | null;
  nextReviewDue: string | null;
  errorLogId: string | null;
}

export type ContentStatus = 'notConfigured' | 'loading' | 'ready' | 'error';
interface AppsState { status: ContentStatus; items: AppEntry[] }

const AppsCtx = createContext<AppsState>({ status: 'loading', items: [] });

/** One live listener for the whole app; content edits appear without a reload. */
export function ContentProvider({ children }: { children: React.ReactNode }) {
  const { status: auth } = useAuth();
  const [state, setState] = useState<AppsState>({ status: fb() ? 'loading' : 'notConfigured', items: [] });

  useEffect(() => {
    const s = fb();
    if (!s) return setState({ status: 'notConfigured', items: [] });
    if (auth !== 'ready') return; // content is readable once signed in
    setState((x) => ({ ...x, status: 'loading' }));
    return onSnapshot(
      collection(s.db, 'content', 'apps', 'items'),
      (snap) => setState({
        status: 'ready',
        items: snap.docs
          .map((d) => ({ ...(d.data() as AppEntry), id: d.id }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }),
      () => setState((x) => ({ ...x, status: 'error' })),
    );
  }, [auth]);

  return React.createElement(AppsCtx.Provider, { value: state }, children);
}

/** Appverse entries from Firestore. Empty until a person supplies seed content (docs/HUMAN_TASKS.md 3.1). */
export const useApps = () => useContext(AppsCtx);

export const reviewState = (a: Pick<AppEntry, 'reviewedBy' | 'reviewedOn' | 'nextReviewDue'>, today = new Date()) => {
  if (!a.reviewedBy || !a.reviewedOn) return 'notReviewed' as const;
  if (a.nextReviewDue && new Date(a.nextReviewDue) < today) return 'needsRecheck' as const;
  return 'reviewed' as const;
};
