# Compact progress header and current Roadmap lesson focus

Base: latest fetched origin/main d6938f1 (merged PR #12, containing merged PR #11). Branch: feat/compact-header-roadmap-focus. Those merged implementations are baseline, not duplicated in this diff.

## Approved improvements

The shared LearnerStatusCard changes only its minimum height/padding/gaps: normal card 44px instead of 56px, fixed header 120px instead of 132px, excluding native safe-area insets. Text sizes, vector icons, palette, data formatting and settings behavior are unchanged. The settings gear retains its 44x44px touch target. At 320px, 365 days / Level 12 / 12345 of 20000 XP fit at 44px without clipping. Exceptional long values and unavailable labels wrap safely (52px and 59px cards respectively) rather than shrinking or truncating text.

Roadmap starts one cancellable positioning operation per tab visit, after fresh authenticated progression data, fonts, viewport and destination measurements are ready. It reuses buildJourney's existing recommendation/status selection, with incomplete Module 0 and completed/final milestone fallbacks. Explicit route intent takes priority without allowing locked launches. Consumed route tokens do not permanently override later progression. Actual ScrollView height accounts for fixed header and bottom tabs; target centering clamps safely at the journey ends.

Content is revealed after initial positioning to avoid a wrong-location flash. Touch, wheel, drag and scroll keys cancel pending movement; active visits do not repeatedly snap back. Tab blur, account/session changes and fresh-load epochs reject stale work. Re-entry refreshes progression; a dedicated regression covers re-entry after previously empty data.

Nonvisual observation refs measure the full lesson boxes without wrappers or style changes. Existing connector anchor groups, SVG math, artwork, milestone coordinates/order, locked/completed states, Portfolio, tab navigation, backend logic, database and learner calculations are unchanged. Previously approved compact-header screenshots and Roadmap focus screenshots are included below; captures use local synthetic data with production screens.

## Final validation

- Focused frontend/controller tests: 45 passed, 0 failed.
- Full regression suite: 363 passed, 0 failed, including real-screen re-entry and account-switch scrolling tests.
- TypeScript: 22 baseline / 22 current / zero new diagnostics. Existing baseline errors remain.
- Production Expo web/iOS/Android exports: passed on the final combined implementation (see verification-results.txt).
- git diff --check passed.
- Responsive checks at 320/390/1280px; actionable targets within approximately 1px of visible viewport center (desktop worst observed 1.25px). Boundary targets clamp safely.
- Simulated progression return changes scrollTop 565 -> 2248px and centers the later rotation.
- Manual scrollTop 1740px survives settings open/Escape without snapping.
- Explicit locked destination centers for inspection without launching; stale account/session work cannot position a different learner's journey.
- Native exports verify bundles, not physical-device screenshot rendering. No production learner record was read or modified.

## Screenshots

- [390px compact headers](header-390.png), [320px compact headers](header-320.png)
- [390px scrolled](header-390-scrolled.png), [320px scrolled](header-320-scrolled.png), [320px longer values](header-320-long-values.jpg)
- [390px current and later lesson](focus-390.png), [320px current](focus-320.jpg), [desktop current](focus-desktop.jpg)
- [Incomplete Module 0](focus-module0.jpg), [completed roadmap](focus-complete.jpg), [return after progression](focus-return.jpg)
- [Manual position retained](focus-manual-preserved.jpg), [explicit locked destination](focus-explicit-locked.jpg)

[Changed-file list](changed-files.txt). Measured bounds, scrolling evidence and TypeScript comparison are included alongside this note. Generated bundles, old captures and unrelated pre-existing line-ending worktree changes are excluded.

Published for draft review only. Do not merge or deploy.
