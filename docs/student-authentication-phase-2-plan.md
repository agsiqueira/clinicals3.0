# Phase 2 proposal: authenticated individual learners

## Status and boundaries

Phase 1 was reviewed and committed as
`87724d8b5fcf1cf588127b4e7aca816ca16c8f7b` on
`security/student-first-phase-0-1`. The new branch
`security/student-authentication-phase-2` starts at that exact commit.
The reviewed changes contain faculty disablement, preservation of both screens,
HTTP regressions, and the baseline report; no unrelated changes were found.

This document is a proposal, not implemented authentication. No Phase 2
application code, dependency installation, merge, deployment, or database
mutation has been performed. Implementation and any live database mutations
require approval. The Neon data is development/test-only; formal recovery
verification is not a prerequisite. No new institutional roles, courses,
faculty permissions, schema, or migration is proposed.

## Authentication design

1. Add the maintained `@clerk/express` SDK to the backend only. Registry metadata
   currently reports 2.1.78, Express peer compatibility `^4.17.0 || ^5.0.0`,
   and Node >=20.9.0. Pin a reviewed compatible release and commit its lockfile;
   do not upgrade Express, Prisma, mobile Clerk, Expo, or unrelated dependencies.
2. Initialize trusted Clerk configuration before constructing authentication
   middleware. Use the existing Clerk application, its backend publishable and
   secret key bindings, and the SDK's verification/key-rotation support. An SDK
   supported `jwtKey` can be used for deterministic tests/offline verification;
   this is not a plan for implementing our own JWT verifier.
3. Apply `clerkMiddleware`, then obtain authentication through `getAuth` with
   session-token acceptance explicitly restricted using the installed SDK's
   supported API. API keys, machine/OAuth access tokens, caller-supplied user
   IDs, and decoded-but-unverified JWTs must not become learner identities.
   Verify the exact installed SDK option names/types before implementing them.
4. Configure the actual permitted web authorized parties and supported native
   token behavior. Trust keys belonging to the existing Clerk application;
   do not use a token-supplied URL as a custom key-fetch destination. Use the
   SDK's supported validation rather than inventing issuer/audience options.
   If additional issuer checks are needed, compare only verified claims to
   trusted configuration. Do not require a custom JWT template or audience
   absent from normal session tokens merely to make authentication work.
5. An explicit protected-route gate returns JSON 401 for missing, invalid,
   expired, or wrong-application authentication. Do not use a login redirect
   for API requests. Missing server configuration/key-discovery failures fail
   closed with a generic service-unavailable response; never fall back to
   `x-clerk-user-id`, cookies decoded by application code, or `dev-user`.
6. Resolve the database learner from the SDK-verified Clerk subject and put
   the internal user ID into request context. Services receive that trusted
   context/ID; request parameters and headers cannot replace it.
7. Authentication is separate from ownership. A valid session permits access
   only to that learner's resources and approved shared content.

Keep the faculty 404 boundary before authentication, CORS preflight, and body
parsing, including when Clerk configuration is missing. Health and approved
public metadata must remain independent of login. Preserve student preflight.
For protected routes, verification and ownership must precede database writes,
AI calls, grading, rewards, and email.

## Current frontend tokens

The shared API client, current encounter screen, older encounter screen, and
attempt-result screen each have request code that reads a legacy storage key
named `token`. That is not evidence of a valid current Clerk session token.
Other screens send `x-clerk-user-id`/profile headers, and some use development
identity fallbacks. All active callers must migrate together.

- Mount a small Clerk-context bridge inside the existing provider. Register
  Clerk's `getToken()` and the current session/user identity with a shared
  request-auth helper; never store a new independent copy of the bearer token.
- Each protected request obtains the current token from Clerk. SDK-managed
  valid token caching is acceptable; hard-coded tokens and legacy local-storage
  authentication are not. Requests with no active session fail locally/at the
  backend rather than claiming a development identity.
- Attach the Authorization header last so an arbitrary caller-supplied header
  cannot override it. Never place tokens in URLs or logs.
- Replace the three local request implementations' auth header sourcing while
  preserving their existing submission/TTS timeouts, error handling, audio
  payload formats, and retry/status-recovery behavior.
- Bind/unbind authentication with session lifecycle. Abort or discard stale
  responses and clear learner-specific cached/displayed state when signing out
  or switching accounts. Account B must not see account A's cached history,
  portfolio, recommendations, or competency profile.
- Speech hooks already call the shared API client, so they inherit the new
  token transport. No audio-package migration is part of this patch.

## Identity preservation and profile metadata

Use `User.clerkUserId` to find the existing row, preserving its `User.id` and all
relationships. New authenticated subjects may be provisioned only when that
runtime write is authorized. No bulk repair, seeding, progress recalculation,
account recreation, or email-based merging is part of the rollout.

