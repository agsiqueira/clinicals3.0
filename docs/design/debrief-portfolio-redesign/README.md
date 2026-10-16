# Debrief and Portfolio design verification

Local implementation on `feat/debrief-portfolio-redesign`, based on `origin/main` at `72e57071d410f96b70ade68ebb660425a6892f37` (includes merged Meet Preceptor PR #15). The designs and final chart refinement are approved for publication as one draft PR. No merge, deployment, database change, or learner-record write was performed.

## Approved references and comparisons

All four Figma frames were inspected before implementation.

| Design | Figma | Direct comparison |
|---|---|---|
| Debrief desktop | [73:2](https://www.figma.com/design/qsmnc7bznmYoLQRnplhJKH?node-id=73-2) | [Figma / implementation](comparison-debrief-desktop.png) |
| Debrief mobile | [73:43](https://www.figma.com/design/qsmnc7bznmYoLQRnplhJKH?node-id=73-43) | [Figma / implementation](comparison-debrief-mobile.png) |
| Portfolio mobile | [73:84](https://www.figma.com/design/qsmnc7bznmYoLQRnplhJKH?node-id=73-84) | [Figma / implementation](comparison-portfolio-mobile.png) |
| Performance empty state | [75:27](https://www.figma.com/design/qsmnc7bznmYoLQRnplhJKH?node-id=75-27) | [Figma / implementation](comparison-portfolio-empty.png) |

The comparisons retain original screenshot pixels. The desktop implementation is cropped to the centered 800px region to match the reference frame; the uncropped desktop screenshots are also included. Mobile references and implementation use the same 390px width, with their original different canvas heights.

**All browser captures use explicitly synthetic fixtures**, rendering the production presentation components. They are not authenticated production screenshots. The local preview aliases authentication, API and voice dependencies only in its isolated build; it cannot write learner records. No Figma example scores were inserted into application data.

## Implementation and preserved behavior

- `ClinicalDebrief` extracts only the existing result/coaching presentation. `level1.tsx` still owns assessment results, attempt/conversation identifiers, messages, requests, transcription, speech playback, state reset, score/rubric calculations, Retry Encounter and Continue Learning. Existing callbacks and guards are passed through.
- `DebriefSheet` provides a 736px centered desktop modal, a mobile sheet, native safe-area padding, keyboard avoidance, scrolling history and a separate persistent composer/action footer. Close, native modal dismissal and Escape reuse the existing `continueLearning` callback. The actual Dr. Martinez portrait remains in use.
- Backend coaching, saved messages, all original suggested questions, Voice On/Off, microphone, Ask/loading/error states, focus-next feedback, earned badges, score explanation, Patient Summary/HPI and detailed rubric remain accessible. Details are disclosed within the history scroll area; they cannot push the footer offscreen.
- Portfolio uses screen-scoped styles; Today/shared legacy styles are untouched. Badges, Achievements and Competencies remain available. Badges is initially selected as shown in Figma. Clinical Growth and Current Goal are also available below the Badges history while remaining accessible from Achievements.
- Existing patient identity, portraits/fallbacks, dates, badge tiers, score history, history expansion, milestones, timeline, competency profile, Best/Latest competency charts, refresh/error/retry, settings and bottom navigation remain. Professional Qualities/Mentor Commendations retain the existing pending-data messaging; this change does not invent unsupported recognition records.
- The identity card displays the existing learner title, level, XP, streak, backend path title, completion count and path progress. No backend calculations or endpoints changed. The original Best/Latest competency charts retain their stacked layout; [browser measurements](competency-bar-measurements.json) confirm their tracks have 183px width at 390px.
- Meet Preceptor changes exactly one style property: Back `alignItems: center`. Width remains 86px mobile / 110px desktop, height remains 44px, radius remains 14px, and handlers/colors/Meet Patient remain unchanged.

## Clinical Performance verification

The chart uses only the existing `recentPatients` data. The final approved refinement removes the redundant visible `#1 … · #2 …` score list while retaining per-point score labels, the fixed scale, the descriptive caption and the complete chronological score description for screen readers. [Final mobile accessibility/overflow checks](final-chart-accessibility.json) confirm the list is absent and all six scores remain accessible at 320×568 and 390×844. A valid point requires a finite numeric score in `[0,100]` and a valid `scoredAt` date. Nulls, numeric strings, booleans, invalid dates and out-of-range/nonfinite scores are not converted into values. Those encounter records remain available in the original history.

Records are sorted chronologically without mutating history; tied timestamps keep their input order. Each valid record yields one point, with no synthetic missing encounters. The vertical scale is fixed: `y = 92 - score * 0.82`, so 0 maps to 92 and 100 maps to 10. Plot width adapts to the measured card on desktop. Narrow plots can scroll horizontally within their card; the page itself has no horizontal overflow. Sequence labels, accessible score descriptions accompany the SVG, rendered through the existing Expo Image dependency.

The visual fixture supplies six records in reverse order; the chart displays **72, 81, 66, 88, 79, 94** in chronological order. These are synthetic verification inputs, deliberately different from the Figma illustration. [Fixture inputs and geometry](chart-fixture-verification.json) and [browser dimensions/point count](portfolio-layout-measurements.json) are included. Both mobile and desktop SVGs contain exactly six points. Unit tests also cover zero, 100, tied dates, invalid inputs, one-point/empty state and 30 records.

For fewer than two valid scored encounters, the chart shows exactly: “Complete at least two scored encounters to see how your performance changes over time.” The zero-record view omits redundant subtitle/history-placeholder copy; real history records still appear when present. No illustrative chart appears in the empty state.

## Screenshots and browser checks

| Viewport | Debrief | Portfolio |
|---|---|---|
| 320×568 | [Default](debrief-320x568.jpg) | [Populated](portfolio-320x568.jpg) / [Empty](portfolio-empty-320x568.jpg) |
| 390×844 | [Default](debrief-390x844.jpg) | [Populated](portfolio-390x844.jpg) / [Empty](portfolio-empty-390x844.jpg) |
| 390×875 | [Default](debrief-390x875.jpg) | [Populated](portfolio-390x875.jpg) |
| 1280×900 | [Default](debrief-1280x900.jpg) | [Populated](portfolio-1280x900.jpg) / [Empty](portfolio-empty-1280x900.jpg) |
| 1440×900 | [Default](debrief-1440x900.jpg) | [Populated](portfolio-1440x900.jpg) |
| 1280×600 | [Reduced height](debrief-1280x600.jpg) | [Reduced height](portfolio-1280x600.jpg) |

Additional captures:

- [Long conversation, manually scrolled](debrief-long-scrolled-390.jpg), [320px long content](debrief-long-scrolled-320.jpg), [expanded progress](debrief-progress-expanded-390.jpg), [long conversation with rubric](debrief-long-progress-390.jpg).
- [Loading with Voice Off](debrief-loading-voice-off-390.jpg), [error state](debrief-error-390.jpg).
- [Clinical Growth and Current Goal](portfolio-growth-390.jpg), [Achievements](portfolio-achievements-390.jpg), [Competencies](portfolio-competencies-390.jpg), [unchanged settings menu](portfolio-settings-390.jpg).
- Centered Back: [320px](meet-preceptor-back-320.jpg), [390px](meet-preceptor-back-390.jpg), [desktop](meet-preceptor-back-1280.jpg).

[Debrief measurements](debrief-layout-measurements.json) show the footer wholly inside every requested viewport, with history ending exactly at the footer's top. At 390×844, history is 627px high and the footer starts at y=705; at 320×568, history is 351px high and the footer starts at y=429. At 1280×600, the modal naturally reduces to 552px height; the footer remains inside it. Portfolio is constrained to 760px content width on desktop. Measured document width equals viewport width at every requested size.

[Manual-reading check](debrief-reading-position.json): submitting a fixture reply while the history was at scrollTop 548 left it at 548. No automatic snapping was introduced. [Back measurements](back-alignment-measurements.json) report zero horizontal and vertical center difference at 320, 390 and 1280px.

## Validation

- Focused frontend: **140 passed**, zero failures. Command: `node --test backend/test/debriefPortfolioFrontend.test.js backend/test/module0Frontend.test.js`. [Log](focused-tests.txt).
- Complete frontend/backend regression: **396 passed**, zero failures. Command from `backend`: `npm test`. [Log](regression-tests.txt).
- TypeScript: **22 on main, 22 on this branch, zero new diagnostics**. Comparison matches file/code/message so moving unchanged source does not count as a new error. [Full comparison](typescript-comparison.json). Command: `node mobile/validation/shared-typescript.cjs`.
- Production web, iOS and Android exports: **passed**. Command from `mobile`: `npx expo export --platform all --max-workers 2 --output-dir ../docs/design/debrief-portfolio-redesign/exports`. [Log](exports.txt). Build output is local and ignored.
- [Scope verification](scope-verification.json) confirms the encounter owner outside the replaced presentation/imports and the Portfolio data loader/focus lifecycle are byte-for-byte unchanged after line-ending normalization.
- `git diff --check` passed. No backend implementation, dependency manifest, route destination, Today/Roadmap layout, Patient Brief, database or clinical engine changes.

Existing Windows checkout caveat: the image-integrity suite expects the exact LF bytes of the audited main-branch SVG assets. The test run temporarily used those exact Git blobs, then restored the original Windows checkout line endings. No SVG content changes are included in the diff. The sandbox initially prevented Hermes from writing its temporary binary; exports succeeded when rerun with the required local permissions.

To reproduce browser fixtures, run `node mobile/validation/roadmap-build.cjs`, then start `mobile/validation/roadmap-server.cjs` with `ROADMAP_REVIEW_PORT=4190`. Routes: `/debrief-review`, `/debrief-review?fixture=debrief-long`, `/debrief-review?fixture=debrief-loading&voice=off`, `/portfolio?fixture=portfolio-populated`, `/portfolio?fixture=portfolio-empty`; `/cases?fixture=real` retains the original Patient Brief → Meet Preceptor flow for the Back check. The preview files are not imported by the production Expo entry.

## Differences from illustrative Figma / remaining checks

- Real portrait and readable natural-height identity replace clipped initials; the voice control remains accessible. The identity can wrap at 320px.
- Existing composer, microphone, voice state, complete feedback and rubric disclosures are preserved despite being omitted from the illustrative frame. The footer therefore includes question entry above its navigation actions. Buttons have minimum 44px targets rather than the frame's smaller illustrated actions.
- Actual learner identity/path/stats, actual history, numeric scores and all existing tabs/sections replace illustrative placeholder copy. These make Portfolio longer than the illustration. The empty card's measured 114px height accommodates its text; the approved reference is 109px.
- Windows web scrollbars reserve their native gutter when content overflows. The narrow chart can scroll internally to keep labels readable; all scores remain readable in the accompanying text. The chart expands within the constrained desktop card. SVG labels request Inter with Arial/sans-serif fallback where the image renderer cannot access the app font.
- The Figma “example/empty state · not real learner data” annotations are design notes and are not shipped as learner-facing copy.
- Physical iOS/Android runtime, native keyboard-open/safe-area behavior, microphone permissions, actual STT/TTS and authenticated live-service/account-switch checks remain outstanding. Native behavior has focused mocked tests and successful exports, not physical-device execution. No production learner encounter was started or submitted for verification.

## Exact inventory

See [changed-files.txt](changed-files.txt) for every changed/new source, test, local validation file and review artifact. The inventory excludes ignored generated bundles/exports and unchanged assets.
