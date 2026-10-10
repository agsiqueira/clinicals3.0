# Module 0 optional evidence correction

## Findings

The Windows diagnostic on 9616db2 confirms two validation failures: an unsupported
top-level value on attempt 1 (`INVALID_OBJECT`) and required evidence rejection on
attempt 2 (`MISSING_EVIDENCE`). The previous evidence check rejected absent,
non-array, or empty evidence. Label and feedback validation had already passed
on attempt 2. The exact first value and evidence field are unknown because the
diagnostic intentionally did not retain model output. Do not infer a specific
model defect, timeout, or envelope from these codes alone.

## Correction

- Require an allowed formative label and validated concise feedback. Missing,
  null, or empty optional evidence becomes an empty array, never invented quotes.
- Any supplied evidence must remain an array of at most three nonempty exact
  learner-response substrings. Malformed or ungrounded quotes are rejected and
  can use the existing bounded repair; they are never displayed.
- Prompt for a top-level object with label and feedback, prefer omitting evidence,
  and explicitly discourage arrays, JSON strings, and wrappers. Whole JSON fences
  remain supported. Unsupported shapes are rejected rather than guessed/unwrapped.
- Development diagnostics report only allowlisted shape categories: null, array,
  string, number, boolean, undefined, object, or unexpected_envelope. No values,
  keys, learner text, prompts, or provider bodies are logged.
- Retain the existing two-call maximum and overall 40-second evaluation budget.
  No generic fallback evaluation or completion from arbitrary text is introduced.
- The diagnostic prints evidenceCount on success, including zero, rather than
  implying quotations were present. It does not import Prisma or write progress.

No verified NaviGator JSON-mode capability was available; no response_format or
other new provider parameter is sent. The existing configured text model, 512-token
limit and deterministic sampling remain. Real model reliability must be checked
on Windows; credentials were unavailable in this cloud environment.

## Verification

- Backend: 229 tests passed, including optional evidence with both labels, exact
  grounding, invalid shapes, repair, timeout/deadline, persistence, ownership and
  idempotent replay. Existing isolation, completion and pending/retry tests pass.
- Grading calibration: all cases passed.
- Expo web export: passed with EXPO_NO_TELEMETRY=1. Initial export failed because
  the cloud Expo home directory was missing; no application change was needed.
- TypeScript: the same 24 baseline diagnostics; no new diagnostics. The only log
  difference was an npm update notice.
- Live diagnostic: not run here (`UPSTREAM_CONFIGURATION`); no credentials present.

Changed files: evaluator utility, error diagnostic utility, diagnostic script,
two backend test files, and this report. No frontend, curriculum, schema, migration,
voice, transport, prerequisites, or dependency changes. No database operations.
Preview configuration and existing prerequisite defaults remain unchanged.

## Windows verification after these local changes are reviewed/transferred

From the existing backend directory, using its existing local configuration:

```powershell
$env:NODE_ENV = 'development'
$env:MODULE0_EVALUATION_DIAGNOSTICS = '1'
$env:MODULE0_PREREQUISITE_MODE = 'preview'
node .\scripts\checkModule0Evaluation.js
```

The diagnostic uses the fixed synthetic opening question without modifying the
database. Success prints result=validated, an allowed label, and evidenceCount
(zero is valid). Failure prints an allowlisted code; development logs identify
unsupported shapes without content. Do not share environment files or raw model
output. Verify a saved answer in the UI can complete with feedback and resume,
then verify another learner cannot see its progress. Live pedagogical quality
still requires review; schema validation cannot establish clinical correctness.
