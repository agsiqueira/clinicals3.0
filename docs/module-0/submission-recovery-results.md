# Module 0 — typed submission and input recovery review

Implemented locally on `feature/phase-3-module-0`, based on
`1fe93e19d95fe2b94901f9fd18451164068cf4a8`. These targeted reliability fixes are approved for publication on this feature
branch for Windows validation. The mobile-first redesign remains a separate increment. No database connection, migration, reset, deployment, or merge was
performed. All test writes use controlled in-memory learner records.
The user reports that the original Module 0 migration is applied on Windows;
no additional migration is needed for this fix. Prerequisite enforcement remains
inactive by default, and `MODULE0_PREREQUISITE_MODE=preview` stays appropriate.

## Confirmed defects and limits of the diagnosis

1. In `mobile/src/api/client.js`, `timeoutOverride || condition ? 90000 : 10000`
   treats a truthy override as the ternary condition. Module 0's intended 45000 ms
   becomes 90000 ms. The corrected expression uses `timeoutOverride ?? (condition
   ? 90000 : 10000)`. Patient and mentor TTS retain their existing 90000 ms budgets.
2. In `mobile/app/module-0.tsx`, a failed local session capture returned silently
   from `submit()` before dispatching a POST. It now reports session expiration
   without discarding the typed answer. This no-POST/no-feedback path is reproduced
   by a regression test. Composer button and keyboard callbacks themselves are
   correctly wired; tests execute the real composer, not just its replacement props.
3. Navigation invalidated the submission guard and aborted its request, but did
   not reset `sending`. Its `finally` handler reset `sending` only while that old
   guard remained valid. Returning to the same mounted screen could therefore
   leave the real TextInput disabled with no server pending answer. A regression
   test failed before the fix: after returning, `sending=true`, `pending=null`,
   `step.completed=false`, `kind=required`, `isFocused=true`, selected activity
   `starting-the-encounter`, selected step `open-the-interview`, and
   composer/TextInput `editable=false`. After the fix, `sending=false` and
   `editable=true` for this same unanswered state.
4. Processing, errors, pending-answer recovery, and newly returned feedback were
   separated from the composer by long teaching/scenario content. They now appear
   beside the answer controls. The old position could conceal an explanation from
   someone typing near the bottom; no claim is made that an overlay was responsible
   for the observed Windows incident.
5. Only 409 submission failures previously refreshed authoritative progress.
   A timeout or connection failure could hide an answer already accepted by the
   server. Every current-view submission failure now refreshes progress without
   erasing the error; active submissions also receive read-only recovery polling.
6. `mobile/src/api/sessionToken.js` removed cancellation forwarding as soon as
   response headers arrived. Cancellation and account isolation now remain active
   until the response body is consumed. The client timeout also covers that read.
   Clerk token verification, token refresh policy, and trusted identity resolution
   are unchanged.

The supplied Windows logs contain only request methods, not Module 0 POST paths,
statuses, or authenticated progress. This workspace has no live Clerk, Neon, or
NaviGator credentials. Consequently, whether the original typed answer reached
the route, was persisted, or failed provider evaluation is **not determinable**.
The defects above are code findings and reproducible synthetic failure paths,
not proof of the precise historical Windows event. TTS success proves nothing
about the separate lesson evaluation request.

## Resulting submission and recovery behavior

- The real input and Submit/keyboard callbacks dispatch the authenticated lesson
  POST with a single request ID. A synchronous request reference prevents double
  clicks or simultaneous keyboard/button submissions before React rerenders.
- Processing is visible immediately. The existing backend still saves the answer
  before evaluation, validates response evidence, and owns all completion decisions.
- Saved feedback is visible near the composer. Both Ready and Needs More Practice
  advance the required interaction exactly once. The next unanswered input is editable.
- Navigation/activity cleanup releases obsolete `sending` state, aborts UI work,
  and stops mentor audio. It does not cancel an already-reserved backend evaluation
  or erase its answer. No voice assignments or playback architecture were changed.
- Returning to an existing screen reloads authoritative progress and selects its
  pending interaction or next unfinished exercise. Explicit completed-step review
  remains available, with Continue actions back to active work.
