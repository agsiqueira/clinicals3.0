# Student-first release: preservation baseline and faculty disablement

## Scope and baseline

This work implements Phase 0 and Phase 1 only. Clerk session verification and
learner data isolation remain Phase 2. No new roles, faculty allowlists,
institutional configuration switches, or database changes are part of this work.

Baseline commit: `4051e30781c3ab7526805859d3a061529186619d`.
Implementation branch: `security/student-first-phase-0-1`.
The checkout was clean before the branch was created. Validation runs in the
Linux cloud checkout with Node 24.19.0 and npm 11.9.0, not the Windows desktop.

## Identity and data preservation

The following describes the repository's schema and resolver, not an inspection
of live Neon rows or a verified export of Clerk accounts. No personal identifiers,
email addresses, connection strings, tokens, or credentials are recorded here.

| Relationship | Existing mapping to preserve |
| --- | --- |
| Clerk account to application user | `User.clerkUserId` is unique; `User.id` is the internal primary key. `getOrCreateUser` upserts by `clerkUserId`. |
| Encounter ownership | `Conversation.userId` references `User.id`; `Message.conversationId` references the encounter. |
| Saved grading | `Submission.conversationId` is unique; an optional unique `sessionAttemptId` links the result to an attempt. |
| Learning attempt ownership | `SessionAttempt.userId` references `User.id`; it also links a patient session and optional unique conversation. |
| Objective evidence and feedback | `AchievementResult` and `SessionFeedback` reference a session attempt; ownership follows that attempt. |
| Progress and streak | `UserProgress.userId` and `Streak.userId` each have unique user links. |
| Rewards | `BadgeAward`, `XPEvent`, and `UserMotivationalAchievement` link to the user; relevant awards/events also link to an attempt. |
| Coaching and readiness | `MentorAssessment`, `PreceptorMessage`, and `OptionalProfessionalReadinessResult` link to the user; some also link to an attempt. |
| Shared training content | Learning paths, units, patient sessions, cases, rubric versions, and achievement definitions describe training content rather than institution membership. |

Current student route resolvers trust `x-clerk-user-id` and can update profile
metadata from client headers. This remains a known Phase 2 security issue; this
patch does not imply those mappings have been authenticated or repaired.

Preserve the existing Clerk application, its account IDs, all internal user IDs,
and every relationship above. Do not merge users by email, reset databases, run
migrations/seeding, recalculate live progress, or synchronize cases to establish
this baseline. The normal backend startup currently synchronizes cases, so it
must not be used against Neon as a read-only preservation check.

## Live mapping and Neon recovery verification

The user clarified that the Neon database contains development/test data only,
with no real users or production student records. Formal backup verification,
restoration testing, and preservation of existing test records are therefore
**not prerequisites** for Phase 1. No destructive database operation is needed
for this change. Keep schema integrity and migrations controlled, use test
records for regressions when access is available, and complete secure learner
authentication and ownership enforcement before onboarding real users.

**Status: not verified in this session.** No `DATABASE_URL`, `DIRECT_URL`,
`NEON_API_KEY`, or Clerk server credentials are injected, and no backend dotenv
file is present. No Neon management connector is available. The local database
prepared during cloud onboarding is not evidence of the Neon project's state.

No production database queries or mutations have been performed. Live mapping
counts, duplicate/unmapped accounts, orphaned relationships, and deployed
migration state therefore remain unverified. The schema's uniqueness and foreign
keys describe intended constraints, not a live data reconciliation.

A recoverable Neon backup or recovery point has **not** been established by
evidence available to this session. A declared retention setting alone would not
prove a currently available recovery point, and neither Git history nor the cloud
filesystem snapshot is a Neon database backup.

Recovery evidence, if requested later, should come from the correct Neon project
and branch: recovery method, available restore interval or backup timestamp,
and matching database/branch identity. Keep credentials and personal data out of
the report. Record separately whether recovery availability is verified and
whether restoration has actually been tested. Do not create a branch, restore
a database, or change retention to perform a read-only check. This evidence is
not a gate for the current development/test-only Phase 1 work.

If authorized database access becomes available, use a read-only transaction for
aggregate mapping/relationship checks. If authorized Clerk management access is
also available, reconcile account existence without logging or persisting account
identifiers. Counts alone must not be described as verified one-to-one account
matching. Historical development identities require a separate reviewed repair.

## Pre-change active routes

All paths below have the `/api` prefix. GET routes also have Express HEAD handling.

| Method | Paths |
| --- | --- |
| GET | `/health`, `/cases`, `/cases/:caseId` |
| POST | `/chat`, `/grade`, `/voice/speak`, `/voice/transcribe` |
| POST | `/conversations`, `/conversations/:id/messages`, `/conversations/:id/debrief-chat`, `/conversations/:id/submit` |
| GET | `/conversations/by-case/:caseId`, `/conversations/:id` |
| GET | `/progress`, `/today`, `/clinical-portfolio`, `/profile/competencies` |
| GET | `/learning-paths`, `/learning-paths/patient-sessions/:slug` |
| POST | `/learning-paths/patient-sessions/:slug/preceptor-chat` |
| GET | `/faculty/dashboard`, `/faculty/dashboard/export.csv`, `/faculty/students/:studentId`, `/faculty/students/:studentId/export.csv` |

