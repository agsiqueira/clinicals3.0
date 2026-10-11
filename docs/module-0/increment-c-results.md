# Module 0 — Increment C results and activation review

Implemented locally on feature/phase-3-module-0, retaining Increments A/B and design commit f77d027a57ed15e218c17cac2a7de9dd5347edb7. Implementation is approved for publication on this feature branch for review and Windows testing; enforcement and database setup remain unapproved. No migration application, Neon query, deployment, merge, database reset or learner-record mutation was performed. Test writes use synthetic in-memory stores.

## Frontend behavior

Module0Card appears before Rotation 1 on Today and Full Roadmap. It displays four activities, the 14–18 minute estimate, server-provided counts, and Start/Continue/Review actions. Clicking an activity opens that activity; opening the module normally selects the backend's next unfinished step. There is no new tab; /module-0 is a dedicated signed-in stack screen.

The screen uses the existing Dr. Martinez avatar, configured EXPO_PUBLIC_NAVIGATOR_MENTOR_TTS_VOICE (same am_adam fallback), voice preference, playback hook, and ClinicalsChatComposer. Authored short teaching/question is spoken on entering a step; feedback is spoken after a saved response. Learners can stop/mute/replay teaching, type or use the existing microphone/Whisper flow, ask for clarification, and choose optional targeted practice. No patient voice settings, TTS approval payload, model, speed, or case configuration was changed.

All nine required interactions remain. Ready and Needs More Practice both advance after a valid attempted answer and persisted feedback. A completed activity stays available for review, with a Continue-to-next-activity action. Completed steps display saved answers and feedback; optional practice and completed-step clarification cannot reset completion or add required checkpoints. Mr. Jones facts remain visible during the exercises, not a memory test. Module 0 feedback is never added to clinical grades, XP, badges or competency scores.

Accepted answers save automatically. Unsubmitted draft text is explicitly identified as unsaved. Navigating away aborts UI requests and stops audio/recording; the server can finish already-reserved feedback for the correct learner so progress is not lost. Returning loads server state and the exact next unfinished step; pending answers are visible, polled, and recoverable using the same request ID. Retry feedback becomes available when the backend retry/lease deadline passes. Clarification remains separate from the exercise.

Synchronous view guards reject delayed results after learner/activity/step/mode/focus changes. The screen remounts for account/session changes; no lesson responses are stored in local storage or global caches. The existing API session bridge verifies the current token and rejects stale account responses. Scope-aware recording cleanup releases late microphone permissions and discards late transcription. Background encounter/briefing audio also releases on navigation focus loss, so it cannot hold the patient playback reservation over Module 0 or restart during teaching.

## Inactive rollout and backend gate coverage

MODULE0_PREREQUISITE_MODE is a server-only setting:
- Unset or preview: prerequisite enforcement is inactive; existing clinical workflows remain available.
- enforced: every authenticated learner must complete all nine required interactions before new clinical activity. No grandfathering, score threshold, exemptions, or client-controlled bypass.
- Invalid values produce a configuration error rather than silently disable checks.

Confirmed current environment: enforcementActive() is false. No environment file was changed. Preview's missing-table summary displays Module 0 availability information without blocking existing Today/Roadmap or patient endpoints. Opening the lesson before storage setup shows a controlled unavailable message. In enforced mode absent storage fails closed with 503.

| Endpoint | Prepared enforcement |
| --- | --- |
| POST /api/conversations | Before case upsert, conversation creation or attempt creation |
| POST /api/conversations/:id/messages | After ownership verification, before message writes |
| POST /api/conversations/:id/submit | Before first grading/attempt/submission; saved result replay remains available |
| POST /api/chat | Before opener/chat/disclosure updates, including omitted conversation IDs and empty messages |
| POST /api/grade | Before direct grading, including identifier-free requests |
| POST /api/learning-paths/patient-sessions/:slug/preceptor-chat | Before paid clinical briefing/coaching |
| POST /api/voice/patient-greeting | After owned active encounter validation, before speech approval |
| POST /api/voice/patient-speak | After approval and ownership checks, before paid patient audio |

The Module 0 entry requirement covers all clinical cases so another case/session slug cannot bypass the Rotation 1 prerequisite. Existing clinical score-based roadmap progression remains separate. Roadmap sessions receive entryBlocked without erasing historical status, scores or badges. When enforcement is active and Module 0 incomplete, Today recommends readiness and suppresses new encounter recommendations. Completion removes only the Module 0 restriction; existing clinical progression rules still apply.

Historical GET conversation/attempt/portfolio/competency data, saved-result replay, and submitted-encounter debrief coaching remain available to their owner. Case catalog/health retain their existing public policy; case/session metadata retains existing Clerk/allowlist protections. Generic mentor TTS and transcription remain authenticated and available for Module 0 itself. These utilities do not create clinical attempts or satisfy completion.

## Changed files in Increment C

New:
- backend/src/services/module0Access.js
- backend/test/module0Access.test.js
- backend/test/module0Frontend.test.js
- backend/test/module0Recording.test.js
- mobile/app/module-0.tsx
- mobile/src/api/module0View.js
- mobile/src/types/clinicalReadiness.ts
- mobile/src/components/Module0Card.tsx
- docs/module-0/increment-c-results.md