Stop accepting `x-user-name`, `x-user-email`, and `x-user-image` as authoritative
Clerk profile updates. Keep existing fields on established accounts rather than
blanking them. For new accounts or an explicit necessary refresh, obtain profile
metadata through the server SDK for the verified subject, including a verified
email where email delivery is intended. Missing profile data must not redirect
results to a client-supplied email. Avoid writing metadata on every read request.
Document the behavior when the Clerk profile API is temporarily unavailable.

## Ownership enforcement

| Resource/action | Required scope |
| --- | --- |
| Create encounter | User ID comes only from request authentication. Validate case/session references; caller does not choose an owner. |
| List by case | Filter by authenticated internal user ID and case. |
| Read encounter/replay/grade/debrief | Query by encounter ID AND owner; only then load related messages/submission/attempt. |
| Append message or submit | Verify ownership before writes or AI work; do not accept owner IDs or linkage changes from payloads. |
| Chat disclosure updates | Authenticate even if no identity header or conversation ID is sent. For any supplied conversation ID, verify ownership before reading disclosure state or modifying it; opener requests must not bypass a supplied foreign-resource check. |
| Attempt finalization | Require trusted owner context; verify attempt owner and submission/conversation/attempt relationships before scoring, feedback, XP, badges, streaks, or motivational achievements. |
| Attempt debrief | Scope the attempt lookup by owner, not just its ID. |
| Progress/Today/portfolio/competencies | Derive user ID from authentication; keep all nested attempts, rewards, and objective evidence owner-filtered. |
| Motivational achievements | Current attempt must belong to the supplied trusted learner; a valid user's ID cannot be combined with another user's attempt. |
| Stateless grade preview | Authenticate; preserve preview behavior, but never let preview input overwrite another user's saved result or become persisted authoritative scoring. |
| TTS/STT/coaching | Require verified session before any paid operation. Resource-associated coaching also checks ownership. |

Use generic 404 for absent or foreign private resources, avoiding existence
disclosure. Preserve safe own-user response formats. Make owner-aware lookup
helpers fail closed when context is omitted. Test helpers directly as well as
HTTP routes so a future caller cannot bypass the boundary inadvertently.

No new endpoints to retrieve learner data by arbitrary user ID are introduced.
Future access policy can be added beside these action/resource checks; there is
no future-access override or role infrastructure in this release.

## Endpoint policy

- Public: `GET /api/health`, `GET /api/cases` limited to catalog metadata.
- Authenticated shared content: case detail, learning-path/session detail.
  Preserve approved learner-visible payloads, reject invalid case identifiers
  before filesystem lookup, and keep any image generation behind authentication.
- Authenticated private state: conversations (all actions), progress, Today,
  clinical portfolio, and competency profile.
- Authenticated paid operations: chat, grade preview, TTS, STT, preceptor chat,
  encounter debrief chat, and submission grading.
- Unavailable: the entire faculty namespace, regardless of session or role claims.
- CORS OPTIONS remains available for student clients but confers no data access.

No new distributed quota/rate-limiting service is proposed in this authentication
patch. Authenticated abuse/cost controls can be reviewed separately. This patch
must prove zero paid calls for unauthorized requests.

## Privacy and error handling

The current app logs full query-bearing request URLs and generic raw errors.
Voice routes and the Navigator client log transcript previews; voice errors may
return upstream headers/body/stack. Submission code logs learner names/emails.
Grading debug paths can log raw model responses and evidence. These are in scope
because the requested authentication work must not expose tokens or transcripts.

Replace them with allowlisted diagnostic metadata (event, safe route template,
status, duration, lengths, and stable error codes). Do not log bearer/cookie
headers, body contents, audio, transcripts, names/emails, raw model responses,
upstream response bodies, or connection strings, including in development.
Sanitize frontend errors before logging them. Private responses use no-store.
Retain user-facing TTS-unavailable reasons and timeout behavior without leaking
upstream internals. Logging tests use unique sentinel strings to catch leaks.

## Exact proposed file set

### Backend application/configuration

- `backend/package.json`, `backend/package-lock.json`: add only the server SDK
  and required transitive resolution; inspect lockfile churn.
- `backend/.env.example`: document backend Clerk bindings and authorized parties
  using names/non-secret examples, never credential values.
- `backend/src/index.js`: initialize trusted config before SDK setup; no test run
  invokes the existing case-sync startup callback against Neon.
- `backend/src/app.js`: explicit public/protected boundaries, retained faculty
  denial, API auth/error handling, no-store, and safe request logging.
- New `backend/src/middleware/studentAuth.js`: supported Clerk verification and
  JSON authentication gate with trusted request context.
