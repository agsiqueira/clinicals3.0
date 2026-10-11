# Module 0 UI refinements — visual review

Baseline: remote main verified as `8d75c42783baffc07eac2db8e8709f4f63907596`. The local feature checkout had the identical tracked tree before editing.

## Implementation

- `mobile/src/components/module0/ApprovedScreens.tsx`: navigation and progress are siblings of the instructional ScrollView. The opaque header remains fixed; its top padding comes only from safe-area insets in production. Back/close keep 44px touch targets and the title stays centered. The 480px centered column remains; decorative frame border/radius are removed. Functional cards and inputs retain their borders. The body uses iOS keyboard avoidance and preserves input tap handling. Replay is removed; Play/Pause, mute, captions and error/disabled states remain.
- `mobile/app/module-0.tsx`: removes the Replay-only restart argument. Normal Play still resumes paused narration or starts the current narration using the existing authenticated speech hook.
- `mobile/validation/module0-preview.tsx`: synthetic fixture supports review, explicit safe-area simulation, optional reference chrome and matching synthetic feedback identity.
- `mobile/validation/module0-ui-refinements.cjs`: local-only browser assertions and before/after screenshot capture. All requests are intercepted and served from local exported fixtures.

- `backend/test/module0Frontend.test.js`: updated obsolete progress and Replay expectations.

## Validation

Widths: 320×568, 390×844, 1440×900. Checks explicitly verify the content scroll viewport begins below the opaque header, the progress bar stays visible and narrow teaching/practice content remains scrollable. Other checks include teaching/practice/feedback scroll, centered width, outer border removal, Replay absence, Play/Pause/mute/captions, back/close and teaching counter navigation. Reduced-height practice keeps its draft and fixed header. Additional shared-screen checks simulate a 47px notch inset; a synthetic long-feedback block stresses independent content scrolling.

Final relevant frontend suites: **87/87 pass** (77 frontend behavior tests, 10 recording/transport tests). The OLD CARTS expectation now validates one saved-exercise progress bar during Practice, its saved completion values, and unchanged progress revision; Teaching still validates panel progress. Four additional legacy Replay expectations now assert its absence and preserve coverage for Play/Pause, mute, captions, pending-state disabling and oversized-response handling. Only frontend test assertions changed in `backend/test/module0Frontend.test.js`; backend implementation is unchanged.

Correction to the provisional report: its 76/77 run preceded the final Replay removal. The final rerun initially exposed four obsolete Replay expectations, which are now updated.

Recording/transport suites included above: 10/10 pass, with synthetic data and a mocked local server. Sandbox loopback access initially failed; the same checks passed outside the sandbox.

TypeScript diagnostics are byte-for-byte identical to main; no new type errors. The project has pre-existing errors outside the changed production files. `git diff --check` passes.

## Review artifacts

Before/after screenshots and generated fixture bundles remain local and are intentionally excluded from the release commit. Detailed browser results are in `results.json`; complete relevant test results are in `final-tests.txt`.

## Limitations and scope

The preview has no Clerk, NaviGator or database connection. Audio checks verify toolbar state and handlers; real audio generation was not invoked. Reduced viewport height is a keyboard approximation, not a physical iOS/Android keyboard test. Native keyboard and device safe-area behavior still need manual review.

No backend implementation, curriculum, narration scripts, grading, learner records, environment configuration or deployment state changed. This report records pre-release validation. Generated fixture bundles/assets are local review artifacts.
