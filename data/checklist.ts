// "First 48 hours" checklist. Text lives in locales under `check.<id>` and
// `check.<id>Desc`. `official` keeps the official service name in English.
import type { Persona, Role } from '../src/store/types';

export interface ChecklistItem {
  id: string;
  appId: string | null;
  official: string | null;
  icon: string; // Ionicons name (fallback)
  art: string; // picture icon name (src/components/icons/registry.ts)
}

export const checklistItems: Record<string, ChecklistItem> = {
  sim: { id: 'sim', appId: null, official: null, icon: 'phone-portrait-outline', art: 'sim-card' },
  uaepass: { id: 'uaepass', appId: 'uaepass', official: 'UAE PASS', icon: 'finger-print-outline', art: 'fingerprint' },
  transport: { id: 'transport', appId: 'rta', official: 'nol', icon: 'bus-outline', art: 'tram' },
  groceries: { id: 'groceries', appId: 'carrefour', official: null, icon: 'basket-outline', art: 'shopping-cart' },
  doctor: { id: 'doctor', appId: null, official: null, icon: 'medkit-outline', art: 'stethoscope' },
  utilities: { id: 'utilities', appId: 'dewa', official: 'DEWA / ADDC / SEWA', icon: 'flash-outline', art: 'plug' },
  schools: { id: 'schools', appId: null, official: 'KHDA / ADEK / SPEA', icon: 'school-outline', art: 'school' },
  guide: { id: 'guide', appId: null, official: null, icon: 'people-outline', art: 'users' },
  address: { id: 'address', appId: null, official: null, icon: 'home-outline', art: 'home' },
  community: { id: 'community', appId: null, official: null, icon: 'heart-outline', art: 'heart' },
  guideProfile: { id: 'guideProfile', appId: null, official: null, icon: 'person-outline', art: 'user-round' },
  firstNewcomer: { id: 'firstNewcomer', appId: null, official: null, icon: 'hand-left-outline', art: 'message-circle' },
  privacyRead: { id: 'privacyRead', appId: null, official: null, icon: 'shield-checkmark-outline', art: 'lock' },
};

const order: Record<Persona | 'volunteer', string[]> = {
  justArrived: ['sim', 'uaepass', 'transport', 'groceries', 'doctor', 'guide'],
  family: ['sim', 'uaepass', 'doctor', 'schools', 'groceries', 'transport', 'guide'],
  moving: ['address', 'utilities', 'transport', 'groceries', 'doctor', 'guide'],
  belong: ['guide', 'community', 'doctor', 'uaepass'],
  volunteer: ['guideProfile', 'privacyRead', 'firstNewcomer'],
};

export function checklistFor(role: Role, persona: Persona): ChecklistItem[] {
  const ids = role === 'volunteer' ? order.volunteer : order[persona];
  return ids.map((id) => checklistItems[id]);
}