Updated:
- backend/src/app.js — safe prerequisite/storage/configuration error codes.
- backend/src/services/clinicalReadiness.js — allow clarification when reviewing completed steps, without altering checkpoints.
- backend/src/services/today.js — owned Module 0 summary and conditional recommendations.
- backend/src/routes/chat.js, conversations.js, grade.js, learningPaths.js, voice.js — shared gate calls at the entry points listed above.
- mobile/app/(tabs)/index.tsx and cases.tsx — Module 0 card, protected learner-specific loading, and server entryBlocked handling.
- mobile/app/(tabs)/level1.tsx — focus-gated patient/debrief playback; settings and speech approval unchanged.
- mobile/app/_layout.tsx — signed-in module stack route.
- mobile/src/api/client.js — authenticated progress/submission requests, cancellation, 45-second lesson submission timeout (existing requests retain their timeouts).
- mobile/src/components/RotationCard.tsx — conditionally show server-provided entry restriction, retaining clinical history.
- mobile/src/hooks/useEnglishSpeechTranscription.ts — optional activity/focus scope, late-permission release and late-result rejection; defaults preserve existing callers.
- docs/module-0/design-review.md and implementation-results.md — link the current review state.

The active additive schema/migration and other pending A/B files remain as previously reviewed. No new schema alteration was needed in C. No dependencies or lockfiles changed.

## Verification

| Check | Final result |
| --- | --- |
| Full backend suite | 192 passed, 0 failed/skipped (151 Phase 2 + 19 A/B + 22 C) |
| Direct entry / gate tests | 8 passed, real Clerk verification with synthetic sessions/records |
| Frontend source/render/navigation tests | 10 passed, actual TSX transpiled with controlled hook/platform adapters and real synthetic lesson service |
| Recording tests | 4 passed: normal web/native, late permission, activity/navigation/account cancellation |
| Grading calibration | All passed: borderline 87%, ideal 100%, weak 16% |
| Expo web export | Passed: 21 static routes, including /module-0; output /tmp/module0-c-web |
| Prisma schema validation | Passed; no database connection or migration execution |
| TypeScript | 24 baseline diagnostics, 0 new Module 0 diagnostics |
| git diff --check | Passed |

TypeScript detail: the previous report counted 22 using stale ignored Expo route declarations that still listed removed faculty routes. Regenerating declarations using Expo Router's installed generator exposed two additional errors in the preserved inactive faculty navigation code (FacultyDashboardScreen.tsx and FacultyStudentDetailScreen.tsx). A pristine copy of the committed mobile source with freshly generated declarations reproduces all 24. Current and pristine diagnostic file/code counts match, with zero added/removed diagnostics. No error was suppressed or inactive faculty code reactivated. The current level1 diagnostic line moves with the small focus guard addition.

Tests and exports do not establish live browser/device usability, PostgreSQL concurrency behavior, live Clerk account behavior, or NaviGator clinical feedback quality. Those still need approved database setup and Windows end-to-end testing. The existing source clinical cautions and supplementary history/version compatibility limits remain documented in design-review.md.

## Exact safe activation sequence

Do not run migration or enable enforcement on the basis of this document alone. Both remain explicit approval steps.

1. Review local A/B/C changes, the additive LearnerModuleProgress schema and migration SQL, clinical source cautions, and this gate matrix. Approve publishing separately if Windows checkout is needed; nothing was pushed.
2. After explicit database-application approval, use the intended development Neon database and existing private DATABASE_URL binding. From backend/, run npx prisma migrate status. Confirm that the only newly pending migration is 20261010190000_add_learner_module_progress and the five prior migrations are applied. Stop if status shows any unexpected pending migration, drift, or failed migration.
3. Only after that confirmation and approval, run npx prisma migrate deploy, followed by npx prisma generate. Never reset the database or seed over learner records. The new table is empty initially; existing accounts and progress are preserved.
4. Keep the backend in preview during initial UI validation. In Windows PowerShell, in the backend terminal: $env:MODULE0_PREREQUISITE_MODE = 'preview'; then npm run dev. Start Expo web from mobile/ using npx expo start --web --clear. Existing Clerk/NaviGator/API-base/mentor-voice variables remain unchanged; no new secret is required. Expo startup refreshes ignored route declarations.
5. Validate two independent Clerk test accounts: A completes one activity, closes/reopens the browser and resumes; B remains at zero. Complete A with mixed Ready/Needs More Practice feedback; verify nine checkpoints, completed review, and optional practice preserving completion. Confirm patient greeting/chat/recording/transcription/TTS/grading still work in preview. Test leaving during pending feedback, late audio/transcription, activity changes and account switching. Review actual educator feedback before release.
6. Review these results and explicitly approve enabling enforcement. Then stop/restart the backend in a dedicated validation terminal with $env:MODULE0_PREREQUISITE_MODE = 'enforced' before npm run dev. Do not change Clerk identities, create exemptions, or set a client/public activation flag.
7. With enforcement approved, B must get 403 MODULE0_REQUIRED on every new clinical entry in the matrix, including direct requests without conversation IDs or with alternate slugs. A must retain access. B's historical owned records/portfolio must remain readable; cross-user requests must remain denied. Complete B and verify normal clinical entry. Do not share bearer tokens, transcripts, or secret values in validation reports.
8. Verify restart persistence and the same environment setting on every backend instance before any later release. Merge/deployment remain separate approvals. Keep preview for current local use until steps 1–6 are authorized and completed.
