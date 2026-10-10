# Module 0 — Increments A and B results

This is the historical A/B report. For current UI/gate implementation and activation instructions, see [Increment C results](increment-c-results.md).

Local implementation on feature/phase-3-module-0 after design commit f77d027a57ed15e218c17cac2a7de9dd5347edb7. No push, merge, deployment, database queries/mutations, or migration execution. Existing clinical entry remains unchanged; gates and UI await review.

## Changed files

- backend/src/content/clinicalReadiness.json — 14–18 minute range, representative 16 minutes; nine source-referenced steps, concise answer hints, shared visible scenario.
- backend/prisma/schema.prisma — additive LearnerModuleProgress and User back relation.
- backend/prisma/migrations/20261010190000_add_learner_module_progress/migration.sql — prepared, unapplied additive table/index/foreign key.
- backend/src/services/clinicalReadiness.js — owned persistence, projection, independent activities, ordered steps, exact resume, request reservation, retries and completion.
- backend/src/utils/clinicalReadinessTeaching.js — isolated Dr. Martinez formative evaluation/clarification using existing NaviGator transport; validates labels, bounded text and literal evidence.
- backend/src/routes/clinicalReadiness.js — authenticated GET progress and POST interaction handlers; safe errors/no-store responses.
- backend/src/app.js and backend/src/index.js — register only the student lesson router, behind existing Clerk middleware.
- backend/test/clinicalReadiness.test.js — 19 new automated tests.
- backend/test/facultyDisabled.test.js — update expected student startup-router list; retain all faculty-denial assertions.
- docs/module-0/design-review.md — current contract and policy.
- docs/module-0/implementation-results.md — this report.

No mobile, patient, grading, voice configuration, dependency, or existing-record changes.

## Automatic saving and resume

GET reads the authenticated learner/module row without creating it. POST validates the actual attempt and reserves it through revision-conditional updateMany before AI evaluation. JSON holds the accepted response, request ID, worker reservation and lease. A successful evaluation is validated and atomically saved with the checkpoint; only then is the next step returned. All nine checkpoints set completedAt regardless of label.

The last active unfinished activity is the default resume target; each activity also exposes its own next unfinished step. Completing activities independently is supported; later steps in the same activity cannot be skipped. Responses, feedback and next-step state live in PostgreSQL once the approved migration is applied, so browsers/devices/processes use the same data. Synthetic tests recreate the service against a retained store to verify restart behavior.

Failed or malformed AI output leaves the accepted answer pending without advancing. Retry after five seconds with the same request ID/answer; replay after success returns the saved result without another AI call. A two-minute lease allows recovery from an abandoned worker. Expired-worker output cannot overwrite the replacement reservation. Pending state exposes the learner's own retained answer for a future UI to recover; it never exposes tokens or worker reservation IDs.

## Formative behavior and security

Ready and Needs More Practice are advisory labels. Valid weak attempts advance after feedback persistence. Clarification never advances; targeted practice never increases required checkpoints or clears completion. Targeted practice is evaluated against its own question rather than unrelated parts of the original exercise.

Identity comes only from the existing validated Clerk session and User resolver. Query/header identities do not select another learner. Unexpected submission fields, including identity, history, scores and completion flags, are rejected. Every row update includes authenticated userId plus revision. Private criteria are omitted from public projections. AI output cannot set completion; only literal response evidence and validated feedback fields are retained. Learner text is untrusted model input; no client tutor history is used. No raw upstream exceptions, answers, clinical transcripts or tokens are logged.

Empty, malformed, obvious control-only/non-attempt responses and oversized inputs are rejected deterministically. This formative system is not proof of attention: weak attempted answers can complete the module by design. Semantic clinical correctness and prompt-injection resistance still need educator/provider validation.

## Database review

Prepared table: id, userId, moduleId, contentVersion, revision, JSON state, startedAt, completedAt, updatedAt; unique (userId,moduleId), User foreign key with DELETE RESTRICT / UPDATE CASCADE, matching existing retention constraints. Review the active migration and the original proposal copies. No destructive statements, backfill, exemptions or institutional models.

Prisma validate and generate succeeded (Client 5.22.0). Generation is a local ignored artifact, not a database operation. Offline schema-to-schema diff from committed baseline contains only the new table, index and foreign key and matches prepared SQL. No checksums or TLS verification were bypassed. Do not run migrate deploy/dev until database application is explicitly approved.

## Executed checks

| Check | Result |
| --- | --- |
| Full backend suite | 170 passed, 0 failed/skipped: 151 existing + 19 new |
| Grading calibration | All passed: borderline 87%, ideal 100%, weak 16% |
| Prisma validate / generate | Passed; Client 5.22.0 |
| Offline migration diff | Only approved additive model; no DB connection |
| Expo web export | Passed, 20 existing static routes; output in /tmp/module0-web-export |
| TypeScript | Failed with 22 existing diagnostics; no frontend changes or new diagnostics |
| git diff --check | Passed |

The first full-suite run caught the startup test's closed router list; updating that list for the new authenticated student router resolved its four failures. No assertions were removed. Expo initially failed because telemetry tried writing to an unavailable /home/agent/.expo directory; EXPO_NO_TELEMETRY=1 fixed the environment issue without changing source/configuration. TypeScript's existing errors remain in sign-in, legacy/current level1, inactive faculty sources and the avatar component. The backend JS tests exercise the new service; mobile tsc does not type-check backend JS.

Tests use synthetic records and locally signed synthetic Clerk sessions with the supported real verifier. They make no live Clerk/AI calls and require no live credentials. PostgreSQL-backed integration tests have not run because migrations to any database are not authorized.

## Remaining limitations and Windows validation

- The new API returns controlled 503 MODULE_STORAGE_UNAVAILABLE until the migration is approved/applied and Prisma Client regenerated locally. Existing endpoints remain available.
- No Module 0 screen, Today/Roadmap card, microphone wiring or new audio behavior exists yet. Existing patient and Dr. Martinez voices are untouched.
- Rotation 1 is not gated yet. Universal completion policy is documented, with no grandfathering.
- Unknown content versions return explicit 409 without overwriting records. A compatibility mapping/archive policy must accompany future catalog versions; version 1 is the only current content.
- Up to 40 successful clarifications and 40 practice interactions are retained per module. Required work is unaffected; this product limit should be reviewed before release.
- Model outages require retry to obtain feedback; persisted answers remain available but the step does not advance without feedback.
- Clinical management exemplars and live model feedback need clinical educator review, including the documented ECG/ROS/social-context cautions.
- No new environment variables are required. Existing Clerk and NaviGator settings remain in use; mentor voice will be wired in Increment C using its existing setting.

Before Windows live testing: review/approve this implementation and migration, explicitly authorize database application, implement Increment C's authenticated UI/gates and cancellation integration, then rerun integration/security checks and test two distinct Clerk learners. Nothing has been pushed for Windows checkout yet.