The student frontend routes are Today (`/`), Roadmap (`/cases`), Portfolio
(`/portfolio`), `/level1`, `/level1 - original`, `/attempts`, `/attempt-result`,
`/clinical-portfolio` (redirect), `/signin`, `/signup`, and `/modal`, plus Expo's
route-group aliases and generated sitemap/not-found routes. The pre-change web
export had 24 static routes, including `/faculty`, `/faculty/student/[studentId]`,
and their `(tabs)` aliases. The Faculty button was present on Today even though
the faculty tab entries used `href: null`.

## Pre-change validation

| Check | Observed result |
| --- | --- |
| `cd backend && npm test` | 51 passed; 7 test files failed at import because Prisma Client is not generated in this cloud checkout. These are pre-existing environment failures, not 7 completed failing assertions. |
| `cd backend && npm run rubric:calibrate` | All three offline fixtures passed. |
| `cd mobile && ./node_modules/.bin/tsc --noEmit --incremental false` | 22 existing errors: sign-in (5), faculty percentage widths (2), faculty student fallback (4), older encounter styles (9), current encounter unreachable stage condition (1), avatar nullable source (1). |
| Expo web export | Passed; 24 static routes. Built with `EXPO_PUBLIC_API_BASE_URL=http://localhost:3001`, `CI=1`, `EXPO_NO_TELEMETRY=1`, and a writable Expo user directory outside the checkout. |

The failing test files are `achievementScoring`, `clinicalPortfolio`,
`debriefChat`, `motivationalAchievements`, `preceptorChat`,
`studentCompetencyProfile`, and `today`. Their failure is
`@prisma/client did not initialize yet`. Earlier onboarding established that the
Prisma engine download was blocked. No workaround disables checksum/TLS checks.

The user's Windows report of 96 passing backend tests, applied migrations,
working Clerk accounts, and functional voice is separate user-reported evidence;
it has not been independently verified against Windows or Neon here.

## Phase 1 implementation and verification

The Express construction was extracted to `backend/src/app.js`; the entry point
still loads the same ten student routers, starts on the same configured port,
and retains its existing startup behavior. It no longer imports the faculty
router. An unconditional `/api/faculty` handler returns a generic 404 with
`Cache-Control: no-store` before CORS preflight, body parsing, or data handlers.
There is no faculty reactivation configuration switch.

The Faculty button on Today and both faculty tab registrations were removed.
The two screens were moved to `mobile/future/faculty`, outside Expo's active
route directory. The dashboard screen is byte-for-byte unchanged; only two
relative imports changed in the student detail screen. Existing type errors in
the preserved source remain visible to TypeScript. Faculty styles, API helpers,
backend router, and backend service are unchanged supporting source.

`backend/test/facultyDisabled.test.js` exercises the production entry point and
real Express app construction. Database/AI student handlers are replaced with
test routers; the real case catalog/detail handlers are exercised. The harness
does not execute startup synchronization or access Neon. Its four tests cover:

- Startup imports only student routers; faculty imports are rejected by the
  harness, and no case synchronization is executed.
- GET/HEAD return 404 at the namespace root, former dashboard/detail/CSV URLs,
  unknown nested URLs, trailing slash/query forms, and mixed-case paths. A
  bearer/header claim of faculty identity does not change the outcome.
- POST/PUT/PATCH/DELETE/OPTIONS also return 404. Malformed and oversized JSON do
  not bypass the denial or return parser errors. A downstream faculty handler
  never executes.
- Health and the real case catalog/detail still work; all student router mounts
  are retained, and student CORS preflight remains unchanged. Stubbed student
  handlers demonstrate routing continuity, not full authenticated/AI behavior.

### Post-change results

| Check | Observed result |
| --- | --- |
| Faculty regression tests | 4 passed; 0 failed; 0 skipped. |
| Full backend test command | 55 passed; the same 7 test files fail at import because the cloud Prisma Client remains ungenerated. The four new tests pass; no new test-file failures. |
| Offline grading calibration | All three fixtures passed: borderline 87%, ideal 100%, weak 16%. |
| TypeScript | The same 22 existing diagnostics; 0 new diagnostics after normalizing the two moved faculty filenames. No checks were disabled. |
| Expo web export | Passed; 20 static routes instead of 24. Comparing both exports shows only the four faculty route/alias entries were removed; no student route was removed or added. |
| Exported web artifact HTTP checks | 17 passed: GET/HEAD deny faculty paths with 404, while representative student HTML pages remain available. This verifies a local static server serving the export, not deployed hosting or native devices. |
| Preservation checks | Archived screens match their original source except the two detail-screen imports. Faculty backend source/styles, Prisma schema, and dependency manifests/lockfiles match the baseline. No database mutation or schema/migration command was run. |
| Patch formatting | `git diff --check` passed. |

No merge or deployment was performed. Live Windows/Neon behavior and native
device behavior were not tested. Previously deployed frontend artifacts and the
running old backend remain unchanged until an approved deployment replaces them.
Student identity-header trust remains unresolved and must be addressed in Phase 2
before real users are onboarded. This work stops after Phase 1.
