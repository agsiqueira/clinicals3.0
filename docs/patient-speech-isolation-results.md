# Patient speech isolation and playback verification

Implemented locally on `security/student-authentication-phase-2`, based on `bd698eb2ef8d393a874c6a272bdaa17d7cb97daf`. These changes have not been pushed, merged, or deployed.

## Findings

Two defects were demonstrated from the code and synthetic reproductions:

1. The patient reply filter accepted evaluation text such as "the student asked about a fever", including commentary appended to a natural patient answer. The active encounter displayed `/chat.reply` and sent it directly to speech.
2. Patient and mentor playback stopped loaded audio without invalidating all pending work within the same account. Late TTS responses could start after a newer turn, stop, or scene change. Old completion/error callbacks could also affect newer playback. A delayed pre-encounter Dr. Martinez chat response could request speech after entering the encounter.

The exact source of the reported live second voice remains unconfirmed. Mixed patient-model content and a delayed mentor request are both plausible. Neither a recording nor a correlated live request trace was supplied. Separate model reasoning fields are not consumed by the NaviGator adapter; embedded reasoning inside `message.content` previously could pass filtering. Disclosure tracking is deterministic; grading and disclosure tracking do not directly invoke patient TTS. The corrective regeneration returns only its final approved reply, not both drafts.

There is no browser `speechSynthesis` or Expo speech fallback in the active encounter path. Web plays NaviGator audio through an HTML audio element; native uses Expo AV. The TTS adapter does not perform an audio-model fallback or retry. Clerk's existing request layer can refresh once after an authentication rejection, before a protected request is authorized.

As clarified during implementation, no per-patient voice assignments exist. Patient speech continues to use the existing backend `NAVIGATOR_TTS_MODEL`, `NAVIGATOR_TTS_VOICE`, and `NAVIGATOR_TTS_SPEED`. Dr. Martinez retains `EXPO_PUBLIC_NAVIGATOR_MENTOR_TTS_VOICE` (existing fallback `am_adam`). MP3 synthesis, English transcription, and existing audio playback settings are retained. No language parameter was previously configured for TTS, and none was introduced. No case configurations or voice assignments were changed.

## Implementation

- Check complete raw model drafts for internal commentary, reasoning tags, grading/rubric text, role descriptions, instructions, and appended notes before returning patient dialogue. Preserve one corrective regeneration and the existing safe fallback. Empty drafts also regenerate/fall back. Rejected drafts never enter the returned reply or patient speech authorization.
- Return an opaque AES-256-GCM speech approval alongside each accepted reply for an owned `IN_PROGRESS` encounter. The approval expires after three minutes and binds approved text, Clerk learner identity, conversation, case, random turn ID, and the snapshot of existing backend TTS settings. The token's contents are encrypted rather than exposed as readable claims.
- `/api/voice/patient-greeting` authorizes the existing deterministic "Hello." greeting without an AI call. `/api/voice/patient-speak` verifies the approval and current encounter ownership/status, rejects client text/model/voice/speed substitutions, and synthesizes only the approved content with its bound settings. `/api/voice/speak` remains the authenticated mentor speech path.
- Patient and mentor audio now share the existing playback hook and a coordinator. Pending audio is invalidated synchronously; only the current lease may play or process callbacks. Each patient turn is attempted at most once per mounted playback owner. Native replacement audio waits for captured older audio resources to stop/unload. Delayed native loads are unloaded without playing.
- Invalidate playback on stop, mute, account/context changes, and unmount. Reserve the patient audio channel throughout an active encounter, including when patient voice is muted. Invalidate pending mentor briefing speech when meeting the patient and pending debrief speech when its scene closes.
- Bind delayed chat/creation/greeting results to their original encounter. Reuse an in-flight conversation creation promise and prevent concurrent send invocations. Cancel a delayed greeting when the learner starts the first turn, so it cannot arrive after the patient answer.

The existing Clerk verification, learner ownership rules, faculty disablement, recording/transcription implementation, grading, and learner records remain intact. No dependencies, Prisma schema, migrations, or case files changed. Automated verification used synthetic identities, records, vendor responses, and audio resources; it did not mutate Neon or call a paid AI provider.

## Changed files

Backend:

- `backend/src/utils/patientReplySafety.js`
- `backend/src/utils/patientSpeech.js` (new)
- `backend/src/routes/chat.js`
- `backend/src/routes/voice.js`
- `backend/src/llm/navigatorClient.js`

Frontend:

- `mobile/app/(tabs)/level1.tsx`
- `mobile/app/(tabs)/cases.tsx`
- `mobile/src/hooks/useSpeechPlayback.ts`
- `mobile/src/api/client.js`
- `mobile/src/api/speechPlayback.js` (new)

Tests:

- `backend/test/patientReplySafety.test.js`
- `backend/test/learnerIsolation.test.js` (extend synthetic adapter configuration)
- `backend/test/patientSpeech.test.js` (new)
- `backend/test/patientVoiceRoutes.test.js` (new)
- `backend/test/navigatorVoice.test.js` (new)
- `backend/test/speechPlayback.test.js` (new)

Documentation:

- `docs/patient-speech-isolation-results.md` (this file)

