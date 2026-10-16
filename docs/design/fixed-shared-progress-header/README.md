# Fixed shared progress header — approved visual review

Branch: feat/fixed-shared-progress-header.
Base: latest fetched main, 064666f7654d6387e6c6c4e7d46f26486cc47fdb (merged PR #11).

## Implementation

ProgressHeader supplies the same title/gear row and simplified LearnerStatusCard on Today and Roadmap. Both existing native SafeAreaView wrappers remain. The header is an opaque white, non-shrinking flex sibling above the ScrollView with zIndex 1. This reserves the actual header height in layout, so learning content is never positioned behind a header overlay. ScrollViews flex into the remaining viewport, with minHeight 0 for web constraints. The existing React Native Modal settings menu renders above the header without modifications.

The progress card removes the rotation label/title and their styles. It retains the existing vector flame, star, authenticated streak/professional level/XP/threshold, neutral fallbacks and existing progress calculation. No separate implementation or new account trigger exists.

Shared normal measurements (web, excluding native safe-area inset):
- Title/gear row: top 12px, 44px high, 29px title font and 44px gear touch target.
- Gap from title row to progress card: 8px.
- Progress card: 56px high, top 64px.
- Gap before learning content: 12px.
- Total fixed region: 132px, identical on both screens at 320/390/1280 widths.

This reduces the card from 90px to 56px (38%) and reclaims vertical learning space without adding compensating margins. Today module starts at y=132 instead of y=222; its JSX, artwork and all learning-content styles are unchanged. Roadmap changes only the header and surrounding scroll padding; measured journey geometry, artwork, milestones, and ordering have no changes. Portfolio, tab layout, AccountSettingsButton, learnerStatus calculations, backend, and database have no changes. Pre-existing SVG line-ending-only worktree changes are preserved.

## Visual verification

All captures use production screen components with local synthetic API/account fixtures. They do not expose real learner data.

- [390px initial Today/Roadmap comparison](390-comparison.png)
- [390px scrolled comparison, constrained 640px viewport height](390-comparison-scrolled.png)
- [390px settings menus above scrolled pages](390-comparison-menu.png)
- Initial, scrolled, and menu captures also recorded at 320px and 1280px.
- All normal progress cards remain one row, 56px high. Titles, gears, card bounds and header heights match on both screens.
- Header stays y=0..132 when Today scrollTop reaches 120 and Roadmap reaches 419px in the 390px check. Scroll viewport begins at y=132; focused Continue Learning and Roadmap Practice Again remain entirely beneath the header and above fixed bottom tabs.
- Settings Sign Out button is fully on screen at all tested widths; Escape dismisses the menu. Actual account sign-out was not performed during screenshot capture; session-specific sign-out behavior is covered by tests.
- Bottom tabs navigate between Today, Roadmap and unchanged Portfolio after menu dismissal.
- At 320px, missing XP/level labels wrap for readability: card 75px / header 151px on both screens, no horizontal overflow or overlap. Natural expansion is reserved in flex layout. Missing streak and threshold fallbacks remain covered by tests.
- Detailed measured bounds, scroll offsets and menu bounds are in browser-checks.json.

## Verification results

- Focused Today/Roadmap/shared-header tests: 36 passed, 0 failed.
- Complete regression suite: 352 passed, 0 failed, including account-switch, navigation and clinical workflows.
- TypeScript baseline comparison: 22 baseline / 22 current / zero new diagnostics. The full project typecheck still has its pre-existing baseline diagnostics.
- Expo web, iOS and Android production exports passed. These are build checks, not native-device visual runs.
- git diff --check passed.

Visual review approved. Authorized for publication as a draft PR only; no merge or deployment. No backend modification or production data write.
