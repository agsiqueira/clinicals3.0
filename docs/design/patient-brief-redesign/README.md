# Patient Brief redesign — local visual review

Branch: `feat/patient-brief-redesign`. Base: latest fetched `origin/main`, `042b98ca7552c22b965f3025a772774fd983be21`. Separate checkout: `C:/Users/alexa/Documents/clinicals3.0-patient-brief`. The uncommitted desktop Roadmap auto-focus work remains in its original checkout and is excluded here.

The implementation passed visual review and is authorized for publication as one draft PR targeting main. Final publication checks were rerun on October 16, 2026. No merge, deployment, production service change or learner-record write is authorized or performed.

## Specification and implementation

Inspected both high-fidelity Figma contexts and screenshots before application edits:

- [Desktop frame 56:2](https://www.figma.com/design/qsmnc7bznmYoLQRnplhJKH?node-id=56-2)
- [Mobile frame 56:38](https://www.figma.com/design/qsmnc7bznmYoLQRnplhJKH?node-id=56-38), including the new top-right close control.

`PatientBrief.tsx` contains responsive presentation using React Native Modal, ScrollView, StyleSheet, existing Inter font assets/design tokens, Ionicons and the existing PatientAvatar. The desktop card stays 736px wide, centered in the viewport. At 390px the mobile sheet is 358px wide with 16px outer margins, 18px inner padding, 24px corners, 17px section gaps, and a 44×44px close control labeled **Close Patient Brief**. Native safe-area insets are included on all four sides.

The white action footer stays outside the scrolling body. Identity, reason, mission, objectives, time, preceptor handoff and secondary actions retain the approved order. Long text wraps naturally. Evaluation details start collapsed and retain achievement weights and performance thresholds. Actual preceptor identity is used in the handoff.

See [existing-workflow.md](existing-workflow.md) for the pre-change trace. Clinical handlers, API requests, authentication, destinations, attempt semantics, mentor/voice logic and progression remain in the existing owning screen. The redesigned component performs no clinical requests or writes. Close, modal Back, accessibility escape and web Escape only dismiss; history closes the brief and uses the existing `/attempts?caseId=…` route. Meet Preceptor still opens the existing mentor dialogue, and its subsequent Meet Patient action preserves case ID, session slug and requiresHpi. Session ownership remains keyed to the authenticated learner, with existing API session-generation protection.

## Direct visual comparisons

- [Mobile Figma / implementation](comparison-mobile.png)
- [Desktop Figma / implementation](comparison-desktop.png)

Desktop comparison crops only the surrounding viewport to an 800px-wide centered region; the modal remains at its actual 736px size. Mobile comparison preserves the 390px width and pads below the 844px implementation capture to the 900px Figma frame height. Neither implementation screenshot is stretched.

### Explicit differences from Figma

- The real 54px patient portrait replaces the illustrative initials placeholder, per the request. Identity can wrap and is 54px high rather than the frame's clipped 40px row; this adds approximately 14px before later sections.
- All primary and Close action targets are at least 44px high rather than Figma's 40px footer controls. The default card is approximately 700px high on desktop versus the 680px concept, and 773px on mobile versus the 750px concept. No clinical text is clipped to force the concept's fixed heights.
- Desktop is vertically centered as requested; Figma's presentation canvas places its card 42px from the top. Mobile remains top-aligned at 14px plus safe area.
- The body scrolls when necessary, while the action footer remains visible. Expanded evaluation content is styled with the same soft surfaces and vector medal icons; the Figma frame only specifies the collapsed state.
- Time, check, chevron, close and arrow glyphs use the project's vector icon library. Native/web keyboard focus outlines remain available; some captures show the focused control's outline.
- Patient, encounter, mission, objectives, duration and preceptor vary with existing application data. Screenshots use local read-only fixtures; illustrative names were not added to production presentation code.
- The original history-scope explanation remains available as the Previous Attempts accessibility hint. Existing case history and mentor screens are deliberately unchanged.

## Screenshot catalog

| State | Screenshot |
| --- | --- |
| 320×568 default, scrollable body and visible action | [default](default-320x568.jpg) |
| 390×844 default and close control | [default](default-390x844.jpg) |
| 390×875 default | [default](default-390x875.jpg) |
| 1280×900 desktop default | [default](default-1280x900.jpg) |
| 1440×900 desktop default | [default](default-1440x900.jpg) |
| 1280×560 short desktop viewport | [default](default-1280x560.jpg) |
| Mobile expanded evaluation, scrolled to criteria, visible footer | [evaluation](evaluation-mobile.jpg) |
| Existing Previous Attempts screen, fixture attempt and correct case | [history](previous-attempts-mobile.jpg) |
| Existing preceptor dialogue after Meet Preceptor | [handoff](preceptor-handoff-mobile.jpg) |
| Long mobile clinical mission/objectives, top | [long content](long-content-mobile-top.jpg) |
| Long mobile content, bottom and visible primary action | [long content](long-content-mobile-bottom.jpg) |

`responsive-measurements.json` records all requested sizes plus reduced desktop height. No horizontal overflow was observed. Footer bottom stays within the viewport: 553px at 320×568, 786px at 390×844/875, 799px at desktop 900px height, and 535px at desktop 560px height. The 320px close control measures exactly 44×44px. The long-content body has 1508px of content in a 652px scroll area and reaches scrollTop 856px without moving the footer.

Browser interaction verified Close dismisses to the existing Roadmap context, web Escape dismisses, Evaluation Details expands, Previous Attempts loads the unchanged history screen for `uti_level1`, and Meet Preceptor opens the unchanged mentor dialogue. No live learner records or encounter attempts were created.

## Validation

- Focused tests: **121 passed, 0 failed** (`focused-tests.txt`): actual owning-screen workflow, backend-driven labels/data, portraits and unknown-image fallback, disclosure/weights/thresholds, case-history navigation, close/modal Back/web Escape, mentor handoff and unchanged patient route, account ownership/session isolation, long text, safe-area padding and separate footer/body.
- Full regression suite: **368 passed, 0 failed** (`regression-tests.txt`). Includes frontend and backend tests, image integrity, clinical workflows and session-token isolation.
- TypeScript comparison: **22 baseline diagnostics, 22 current, zero new** (`typescript.log`, `typescript-comparison.json`). Main already has errors; this is not a globally clean type check.
- Final production Expo export for **web, iOS and Android passed** (`exports.log`, outputs under `exports/`).
- `git diff --check` passed. Audited SVG files were restored to exact main blob bytes after Windows checkout line-ending conversion; no substantive asset changes are in this diff.

Initial local export failed because the chained dependency junction prevented route discovery; direct dependency resolution and a clean Metro export fixed that. Initial image-integrity failures were caused by CRLF conversion, not design asset changes. Final test/export results above supersede those setup failures.

## Remaining checks

Native safe-area layout and Android/modal Back are covered by component/workflow tests, and all platform bundles export. Physical Android/iOS visual testing, native screen-reader gestures and live authenticated end-to-end service validation remain outstanding. There is no attached Android device in this environment and no iOS runtime on this Windows host. Voice/chat backend behavior was not changed or exercised against production; tests preserve the existing workflow locally.

## Exact code/test changes

1. `mobile/src/components/PatientBrief.tsx` — new shared responsive presentation.
2. `mobile/app/(tabs)/cases.tsx` — replace overview presentation with PatientBrief; preserve clinical handlers.
3. `backend/test/module0Frontend.test.js` — component resolution and focused workflow/portrait/safe-area tests.

Local preview tooling and generated bundles, exports and ZIP files are excluded from the PR. Committed documentation contains only the Patient Brief verification report, workflow trace, approved reference/capture images, measurements, and validation evidence. `changed-files.json` inventories the exact PR files. The local TypeScript comparison replaces changed tracked source with origin/main versions for the baseline, excludes new untracked components from that baseline, and compares diagnostics before/after. Validation commands: node --test test/module0Frontend.test.js test/imageAssets.test.js test/sessionToken.test.js; npm test; node validation/shared-typescript.cjs; npx expo export --platform all --max-workers 2.
