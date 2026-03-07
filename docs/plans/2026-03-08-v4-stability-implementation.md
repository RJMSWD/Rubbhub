# V4 Stability Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the highest-priority stability and correctness issues found in review, then verify the project and document the V4 release notes in README.

**Architecture:** Keep the current Vite + React + Express + MySQL structure, but tighten the unstable edges instead of refactoring broadly. The work is split into backend correctness, frontend state isolation, package/test infrastructure, and release documentation so each change stays small and verifiable.

**Tech Stack:** React 19, TypeScript, Vite, Express 4, MySQL, JSON Web Tokens, Node test tooling, npm scripts.

### Task 1: Enable a runnable verification baseline

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `tests/`

**Step 1: Write the failing test**

Add a minimal test entrypoint that exercises new pure helpers for notification caching and auth checks. Start with tests that import modules that do not exist yet or behaviors that are currently wrong.

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: module-not-found or assertion failure for the missing helpers / incorrect current behavior.

**Step 3: Write minimal implementation**

Remove the Windows-only Rollup package from the root manifest, add stable scripts (`test`, `typecheck`), and add the smallest test setup needed to run regression tests in this repo.

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: the new test runner starts successfully and current failing assertions are the only remaining failures.

### Task 2: Fix backend auth and schema drift

**Files:**
- Modify: `server/init.sql`
- Modify: `server/utils/auth.js`
- Modify: `server/routes/auth.js`
- Test: `tests/server/*.test.js`

**Step 1: Write the failing test**

Add regression tests covering:
- banned users with still-valid tokens are rejected
- auth helper returns a clear failure when a user no longer exists or is banned

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: current auth flow still accepts stale valid tokens, so the new assertions fail.

**Step 3: Write minimal implementation**

Centralize token verification + active-user lookup in shared auth helpers, reuse that in required/optional auth, and align `init.sql` with the schema the runtime already expects (`views`, `reply_to`, `follows`, `user_sessions`).

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: banned/stale users are rejected and schema assertions stay green.

### Task 3: Make toggle flows safer under repeat requests

**Files:**
- Modify: `server/routes/entries.js`
- Modify: `server/routes/users.js`
- Test: `tests/server/*.test.js`

**Step 1: Write the failing test**

Add tests for the pure toggle bookkeeping helpers so duplicate-like / duplicate-follow cases do not drift counts or return ambiguous states.

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: existing logic lacks the helper behavior and the assertions fail.

**Step 3: Write minimal implementation**

Introduce small helpers for normalized toggle outcomes and use them to make the routes resilient to duplicate-key style flows without broad refactors.

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: helper tests pass and route code remains consistent with those semantics.

### Task 4: Fix frontend state isolation bugs

**Files:**
- Modify: `src/pages/NotificationsPage.tsx`
- Modify: `src/components/auth/ProfileView.tsx`
- Modify: `src/context/EntriesContext.tsx`
- Create: `src/utils/notificationsCache.ts`
- Test: `tests/frontend/*.test.js`

**Step 1: Write the failing test**

Add regression tests covering:
- per-user notification cache isolation
- cache updates after mark-read
- profile form hydration from async current user data
- detail fetch not polluting a feed list

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: the current cache and state behavior fails these assertions.

**Step 3: Write minimal implementation**

Move notification caching into a keyed helper, resync profile form state when auth resolves, and stop injecting detail-only records into the global entries list.

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: all new frontend regression tests pass.

### Task 5: Align API types and release docs

**Files:**
- Modify: `src/lib/api.ts`
- Modify: `src/pages/AdminPage.tsx`
- Modify: `README.md`

**Step 1: Write the failing test**

Use `npm run typecheck` as the failing verification for the admin API response shape and any new helper typings.

**Step 2: Run test to verify it fails**

Run: `npm run typecheck`
Expected: the current admin API types are inconsistent with the actual response envelope.

**Step 3: Write minimal implementation**

Correct the response types, keep the page consumption explicit, and append a V4 section to the README only after code and verification are complete.

**Step 4: Run test to verify it passes**

Run: `npm run typecheck`
Expected: no type errors.

### Task 6: Final verification and documentation

**Files:**
- Modify: `README.md`

**Step 1: Run full verification**

Run:
- `npm test`
- `npm run typecheck`
- `npm run build`
- `cd server && npm audit --omit=dev`

Expected:
- tests green
- typecheck green
- build green
- audit results captured honestly, whether clean or not

**Step 2: Update release notes**

Document V4 as the stability release with the concrete fixes shipped in this task.