- A genuine pending answer displays its saved text, status, retry wait, and recovery
  controls. Read-only polling runs approximately every three seconds while focused.
  Evaluation failure keeps the answer and offers Retry feedback after the server's
  delay. Retry reuses the saved request ID and answer; it does not create a new attempt.
- Older revision snapshots cannot overwrite newer saved progress. Existing server
  compare-and-swap, worker leases, duplicate protection, ownership, and stale-worker
  rejection remain unchanged. No automatic paid evaluation retries were added.
- Unsubmitted text remains unsaved across a full remount; accepted answers remain
  durable. A session error is actionable and never dispatches an anonymous request.

## Changed files

- `mobile/app/module-0.tsx`
- `mobile/src/api/client.js`
- `mobile/src/api/sessionToken.js`
- `backend/test/module0Frontend.test.js`
- `backend/test/module0Submission.test.js`
- `docs/module-0/submission-recovery-results.md`

No backend application code, curriculum, Prisma files, dependencies, environment
files, grading rules, patient case configuration, or voice settings changed.

## Verification

- Baseline backend suite: 192 passed, no failures or skips.
- Final backend suite: 212 passed, no failures or skips (20 additional tests).
- Frontend component suite: 24 tests, including the real composer/TextInput
  editability, button/keyboard dispatch, feedback, pending/retry, focus return,
  completed review, stale reads, expiration, and account-switch behavior.
- New API submission suite: 6 tests executing the real client and session bridge,
  timeout selection/body-read timeout/cancellation, token refresh, delayed account
  results, and an actual HTTP request to a Clerk-verified Express lesson route.
- Existing recording/transcription, speech isolation, faculty disablement,
  ownership, idempotency, stale-worker, and grading tests remain passing.
- Grading calibration: all three scenarios passed.
- Expo web export: passed, including `/module-0`.
- TypeScript: 24 baseline diagnostics and 24 final diagnostics; no added or removed
  file/error-code counts. The check exits nonzero because those baseline errors remain.
- `git diff --check`: passed. Branch/HEAD unchanged; enforcement check returned false.

The frontend tests execute source components with controlled React hook/platform
adapters, including actual TextInput properties. They are not real browser layout,
Windows device, microphone hardware, or live AI tests.

## Windows retest after the reviewed fix is available locally

Keep the existing database and `MODULE0_PREREQUISITE_MODE=preview`. No migration,
record reset, or dependency update is required. Restart Expo web with a cleared
Metro cache, then reload the browser.

1. With learner A, open an unfinished interaction. Type a valid attempted answer;
   verify the field remains editable while Dr. Martinez's teaching audio plays.
2. Press Submit. Verify immediate processing next to the field, then visible
   feedback, one completion increment, and an editable next question. Repeat using
   the keyboard submission action; rapid repeated clicks must not complete twice.
3. Leave and return before submitting, after submitting, and during processing.
   Verify saved responses/feedback survive and unanswered work stays editable.
4. If evaluation genuinely fails, verify saved-answer text, a pending explanation,
   a retry wait, and an enabled Retry feedback action when permitted. Do not edit
   database state or reset progress to manufacture recovery.
5. Review a completed step/activity and use Continue to return to unfinished work.
   Review and optional practice must never reset completion.
6. Switch to learner B during processing/audio. Verify B sees only B's progress,
   no A feedback or delayed audio. Return to A to inspect A's saved work.
7. Check microphone recording, Whisper transcription, Dr. Martinez's configured
   voice, and an existing patient encounter including patient TTS and grading.

For application-safe diagnosis, use browser Network filtering for
`/api/modules/clinical-readiness`. Inspect locally only: whether the POST exists,
its HTTP status, its `status` field, progress revision/completedCount, pending
presence/status/retryAfter, and selected next activity/step. A 200 `saved` result
means feedback was persisted; 202 with pending means the answer was saved but
feedback remains outstanding. GET can confirm the current authenticated learner's
state after a transport error. Do not share request headers, tokens, complete
response bodies, or learner answers. Browser viewport/focus and live provider
behavior still require this manual validation.
