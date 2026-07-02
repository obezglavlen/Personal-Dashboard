---
name: test-after-change
description: Rerun and update the Vitest suite after changing code in the home-dashboard app. Use after editing any lib/app .ts/.tsx file, when a behavior change needs new or updated test coverage, or to manually confirm the suite is green before declaring a change done. A PostToolUse hook already auto-runs the suite on every edit; this skill is the playbook for keeping the tests correct and extending coverage, not just rerunning them.
---

# Test after change

Keep the Vitest suite green and in sync with code changes in `home-dashboard`.

## When to use
- After editing any `.ts`/`.tsx` under `home-dashboard/`. The PostToolUse hook auto-reruns the suite, but invoke this when you need to **update** tests, not just rerun them.
- When a change alters the behavior of pure logic (renewal math, budget calc, notification digest, Zod schemas).
- Before declaring any change complete.

## Run the suite
```
pnpm -C home-dashboard test          # one-shot (CI mode, what the hook runs)
pnpm -C home-dashboard test:watch    # watch mode while iterating
```
Config: `home-dashboard/vitest.config.ts` — node env, `include: ["lib/**/*.test.ts"]`, `@/*` alias via `resolve.tsconfigPaths`.

## Update tests when behavior changes
1. Find the colocated test: `lib/<x>.ts` → `lib/<x>.test.ts`.
2. If changed pure logic has no test yet, create one at `lib/**/*.test.ts`.
3. Cover happy path, boundaries (month-end clamp, 80%/100% thresholds, window edges), and rejects (invalid input).
4. Inject `now`/reference dates as arguments — never rely on the real clock, so tests stay deterministic. (`Date.now()`/`new Date()` with no arg is also banned in some runners.)
5. Rerun until green.

## Scope
Unit tests target **pure logic only** — no DB, no network, no Next runtime. Current suites:
`lib/subscriptions.test.ts`, `lib/budget.test.ts`, `lib/notifications/digest.test.ts`, `lib/validations/validations.test.ts`.
Keep integration/DB/e2e concerns out of this suite.

## The auto-run hook
A project PostToolUse hook (`.claude/hooks/test-on-change.ps1`, wired in `.claude/settings.json`) runs `pnpm -C home-dashboard test` after every Edit/Write of a `.ts`/`.tsx` under `home-dashboard/`. On failure it exits non-zero and feeds the output back so breakage is caught immediately; on pass it reports a one-line summary. Review or disable it via `/hooks`. It only **reruns** — updating tests for new behavior is still your job (this skill).
