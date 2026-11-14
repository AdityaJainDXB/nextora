import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, connectAuthEmulator, reload, sendEmailVerification } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { Timestamp, doc, setDoc } from 'firebase/firestore';

const projectId = 'demo-nextora';
const email = 'demo@nextora.app';
const password = 'NextoraDemo2026!';
const host = process.env.FIREBASE_EMULATOR_HOST ?? '127.0.0.1';
const authUrl = `http://${host}:9099`;
const guideUid = 'demo_guide_001';
const now = Date.now();
const when = (offsetDays: number) => Timestamp.fromMillis(now + offsetDays * 86_400_000);

const privateProfile = {
  displayName: 'Aisha Rahman', role: 'newcomer', persona: 'justArrived', emirate: 'dubai',
  neighbourhood: 'Jumeirah Lake Towers', interests: ['food', 'outdoors', 'languages'], family: ['none'],
  languages: ['en', 'ar', 'hi'], visibility: { emirate: true, neighbourhood: true, interests: true, family: true, languages: true },
};
const guideProfile = {
  displayName: 'Omar Hassan', role: 'volunteer', persona: 'belong', emirate: 'dubai',
  neighbourhood: 'Al Barsha', interests: ['food', 'outdoors', 'volunteering'], family: ['none'],
  languages: ['en', 'ar', 'hi'], visibility: { emirate: true, neighbourhood: true, interests: true, family: true, languages: true },
};

async function ensureDemoAuthUser() {
  const app = initializeApp({ apiKey: 'demo-key', authDomain: `${projectId}.firebaseapp.com`, projectId, appId: 'demo-app' }, 'nextora-demo-seeder');
  const auth = getAuth(app);
  connectAuthEmulator(auth, authUrl, { disableWarnings: true });
  let user;
  try { user = (await createUserWithEmailAndPassword(auth, email, password)).user; }
  catch (e) {
    if ((e as { code?: string }).code !== 'auth/email-already-in-use') throw e;
    user = (await signInWithEmailAndPassword(auth, email, password)).user;
  }

  if (!user.emailVerified) {
    await sendEmailVerification(user);
    const codes = await fetch(`${authUrl}/emulator/v1/projects/${projectId}/oobCodes`);
    if (!codes.ok) throw new Error(`Auth emulator could not provide the demo verification link (${codes.status}).`);
    const { oobCodes } = await codes.json() as { oobCodes: { email: string; requestType: string; oobLink: string }[] };
    const link = oobCodes.filter((c) => c.email === email && c.requestType === 'VERIFY_EMAIL').pop()?.oobLink;
    if (!link) throw new Error('Auth emulator did not return a demo verification link.');
    const verified = await fetch(link.replace('localhost', host).replace('127.0.0.1', host));
    if (!verified.ok) throw new Error(`Auth emulator rejected the demo verification link (${verified.status}).`);
    await reload(user);
  }
  if (!user.emailVerified) throw new Error('Demo account email remains unverified in the Auth emulator.');
  return user.uid;
}

