# Phase 2 — Student authentication and learner isolation

Implemented on `security/student-authentication-phase-2`, based on Phase 1 commit `87724d8`. No merge, push, deployment, database reset, schema change, migration, or live database mutation was performed. Faculty routes and supporting source remain preserved and disabled.

## Authentication flow

1. The existing Expo Clerk provider continues to manage the existing application and its secure token cache. `ApiAuthBridge` binds the current Clerk user/session and `getToken` to API requests.
2. Requests obtain a current **default Clerk session token** through `getToken()`. The old application `token` storage entry and `x-clerk-user-id`/profile headers are never used for authentication. Local `expectedUserId` request context is consumed on the client and is not sent as an identity header.
3. The backend uses pinned `@clerk/express` 2.1.78, `clerkMiddleware`, and `getAuth` restricted to session tokens. It requires a bearer token, validates signature/expiry and configured authorized parties through Clerk, and checks that the verified issuer matches the frontend API hostname encoded by this application's publishable key. API-key/machine identities and cookie-only requests do not authorize learner APIs.
4. The backend denies API access by default. Only GET/HEAD health and the basic case catalog are public. CORS preflight remains available. The faculty namespace returns 404 before authentication or body parsing, for every method, including GET/HEAD.
5. A validated Clerk subject resolves to the existing unique `User.clerkUserId` mapping. Existing Neon UUIDs, metadata and related progress are preserved. New accounts receive a normal learner record with server-sourced Clerk metadata; there is no role or institutional model. A transcript email recipient is obtained from Clerk's verified primary email, rather than historical client-writable Neon metadata.
6. Conversation reads/writes/grades use the resolved Neon learner ID in ownership queries. Chat validates a supplied conversation even for empty opener requests. Debrief/attempt finalization checks the learner and conversation/submission relationship before accessing achievement, competency, badge or progress writes. Portfolio, competencies, achievements, progress and history retain their learner-scoped queries. Other learners' records return 404.
7. Personal responses use `Cache-Control: no-store`. Diagnostics exclude authorization tokens, identity/profile headers, transcript previews, AI payloads and upstream error bodies/stacks.

Protected routes include case detail, patient chat, grading, conversation creation/history/detail/message/debrief/submission, speech synthesis/transcription, progress, Today, learning paths/session overview/Dr. Martinez coaching, clinical portfolio and competency profiles. No endpoint grants faculty access.

## Encounter and account lifecycle

- Tokens are obtained per request. A definitive HTTP 401 retries once with `getToken({ skipCache: true })`; timeouts, network failures and 5xx responses are not automatically retried. There is no anonymous fallback.
- Changing the Clerk user/session invalidates pending requests and delayed response-body reads. Encounter request closures carry their originating learner, so delayed local audio work cannot start a request with another account's token.
- The signed-in learner subtree remounts when the account changes. Voice hooks stop recording/playback on unmount and check the originating session before transcription or delayed playback.
- Saved encounter references are keyed by learner. A legacy reference is adopted by the current screen only after an authenticated ownership check. Failed authentication/network checks retain the reference; a confirmed 404 can remove it.
- Both current and legacy encounter screens retain in-memory messages, input, HPI, stage, pending message writes and encounter reference across same-learner reauthentication. Switching to another account clears those drafts. Tokens and clinical drafts are not added to browser storage.
- Submission waits for outstanding message writes. Authentication-rejected writes remain queued and can be retried after reauthentication. An uncertain network write blocks submission until the saved transcript is reconciled, rather than automatically replaying a potentially completed mutation.
- Unsaved drafts do **not** survive browser reload, closing the app, or process termination. Persisted transcripts remain on the backend. Switching accounts deliberately clears unsaved local drafts; resume the original account's saved encounter when returning.

## Case confidentiality

Learner case detail uses a separate response allowlist: case display metadata, basic fictional patient demographics, chief complaint and explicit opener fields. Internal histories, behavioral instructions, disclosure facts, hidden truth, grading rubrics and answer keys are excluded. Internal patient-prompt data remains separate, preserving virtual-patient disclosure behavior. Roadmap responses no longer return internal rubric criterion mappings.

Case loaders reject path traversal and reserved `_grading` identifiers. Authenticated learners cannot load a grading JSON file through ordinary case/chat routes. Case requests no longer launch image-generation subprocesses; existing bundled patient assets remain available.

Existing catalog case slugs/titles can still hint at the scenario (for example, an allergy title or a `uti` slug). They are retained for compatibility with stored case links and assets; this release does not provide blinded examination metadata. AI-generated replies retain the existing disclosure and reply-safety controls, but live adversarial model behavior is not proven by synthetic tests.

## Verification

