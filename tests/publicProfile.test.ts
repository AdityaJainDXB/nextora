import { describe, expect, it } from 'vitest';
import { buildPublicProfile, type PrivateProfile } from '../src/shared/publicProfile';

const base: PrivateProfile = {
  displayName: 'Sam', role: 'newcomer', persona: 'family', emirate: 'dubai', neighbourhood: 'Al Nahda',
  reason: 'work', interests: ['food'], family: ['kids'], languages: ['hi', 'en'],
  visibility: { emirate: true, neighbourhood: false, interests: true, family: false, languages: true },
};

describe('buildPublicProfile', () => {
  it('copies only visible fields', () => {
    const p = buildPublicProfile(base, false);
    expect(p).toEqual({ displayName: 'Sam', role: 'newcomer', persona: 'family', isTeam: false, emirate: 'dubai', interests: ['food'], languages: ['hi', 'en'] });
  });
  it('never publishes hidden fields or the reason for coming', () => {
    const p = buildPublicProfile(base, false) as unknown as Record<string, unknown>;
    expect(p.neighbourhood).toBeUndefined();
    expect(p.family).toBeUndefined();
    expect(p.reason).toBeUndefined();
  });
  it('treats missing visibility as hidden', () => {
    const p = buildPublicProfile({ ...base, visibility: {} }, false) as unknown as Record<string, unknown>;
    for (const f of ['emirate', 'neighbourhood', 'interests', 'family', 'languages']) expect(p[f]).toBeUndefined();
  });
  it('marks team accounts from the server-side claim only', () => {
    expect(buildPublicProfile(base, true).isTeam).toBe(true);
  });
});