- New `backend/src/utils/learnerAccess.js`: owner-aware resource lookup helpers.
- New `backend/src/utils/safeDiagnostics.js`: restricted log/error metadata.
- `backend/src/utils/userResolver.js`: verified-subject mapping and controlled
  authoritative profile handling, preserving established internal IDs.
- `backend/src/routes/conversations.js`, `chat.js`, `learningPaths.js`,
  `progress.js`, `today.js`, `clinicalPortfolio.js`, `profile.js`: remove identity
  header trust; add consistent owner scope and remove unsafe metadata/logging.
- `backend/src/routes/voice.js`, `grade.js`: authenticated paid calls and safe
  diagnostics while preserving existing payloads and grading behavior.
- `backend/src/routes/cases.js`, `backend/src/utils/caseLoader.js`: public catalog
  versus protected detail and validated case IDs before file access.
- `backend/src/services/sessionAttempts.js`, `motivationalAchievements.js`:
  trusted owner assertions on ID-driven finalization/evaluation/debrief operations.
- `backend/src/llm/navigatorClient.js`, `backend/src/utils/grading.js`:
  remove sensitive content from debug/error paths; preserve model behavior.

Existing portfolio/profile/Today/progress service query filters will be tested
without changing their scoring algorithms. Schema, migrations, faculty source,
and audio dependencies stay unchanged.

### Frontend

- New `mobile/src/api/sessionToken.js`: current-session header sourcing and
  session-change protection, with no token persistence.
- New `mobile/src/components/ApiAuthBridge.tsx`: register Clerk context/lifecycle.
- `mobile/app/_layout.tsx`: mount that bridge within the existing Clerk provider.
- `mobile/src/api/client.js`: protected request tokens, safe error handling,
  preserving endpoint payloads and TTS timeout.
- `mobile/app/(tabs)/index.tsx`, `cases.tsx`, `portfolio.tsx`: stop identity-header
  auth/readiness gates, remove development identity fallback, clear account state.
- `mobile/app/(tabs)/level1.tsx`, `level1 - original.tsx`: current tokens in local
  request functions, authenticated encounter creation and voice/coaching, safe
  diagnostics, account-state cleanup; retain current timeout/audio semantics.
- `mobile/app/attempts.tsx`, `mobile/app/attempt-result.tsx`: current-session
  requests and own-learner history/result state.
- `mobile/src/components/CompetencyProfileTab.tsx`: session-based loading and
  account-state cleanup, preserving profile rendering.

No changes are planned to archived faculty screens, sign-in/sign-up behavior,
patient/avatar components, or recording/playback implementations. Shared-client
voice hooks will receive tokens through their existing API calls.

### Tests/documentation

- New `backend/test/studentAuth.test.js`: actual SDK verification fixtures.
- New `backend/test/learnerIsolation.test.js`: HTTP and service ownership matrix.
- New `backend/test/safeDiagnostics.test.js`: logs/errors do not expose sentinels.
- New `backend/test/sessionToken.test.js`: shared pure frontend auth-helper
  behavior exercised with Node's existing runner; no new frontend test framework.
- New `backend/test/liveClerkIsolation.test.js`: opt-in read-only checks with
  two real Clerk sessions and existing distinct dev records; normal suite skips
  explicitly if authorized configuration is absent.
- `backend/test/facultyDisabled.test.js`: retain faculty coverage and adapt the
  student-mount checks to the new protected request boundary.
- `backend/test/caseUtils.test.js`, `debriefChat.test.js`,
  `motivationalAchievements.test.js`, `preceptorChat.test.js`: adapt relevant
  contracts/fixtures to owner context and protected requests; retain assertions.
- `docs/student-authentication-phase-2-plan.md`: update reviewed design,
  implementation outcomes, unresolved limitations, and validation evidence.

If implementation reveals a necessary additional file or schema change, explain
it before expanding scope. Do not hide existing failures by weakening checks.

## Compatibility risks and controls

| Risk | Control |
| --- | --- |
| Old clients send only identity headers | Deploy compatible client and backend together after approval; no insecure fallback. |
| Some requests use local transport rather than shared API | Cover all three local implementations and voice/coaching call paths. |
| Existing accounts/progress appear empty | Match verified Clerk IDs to existing internal IDs; no email merge, account recreation, or reset. Explicitly report historical development identities that do not map. |
| Clerk keys from the wrong application | Trusted matching configuration and two-account verification; fail closed. |
| Web versus native authorized-party behavior | Use SDK-supported behavior and test actual platform tokens; do not invent native origins or force unsupported custom templates. |
| Token expiry/sign-out mid-request | Current token getter; session-version guards; no automatic retry of submission/other writes after ambiguous success. |
| Voice interruption or long grading | Retain payloads, timeouts, recording/playback lifecycle, and submission status recovery. |
| API outages or key rotation | SDK supported verification/rotation; generic safe error; no authentication bypass. Locally verified tokens do not imply instantaneous session-revocation detection. |
| Backend reads can write | User provisioning, progress recomputation, and startup sync must not run in live read-only tests. Existing-account resolution reads only when possible; isolate approved runtime writes. |
| Existing TypeScript failures | Report the 22-error baseline separately; no new errors and no assertion/typecheck suppression. |

