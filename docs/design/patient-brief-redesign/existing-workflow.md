# Existing Patient Brief workflow (before implementation)

Base: origin/main 042b98c; branch feat/patient-brief-redesign. Separate worktree preserves the uncommitted desktop autofocus task.

- Roadmap cases.tsx opens its overview Modal from an unlocked, unblocked session. Today can supply focusSessionSlug/focusSessionToken; the same overview is opened in Roadmap's existing navigation context.
- getPatientSessionOverview(slug, {expectedUserId}) uses the API client and authenticatedFetch session binding. Tokens are attached to requests; responses and body reads are checked against the captured Clerk user/session generation. No client identity headers authorize access.
- Existing overviewPatientName, overviewEncounterTitle, overviewReasonForVisit helpers provide patient-facing clinical labels. PatientAvatar resolves the current portrait by session slug/case ID and falls back to initials only when no asset exists.
- Mission uses requiresHpi/workflow metadata, then overview description. Achievements, weights, badge thresholds and duration come from the overview. The preceptor name comes from preceptorPersona with the existing application fallback.
- Evaluation disclosure is local UI state and starts collapsed. Previous Attempts uses previousAttemptsRoute(overview), closes the brief, and pushes the existing case-specific /attempts route. The server enforces learner-specific access.
- Meet Preceptor only closes the brief and opens existing preceptor dialogue, initializes its message/input/error state. It does not itself create an attempt or start a patient. The subsequent existing Meet Patient handler pushes the current linked case/session route and preserves requiresHpi.
- Brief Close and Android/modal onRequestClose simply dismiss overviewVisible. Preceptor Back simply dismisses briefingVisible. Neither changes progression or creates an attempt.
- Voice, mentor chat, assessment, backend, navigation destinations and Roadmap focus are outside this visual change.

Plan: extract PatientBrief.tsx with responsive StyleSheet styles, existing Inter fonts/tokens, vector icons and PatientAvatar; replace only overview modal presentation in cases.tsx. Keep disclosure/history/start handlers connected to existing logic. Test actual-screen workflow plus extracted component and responsive layouts. The modal keeps a separate action footer so long content/evaluation can scroll without obscuring Meet Preceptor. Safe-area padding belongs to the modal, not the Roadmap layout.
