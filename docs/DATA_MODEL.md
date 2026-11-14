# NEXTORA V5 Firestore data model

Status: **rules v1 implemented (Stage 2)** for the user, profile, consent, block, report, audit and
content paths below; later collections get rules in their stage. Rules: `firestore.rules`,
indexes: `firestore.indexes.json`, tests: `tests/rules.test.ts`.

Principles:
- Private data and public data live in different documents, so rules can deny private reads outright.
- Clients never write counters, scores, statuses that matter for trust, or other users' data. Cloud Functions do.
- Hidden profile fields are never copied into `publicProfiles`, so they cannot leak through a query.
- Blocks are checked in rules and in every function that returns other users.

## Users

| Path | Readable by | Writable by | Fields |
|------|-------------|-------------|--------|
| `users/{uid}` | owner | owner creates once after the age question (server-time `ageConfirmedAt`, `createdAt`); later only `language`, `consents` | `ageConfirmedAt`, `createdAt`, `language`, `consents{}`. The age itself is never stored. Email lives in Firebase Auth only. |
| `users/{uid}/private/profile` | owner | owner (validated) | full onboarding answers including hidden fields and the optional `reason` (never public) |
| `users/{uid}/progress/{checklist,appSetup}` | owner | owner | synced from Stage 3 |
| `publicProfiles/{uid}` | signed-in, verified, not blocked either way | functions only (`onProfileWrite`) | `displayName`, `role`, `persona`, `emirate`, `languages[]`, `interests[]`, `familyNeeds[]`, `avatarPath?`, `isTeam` — only fields marked visible |
| `users/{uid}/consentLog/{id}` | owner | owner, append-only | `key`, `granted`, `version`, `at` (server time) |

## Matching and connections

| Path | Readable by | Writable by | Fields |
|------|-------------|-------------|--------|
| `matchCandidates/{uid}` | owner | functions (scheduled + on profile change) | `items[] {uid, score, label, reasons[]}`, `updatedAt` (cap 200, paginated) |
| `matchDecisions/{uid}/items/{otherUid}` | owner | owner | `decision` (`accepted`/`rejected`/`ignored`), `at` |
| `connections/{id}` | the two members | functions only | `userA`, `userB`, `status` (`pending`/`connected`/`declined`), `revealA`, `revealB`, `introMessage`, `createdAt` |
| `connections/{id}/contact/{uid}` | the other member **only when `revealA && revealB`** | owner | contact text the user chose to share |
| `chats/{connectionId}/messages/{id}` | the two members | functions (`sendMessage`) | `from`, `text`, `lang`, `at`, `hidden` |
| `blocks/{uid}/blocked/{otherUid}` | owner | owner | `uid` (= otherUid, indexed for cleanup), `at` |
| `rateLimits/{uid}` | none | functions | per-action counters and windows |

## Content (admin-managed, seeded only from `data/seed/*.json`)

`content/{type}/items/{id}` where `type` is `apps`, `guides`, `schools`, `offers`, `events`.
Readable by everyone signed in; writable only by functions and admin console.

Common fields: `source`, `reviewedBy`, `reviewedOn`, `nextReviewDue`, `version`, `updatedAt`.
Offers and events add `validUntil`. Apps add `iosUrl`, `androidUrl`, `webUrl` (null unless supplied),
`fees` (only if supplied), `needsUaeInfo`, `setup[]`, `category`, `emirates[]`.

User progress: `users/{uid}/progress/checklist` and `users/{uid}/progress/appSetup` (owner only, synced across devices).

## Community

| Path | Notes |
|------|-------|
| `forumSpaces/{id}` | admin-managed |
| `forumPosts/{id}` | created via `createPost` function; `authorUid`, `displayName`, `spaceId`, `topic`, `emirate`, `language`, `title`, `body`, `imagePath?`, `counts{}` (function-written), `hidden`, `pinnedBy?` |
| `forumPosts/{id}/replies/{id}` | one level only, via function |
| `votes/{postId}_{uid}`, `saves/{uid}/items/{postId}`, `follows/{uid}/spaces/{spaceId}` | owner writes; counts updated by functions |
| `events/{id}`, `events/{id}/rsvps/{uid}` | guides create via function, moderated |

## Safety, AI and ops

| Path | Notes |
|------|-------|
| `translationReports/{id}` | signed-in users create; staff read | `uid`, `screen`, `note`, `lang`, `at` |
| `reports/{id}` | `reporterUid`, `targetType`, `targetId`, `reason`, `status`, `assignee`, `slaDueAt`, `audit[]`; created via function; readable by moderators |
| `notifications/{uid}/items/{id}` | owner reads; functions write |
| `translationsCache/{hash}` | functions only; hash of content id + language |
| `aiErrorReports/{id}` | "Report an error" from the assistant; moderators read |
| `auditLog/{id}` | functions only; admins read |

## Deletion

`deleteAccount` (callable, implemented) revokes sessions, then removes `users/{uid}` and all
subcollections, `publicProfiles/{uid}`, the user's blocks and any blocks of them, Storage files
under `users/{uid}/`, then the Auth user, and writes an `auditLog` entry with a hashed id.
Later stages extend it to matches, posts, replies, messages and push tokens.
Firestore backups (if you enable them) keep deleted data until they expire; note your backup retention in `docs/SETUP.md` once chosen.

## Staff

Staff checks use the `role` custom claim (`admin` or `moderator`, set only by
`scripts/createAdmin.ts` / `createModerator.ts`) **and** a second factor on the token.
A role claim without MFA, or any other role value, gets no staff access (tested).
