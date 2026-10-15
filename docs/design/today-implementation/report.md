# Approved Today implementation — release review

## Baseline and scope

Worktree: `C:/Users/alexa/Documents/clinicals3.0-today`. Branch: `feat/today-redesign`.
Fetched baseline/HEAD: `2988ddef22f55c8c4e4278f7a5b2596fbba59e17` (merged/deployed Roadmap PR #8).
The prior Roadmap and image-optimization checkouts remain untouched. The reviewed implementation is prepared for a draft PR. Deployment, migrations, service restarts and production learner-data changes are out of scope.

[Approved Today Figma, node 1:48](https://www.figma.com/design/qsmnc7bznmYoLQRnplhJKH?node-id=1-48).

## Implementation and functional parity

Today retains the existing authenticated `/api/today` request, refresh/loading/error handling, expected-user headers, epoch checks and captured-session validation. No new endpoint or backend behavior is introduced. The pure presentation adapter uses backend recommendations without independently selecting or unlocking encounters.

- Header: 33px navy Today heading and actual streak. The Roadmap popover interaction pattern is applied locally without changing Roadmap: focus on open, Escape/outside/Close dismissal, focus return. Sign Out retains its existing Clerk session-specific handler in the compact account menu.
- Level/XP: exact medal background, star, lavender panel and purple track. Real level, earned XP and next-level threshold are displayed; missing data has no invented progress. Track fill uses the known XP/threshold ratio, bounded visually to 100%, without changing award calculations.
- Current module: exact approved transparent Figma illustration, badge, title/description hierarchy and progress row. Incomplete Module 0 displays actual completed activity count. Completed Module 0 switches to the backend recommended rotation/focus and actual encounter completion count. Retry uses the same recommendation; blocked/complete states link to requirements or Roadmap rather than an invalid encounter.
- Continue Learning: 57px purple CTA. Module 0 opens its established resume route. Encounters pass the exact backend session slug and fresh focus token to the existing Roadmap overview/preceptor controller. No patient overview, assessment, mentor, voice, attempt-history or launch controller is changed.
- Secondary Roadmap card selects the real Expo Router Roadmap tab. Exactly three existing tabs remain. No duplicate navigation is rendered.
- The former Today roster, large readiness checklist, welcome subtitle and coaching dashboard panels are removed from this surface as requested. Module 0 activity/review workflows remain available through Module 0 and the unchanged Roadmap disclosure. Daily briefing data remain in the API model; they are not used to add extra panels.

## Visual comparison

The 390px Figma side-by-side (`figma-comparison-390.png`) passed user visual review. See the [local capture catalog](screenshot-catalog.md). Screenshots remain local and are intentionally excluded from the PR.

The approved reference is 390x875. At 390px, the implementation closely matches header, 91px XP panel, 369px readiness card, illustration crop/placement, 57px CTA and 88px secondary card. At 320px, typography/XP spacing adapts and the secondary title wraps. Long real titles use wider text flow above the illustration, increasing card height rather than clipping content. Desktop stays centered at a 390px content envelope. Original image bytes and SVG proportions are retained.

Intentional differences from the mockup: real counts/XP, real active rotation titles, retained existing tab icons/height/desktop orientation, platform emoji rendering and dynamically taller cards. The current-module badge hugs its label rather than using the prototype's larger fixed width. No Roadmap or Portfolio source or shared tab styling changed.

Synthetic captures cover incomplete readiness, available recommendation, retry, fully completed, locked, partial XP and long titles at 320x568, 390x844 and 1280x900. Full-height captures combine overlapping, unretouched viewport strips with the header/tab bar shown once. Desktop states that fit use a single viewport. Original viewport captures are also retained locally.

## Validation

- Complete backend/frontend regression suite: **340 passed, 0 failures** (`backend npm test`). Includes six focused Today tests plus route/account-isolation coverage in the existing frontend harness.
- Focused Today tests: **6 passed**; incomplete readiness, backend recommendation/retry, completed/locked/missing destination, partial XP, real long titles and exact artwork integrity.
- TypeScript versus latest main: **22 baseline, 22 current, zero new** at file/code/line/character. Two unchanged faculty overload diagnostics have different TypeScript union-message ordering; diagnostic locations/codes/counts remain identical. Neither faculty file is modified.
- Production Expo **web, iOS, Android exports all succeeded** after final responsive changes.
- Browser: 21 fixture/viewport combinations show **zero missing images, zero horizontal overflow, exactly three tabs**. Measured primary/secondary actions are at least 57/88px high; streak target 47px.
- Browser Continue checks reached Module 0 and the existing patient overview with correct session slug. Roadmap tab entry works. Account popover opens with focus, Escape closes it and returns focus. Error and loading states captured. Account-switch regression rejects late previous-user responses.
- All 74 existing image integrity checks and new seven-asset Today provenance checks pass. Today SVG checkout line endings are pinned to LF, matching the existing Roadmap asset policy. Literal runtime asset references resolve. `git diff --check` passes.

Logs are local under `validation/`: `regression-final.txt`, `today-focused-final.txt`, `typescript-final.txt`, `typescript-comparison.json`, `production-exports.txt`. Browser measurements: `browser-checks.json`.

## Environment notes

Dependencies are junctions to the existing installed packages; nothing was installed or changed in shared dependencies. New-worktree Windows checkout line endings initially changed 18 existing SVG byte hashes; exact baseline Git blob bytes were restored. Those files have no content diff and no artwork changes. The first Expo export resolved an empty route tree through shared dependency caches; setting `EXPO_ROUTER_APP_ROOT` to this worktree's `mobile/app` fixed it without production configuration changes.

Local preview helpers/fixtures, raw captures, failed-attempt logs and generated exports are review tools, not production entry points. Preview uses synthetic API/auth/voice adapters; no production learner account or database is connected. A local synthetic preview is available at `http://127.0.0.1:4184/?fixture=incomplete`.

## Remaining verification

Physical iOS/Android rendering, native SVG decoding, hardware safe areas/font scaling, screen-reader usability and live microphone/STT/TTS require device/service checks. Native exports validate bundling, not physical-device appearance. Existing shared bottom navigation intentionally differs visually from Figma because Roadmap/Portfolio/navigation styling is out of scope. No functional blocker remains in the tested synthetic flows. Visual review has passed; physical-device and live-service verification remain outstanding before release.
