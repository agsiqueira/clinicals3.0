# Illustrated Roadmap implementation review

Baseline: a1fa4de0607a9efdb642b21cc2bfab2375eafffb. Branch: feat/roadmap-redesign.
Approved Figma: https://www.figma.com/design/qsmnc7bznmYoLQRnplhJKH?node-id=13-3

## Implementation and parity
Replaces the flat Roadmap with a naturally scrolling illustrated journey: actual rotation names and encounter counts, numbering from 1 per rotation, curved lavender connectors, original artwork, current encounter actions, backend-controlled locked states, and scenic mastery destinations.

The pure journey adapter preserves API ordering, real badgeTier Gold/Silver/Bronze/NONE, missing scores, and the exact 84% mastery boundary (83.99% does not qualify). Mastery presentation never unlocks encounters or awards XP. Bronze is the approved Figma vector, node 15:21.

Existing owner/session protections, patient overview, evaluation details, preceptor briefing, mentor chat, STT/TTS, launch parameters, repeat/practice, saved progress, loading/error/empty states and real Expo Router tabs remain intact. View Previous Attempts is clearly case-wide and uses the existing history route. Today, Portfolio, assessment, backend APIs and schemas are unchanged.

The visual refinement removes the active rectangular card, normalizes connector spacing, blends the scenic landscape into the journey, and gives narrow screens more text width and full-width prerequisites. Existing artwork was not regenerated.

## Validation
- Full regression suite: 326 passed, zero failures (backend npm test).
- Focused Roadmap suite: 11 passed, including iOS/Android medal rendering and disabled locked launch actions.
- Production Expo web, iOS and Android exports succeeded.
- TypeScript comparison: 22 baseline diagnostics, 22 current, zero new.
- Asset integrity and whitespace checks passed.
- Synthetic browser checks at 320x568, 390x844 and 1280x900: assets loaded, no horizontal overflow, encounter actions at least 44px high, locked encounters had no launch actions.
- Ordering, multiple rotations, empty units, badge NONE, missing scores, 83.99/84 boundary, case-wide history and preceptor entry flows covered.
- No migrations or learner data changes.

## Selected review screenshots
Only the following review captures are included; raw collections, preview tools, exports and backups remain local.

| View | Before | After |
|---|---|---|
| 390px current | [Before](visual-refinement/before/390-current.jpg) | [After](visual-refinement/after/390-current.jpg) |
| 390px scenic destination | [Before](visual-refinement/before/390-destination.jpg) | [After](visual-refinement/after/390-scenic-mastered.jpg) |

Additional captures: [320 current](visual-refinement/after/320-current.jpg), [320 locked](visual-refinement/after/320-locked.jpg), [390 top/completed](visual-refinement/after/390-top.jpg), [Bronze](visual-refinement/after/390-bronze.jpg), [rotation transition](visual-refinement/after/390-rotation-transition.jpg), [desktop destination](visual-refinement/after/1280-scenic-mastered.jpg).

## Outstanding verification and deviations
Physical iOS/Android checks, live microphone/STT/TTS, native SVG decoding and native grayscale remain outstanding. Native locked imagery retains opacity/muted styling; exact grayscale is verified only on web. Exports and native component tests do not establish physical-device appearance or live voice behavior.
Real learner text varies from Figma fixture labels. The approved existing tab bar is preserved, and desktop uses a centered responsive journey. Screenshots use synthetic data.

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
