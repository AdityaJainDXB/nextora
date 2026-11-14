// Writes clearly labelled SAMPLE forum posts and replies so the forum isn't empty
// in demos. Every doc has isSample: true (the app shows a "Sample content" badge and
// hides them when the person turns sample content off). The rules allow sample
// writes only for moderators. The text is ordinary newcomer questions and answers:
// no facts, fees, links or statistics.
//
//   npm run seed:sample -- --env local      (add)
//   npm run seed:remove -- --env local      (= seedSample.ts --remove: delete every isSample doc)
import {
  collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where, writeBatch, type Firestore,
} from 'firebase/firestore';
import { signInModerator } from './lib/signIn';

interface SampleReply { name: string; body: string }
interface SamplePost {
  id: string; name: string; topic: string; emirate: string; language: string; title: string; body: string; replies: SampleReply[];
}

const POSTS: SamplePost[] = [
  {
    id: 'sample-01', name: 'Sample resident, Dubai', topic: 'newcomers', emirate: 'dubai', language: 'en',
    title: 'Just arrived last week. What did you sort out first?',
    body: 'Hi everyone, we moved here last week and everything feels new. What were the first few things you sorted out after arriving? Any order you would recommend?',
    replies: [
      { name: 'Sample volunteer, Dubai', body: 'Welcome! I made a simple list and did one thing a day. Asking a colleague or neighbour what they did first helped me a lot.' },
      { name: 'Sample resident, Sharjah', body: 'Take it slowly. I kept all my papers in one folder so I always had them with me when I needed them.' },
    ],
  },
  {
    id: 'sample-02', name: 'Sample resident, Abu Dhabi', topic: 'schoolsFamily', emirate: 'abudhabi', language: 'ar',
    title: 'كيف اخترتم مدرسة لأطفالكم؟',
    body: 'وصلنا حديثًا مع طفلين. كيف بدأتم البحث عن مدرسة مناسبة؟ ما الأسئلة التي طرحتموها عند الزيارة؟',
    replies: [
      { name: 'Sample volunteer, Abu Dhabi', body: 'زرنا ثلاث مدارس قبل أن نقرر. سألنا عن طريقة التدريس والأنشطة بعد الدوام، وتحدثنا مع أولياء أمور آخرين.' },
    ],
  },
  {
    id: 'sample-03', name: 'Sample resident, Sharjah', topic: 'housing', emirate: 'sharjah', language: 'hi',
    title: 'पहला फ़्लैट ढूँढते समय किन बातों का ध्यान रखें?',
    body: 'मैं अपना पहला फ़्लैट ढूँढ रहा हूँ। देखने जाते समय आप लोग क्या-क्या जाँचते हैं? कोई सलाह हो तो बताइए।',
    replies: [
      { name: 'Sample volunteer, Sharjah', body: 'मैं हमेशा दिन में और शाम को दोनों समय इलाका देखने जाता हूँ। और कोई भी पैसा देने से पहले अनुबंध ध्यान से पढ़ता हूँ।' },
      { name: 'Sample resident, Ajman', body: 'पानी, एसी और खिड़कियाँ ख़ुद चलाकर देखें। पड़ोसियों से बात करना भी अच्छा रहता है।' },
    ],
  },
  {
    id: 'sample-04', name: 'Sample resident, Ajman', topic: 'jobsWork', emirate: 'ajman', language: 'ur',
    title: 'نوکری کی تلاش کہاں سے شروع کی؟',
    body: 'میں حال ہی میں آیا ہوں اور کام ڈھونڈ رہا ہوں۔ آپ لوگوں نے شروعات کیسے کی؟ سی وی کے بارے میں کوئی مشورہ؟',
    replies: [
      { name: 'Sample volunteer, Ajman', body: 'میں نے اپنی سی وی مختصر رکھی اور ہر درخواست کے لیے تھوڑی تبدیل کی۔ یاد رکھیں، اصل آجر نوکری کے لیے پیسے نہیں مانگتے۔' },
    ],
  },
  {
    id: 'sample-05', name: 'Sample resident, Ras Al Khaimah', topic: 'foodGroceries', emirate: 'rak', language: 'ml',
    title: 'നാട്ടിലെ പോലെ പാചകം ചെയ്യാൻ സാധനങ്ങൾ എവിടെ കിട്ടും?',
    body: 'ഞങ്ങൾ അടുത്തിടെ ഇവിടെ എത്തി. നാട്ടിലെ വിഭവങ്ങൾ ഉണ്ടാക്കാനുള്ള സാധനങ്ങൾ എവിടെ നിന്നാണ് നിങ്ങൾ വാങ്ങുന്നത്?',
    replies: [
      { name: 'Sample volunteer, Ras Al Khaimah', body: 'അടുത്തുള്ള ചെറിയ കടകളിൽ ചോദിച്ചു നോക്കൂ. പലപ്പോഴും അവർ ആവശ്യമുള്ളത് വരുത്തിത്തരും.' },
    ],
  },
  {
    id: 'sample-06', name: 'Sample resident, Dubai', topic: 'transport', emirate: 'dubai', language: 'tl',
    title: 'Paano kayo nasanay sa pag-commute dito?',
    body: 'Bago lang ako at wala pang sasakyan. Paano ninyo pinlano ang biyahe papunta sa trabaho noong una?',
    replies: [
      { name: 'Sample volunteer, Dubai', body: 'Sinubukan ko muna ang ruta tuwing weekend para hindi ako magmadali sa unang araw ng trabaho.' },
      { name: 'Sample resident, Dubai', body: 'Nagtanong ako sa mga katrabaho kung anong ruta ang ginagamit nila. Malaking tulong iyon.' },
    ],
  },
  {
    id: 'sample-07', name: 'Sample resident, Fujairah', topic: 'health', emirate: 'fujairah', language: 'ru',
    title: 'Как вы нашли семейного врача?',
    body: 'Мы недавно переехали с ребёнком. Как вы выбирали клинику и врача? На что обращали внимание?',
    replies: [
      { name: 'Sample volunteer, Fujairah', body: 'Я спрашивала соседей и коллег, к кому они ходят. Потом сходили на обычный приём, чтобы познакомиться.' },
    ],
  },
  {
    id: 'sample-08', name: 'Sample resident, Umm Al Quwain', topic: 'events', emirate: 'uaq', language: 'ta',
    title: 'புதிய நண்பர்களைச் சந்திக்க என்ன செய்தீர்கள்?',
    body: 'இங்கே வந்து ஒரு மாதம் ஆகிறது. வேலைக்கு வெளியே மக்களைச் சந்திக்க நீங்கள் என்ன செய்தீர்கள்?',
    replies: [
      { name: 'Sample volunteer, Umm Al Quwain', body: 'நான் ஒரு வார இறுதி நடைப்பயிற்சிக் குழுவில் சேர்ந்தேன். மெதுவாக நண்பர்கள் கிடைத்தார்கள்.' },
    ],
  },
  {
    id: 'sample-09', name: 'Sample resident, Abu Dhabi', topic: 'visasPaperwork', emirate: 'abudhabi', language: 'en',
    title: 'How do you keep track of your documents?',
    body: 'I keep losing track of which papers I need and when. How do you organise your documents and renewal dates?',
    replies: [
      { name: 'Sample volunteer, Abu Dhabi', body: 'I keep one folder for originals and set calendar reminders well before anything expires. For the actual rules I always check the official government website.' },
    ],
  },
];

