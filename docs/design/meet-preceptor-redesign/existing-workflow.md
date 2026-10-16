# Existing Meet Preceptor workflow — inspection before UI changes

Base: origin/main a6ac9eb (includes merged Patient Brief PR #14). Branch feat/meet-preceptor-redesign is isolated from earlier tasks.

- The modal is owned by OwnedRoadmap in mobile/app/(tabs)/cases.tsx. Patient Brief Meet Preceptor sets briefingVisible, initializes existing mentor messages, clears input/errors, and preserves selectedOverview.
- Identity uses overview.preceptorPersona name/specialty/slug with existing Dr. Martinez fallback. MentorAvatar resolves the existing portrait and speaking video via mentorAssets and CharacterAvatar.
- INITIAL_PRECEPTOR_BRIEFING is the existing introductory content. The first assistant message is shown as welcomeMessage; remaining user/assistant messages are conversationMessages. No new clinical copy is required for the visual redesign.
- Suggested questions call the same sendPreceptorMessage handler as Ask. It trims input, blocks empty/duplicate sends, appends the user message, clears the draft/error, sets sending, stops old speech, and captures the current speech owner.
- sendPreceptorChatMessage receives the selected session slug, message and prior messages plus expectedUserId. The authenticated API client attaches the current Clerk token and rejects responses from changed sessions. Owner-keyed Roadmap state resets on learner changes.
- Replies append to existing chat. When Voice is enabled, the existing speech playback owner speaks the reply only if its captured session/scope remains valid. TTS errors do not block text chat.
- Voice On/Off uses the existing persisted useVoicePreference. Switching off stops current playback. Speech playback and recognition are enabled only while the tab and modal are active; their scope includes learner/session/modal visibility.
- useEnglishSpeechTranscription toggles recording, transcribes into the controlled editable draft, and reports a recoverable error. Composer exposes recording, transcription, disabled and sending states. No new STT/TTS implementation is needed.
- Existing ClinicalsChatComposer receives all input, mic, Ask and loading callbacks. It must be reused or extended with a scoped presentation variant rather than replacing the input workflow.
- Back and modal onRequestClose dismiss briefingVisible without creating an attempt. Meet Patient stops mentor speech, closes the modal, and pushes /(tabs)/level1 with the existing caseId, patientSessionSlug and requiresHpi. Clinical prerequisites and attempt creation remain downstream.
- Existing dialogue ref/content-size callback and scroll-to-end effect follow messages/loading state. Any new scroll container must keep these connections.

Figma inspected before edits: desktop 65:2 and mobile 65:45 in qsmnc7bznmYoLQRnplhJKH. Both frames contain an introduction card constrained to 40px despite 124px/94px portrait children and name/voice content. The screenshots visibly clip those identity elements. This needs to be reconciled with the requested real portrait and visible identity, without inventing a different hierarchy.