async function main() {
  const uid = await ensureDemoAuthUser();
  const env = await initializeTestEnvironment({ projectId, firestore: { host, port: 8080 } });
  try {
    await env.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      const put = (path: string, data: Record<string, unknown>) => setDoc(doc(firestore, path), data);
      await put(`users/${uid}`, { ageConfirmedAt: when(-30), createdAt: when(-30), language: 'en', matchingOn: true, assistantOn: true, showSample: true });
      await put(`users/${uid}/private/profile`, { ...privateProfile, updatedAt: when(-30) });
      await put(`publicProfiles/${uid}`, { ...privateProfile, isTeam: false, updatedAt: when(-30) });
      await put(`users/${uid}/progress/checklist`, { items: { guide: true, firstNewcomer: true }, updatedAt: when(-1) });

      await put(`users/${guideUid}`, { ageConfirmedAt: when(-100), createdAt: when(-100), language: 'en' });
      await put(`users/${guideUid}/private/profile`, { ...guideProfile, updatedAt: when(-100) });
      await put(`publicProfiles/${guideUid}`, { ...guideProfile, isTeam: false, updatedAt: when(-100) });

      const posts = [
        ['dubai-first-week', 'newcomers', 'A good first-week checklist for Dubai?', 'I have just arrived in JLT. What should I prioritise during my first week, and which details should I confirm through official sources?', 'en', 'dubai'],
        ['school-visit-questions', 'schoolsFamily', 'Questions to ask on a school visit', 'We are comparing schools for our family. What practical questions helped you understand the daily routine and transport?', 'en', 'abudhabi'],
        ['sharjah-markets', 'foodGroceries', 'Favourite local markets in Sharjah?', 'I would love recommendations for friendly neighbourhood markets and good places to find fresh produce.', 'en', 'sharjah'],
        ['safe-rental-checks', 'housing', 'What do you check before renting?', 'I am viewing a flat this weekend. Which items should I inspect and what should I read carefully before signing?', 'en', 'ajman'],
        ['weekend-walks', 'events', 'Easy weekend walks around Ras Al Khaimah', 'Looking for relaxed outdoor plans and public places to explore with new friends.', 'en', 'rak'],
        ['fujairah-community', 'newcomers', 'How did you meet people in Fujairah?', 'I recently moved and would love to find welcoming community activities and groups.', 'en', 'fujairah'],
        ['abu-dhabi-documents', 'visasPaperwork', 'How do you organise important documents?', 'What is your simple system for keeping paperwork and renewal reminders organised?', 'en', 'abudhabi'],
        ['ajman-commute', 'transport', 'Tips for learning a new commute', 'I am learning a new route for work. What helped you plan the trip without feeling rushed?', 'en', 'ajman'],
      ] as const;
      for (const [index, [id, topic, title, body, language, emirate]] of posts.entries()) {
        await put(`forumPosts/${id}`, {
          authorUid: guideUid, displayName: `Sample resident · ${emirate}`, topic, emirate, language,
          title, body, createdAt: when(-(index + 1)), updatedAt: when(-1),
          hidden: false, deleted: false, isSample: true, upvotes: 3 + index,
        });
      }
      const replySamples = [
        ['dubai-first-week', 'A useful first step is to map your daily routes. Confirm residency and service requirements with official UAE sources.'],
        ['school-visit-questions', 'We asked about the school day, transport routes, language support and how families receive updates.'],
        ['safe-rental-checks', 'Take notes during the viewing and read every clause before paying or signing. This is a sample, not legal advice.'],
        ['fujairah-community', 'Community walks and library events can be a gentle way to meet people. Check the organiser details first.'],
      ];
      for (const [postId, body] of replySamples) {
        await put(`forumPosts/${postId}/replies/demo-guide-reply`, { authorUid: guideUid, displayName: 'Omar · sample guide', body, createdAt: when(-1), deleted: false, isSample: true });
      }

      const connectionId = [uid, guideUid].sort().join('_');
      await put(`connections/${connectionId}`, {
        members: [uid, guideUid].sort(), from: uid, to: guideUid, status: 'connected',
        intro: 'Hi Omar, I would love a few tips for getting to know my neighbourhood.', reveal: { [uid]: false, [guideUid]: false },
        createdAt: when(-3), updatedAt: when(-1),
      });
      const messages = [
        [guideUid, 'Welcome to Dubai, Aisha! How are you settling in so far?', -3],
        [uid, 'Thank you! I am exploring JLT and learning my commute.', -3],
        [guideUid, 'That is a great start. Want a few ideas for a relaxed weekend?', -2],
        [uid, 'Yes please. I would also love to find a local market.', -2],
        [guideUid, 'I have added a couple of sample ideas to the forum feed. Check dates and details before you go.', -1],
      ] as const;
      for (const [i, [from, text, day]] of messages.entries()) {
        await put(`chats/${connectionId}/messages/demo-${String(i + 1).padStart(2, '0')}`, { from, text, at: when(day) });
      }

      const apps = [
        ['demo-neighbourhood-map', 'Neighbourhood Map (Demo)', 'MAP', 'transport', 'A fictional guide card showing how local discovery appears in Appverse.', ['Explore a sample area', 'Save a place for later']],
        ['demo-market-finder', 'Market Finder (Demo)', 'SHOP', 'shopping', 'A fictional card for browsing neighbourhood markets.', ['Browse sample markets', 'Compare opening hours']],
        ['demo-home-checklist', 'Home Setup Checklist (Demo)', 'HOME', 'property', 'A fictional checklist for organising a first home.', ['Review sample setup steps', 'Track your progress']],
        ['demo-family-planner', 'Family Planner (Demo)', 'FAMILY', 'education', 'A fictional card for collecting school visit questions.', ['Save questions', 'Prepare for a visit']],
      ] as const;
      for (const [id, name, badge, category, why, features] of apps) {
        await put(`content/apps/items/${id}`, {
          id, name, badge, category, why, features, needsUaeInfo: null, needsUaeInfoNote: 'Fictional demo content; not a real service.',
          iosUrl: null, androidUrl: null, webUrl: null, fees: null, setup: ['Open this fictional demo card', 'Review the sample steps'],
          suggestedFor: ['justArrived', 'family', 'moving', 'belong'], emirates: null,
          source: 'Fictional demo content', reviewedBy: 'Demo fixture', reviewedOn: '2026-10-31', nextReviewDue: null, errorLogId: null,
        });
      }

      for (const [id, title, body, emirate, offset] of [
        ['demo-coffee-meetup', 'Community coffee and introductions', 'A fictional low-key meetup card for exploring the events screen with the demo account.', 'dubai', 4],
        ['demo-sharjah-market-walk', 'Sample market walk', 'A fictional group outing card. Confirm real venues and event details outside this demo.', 'sharjah', 8],
      ] as const) {
        await put(`events/${id}`, {
          hostUid: guideUid, hostName: 'Omar · demo guide', title, body, place: 'Demo venue (fictional)', emirate,
          language: 'en', startsAt: when(offset), endsAt: when(offset), capacity: 12, status: 'scheduled', hidden: false, isSample: true,
          createdAt: when(-1), updatedAt: when(-1),
        });
      }
    });
  } finally { await env.cleanup(); }
  console.log(`Demo emulator is ready. Sign in with ${email} / ${password}`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