async function add(db: Firestore, uid: string) {
  let added = 0;
  for (const p of POSTS) {
    const ref = doc(db, 'forumPosts', p.id);
    if ((await getDoc(ref)).exists()) { console.log(`skip ${p.id} (already there)`); continue; }
    await setDoc(ref, {
      authorUid: uid,
      displayName: p.name, topic: p.topic, emirate: p.emirate, language: p.language, title: p.title, body: p.body,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(), hidden: false, deleted: false, isSample: true, upvotes: 0,
    });
    // Replies after the post exists (the rules check the parent post).
    const b = writeBatch(db);
    p.replies.forEach((r, i) => b.set(doc(db, 'forumPosts', p.id, 'replies', `${p.id}-r${i + 1}`), {
      authorUid: uid, displayName: r.name, body: r.body, createdAt: serverTimestamp(), deleted: false, isSample: true,
    }));
    await b.commit();
    added++;
  }
  console.log(`Added ${added} sample posts.`);
}

async function remove(db: Firestore) {
  const posts = await getDocs(query(collection(db, 'forumPosts'), where('isSample', '==', true)));
  let replies = 0;
  for (const p of posts.docs) {
    const b = writeBatch(db);
    const votes = await getDocs(collection(db, 'forumPosts', p.id, 'votes'));
    votes.docs.forEach((v) => b.delete(v.ref));
    const rs = await getDocs(collection(db, 'forumPosts', p.id, 'replies'));
    const real = rs.docs.filter((r) => r.data().isSample !== true);
    rs.docs.filter((r) => r.data().isSample === true).forEach((r) => { b.delete(r.ref); replies++; });
    if (real.length) console.log(`note: ${p.id} has ${real.length} real replies; they are left in place (rules allow deleting sample docs only).`);
    b.delete(p.ref);
    await b.commit();
  }
  console.log(`Removed ${posts.size} sample posts and ${replies} sample replies.`);
}

async function main() {
  const { db, uid, env } = await signInModerator();
  console.log(`Signed in as a moderator (${env}).`);
  if (process.argv.includes('--remove')) await remove(db);
  else await add(db, uid);
  process.exit(0);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
