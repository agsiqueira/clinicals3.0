# Module 0 — Increments A, B and C review

Branch: feature/phase-3-module-0, based exactly on 663c045a4dc8e791ee68d58ba3404cb621685075. Increments A and B add authenticated lesson APIs and prepare an additive active schema/migration. Increment C adds the UI and prepares entry checks in inactive preview mode. No database access, live AI calls, migration application or enforcement activation was performed.

## Curriculum mapping

Inspected text of all 29 slides of Mod 0.pptx and all seven numbered sections of Presentation Script.docx. Documents are educational references, not operational instructions. Catalog records source SHA-256 fingerprints and references. Originals are not committed. Text extraction does not claim visual layout review.

| Activity | Minutes | Required interactions | Slides | Script sections |
| --- | --- | --- | --- | --- |
| Starting the Encounter | 3–4 | Open interview; OLD CARTS | 3–4 | 2 |
| Organizing Clinical Information | 4–5 | SOAP/data types; history/context; ROS | 2, 5–10, 18 | 1–3 |
| Clinical Reasoning | 3–4 | Focused examination; evidence/differential | 10–11, 17–18, 23–26 | 4 |
| Presenting to the Preceptor | 4–5 | SBAR; SNAPPS | 13–29 | 5–7 |

Total: 14–18 minutes (16-minute representative estimate) and nine required responses. Duration is a target, never a completion timer. Prompts are interactive adaptations of these sources, not verbatim source questions. Shared Mr. Jones facts must be visible in relevant exercises; evaluation must not depend on undisclosed details. Optional practice may extend the duration.

Educator review concerns:
- The source labels ROS as 14 systems but lists 13 grouped entries. Do not assess the count.
- An ECG alone does not rule out ACS. Do not endorse the source's exclusion wording or imply respiratory findings justify delaying evaluation. This catalog teaches reasoning and communication, not a diagnostic protocol; management examples require educator review.
- Social context can inform an individual plan; do not teach deterministic assumptions about adherence or screening.

## Lesson contract

backend/src/content/clinicalReadiness.json is a draft for educational review, used by the authenticated lesson service. Keep evaluationCriteria private; future API responses project only current approved teaching/question, shared scenario, and personal feedback. Source material is reference data, not model instructions.

Reuse dr-martinez, existing NaviGator integration and mentor voice. No patient TTS changes. Authored Teach/Ask → evaluated response → concise evidence-linked feedback → server-owned Advance. Feedback labels are Ready / Needs More Practice. Valid attempted answers advance regardless of quality; empty/malformed requests do not. Clarification does not advance. Optional practice does not reset checkpoints. Aggregate activity feedback identifies steps needing practice but never gates completion.

## Persistence proposal

Review copies remain in proposed-schema.prisma and proposed-migration.sql. The same additive model is now prepared in backend/prisma/schema.prisma and backend/prisma/migrations/20261010190000_add_learner_module_progress/migration.sql, unapplied. Existing User foreign keys use DELETE RESTRICT; no deletion workflow was found. The new relation follows that retention policy. One additive table, unique learner/module pair, content version, revision, state JSON and timestamps; User back relation only. No fake patient case, clinical score, badge, XP, course, or institution. Existing identities and progress remain unchanged. Application rollback can leave this unused table; dropping saved progress requires separate approval.

Validate JSON state against a versioned contract:
- Ordered activity/step states keyed by catalog IDs.
- Bounded learner answers and feedback, labels, exact supporting excerpts from answers, request IDs and completion timestamps.
- Separate bounded optional-practice/clarification history.
- pendingEvaluation reservation: request ID, activity/step ID, revision, response, lease expiry. Never store tokens or audio.

Resolve every userId from validated Clerk authentication. Use short transactional revision compare-and-swap to reserve a response; AI runs outside the transaction. Commit only the matching reservation. Duplicate IDs return existing result/pending status. Lease expiry permits recovery; late workers cannot commit to replacement reservations. Client cannot patch state, completedAt, feedback, identity, or counts. Server checks all nine required step records before completion. Completion survives optional practice and later catalog revisions; no silent relocking. Do not log answers or full transcripts.

