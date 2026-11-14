export type Role = 'newcomer' | 'volunteer';
export type Persona = 'justArrived' | 'family' | 'moving' | 'belong';
export type Emirate = 'abudhabi' | 'dubai' | 'sharjah' | 'ajman' | 'uaq' | 'rak' | 'fujairah';
export type Interest =
  | 'food' | 'sports' | 'faith' | 'music' | 'outdoors' | 'tech'
  | 'parenting' | 'career' | 'languages' | 'arts' | 'cooking' | 'volunteering';
export type FamilyNeed = 'kids' | 'schools' | 'elderly' | 'pets' | 'none';

export type Field = 'emirate' | 'neighbourhood' | 'interests' | 'family' | 'languages';

export interface Profile {
  displayName: string;
  role: Role;
  persona: Persona;
  emirate: Emirate;
  neighbourhood: string;
  interests: Interest[];
  family: FamilyNeed[];
  languages: string[];
  visibility: Record<Field, boolean>;
  /** Why they came (optional, never shown to others). */
  reason?: Reason | null;
}

export type Reason = 'work' | 'family' | 'business' | 'study';
export const ALL_REASONS: Reason[] = ['work', 'family', 'business', 'study'];

export type Decision = 'accepted' | 'rejected' | 'ignored';

export type ConsentKey = 'analytics' | 'notifications' | 'aiTranslate' | 'aiAssist' | 'aiAssistant';
export interface ConsentEntry {
  granted: boolean;
  version: string;
  at: number;
}

/** What other users may see of someone. Built server-side from visible fields only (Stage 2). */
export interface PublicProfile {
  displayName: string;
  role: Role;
  persona?: Persona;
  emirate?: Emirate;
  languages?: string[];
  interests?: Interest[];
  family?: FamilyNeed[];
  neighbourhood?: string;
  isTeam: boolean;
}

export interface Report {
  kind: 'translation' | 'user' | 'assistant';
  target: string;
  note: string;
  lang: string;
  at: number;
}

export const ALL_EMIRATES: Emirate[] = ['abudhabi', 'dubai', 'sharjah', 'ajman', 'uaq', 'rak', 'fujairah'];
export const ALL_INTERESTS: Interest[] = [
  'food', 'sports', 'faith', 'music', 'outdoors', 'tech',
  'parenting', 'career', 'languages', 'arts', 'cooking', 'volunteering',
];
export const ALL_FAMILY: FamilyNeed[] = ['kids', 'schools', 'elderly', 'pets', 'none'];
export const ALL_PERSONAS: Persona[] = ['justArrived', 'family', 'moving', 'belong'];
