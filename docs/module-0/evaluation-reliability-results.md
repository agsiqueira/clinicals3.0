# Module 0 evaluation reliability — local review

Branch: `feature/phase-3-module-0`, based on
`988f6c889b831351e26fbffb5d072dd95668608c`. These targeted changes are approved for publication on the feature branch for
Windows validation. The mobile-first visual redesign remains a separate increment. No push, deployment, merge, database query, migration or record reset
was performed. Tests use synthetic stores and stubbed provider responses.

## What is confirmed

The reported failed-pending state comes from the service's evaluation catch
branch, after it has durably reserved the answer. It cannot distinguish a provider
failure from parser/schema failure in the published version because that branch
discarded the cause. TTS is a separate request and is not evidence of successful
lesson evaluation.

The original parser rejects an otherwise valid Markdown-fenced JSON object for
the exact answer `What brings you in today?`: `JSON.parse` throws SyntaxError.
That defect was reproduced before editing. The original prompt also described
the label using the combined phrase `Ready or Needs More Practice`, rather than
making the two allowed values explicit. Generation reused the patient transport's
250-token budget, temperature 0.4, and patient stop sequences; those settings are
fragile for structured teaching output. These are confirmed implementation issues,
not proof of the exact provider response seen on Windows.

The exact historical provider failure remains unknown: neither injected credentials
nor a local `.env` containing them is available here. A live probe returned
`not_run / UPSTREAM_CONFIGURATION`. No real NaviGator request was made. The active
Windows `NAVIGATOR_MODEL` cannot be established from this checkout; the example
environment names `granite-3.3-8b-instruct`, which is not evidence of the current
runtime model. Actual model reliability requires the Windows probe below.

## Targeted changes

### Transport and prompting

`createLessonReply` reuses the existing configuration, authentication, endpoint,
and shared chat request builder. Only lesson requests use temperature 0, 512 output
tokens, and no patient stop sequences. It continues using `NAVIGATOR_MODEL`, does
not change model assignments, and does not assume the provider supports JSON mode
or a `response_format` parameter. Patient chat, grading, STT and TTS configurations
are unchanged.

The lesson prompt explicitly lists the two allowed labels, requests brief feedback,
and requires a verbatim substring from the learner's answer as evidence. Private
criteria and learner input remain backend-only prompt data with the existing
instruction and clinical safeguards.

### Parsing, validation and bounded repair

The parser accepts whitespace/BOM and one complete JSON Markdown fence. It does
not extract JSON out of surrounding commentary, repair JSON values, accept new
labels, synthesize evidence, or lower the existing content/evidence validation.
Harmless whitespace surrounding an allowed label is trimmed. Model-controlled
completion fields are discarded as before.

Generation and validation happen together so a malformed result can receive one
format-repair generation. Normal valid/fenced output needs one call. The repair
does not include rejected model output in history. There are at most two calls
within a 40-second generation/validation budget; each request is capped at the
configured chat timeout, 30 seconds, and remaining budget. This fits under the
frontend's 45-second request timeout before ordinary persistence overhead.

HTTP/network errors, timeouts, invalid provider envelopes, and empty provider
responses do not automatically retry. JSON/schema/content/evidence failures and
truncation can receive the single bounded repair. If it still fails, the answer
remains pending with the existing retry delay. There is no fabricated evaluation
fallback and no completion without persisted, validated formative feedback.

The original request ID, answer, revision checks, ownership, compare-and-swap,
leases and stale-worker rejection are unchanged.

### Diagnostics

Diagnostics require both `NODE_ENV=development` and
`MODULE0_EVALUATION_DIAGNOSTICS=1`. They emit only an allowlisted code, attempt
number (1 or 2), and optional numeric upstream HTTP status. They never print
answers, provider bodies, prompts, tokens, API keys, learner IDs, or error messages.
Production and disabled diagnostics emit nothing.

Codes distinguish:

- `UPSTREAM_CONFIGURATION`, `UPSTREAM_REQUEST_FAILED`, `UPSTREAM_TIMEOUT`,
  `UPSTREAM_ERROR` (with HTTP status).
