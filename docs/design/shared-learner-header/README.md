# Shared account settings and learner progress

Reviewed against latest fetched main: 96b796564ffc0778f7c4509a5a9d398c5df2c6f9.

Today retains its approved compact lavender Level/XP card, star, XP progress bar, illustrated Current Module, Continue Learning, Roadmap card and bottom navigation. Its backend streak appears beneath the XP bar with a 14px purple (#6150ED) Ionicons flame-outline. The card remains 91px tall and Current Module starts at y=223px in the 390px review viewport. Zero, singular, plural and unavailable values use shared backend-data formatting.

Roadmap alone uses the richer LearnerStatusCard with active rotation, streak, level and XP. The status card is outside JourneyCanvas; journey/connection geometry is unchanged. Portfolio adds only the shared settings gear.

All three tabs use AccountSettingsButton for current-account information and Sign Out. The established Clerk session-specific sign-out and redirect remain, with account/session ownership guards, tab-blur dismissal, Escape/native Back, focus return, and retry after failure. Progress indicators do not open account menus. No visible Close Account or Close Level/XP action is introduced.

## Final screenshots

Local review uses synthetic learner fixtures with production screen components; no production learner records are captured.

- [Today, 390px](vector-streak-today-390.jpg)
- [Roadmap, 390px](correction-roadmap.jpg)
- [Portfolio, 390px](correction-portfolio.jpg)

## Validation

- Focused tests: 36 passed, 0 failed (Today, Roadmap, shared settings/status).
- Final full regression: 352 passed, 0 failed.
- TypeScript comparison against main: 22 existing baseline diagnostics, 22 current, zero new. Full typecheck is not clean because of existing baseline errors.
- Whitespace: git diff --check passed.
- Today 320px: zero, singular, long streak and unavailable data checked without expanding the 91px card or shifting Current Module.
- No production backend, schema, assessment, learner-data, or deployment changes.

Final production Expo web, iOS and Android exports passed. Generated bundles and historical review captures are kept local and excluded from this commit.
