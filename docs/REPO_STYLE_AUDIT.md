# Repo style audit: NEXTORA vs everything-claude-code

Date: 2026-10-31. Read-only audit. Nothing was changed except this file.

Reference: https://github.com/worldflowai/everything-claude-code. I read it through `gh api` (contents endpoint, read-only). I ran nothing from it and installed nothing. I used it only as a guide to style and structure. Its README badges point to `affaan-m/everything-claude-code`, so it looks like a fork.

Note: the reference is a **Claude Code config collection**, not an app. Many of its conventions do not fit an Expo app directly.

## What the reference repo looks like (verified)

- Top level: `.claude/`, `.claude-plugin/` (plugin.json, marketplace.json), `agents/`, `commands/`, `skills/`, `rules/`, `hooks/` (hooks.json + subfolders), `contexts/` (dev/research/review.md), `mcp-configs/`, `plugins/`, `examples/`, `scripts/` (hooks/, lib/), `tests/` (hooks/, lib/, run-all.js), `README.md`, `CONTRIBUTING.md`.
- Naming: kebab-case `.md` files (`code-reviewer.md`, `build-error-resolver.md`). Each skill is a folder with a `SKILL.md` in it.
- Agents use YAML frontmatter: `name`, `description`, `tools`, `model`.
- Rules are short, topic-based files: `coding-style`, `testing`, `security`, `git-workflow`, `performance`, `patterns`, `hooks`, `agents`.
- No `.github/` folder (the API returned 404), so no CI workflows were seen.
- `rules/testing.md` asks for 80% coverage and TDD. That is the reference's opinion, not a requirement.

## What NEXTORA has now

- An Expo Router app in `src/app`, with `src/{components,lib,store,shared}`, plus `theme/`, `locales/`, `data/`, `config/`, `rules/` (Firestore rule snippets), `worker/` (a Cloudflare Worker with its own tests), `scripts/`, `tests/`, `archive/`, and `docs/` (UPPER_SNAKE `.md` files plus `docs/tools/`).
- `AGENTS.md` (Expo guidance). There is no `CLAUDE.md`. `.claude/settings.json` only turns on the expo plugin.
- Tests: Vitest in `tests/*.test.ts` (rules, matching, locales, publicProfile, forum rules) with `tests/fixtures/`, run under the Firestore emulator. The worker has its own `worker/test/`.
- Lint: `AGENTS.md` says to run `npx expo lint`, but there is no ESLint or Prettier config and no `lint` script in `package.json`.
- CI: no `.github/workflows`.
- TS: `strict: true`, with an `@/*` path alias. `scripts`, `tests` and `worker` are left out of the root tsconfig (`scripts/` has its own).

## What matches

- Tests live in a top-level `tests/` folder, with fixtures in their own place, as in the reference.
- `scripts/` has a `lib/` subfolder for shared helpers, the same pattern.
- `.claude/` is at the repo root.
- The docs are split by topic (SETUP, DATA_MODEL, PLAN, PROGRESS), much like `rules/` is split by topic.
- Agent guidance lives in a root markdown file (`AGENTS.md`).

## What differs

1. There is no `CLAUDE.md`. The reference relies on Claude-specific files, while NEXTORA has only `AGENTS.md`.
2. There are no project agents, commands or skills (`.claude/agents`, `.claude/commands`, `.claude/skills`).
3. There is no lint config, even though `AGENTS.md` tells agents to run lint. This is the biggest gap.
4. There is no CI. The reference has none either, but an app with security rules has more to gain from it.
5. File names follow different conventions: NEXTORA docs use UPPER_SNAKE, the reference uses kebab-case. Both are consistent within themselves.
6. There is no `CONTRIBUTING.md`.
7. The README is out of date. It mentions `npm run functions:build`, a "Cloud Function" and `scripts/createAdmin.ts`/`createModerator.ts`, but none of these exist in `package.json` or `scripts/`. Cloud Functions now sit in `archive/functions-v5` and the AI path is `worker/`.
8. Stray log files are in the repo root (`firebase-debug.log`, `firestore-debug.log`).
9. There is one test runner (`run-all.js`) in the reference. NEXTORA has two separate suites (root and `worker/`) and no single command that runs both.

## Suggested changes

### Safe to apply now (docs, structure, lint config)

- A1. Add a `lint` script (`"lint": "expo lint"`) and an `eslint.config.js` using `eslint-config-expo`. Install it with `npx expo install` (see AGENTS.md). Note: this adds a dev dependency.
- A2. Add a short `CLAUDE.md` that points to `AGENTS.md` and `docs/`, so the guidance is not repeated in two places.
- A3. Update the README: remove `functions:build`, `createAdmin`/`createModerator` and the Cloud Functions wording, or mark them as archived. Mention `worker/` and `scripts/worker/{setup,check}.mjs`.
- A4. Add `*-debug.log` to `.gitignore` and delete the two log files from the root.
- A5. Add a `docs/README.md` index that lists each doc in one line.
- A6. Add `test:all` (root and worker suites) and `i18n:check` (`node scripts/i18nCheck.mjs`) scripts, so the existing scripts are easy to find.
- A7. Keep UPPER_SNAKE for `docs/`. Do not rename to kebab-case: renaming would break links for little gain.

### Needs human approval

- H1. Add GitHub Actions CI (typecheck, lint, emulator tests, worker tests). It needs choices about Java and the emulator setup in CI, and whether to cache firebase-tools.
- H2. Add project agents, commands or skills under `.claude/` (for example a `rules-reviewer` agent for `firestore.rules`, or a `/verify` command that runs typecheck, lint and tests). This changes how agents behave in the repo.
- H3. Add hooks in `.claude/settings.json` (for example a typecheck after edits). This is persistent config.
- H4. Add a coverage target or a TDD rule like the reference's 80%. This is a policy decision for the team.
- H5. Decide whether `archive/` should stay in the repo or move to a tag or branch.
- H6. Add `CONTRIBUTING.md`, but only if outside contributors are expected.
- H7. Do not copy any reference hooks or scripts (`hooks.json`, `scripts/hooks/*`, `setup-package-manager.js`) as they are. They are untrusted. Write your own if you need them.
