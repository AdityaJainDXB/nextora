import { describe, expect, it } from 'vitest';
import { rankMatches, scoreProfile, unsafeText, type Me } from '../src/shared/matching';

const me: Me = {
  role: 'newcomer', persona: 'family', emirate: 'dubai', interests: ['food', 'tech'], family: ['kids'], languages: ['hi', 'en'],
  visibility: { emirate: true, interests: true, family: true, languages: true },
};

describe('scoreProfile', () => {
  it('weighs a shared non-English language highest and explains every point', () => {
    const m = scoreProfile(me, { uid: 'g', role: 'volunteer', persona: 'family', emirate: 'dubai', languages: ['hi'], interests: ['food'], family: ['kids'] });
    expect(m.label).toBe('strong');
    expect(m.reasons.map((r) => r.kind)).toEqual(['lang', 'emirate', 'family', 'interests', 'persona']);
  });
  it('English alone counts less than a shared mother tongue', () => {
    const en = scoreProfile(me, { uid: 'a', role: 'volunteer', persona: 'x', languages: ['en'] });
    const hi = scoreProfile(me, { uid: 'b', role: 'volunteer', persona: 'x', languages: ['hi'] });
    expect(hi.score).toBeGreaterThan(en.score);
  });
  it('fields I hide are not used to match me', () => {
    const hidden = { ...me, visibility: { emirate: false, interests: false, family: false, languages: false } };
    const m = scoreProfile(hidden, { uid: 'g', role: 'volunteer', persona: 'none', emirate: 'dubai', languages: ['hi'], interests: ['food'], family: ['kids'] });
    expect(m.reasons).toEqual([]);
    expect(m.label).toBe('weak');
  });
  it('fields the other person hid (absent) never produce a reason', () => {
    const m = scoreProfile(me, { uid: 'g', role: 'volunteer', persona: 'none' });
    expect(m.reasons).toEqual([]);
  });
});

describe('rankMatches', () => {
  it('newcomers only see guides, best first', () => {
    const r = rankMatches(me, [
      { uid: 'n1', role: 'newcomer', persona: 'family', languages: ['hi'] },
      { uid: 'g1', role: 'volunteer', persona: 'x', languages: ['en'] },
      { uid: 'g2', role: 'volunteer', persona: 'family', languages: ['hi'], emirate: 'dubai' },
    ]);
    expect(r.map((m) => m.uid)).toEqual(['g2', 'g1']);
  });
});

describe('unsafeText', () => {
  it('blocks phone numbers, emails and links before the mutual reveal', () => {
    expect(unsafeText('call me on +971 50 123 4567')).toBe('contact');
    expect(unsafeText('mail me sam@example.com')).toBe('contact');
    expect(unsafeText('see https://example.com/x')).toBe('link');
    expect(unsafeText('check bit.ly now')).toBe('link');
  });
  it('allows ordinary messages, including short numbers', () => {
    expect(unsafeText('Meet at 5pm near metro exit 2?')).toBeNull();
    expect(unsafeText('मैं 2 साल से दुबई में हूँ')).toBeNull();
  });
});
