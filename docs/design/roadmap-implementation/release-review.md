# Final illustrated Roadmap review

Branch: `feat/roadmap-redesign`. Base: `a1fa4de0607a9efdb642b21cc2bfab2375eafffb`.
[Approved Figma](https://www.figma.com/design/qsmnc7bznmYoLQRnplhJKH?node-id=13-3).

## Final implementation

- Fixed Roadmap header outside the scrolling journey. Clickable streak opens the existing level/XP summary in a responsive popover, with close/outside/Escape dismissal and focus return.
- Compact encounter nodes retain actual patient/title, per-rotation numbering, concise state, finite best score, real Gold/Silver/Bronze/NONE badge state and one contextual action. Long objectives/descriptions remain in clinical data and existing detail workflows, not on the Roadmap.
- Measured milestone centers automatically realign on responsive layout and Module 0 disclosure changes. Two broad alternating cubic arcs connect adjacent stages within each independent learning path. Lavender 5.5px rounded 9/11 dashes render below scenery and foreground artwork; no obstacle routing or stretched short segments.
- Text masks and the same-art alpha silhouette beneath muted locked illustrations protect foreground readability. Destination art retains its original proportions, with localized scenic backdrops, actual numeric mastery and concise state.
- Introduction illustration has the reviewed localized checkmark removal. Provenance records bytes, hash, dimensions and edit; all other approved image bytes remain unchanged in this follow-up.

## Functional parity

Backend locking, Module 0 requirements, API ordering, account ownership/isolation, saved progress and the exact 84% boundary remain authoritative. Destinations do not award XP or unlock encounters. No scores or achievements are invented. Completed/current/retry/available/locked states preserve existing launch handlers.

Patient overview, evaluation details, preceptor briefing, mentor, STT/TTS, encounter parameters, repeat practice and clearly labelled case-wide previous attempts remain intact. Real Expo Router tabs, loading/error/empty states and independent learning paths remain intact. Today, Portfolio, backend APIs, assessment, authentication, schema and storage behavior are unchanged.

## Validation

- Full regression suite: **333 passed, zero failures**. Focused Roadmap suite: **18 passed**.
- Production Expo **web, iOS and Android exports succeeded**.
- TypeScript comparison against baseline: **22 baseline, 22 current, zero new diagnostics**; existing diagnostics listed below.
- Asset integrity validates all Roadmap files against provenance bytes and SHA-256. Whitespace checks pass.
- Synthetic browser captures reviewed at **320x568, 390x844 and 1280x900**: no missing images, horizontal overflow or clipped labels; encounter actions at least 44px high. Measured connectors realign with expanded Module 0, long titles and multiple rotations; independent paths are not bridged.
- Oversized hidden objective/description fixtures have identical scroll heights to compact fixtures: 3192/3295/3859px at the three widths. Separate captures cover retry, medal NONE/missing score and mastered destinations.
- Regression coverage includes 83.99% versus 84%, real medals, best-score-only display, locked actions, overview/evaluation/history/preceptor entry, measurement changes and foreground layering.

## Visual review and scope

Final full-height mobile/desktop captures and the same-width 390px Figma comparison passed user visual review. Raw screenshots, generated exports, temporary validation logs, preview fixtures/servers and caches are intentionally excluded from this follow-up commit. Earlier selected screenshots already in the PR remain historical snapshots, not the final geometry.

Real learner names, counts and text differ from Figma fixture values. The existing tab bar and Module 0 disclosure remain. Scenic backdrops are localized to destinations so opaque artwork cannot erase encounter connections.

## Remaining verification

Physical iOS/Android visual checks, native SVG data-URI decoding, grayscale/white-alpha-mask rendering, screen-reader behavior and live microphone/STT/TTS checks remain outstanding. Successful exports and synthetic/native component tests do not establish physical-device appearance or live voice behavior. No production learner data was used or changed. No migration, deployment or service restart is required or performed by this review step.

## Existing TypeScript diagnostics
| File | Code | Count |
|---|---|---|
| mobile/app/(auth)/signin.tsx | TS2722 | 1 |
| mobile/app/(auth)/signin.tsx | TS18048 | 4 |
| mobile/app/(tabs)/level1 - original.tsx | TS2339 | 9 |
| mobile/app/(tabs)/level1.tsx | TS2367 | 1 |
| mobile/future/faculty/FacultyDashboardScreen.tsx | TS2769 | 1 |
| mobile/future/faculty/FacultyStudentDetailScreen.tsx | TS2339 | 4 |
| mobile/future/faculty/FacultyStudentDetailScreen.tsx | TS2769 | 1 |
| mobile/src/components/AnimatedPatientAvatar.tsx | TS2769 | 1 |
