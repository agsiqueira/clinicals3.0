# Portfolio V2 — existing behavior and implementation plan

Base: origin/main 7807ecca61bb90f37608839e0b065274fc08b005, including deployed PR #16. New branch: feat/portfolio-v2-achievement-gallery. No publication is authorized.

## Sources and existing behavior

The Portfolio screen owns Badges/Achievements/Competencies, refresh/loading/error/retry and the authenticated getClinicalPortfolio/getToday requests. getClinicalPortfolio is called with expectedUserId and obtains backend-built identity, streak, learning-path progress, milestone states, competencies and scored patient history. The backend supplies actual EARNED/IN_PROGRESS/LOCKED states and completion percentages; the frontend must not rederive awards. Professional Qualities and Mentor Commendations are currently empty backend arrays with pending-data copy, which remains accessible.

PR #16's ClinicalPerformance and performance helpers validate scores, sort chronologically, use a fixed 0–100 scale, preserve screen-reader values and show the exact fewer-than-two empty state. These files remain unchanged. Existing milestone detail/category lists, Best/Latest competency charts, Current Goal, Growth Timeline, CompetencyProfileTab and account settings remain. Patient history is already expandable with patient portraits, dates, scores and badge tiers. No encounter is started from Portfolio.

## Corrected Figma inspection

Frame 108:2 was fetched with full design context and screenshot before application edits. It is 390×1608, with 20px horizontal padding, 21px stack gaps, a lavender 350px hero with 175px copy and 132×154 artwork, three small achievement cards, an 88×100 encounter illustration, real-history disclosure, then performance, growth and goal. Native navigation/settings are retained rather than replaced by the frame's illustrative glyphs. The example chart is not an application asset; the existing live chart remains authoritative.

Figma hero a889e.png matches existing Today a889e.png exactly. Trophy 0b6ad.png matches Roadmap destination.png; encounter 79aa3.png matches Roadmap encounter.png. The introduction image 455c3.png includes the original decorative check and differs from the Roadmap's deliberately edited version, so the approved image is added as a Portfolio-specific asset. Artwork does not determine earned state; explicit backend state does.

## Planned changes and risks

- Portfolio screen: wire illustrated hero/galleries into Badges; retain all other tabs and detail components; move the existing chart below the galleries. Keep real history expansion functional. Use a session-keyed presentation boundary to reset local display state on learner/session changes, leaving authentication and API authorization untouched.
- New Portfolio presentation components and types: responsive natural-height hero, wrapping collectible grid with details/expansion, encounter preview using the approved generic encounter artwork, existing patient portraits in the full history, metadata fallbacks and accessible state descriptions.
- Scoped Portfolio styles: match reference typography, surfaces, spacing and constrained desktop width. No shared Today/Roadmap styles change.
- Focused tests and isolated review fixtures: state/data correctness, disclosures, tab retention, fallbacks, account presentation reset, long titles and responsive bounds. The existing chart tests remain.
- Verification docs/screenshots: 320/390 mobile and 1280/1440/1920 desktop, mixed/empty/long/many records, all tabs, chart and comparison to the corrected frame. Full regression, TypeScript main comparison and all three exports.

The primary risks are horizontal overflow from long labels/artwork, misleading award appearance, hiding detailed history and reusing old account UI state. Natural sizing, responsive columns, explicit backend labels, preserved disclosures and a keyed presentation boundary address these risks. No backend, scoring, progression, voice or clinical navigation changes are planned.