## Verification results

| Check | Result |
| --- | --- |
| Backend `npm test` | 151 passed, 0 failed, 0 skipped; baseline was 126, with 25 new tests |
| Grading calibration | All three fixtures passed: borderline 87, ideal 100, weak 16 |
| Expo web export | Passed, 20 routes, no faculty routes |
| Mobile TypeScript | Failed with the same 22 existing diagnostic signatures; 0 added or removed |
| Diff whitespace check | Passed |

Existing TypeScript failures: five Clerk optional-resource errors in sign-in, nine style errors in the legacy level1 screen, one stage comparison in the current level1 screen, one avatar source error, and six errors in preserved inactive faculty screens. Line numbers moved where encounter code changed; diagnostic signatures did not change. No new application or Prisma failures occurred.

Regression coverage includes mixed/internal drafts, safe fallback, real NaviGator request construction with mocked transport, backend speech settings for two encounters, independent mentor override, greeting, unauthenticated/cross-user/cross-encounter/expired/tampered speech denial, client setting substitution denial, approved-only TTS input, duplicate turns, reordered responses, mute/unmute, stop, unmount, account/encounter changes, outdated briefing responses, old web callbacks, delayed native loads, and native cleanup ordering. Existing authentication, grading, transcription, and faculty-disablement tests also passed. Hardware recording, browser autoplay behavior, and live vendor-generated audio require Windows/device validation; simulated audio tests do not prove live audio quality.

## Windows validation

These commits are local to the cloud workspace. GitHub still has the previous published signup commit until publishing is separately approved. Do not expect fetching now to retrieve these fixes.

Once the reviewed changes are made available in your Windows checkout:

1. Preserve local `.env` files. Keep all current backend `NAVIGATOR_TTS_*` values and mobile `EXPO_PUBLIC_NAVIGATOR_MENTOR_TTS_VOICE` unchanged. No new setting is required for one backend process.
2. Restart backend and Expo together so the browser uses the new patient speech endpoints. From the repository root, use separate PowerShell terminals:

   ```powershell
   Set-Location .\backend
   npm start
   ```

   ```powershell
   Set-Location .\mobile
   npx expo start --web --clear
   ```

   Use the existing API URL, Clerk configuration, and ports. Do not run database resets, seed scripts, or migrations for this change.
3. Start a fresh encounter, wait for "Hello.", then ask "What brings you in today?" Confirm one visible patient answer and one corresponding spoken answer, with no narrator/evaluation tail. Ask about fever separately. Repeat in another patient case: both should use your existing backend default voice, model, and speed; no new per-patient differences are expected.
4. Open Dr. Martinez's briefing/debrief and verify the existing separate mentor voice. Ask a briefing question, then immediately choose "Meet Patient" before its response returns. Its delayed answer must not speak over the encounter. Repeat by leaving a debrief while a mentor response is pending.
5. Using browser network throttling, delay a patient speech response and start another turn after the visible reply arrives. Only the current response may play. Repeat with voice off/on, navigating to another case, and switching between two independent learner accounts. The older request may finish in the network panel but must not play. If you ask before the initial greeting finishes, the stale greeting must not follow your answer.
6. Verify microphone recording, automatic/manual stop, English Whisper transcription, patient reply/playback, hang-up, HPI where applicable, submission, grading, and portfolio progress. Keep the two learners' encounters separate. Also verify native playback on a device if native use is part of your validation.
7. The network panel should show patient audio at `/api/voice/patient-speak` with an opaque authorization and encounter context, without client-supplied text or speech overrides. Its returned turn ID corresponds to the chat/greeting approval. Mentor audio remains `/api/voice/speak`. Do not export/share HAR files, authentication headers, speech authorizations, transcripts, or credentials. If the defect recurs, report only endpoint/order/count/turn correlation and whether the extra words were present in the visible reply.

## Compatibility and residual risks

- Frontend and backend must be updated together. An old frontend continues using its old generic speech path and playback logic, so an old cached bundle does not validate these fixes.
- Single-process speech approvals use a fresh process-local encryption key. A backend restart invalidates outstanding approvals; text/drafts remain, and the next turn obtains a fresh approval. The application does not automatically replay an expired or rejected turn. Multiple backend replicas require the same dedicated 32-byte hex `PATIENT_SPEECH_KEY` in secure configuration. Do not reuse Clerk/NaviGator secrets for that key. No shared-key setup is needed for the current single Windows backend.
- Speech approvals can be reused by the same authenticated learner for the same still-active encounter within their short lifetime. Playback deduplication is enforced in the client; there is no distributed one-use approval ledger. This does not authorize different text, settings, learners, or encounters.
- Pattern filtering can miss novel paraphrases and can reject an unusual legitimate answer. Prompt boundaries, one retry, and safe fallback reduce risk without adding an extra grading/model operation, but do not establish semantic certainty.
- We bind approved input to TTS, but do not independently transcribe/review the returned audio. An upstream TTS artifact that differs from its input still requires live vendor investigation. No audio-review AI call was added.
- The authenticated mentor speech route remains available for its existing coaching use. This change does not add global paid-operation quotas or rate limits.
