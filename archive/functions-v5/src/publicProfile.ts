// Builds publicProfiles/{uid} from users/{uid}/private/profile. Pure, so it is unit
// tested directly. Only fields the person left visible are copied; anything not
// copied can never be returned to another user, because publicProfiles is the
// only profile document other users can read.

export type Field = 'emirate' | 'neighbourhood' | 'interests' | 'family' | 'languages';

export interface PrivateProfile {
  displayName: string;
  role: 'newcomer' | 'volunteer';
  persona: string;
  emirate: string;
  neighbourhood: string;
  reason?: string;
  interests: string[];
  family: string[];
  languages: string[];
  visibility: Partial<Record<Field, boolean>>;
}

export interface PublicProfile {
  displayName: string;
  role: 'newcomer' | 'volunteer';
  persona: string;
  isTeam: boolean;
  emirate?: string;
  neighbourhood?: string;
  interests?: string[];
  family?: string[];
  languages?: string[];
}

const FIELDS: Field[] = ['emirate', 'neighbourhood', 'interests', 'family', 'languages'];

export function buildPublicProfile(p: PrivateProfile, isTeam: boolean): PublicProfile {
  const out: PublicProfile = {
    displayName: p.displayName,
    role: p.role,
    persona: p.persona,
    isTeam,
  };
  for (const f of FIELDS) {
    // Missing visibility means hidden: never publish by default.
    if (p.visibility?.[f] !== true) continue;
    const v = p[f];
    if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    (out as unknown as Record<string, unknown>)[f] = v;
  }
  // `reason` (why they came) is never public.
  return out;
}