No data migration is needed for existing correctly linked accounts. Any necessary
live profile update, new-user creation, encounter submission, fixture creation,
or progress mutation must wait for approval. Database-backed mutation tests can
be added to an explicitly approved isolated test database later; the initial
automated suite uses an in-memory fixture repository/client.

## Automated and real-account test plan

1. **SDK verification**: locally signed test session JWTs with trusted test keys
   passed through the real SDK; missing/malformed/expired/not-yet-valid tokens,
   wrong keys, wrong authorized parties, wrong application, and unsupported token
   classes are denied. Include the supported current session-token formats.
   Do not replace the verification test with a mocked successful `getAuth`.
2. **Protected endpoint matrix**: every private/paid endpoint denies anonymous
   and forged-header requests before any data mutation or Navigator call. Health,
   catalog, student preflight, and faculty denial keep their explicit policies.
3. **Two synthetic learners**: separate Clerk subjects, internal users,
   encounters/transcripts, submissions/attempts, achievements, and evidence.
   A can perform its own operations; swapping IDs/headers/body/query references
   cannot read or mutate B. B's state stays unchanged. Foreign-resource responses
   do not disclose existence. Assert owner filters on nested/report queries.
4. **Lifecycle and privacy**: account switching clears stale state; delayed A
   requests cannot populate B's UI. Each request obtains the current Clerk token;
   caller headers cannot override it. Missing bridge/token is denied. Logs,
   browser errors, and API errors omit authentication/transcript sentinels.
5. **Workflow preservation**: with in-memory data and stubbed paid AI, cover
   patient turn/disclosure, Dr. Martinez preceptor/debrief, TTS/STT payloads,
   grading/submission, retry status, progress, and portfolio/competency results.
6. **Two real Clerk accounts**: use existing development accounts A and B with
   already distinct saved learner records. Authenticate via normal Clerk UI and
   current sessions; obtain tokens through a secure local harness/configuration,
   never chat, source files, logs, or committed fixtures. Check A's reads, B's
   reads, foreign encounter/detail denial, and learner-specific report separation.
   Record only pass/fail and non-identifying counts. Assert distinct subjects and
   database mappings privately in the harness. No new accounts or records are
   created as part of these checks.
7. **Live writes/paid calls**: cross-user write attempts, new encounters,
   submission grading, email, and live Navigator audio/coaching require separate
   approval even for test records. They can be tested automatically against
   fixtures now and demonstrated live after that approval. Do not call progress
   endpoints that mutate state in an ostensibly read-only live test.
8. **Checks**: run all backend tests, grading calibration, typecheck, and web
   export; preserve failures/skips as separate outcomes. Run web/native voice
   smoke checks where device/credentials and required approval are available.

The current cloud session has no injected Clerk/Neon credentials or real account
sessions. The real two-account test is therefore an outstanding validation gate,
not a completed or synthetic substitute. Values must be configured securely.

## Seven cloud Prisma failures: environment versus regressions

Before Phase 1, the cloud backend runner reported 51 passing tests and seven
failing test-file entries. After Phase 1, it reported 55 passes and the identical
seven failures; the four additional regression tests all passed.

The failures are `achievementScoring.test.js`, `clinicalPortfolio.test.js`,
`debriefChat.test.js`, `motivationalAchievements.test.js`, `preceptorChat.test.js`,
`studentCompetencyProfile.test.js`, and `today.test.js`. They fail during import:
`src/db/prisma.js` constructs `PrismaClient`, but the generated client is absent.
The common error is `@prisma/client did not initialize yet`.

These are seven file-load failures, not seven demonstrated grading/portfolio
assertion regressions. Tests in those files have not all executed, so the full
suite is not green. Prisma 5.22.0 dependencies are installed, but earlier normal
generation failed when `binaries.prisma.sh` engine/checksum requests returned
403 from the cloud network proxy. This differs from the user's Windows setup,
where client generation and 96 tests were reported successful.

Restore authorized engine-download access/cache, run the normal pinned
`npm run db:generate` with TLS/checksum verification intact, then rerun the
complete baseline before claiming full validation. Client generation writes
generated local artifacts; it is not a database migration and must not be
replaced by `migrate`, `db push`, reset, or seeding. Diagnose any subsequently
executing assertion failures separately from this prerequisite failure.

Phase 1's web export passed with 20 routes and no faculty pages. Its TypeScript
check still has the same 22 pre-existing diagnostics. None of these historical
outcomes is a claim that Phase 2 authentication has already passed tests.