- `UPSTREAM_INVALID_JSON` (provider envelope), `UPSTREAM_EMPTY_RESPONSE`,
  `OUTPUT_TRUNCATED` (provider `finish_reason=length`).
- `JSON_PARSE_FAILURE`, `INVALID_OBJECT`, `INVALID_LABEL`.
- `INVALID_FEEDBACK`, `FEEDBACK_TOO_LONG`, `UNSAFE_FEEDBACK`.
- `MISSING_EVIDENCE`, `INVALID_EVIDENCE`, `UNGROUNDED_EVIDENCE`.
- `EVALUATION_FAILED` for an unclassified internal evaluation exception.

### Pending/retry UI

Known failed evaluations no longer cause continuing GET polling. A single local
timer enables Retry feedback when the server delay expires, without issuing a
request. Active evaluation polling also stops when the worker lease expires.
Failed/expired states explain that automatic checks have stopped and offer
Retry feedback and manual Refresh saved progress. Retrying uses the saved answer
and request ID; it does not reset progress or start another required interaction.

If another browser completes the request after polling has stopped, manual
refresh or leaving/returning retrieves that result. This avoids indefinite polling
while preserving recovery. Polling during an active submission/worker remains
read-only and does not trigger paid model calls.

## Files changed

- `backend/src/llm/navigatorClient.js`
- `backend/src/services/clinicalReadiness.js`
- `backend/src/utils/clinicalReadinessTeaching.js`
- `backend/src/utils/lessonEvaluationErrors.js`
- `backend/scripts/checkModule0Evaluation.js`
- `backend/test/clinicalReadiness.test.js`
- `backend/test/clinicalReadinessEvaluation.test.js`
- `backend/test/module0Frontend.test.js`
- `mobile/app/module-0.tsx`
- `docs/module-0/evaluation-reliability-results.md`

## Verification

- Backend suite: 225 passed, zero failed/skipped; previous baseline 212.
- 13 additional tests cover formatting/schema failures, privacy-safe diagnostics,
  transport errors and timeouts (including body reads), bounded repair/deadline,
  exact-answer persistence and same-ID retry, and stopping failed/expired polling.
- Focused evaluator/service/frontend run: 56 passed.
- Grading calibration: all three scenarios passed.
- Expo web export: passed, including `/module-0`.
- TypeScript: 24 existing diagnostics, no added or removed file/error-code counts.
- Existing learner isolation, stale-worker, patient safety/voice, transcription,
  grading, and faculty-disablement tests remain passing.

Provider tests use controlled fetch responses and synthetic credentials. Frontend
tests execute components with controlled hook/platform adapters. Live Windows
browser, microphone and real-model validation remain necessary.

## Windows diagnosis after the reviewed files are available

Keep `MODULE0_PREREQUISITE_MODE=preview` and the current migration/records. No
dependency update or Prisma regeneration is required. In PowerShell:

```powershell
Set-Location 'D:\101 - clinicals 3\clinicals3.0\backend'
$env:NODE_ENV = 'development'
$env:MODULE0_EVALUATION_DIAGNOSTICS = '1'
$env:MODULE0_PREREQUISITE_MODE = 'preview'
node .\scripts\checkModule0Evaluation.js
```

The probe loads the existing backend `.env`, sends the fixed synthetic answer to
the configured text model, and prints only validation status/label or failure code.
It makes at most two paid text calls and performs no database operation. Diagnostic
lines identify a failed first attempt even if the second attempt succeeds. It
never prints the raw model response. Its result does not update a learner's progress.

For application testing, restart the backend in that same terminal with `npm run
dev` and restart/reload Expo with the reviewed frontend code. The existing backend
startup case synchronization behavior is unchanged. Retry the original saved
answer without resetting it. Confirm visible feedback, advancement exactly once,
and no repeated GET calls after a failed status. Test another account to confirm
isolation, then retest patient chat/recording/transcription/audio/grading.

To turn off these optional diagnostics:

```powershell
Remove-Item Env:MODULE0_EVALUATION_DIAGNOSTICS -ErrorAction SilentlyContinue
```

Restart the backend after changing diagnostic settings. Share only failure codes,
attempt numbers, HTTP status, and the non-secret text-model name if needed. Do not
share `.env`, authorization headers, raw provider responses, or learner answers.