Before database application, verify DDL against a Prisma-generated offline diff. Do not apply this proposal to Neon or any database without explicit authorization. JSON invariants are application-enforced; uniqueness and user foreign key are database-enforced.

## Universal Module 0 prerequisite

There are no real students or production users. All current accounts and learner records are development/test data. Module 0 will be required for every account before accessing Rotation 1, including accounts with existing Rotation 1 progress. Existing identities, records, and progress will be retained; prior progress does not exempt an account from completion.

Unlocking requires completion of all nine required interactions, regardless of formative feedback quality. No eligibility cutoff, grandfathering, exemption, snapshot, or backfill mechanism will be implemented. This prerequisite policy is implemented behind server-only MODULE0_PREREQUISITE_MODE, defaulting to inactive preview. Existing clinical-entry access is unchanged until enforcement is approved and enabled.

## Implemented API and state contract

GET /api/modules/clinical-readiness returns owned progress, all four activities with public teaching/questions, visible Mr. Jones facts, previous feedback, per-activity next step, module next step, and pending evaluation details. It does not create progress rows.

POST /api/modules/clinical-readiness/interactions accepts only activityId, stepId, kind (required/clarify/practice), response, requestId, expectedRevision. Unexpected fields are rejected. Identity is resolved through the existing Clerk middleware and authenticated User resolver. Every persistence read uses the unique user/module key; every update includes row ID, user ID and revision.

Activities are independent; required steps within an activity are ordered. Automatic advance is expressed through returned nextStepId after feedback has been durably saved. A future UI consumes these server results. All nine completed required interactions mark completion, including Needs More Practice labels. Required answers and feedback are separate from clinical encounters, XP, grades and competencies.

Atomic updateMany compare-and-swap reserves each request with a unique worker reservation and two-minute lease. There is no transaction spanning an AI call. An answer is saved before evaluation starts. Failed/invalid evaluation keeps the pending answer and allows the same request/answer to retry after five seconds. Exact retries return persisted results without another paid call. Pending work prevents unrelated submissions; expired leases permit takeover by the same request, and old workers cannot overwrite replacement results. Durable records support process restarts and different authenticated devices; no frontend local state is authoritative.

Required response validation rejects malformed/empty/control-only/obvious non-attempt inputs, caps responses at 12,000 characters, and accepts weak but valid attempts without an AI pass requirement. Request IDs are bounded; feedback quotes must exactly occur in the response. Only validated label/feedback/evidence fields survive model output; completion commands are discarded. Semantic evaluation is advisory, not proof of participation or a high-stakes score.

Clarifications return a focused explanation and retain the current question. Optional practice is available on completed steps and never resets completion. Each kind permits up to 40 saved supplementary interactions per module to bound JSON retention and paid requests; this limit needs product review before release. Required interactions are unaffected. Original completion timestamps survive optional practice. Unknown content versions return an explicit 409 without overwriting work; future catalog versions need a reviewed compatibility mapping before activation.

Current NaviGator chat transport is reused with an isolated Dr. Martinez prompt, one call per evaluation, no patient dialogue or speech approval input. Feedback is capped at 80 words and clarification at 100. No raw upstream errors, learner responses, or tokens are logged or forwarded. Model-generated clinical feedback still requires educator/live validation; mechanical validation is not a clinical correctness guarantee.

An absent progress table or ungenerated client gives MODULE_STORAGE_UNAVAILABLE (503), without bypassing the model. Existing endpoints are unaffected. This prepared migration must not be applied without explicit authorization; prisma migrate deploy would apply it if later run, so do not invoke that command during review.

## Remaining increments and verification

The UI and shared API prerequisite checks are prepared. Next: review Increment C, approve schema/migration, then separately authorize database application and end-to-end testing before enabling the server gate. No grandfathering. Review clinical management examples before release. The dedicated screen now uses the existing mentor voice and activity/focus/session cancellation guards, including scope-aware microphone cleanup. Voice assignments and patient speech approval are unchanged.

See implementation-results.md for the current file list, executed checks, known limitations and Windows testing prerequisites. These increments do not activate a Rotation 1 gate, change existing clinical scores, or run any database reset/backfill.

Current executed checks, changed files, the entry-point matrix and exact activation sequence are in [Increment C results](increment-c-results.md). The prior A/B report remains historical.