| Check | Result |
| --- | --- |
| `backend: npm test` | **122 passed, 0 failed**, including 22 new security tests |
| `backend: npm run rubric:calibrate` | **All 3 passed**: borderline 87%, ideal 100%, weak 16% |
| `backend: npm run db:generate` | Prisma Client 5.22.0 generated successfully; no database connection or migration |
| `mobile: tsc --noEmit` | Exit 2: **22 existing diagnostics**, zero new/removed diagnostic signatures against Phase 1 |
| `mobile: expo export --platform web` | Passed, **20 static routes**, no faculty routes |
| Diff/dependencies/schema review | `git diff --check` clean; no existing dependency version changed; Prisma schema/migrations unchanged |

The 22 pre-existing TypeScript diagnostics remain: sign-in Clerk optional helpers (5), legacy encounter missing styles (9), current encounter stage narrowing (1), avatar nullable image source (1), preserved inactive faculty source types (6). They were not suppressed or excluded.

### The seven earlier Prisma failures

The previous cloud baseline reported 55 passing tests and seven test-file import failures: achievement scoring, clinical portfolio, debrief chat, motivational achievements, preceptor chat, student competency profile, and Today. Those modules could not initialize `PrismaClient` because the generated client was absent. Earlier engine/checksum downloads had returned HTTP 403. Those failures occurred during module import, before their assertions or a Neon query, and were environment/setup failures rather than demonstrated application regressions.

Normal Prisma generation now succeeds, without disabling TLS or checksum verification. Both `NODE_TLS_REJECT_UNAUTHORIZED` and `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING` were unset. The previously blocked suites now execute. Two old route-mount assertions still referenced `index.js` after Phase 1 extracted wiring into `app.js`; those assertions were corrected to inspect the actual wiring. Faculty regression expectations were updated to require authentication on student routes. All backend tests now pass.

### Automated test boundaries

Tests use locally generated RSA keys and synthetic Clerk session JWTs through the real Clerk Express verification middleware. They cover missing/forged/expired/future/wrong-origin/wrong-issuer tokens, header impersonation, default denial of newly mounted routes, two distinct synthetic learner identities and transcripts, cross-user conversation/message/debrief/submission/grade access, attempt ownership/linkage before evidence writes, preservation of existing identity mappings, verified email destinations, authorized conversation creation, personal dashboards, AI workflows and owned achievement/badge/feedback finalization, case confidentiality/traversal, token refresh, draft recovery, and delayed requests/body reads/local work after account switching.

The HTTP isolation tests substitute an in-memory Prisma store and synthetic AI responses while retaining actual routes/services/authentication. They do not connect to Neon, send email, contact paid AI services, or require live Clerk credentials. Live Clerk revocation, actual NaviGator voice/model behavior, native device audio, and desktop two-account interaction were not exercised here.

## Windows configuration and verification

Use the **existing** Clerk application and frontend publishable key. The Clerk Express dependency requires Node >=20.9. Do not replace the Clerk application or change learner identity mappings.

In the existing backend `.env`, configure:

```dotenv
CLERK_PUBLISHABLE_KEY=<same application publishable key used by Expo>
CLERK_SECRET_KEY=<backend secret key from that application>
CLERK_AUTHORIZED_PARTIES=http://localhost:8081
```

`CLERK_AUTHORIZED_PARTIES` accepts comma-separated exact frontend origins. Include the actual LAN web origin if using one; update it for an approved future HTTPS deployment. The secret stays backend-only. No JWT template, faculty setting, allowlist, schema change or seed/reset is required. Existing `DATABASE_URL`, NaviGator and email configuration remain in place.

Keep the existing mobile settings:

```dotenv
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=<existing publishable key>
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
```

After reviewing the branch, install the committed backend lockfile with `npm ci`, run `npm run db:generate` and `npm test` in `backend`, then restart the backend and Expo web with the existing commands. Prisma generation updates local generated code only; do not run migrate/reset/seed commands for this change. Never place a Clerk secret in an `EXPO_PUBLIC_` variable.

### Two independent learner accounts

These manual checks create ordinary development training records when you choose to run them; they were not run against Neon by this implementation.

