# Meet Preceptor redesign — local review

Branch: `feat/meet-preceptor-redesign`. Base: `origin/main` at `a6ac9ebae1e263f48ce478077ab58b22fbfa3f25`, including merged Patient Brief PR #14. Separate checkout: `C:/Users/alexa/Documents/clinicals3.0-meet-preceptor`.

The implementation passed visual review and is authorized for publication as one draft PR targeting main. Final publication validation was rerun on October 16, 2026. No merge or deployment is authorized. No production services, databases, learner records or clinical APIs were changed.

## Design and implementation

Both Figma design contexts and frame renders were inspected before application changes:

- [Desktop 65:2](https://www.figma.com/design/qsmnc7bznmYoLQRnplhJKH?node-id=65-2)
- [Mobile 65:45](https://www.figma.com/design/qsmnc7bznmYoLQRnplhJKH?node-id=65-45)

The new `MeetPreceptor` component presents the existing mentor state in the Clinicals purple/navy/lavender palette with existing Inter font assets and vector icons. Desktop uses a centered 736×816px card, shrinking safely at shorter viewport heights. Mobile fills the available safe area. The close control is always 44×44px and labeled `Close Meet Preceptor`.

The body contains identity/portrait/Voice, conversation introduction, the existing welcome message, user/mentor history, loading state, then existing suggested questions. The question composer and Back/Meet Patient actions remain in a separate white footer. The conversation scrolls independently, and native KeyboardAvoidingView keeps the dock above the keyboard. The existing shared composer receives a scoped `preceptor` visual variant; other composer variants retain their styles and behavior.

The real Dr. Martinez portrait and speaking media are resolved by the existing MentorAvatar/CharacterAvatar/mentorAssets pipeline. Name, role and slug come from the current overview's preceptorPersona with existing fallbacks. Welcome/history and all three suggestions are passed from the existing owner state/constants. No Figma-specific patient, preceptor or clinical message data was added to production code.

## Behavior preservation

The pre-change trace is in [existing-workflow.md](existing-workflow.md). Clinical conversation state, API payloads, voice preference, STT/TTS hooks, encounter selection and navigation stay in `cases.tsx`.

- Typed and suggested questions call the same existing handler and backend endpoint with the same session slug, prior messages and authenticated expected-user context. Dictation remains an editable draft and does not automatically submit.
- Loading disables the existing Ask/input/microphone/suggestion controls. Failure retains the conversation, displays the existing error and permits a new question; there was no separate retry endpoint or retry button to replace.
- Voice On/Off retains the persisted preference and playback-stop callback. Existing voice owner/session checks and recognition/playback visibility scopes are unchanged. Speaking state still reaches the mentor's existing animation component.
- Back, Close, native/modal request-close, accessibility escape and web Escape dismiss without starting a patient or creating an attempt. As in the original implementation, Back returns to the underlying Roadmap context; it does not invent a new destination or reopen Patient Brief.
- Meet Patient retains the existing `/(tabs)/level1` route, caseId, patientSessionSlug, requiresHpi and speech-stop action. Attempt creation and clinical prerequisites remain downstream.
- Account ownership remains keyed to the authenticated learner and existing session-bound API/speech infrastructure.
- Initial opening shows identity/welcome at scrollTop 0. New messages follow while the viewport is within 48px of the bottom. Scrolling up pauses follow; returning to the bottom resumes it. Layout changes do not reset messages. The old fixed-delay unconditional scroll was replaced with content-size/effect callbacks guarded by this follow state.

No changes were made to PatientBrief.tsx, Previous Attempts, Today, Portfolio, Roadmap journey/artwork/connectors/focus, backend APIs/schema, scoring, progression, Clerk, voice engines or patient encounter state machines.

## Comparisons and unavoidable differences

- [Desktop Figma / implementation](comparison-desktop.png)
- [Mobile Figma / implementation](comparison-mobile.png)

The desktop comparison crops only the surrounding browser viewport to an 800px centered region. Mobile remains at 390×844. Neither implementation image is stretched.

The Figma frames contain an actual layout defect: the identity card is constrained to **40px** while its children include **124px desktop / 94px mobile** portraits, name, role and Voice. The source renders visibly clip those elements. The implementation preserves the specified portrait sizes but lets the card take natural height (160px desktop) so every required identity/control is visible. This necessarily pushes later content down and makes short viewports scroll. The natural-height identity card and these visual differences have been approved; no further visual changes were made for publication.

Other explicit differences:

- Real portrait/speaking assets replace illustrative initials, as requested.
- Close, Voice, suggestions, microphone, Ask and navigation targets are at least 44px high rather than the concept's clipped 40px controls. Footer height is 139px, including the 58px composer row and 44px navigation row.
- The footer is attached to the bottom of the card; the Figma render leaves unused space below its purported sticky footer. The top close/header stays accessible while history scrolls.
- The existing welcome starts `Welcome.` rather than Figma's illustrative `Welcome!`; existing clinical text and suggested-question callbacks were preserved. The generic introduction says “your patient encounter” rather than assuming every encounter is the learner's first.
- Voice is a functional accessible switch; microphone/time-processing/stop states use the existing vector library rather than emoji artwork. Keyboard focus outlines remain available.
- Actual history, errors, recording and loading states are rendered from existing state. Figma specifies only the initial conversation.

Desktop suggestion minimum widths match the frame's 274px, 250px and 235px first three rows; mobile suggestions stretch within the padded sheet and can wrap.

## Screenshots and measurements

| State | Capture |
| --- | --- |
| Desktop 1280×900 | [default](default-1280x900.jpg) |
| Desktop 1440×900 | [default](default-1440x900.jpg) |
| Reduced desktop 1280×560 | [default](default-1280x560.jpg) |
| Mobile 390×844 | [default](default-390x844.jpg) |
| Narrow mobile 320×568 | [default](default-320x568.jpg) |
| Voice On | [mobile](voice-on-mobile.jpg) |
| Voice Off | [mobile](voice-off-mobile.jpg) |
| Question submitting/loading | [mobile](submission-loading-mobile.jpg) |
| Long/wrapped mentor history | [mobile](long-history-mobile.jpg), [desktop](long-history-desktop.jpg) |
| Manual reading position preserved during a new reply | [mobile](manual-reading-preserved-mobile.jpg) |
| Error and usable retry-by-question flow | [desktop](error-desktop.jpg) |
| Focused input with reduced web viewport | [simulation](focused-input-reduced-web-viewport.jpg) |

`responsive-measurements.json` records all five requested viewport sizes plus DOM bounds. There is no horizontal overflow. All default views start at scrollTop 0. At 320×568, 673px of content fits a 347px scrolling body; the footer ends at y=567 and remains visible. At desktop 1280×560 the card shrinks to 512px, body to 282px, and footer ends at y=535. At 390×844 the body is 623px and footer ends at y=843.

The long-history browser fixture correctly followed its first reply to the bottom (1719px content, 623px viewport, scrollTop 1096). After PageUp, a further typed question/reply preserved scrollTop **551px → 551px** (`manual-scroll-check.json`). Resize also preserved the existing message history.

The focused-input capture uses a **390×500 web viewport simulation**, not a native on-screen keyboard. Its 44px input lies at y=380–424 and footer at y=360–499. It proves responsive viewport handling only.

## Validation run

- **146 focused tests passed**, 0 failed (`focused-tests.txt`): frontend workflow, images, session-token boundaries, speech playback ownership and preceptor chat. Includes eight new Meet Preceptor cases for dynamic identity/welcome/portrait, history/payloads/drafts, loading/error recovery, voice/mic/dictation, dismissal and route parameters, scroll follow, account changes, safe areas/keyboard avoidance/footer separation.
- **376 complete regression tests passed**, 0 failed (`regression-tests.txt`).
- **TypeScript: 22 main diagnostics / 22 current / zero new** (`typescript.log`, `typescript-comparison.json`). Main is not globally type-clean.
- **Production web, iOS and Android Expo exports passed** (`exports.log`, generated outputs remain local under `exports/`).
- **git diff --check passed**. Windows SVG line endings were normalized to exact main blob bytes for image-integrity tests; there is no substantive asset diff.

Focused command: `node --test test/module0Frontend.test.js test/imageAssets.test.js test/sessionToken.test.js test/speechPlayback.test.js test/preceptorChat.test.js`. Full suite: `npm test` in backend. Local TypeScript baseline comparator: `node validation/shared-typescript.cjs`. Exports: `npx expo export --platform all --max-workers 2` in mobile.

## Exact implementation/test inventory

1. `mobile/src/components/MeetPreceptor.tsx` — new shared responsive mentor modal.
2. `mobile/src/components/ClinicalsChatComposer.tsx` — scoped preceptor appearance/vector mic; existing callbacks and other variants retained.
3. `mobile/app/(tabs)/cases.tsx` — replace only mentor modal presentation, pass existing state/handlers, preserve manual reading during message follow.
4. `backend/test/module0Frontend.test.js` — test resolution/mocks plus eight focused Meet Preceptor cases.

Review artifacts are contained in `docs/design/meet-preceptor-redesign/`. `changed-files.json` inventories every file in this PR: four implementation/test files and the selected verification documentation, screenshots, measurements and validation results. Local preview tooling under `mobile/validation/`, generated app bundles/exports, ZIP files and intermediate logs are excluded. None of the local fixture aliases are imported by production Expo.

## Outstanding checks

No Android device is attached (`android-devices.txt`), and this Windows host has no iOS runtime. Physical native keyboard geometry, screen-reader escape, microphone permission prompts, actual STT, TTS/audio/animation synchronization and authenticated production conversation/navigation require device/live-service verification. Native exports and mocked callbacks do not prove those physical behaviors.

Browser captures use isolated synthetic API, identity, speech and transcription fixtures; no live microphone permissions were requested and no production conversations or attempts were created. Existing authenticated API/speech ownership is covered by local tests, while live authenticated end-to-end checks remain outstanding.
