# Problem and empathy

## The problem

Arriving in the UAE, or moving between emirates, means learning many official apps and services at once, often in a language that is not your first, and often without people nearby to ask. Information is spread across many sources, and much of it assumes you already know how things work. (No statistics are claimed here; we have not sourced any.)

## Who NEXTORA helps

| Person | What they need | How NEXTORA responds |
|---|---|---|
| **Newcomers** in their first days | Know what to do first and which apps matter | "First 48 hours" checklist ordered by persona; Appverse guides with official links and a review badge |
| **Families with children** | Steps that cover the whole household, not just one adult | Persona-ordered checklist; plain-language guides; progress synced across devices so two parents can share it |
| **People moving between emirates** | What changes locally | Appverse emirate filter |
| **Long-term residents wanting community** | People to meet and ways to give back | Profiles with per-field visibility, matching, chats, forum |
| **Volunteer guides** | A safe, simple way to help | "I'd like to help" path, moderated community, blocks and reports enforced by security rules |

## Reaching beyond one household

- **Guides**: one volunteer can help many newcomers; help is offered through the app, not private contact details.
- **Forum**: one answered question stays useful for the next person who asks it.
- **Language access**: 16 active languages each shown in its own script, with Arabic and Urdu right to left. Only languages reviewed by a native speaker are released in production (`locales/meta.ts`); currently that is English only.
- **Shared knowledge**: Appverse content is supplied and checked by people, loaded by `scripts/seedContent.ts`, and marked "Human-reviewed", "Not yet reviewed" or "Needs re-check". AI answers come only through the server-side worker and never invent a guide.

## Care built in

- Under-18s are blocked at sign-up and the age is not stored.
- Optional sensitive answers (for example "why did you come") are never public.
- Analytics, notifications and AI features are off by default; every change is logged.
- Honest empty states ("not set up yet", "no verified guides yet") instead of sample people or fake content.