1. Use two separate browser profiles with distinct Clerk development accounts A and B. Complete separate encounters with clearly different synthetic conversation/HPI content. Check each account's attempts, grades, achievements, competency profile and portfolio show only its own records.
2. Record A's conversation ID locally. While signed in as B, open `/attempt-result?conversationId=<A conversation ID>` or replay a backend request using B's current session and A's ID. Conversation detail, message append, submission and debrief must return 404; B must not gain A's progress. Keep tokens in local developer tools; do not paste them into chats, logs or screenshots.
3. A header-only request with `x-clerk-user-id` must return 401. Health/catalog should remain public; case detail and voice/chat/grade require authentication. GET and HEAD `/api/faculty/dashboard` must return 404 even with a valid token.
4. In one browser, throttle requests, start an A request or audio operation, then sign out and sign in as B. A's delayed replies/transcriptions/playback must not appear or be sent under B's identity. Check Today, milestones, portfolio and attempt screens refresh for B.
5. With A, keep an encounter open beyond the normal token lifetime, enter an HPI draft, then continue chat/voice/coaching and submit. Token refresh should be transparent. For a rejected session, the UI should show the failure, retain the encounter/draft in that app instance, and allow same-account reauthentication without creating a B-owned encounter. Avoid reloading if verifying unsaved in-memory draft recovery.
6. Check native recording/transcription and playback separately on a device before real-user onboarding; web export validates bundling and route absence, not microphone hardware behavior.

## Remaining risks and later review

- Resolve the existing TypeScript diagnostics and the separately reviewed Expo/Clerk frontend compatibility warnings before treating the release as fully type-checked. Unrelated dependencies were not upgraded.
- Authentication prevents anonymous AI spending; per-learner rate limits, quotas and abuse monitoring are not implemented in this phase.
- Short-lived signed session JWTs have a revocation window until expiration/refresh. Live Clerk session behavior and production origins need desktop/deployment verification.
- Own transcript entries and stateless grading previews remain client-supplied. Access and ownership are enforced, but grades are not tamper-proof certification evidence.
- Existing submission/grading writes are not a single transactional, concurrency-safe workflow. This phase does not redesign retry/idempotency for simultaneous submissions or ambiguous network completion. The UI avoids automatically replaying uncertain writes.
- Local unsaved drafts are memory-only and intentionally cleared on account changes. Durable draft recovery would require a separately reviewed design for sensitive data storage.
- Case metadata and live AI prompt-injection resilience need further review if blinded assessments are introduced. Private case JSON/rubrics are excluded deterministically from metadata responses, but model-generated text needs separate live adversarial verification.
- Existing case/session definitions and historical development records were not queried or repaired. Corrupt cross-owner attempt relationships now fail closed instead of silently reassigning progress.

## Changed files

### Backend

- `backend/.env.example`
- `backend/package-lock.json`
- `backend/package.json`
- `backend/src/app.js`
- `backend/src/index.js`
- `backend/src/llm/navigatorClient.js`
- `backend/src/middleware/studentAuth.js`
- `backend/src/routes/cases.js`
- `backend/src/routes/chat.js`
- `backend/src/routes/clinicalPortfolio.js`
- `backend/src/routes/conversations.js`
- `backend/src/routes/learningPaths.js`
- `backend/src/routes/profile.js`
- `backend/src/routes/progress.js`
- `backend/src/routes/today.js`
- `backend/src/routes/voice.js`
- `backend/src/services/motivationalAchievements.js`
- `backend/src/services/sessionAttempts.js`
- `backend/src/utils/caseLoader.js`
- `backend/src/utils/grading.js`
- `backend/src/utils/roadmap.js`
- `backend/src/utils/safeCase.js`
- `backend/src/utils/safeDiagnostics.js`
- `backend/src/utils/userResolver.js`
- `backend/test/caseConfidentiality.test.js`
- `backend/test/clinicalPortfolio.test.js`
- `backend/test/facultyDisabled.test.js`
- `backend/test/helpers/clerkSession.js`
- `backend/test/learnerIsolation.test.js`
- `backend/test/safeDiagnostics.test.js`
- `backend/test/sessionToken.test.js`
- `backend/test/studentAuth.test.js`
- `backend/test/today.test.js`
- `backend/test/userResolver.test.js`

### Frontend

- `mobile/app/(tabs)/cases.tsx`
- `mobile/app/(tabs)/index.tsx`
- `mobile/app/(tabs)/level1 - original.tsx`
- `mobile/app/(tabs)/level1.tsx`
- `mobile/app/(tabs)/portfolio.tsx`
- `mobile/app/_layout.tsx`
- `mobile/app/attempt-result.tsx`
- `mobile/app/attempts.tsx`
- `mobile/src/api/client.js`
- `mobile/src/api/encounterDraft.js`
- `mobile/src/api/sessionToken.js`
- `mobile/src/components/ApiAuthBridge.tsx`
- `mobile/src/components/CompetencyProfileTab.tsx`
- `mobile/src/hooks/useEnglishSpeechTranscription.ts`
- `mobile/src/hooks/useSpeechPlayback.ts`

### Documentation

- `docs/student-authentication-phase-2-plan.md`
- `docs/student-authentication-phase-2-results.md`
