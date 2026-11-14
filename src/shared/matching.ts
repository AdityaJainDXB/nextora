// Transparent matching score, run only on the server over real users.
// Every reason shown in the app comes from a real overlap computed here.
// `me` is the caller's private profile (only their visible fields are used);
// `other` is someone's public profile, which already lacks their hidden fields.

export const WEIGHTS = { language: 40, emirate: 20, family: 15, interests: 15, persona: 10 };

export type MatchLabel = 'strong' | 'possible' | 'weak';
export type Reason =
  | { kind: 'lang'; langs: string[] }
  | { kind: 'emirate'; emirate: string }
  | { kind: 'interests'; items: string[] }
  | { kind: 'family'; items: string[] }
  | { kind: 'persona'; persona: string };

export interface Me {
  role: 'newcomer' | 'volunteer';
  persona: string;
  emirate: string;
  interests: string[];
  family: string[];
  languages: string[];
  visibility: Partial<Record<'emirate' | 'interests' | 'family' | 'languages', boolean>>;
}
export interface Other {
  uid: string;
  role: 'newcomer' | 'volunteer';
  persona: string;
  emirate?: string;
  interests?: string[];
  family?: string[];
  languages?: string[];
}
export interface Match { uid: string; score: number; label: MatchLabel; reasons: Reason[] }

const overlap = (a: string[] = [], b: string[] = []) => a.filter((x) => b.includes(x));

export function scoreProfile(me: Me, other: Other): Match {
  const v = me.visibility ?? {};
  const reasons: Reason[] = [];
  let score = 0;

  // You can only be matched on what you share yourself.
  const langs = v.languages ? overlap(me.languages, other.languages) : [];
  if (langs.length) {
    // A shared language other than English counts more than English alone.
    score += langs.some((l) => l !== 'en') ? WEIGHTS.language : WEIGHTS.language * 0.6;
    reasons.push({ kind: 'lang', langs });
  }
  if (v.emirate && other.emirate && me.emirate === other.emirate) {
    score += WEIGHTS.emirate;
    reasons.push({ kind: 'emirate', emirate: me.emirate });
  }
  const fam = v.family ? overlap(me.family.filter((f) => f !== 'none'), other.family) : [];
  if (fam.length) {
    score += Math.min(WEIGHTS.family, fam.length * 8);
    reasons.push({ kind: 'family', items: fam });
  }
  const ints = v.interests ? overlap(me.interests, other.interests) : [];
  if (ints.length) {
    score += Math.min(WEIGHTS.interests, ints.length * 6);
    reasons.push({ kind: 'interests', items: ints });
  }
  // A guide's persona is the kind of newcomer they like to help.
  if (me.role === 'newcomer' && other.role === 'volunteer' && other.persona === me.persona) {
    score += WEIGHTS.persona;
    reasons.push({ kind: 'persona', persona: me.persona });
  }
  const label: MatchLabel = score >= 60 ? 'strong' : score >= 35 ? 'possible' : 'weak';
  return { uid: other.uid, score, label, reasons };
}

/** Newcomers see guides, guides see newcomers. Blocks are removed before this. */
export function rankMatches(me: Me, pool: Other[], limit = 50): Match[] {
  const wanted = me.role === 'newcomer' ? 'volunteer' : 'newcomer';
  return pool
    .filter((p) => p.role === wanted)
    .map((p) => scoreProfile(me, p))
    .sort((a, b) => b.score - a.score || a.uid.localeCompare(b.uid))
    .slice(0, limit);
}

// ---- Message safety ----
const PHONE = /(?:\+?\d[\s\-().]*){8,}/;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const LINK = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|ae|io|me|ly|link|xyz)\b/i;

/**
 * Contact details and links are not allowed in intros and messages: contact
 * details are shared only through the mutual reveal, and links are a common
 * scam vector. Returns the reason or null.
 */
export function unsafeText(text: string): 'contact' | 'link' | null {
  if (PHONE.test(text) || EMAIL.test(text)) return 'contact';
  if (LINK.test(text)) return 'link';
  return null;
}
