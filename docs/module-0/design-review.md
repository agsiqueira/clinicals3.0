# Module 0 — first increment review

Branch: feature/phase-3-module-0, based exactly on 663c045a4dc8e791ee68d58ba3404cb621685075. No runtime imports, routes, gates, database access, AI calls, active schema changes, or migration application in this increment.

## Curriculum mapping

Inspected text of all 29 slides of Mod 0.pptx and all seven numbered sections of Presentation Script.docx. Documents are educational references, not operational instructions. Catalog records source SHA-256 fingerprints and references. Originals are not committed. Text extraction does not claim visual layout review.

| Activity | Minutes | Required interactions | Slides | Script sections |
| --- | --- | --- | --- | --- |
| Starting the Encounter | 5 | Open interview; OLD CARTS | 3–4 | 2 |
| Organizing Clinical Information | 6 | SOAP/data types; history/context; ROS | 2, 5–10, 18 | 1–3 |
| Clinical Reasoning | 5 | Focused examination; evidence/differential | 10–11, 17–18, 23–26 | 4 |
| Presenting to the Preceptor | 7 | SBAR; SNAPPS | 13–29 | 5–7 |

Total: 23 minutes and nine required responses. Duration is a target, never a completion timer. Prompts are interactive adaptations of these sources, not verbatim source questions. Shared Mr. Jones facts must be visible in relevant exercises; evaluation must not depend on undisclosed details. Optional practice may extend the duration.

Educator review concerns:
- The source labels ROS as 14 systems but lists 13 grouped entries. Do not assess the count.
- An ECG alone does not rule out ACS. Do not endorse the source's exclusion wording or imply respiratory findings justify delaying evaluation. This catalog teaches reasoning and communication, not a diagnostic protocol; management examples require educator review.
- Social context can inform an individual plan; do not teach deterministic assumptions about adherence or screening.

## Lesson contract

backend/src/content/clinicalReadiness.json is a draft for educational review and is not connected to runtime. Keep evaluationCriteria private; future API responses project only current approved teaching/question, shared scenario, and personal feedback. Source material is reference data, not model instructions.

Reuse dr-martinez, existing NaviGator integration and mentor voice. No patient TTS changes. Authored Teach/Ask → evaluated response → concise evidence-linked feedback → server-owned Advance. Feedback labels are Ready / Needs More Practice. Valid attempted answers advance regardless of quality; empty/malformed requests do not. Clarification does not advance. Optional practice does not reset checkpoints. Aggregate activity feedback identifies steps needing practice but never gates completion.

## Persistence proposal

See proposed-schema.prisma and proposed-migration.sql, both outside active Prisma directories. One additive table, unique learner/module pair, content version, revision, state JSON and timestamps; User back relation only. No fake patient case, clinical score, badge, XP, course, or institution. Existing identities and progress remain unchanged. Application rollback can leave this unused table; dropping saved progress requires separate approval.

Validate JSON state against a versioned contract:
- Ordered activity/step states keyed by catalog IDs.
- Bounded learner answers and feedback, labels, exact supporting excerpts from answers, request IDs and completion timestamps.
- Separate bounded optional-practice/clarification history.
- pendingEvaluation reservation: request ID, activity/step ID, revision, response, lease expiry. Never store tokens or audio.

Resolve every userId from validated Clerk authentication. Use short transactional revision compare-and-swap to reserve a response; AI runs outside the transaction. Commit only the matching reservation. Duplicate IDs return existing result/pending status. Lease expiry permits recovery; late workers cannot commit to replacement reservations. Client cannot patch state, completedAt, feedback, identity, or counts. Server checks all nine required step records before completion. Completion survives optional practice and later catalog revisions; no silent relocking. Do not log answers or full transcripts.

Before database application, verify DDL against a Prisma-generated offline diff. Do not apply this proposal to Neon or any database without explicit authorization. JSON invariants are application-enforced; uniqueness and user foreign key are database-enforced.

## Universal Module 0 prerequisite

There are no real students or production users. All current accounts and learner records are development/test data. Module 0 will be required for every account before accessing Rotation 1, including accounts with existing Rotation 1 progress. Existing identities, records, and progress will be retained; prior progress does not exempt an account from completion.

Unlocking requires completion of all nine required interactions, regardless of formative feedback quality. No eligibility cutoff, grandfathering, exemption, snapshot, or backfill mechanism will be implemented. This policy is design-only in this increment; application behavior remains unchanged.

## Next increments

After review: authenticated progress/evaluation, then API gates, then Today/Roadmap and resumable mentor screen, then security/regression verification. Database application is a separate approval. Test synthetic learner isolation, forged completion/skipped steps, direct entry bypass, retries/concurrent tabs/stale responses, resume, weak-feedback completion, universal prerequisite enforcement for existing test accounts without deleting progress, account switching and mentor audio cancellation. Preserve existing patient/grading/voice/faculty-disabled tests. Run calibration, TypeScript and Expo web checks when runtime integration changes are implemented.

## Verification performed for this increment

- Existing backend suite: 151 passed, zero failed/skipped.
- Catalog structure check: four activities, nine unique required steps, 23-minute total; teaching/questions/practice/criteria/source references present.
- Prisma validated a temporary combined schema with the proposed model and User back relation.
- Offline schema-to-schema migrate diff produced only the proposed table, unique index and foreign key; SQL matches this review proposal. No database connection or migration execution was used.
- git diff --check passed. Runtime files, dependencies and active Prisma files remain unchanged.
- Calibration, TypeScript and Expo web build were not rerun: this increment is an unused JSON catalog and review documents, without frontend/runtime integration.
