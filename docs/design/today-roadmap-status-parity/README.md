# Today / Roadmap learner-status parity — approved review

Branch: feat/today-roadmap-status-parity
Base: latest fetched main, c13b7f53110435169055bbd02dc62e37bb085427.

Today now renders the existing LearnerStatusCard directly in its content stack with identity={data.identity} and rotationTitle={data.activeRotation?.title}. The compact XP panel, its Today-specific streak/icon, unused medal reference, and obsolete styles were removed. Existing authenticated data fetching and account ownership protections remain unchanged.

LearnerStatusCard is byte-for-byte equivalent to main after Git line-ending normalization (blob e17c2ef1f0e8042c7da88c736c8d2de1d36e5861). Roadmap, Portfolio, shared settings gear, tab navigation and production backend files have no diff. Current Module, Continue Learning and Roadmap link JSX/styles compare exactly to main after line-ending normalization.

## Visual verification

Screenshots use synthetic learner fixtures and production screen components; no production learner records were accessed. The reference is the existing component on latest main. Visual review was approved by the user.

- [390px Today](390-today.jpg) / [390px Roadmap](390-roadmap.jpg) / [side by side](390-today-roadmap-comparison.png).
- Identical normal card text, width 350px and natural height 90px on both screens. Header heights differ as before, so Today card starts at y=112 and Roadmap at y=92.
- Today keeps its 20px flow gap: Current Module starts at y=222, height 369; Continue Learning starts at y=607, height 57. No overlap.
- At 320px both cards are 280px wide: normal height 90, long rotation height 144, missing XP/level height 116. Natural wrapping matches on both screens without horizontal page overflow.
- At desktop width 1280, existing parent widths are preserved: Today content/card 350px, Roadmap card 560px. Both use the same unchanged responsive component. Long titles naturally use 126px on Today and 108px on Roadmap at those different content widths.
- Long title CTA remains reachable through normal scrolling/keyboard focus, with artwork above the CTA and the Roadmap link below: [320px scrolled check](320-long-cta-accessible.jpg).
- Detailed bounds and text are in browser-checks.json. Missing rotation/streak/level/XP neutral fallback is covered by focused adapter tests. Account switch, tab blur, stale sign-out callback and delayed learner response protections pass in the focused/full suites.

## Validation

- Focused Today/Roadmap/shared-header tests: 36 passed, 0 failed.
- Full regression: 352 passed, 0 failed.
- Expo production web, iOS and Android exports passed. Native export success is a build check, not a physical-device visual test.
- git diff --check passed.

Only production change: mobile/src/components/today/TodayPresentation.tsx. Two frontend test files updated for the new shared-card requirement. Approved screenshots and bounds accompany this change; generated bundles, logs and old review harnesses remain local. Pre-existing SVG line-ending-only worktree changes and older artifacts were preserved.

Approved for publication as a draft PR only. No merge or deployment is authorized.
