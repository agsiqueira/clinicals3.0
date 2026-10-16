# Portfolio V2 — local visual review

Branch: `feat/portfolio-v2-achievement-gallery`. Base: `7807ecca61bb90f37608839e0b065274fc08b005` (origin/main, merged PR #16).

Approved reference: https://www.figma.com/design/qsmnc7bznmYoLQRnplhJKH?node-id=108-2

## Implementation and preserved functionality

The existing authenticated Portfolio controller supplies the illustrated story hero, collectible milestone gallery, and completed-patient preview. Titles, level, XP, streak, path progress, milestone states and patient metadata come from existing API results. Unknown values use neutral fallbacks; zero values are retained. Milestone states never derive from XP or artwork.

Milestone cards disclose the existing descriptions, progress and earned dates. View All supports arbitrary milestone counts. The patient View All action reveals the existing complete encounter history, portraits, dates, badges, scores and encounter tasks. Achievements retains goals, competency growth, timeline, milestone categories, qualities and commendation placeholders. Competencies retains the existing competency profile. Settings and bottom navigation remain existing components.

The PR #16 Clinical Performance implementation and score preparation are unchanged: chronological real scores, 0–100 scale, individual point labels and accessible score descriptions, no redundant visible score list, and the original fewer-than-two-scores empty state. Clinical Growth and Current Goal remain accessible below the galleries/chart.

The presentation subtree is keyed by existing authenticated user/session IDs so switching accounts clears local presentation state. Existing API authorization and expected-user checks remain intact. A delayed synthetic learner-A response did not restore A's history after switching to B.

## Visual evidence

- [Figma comparison](figma-comparison.png), [approved reference](figma-approved.png)
- [320×568](default-320x568.jpg), [390×844](default-390x844.jpg), [390×875](default-390x875.jpg)
- [1280×900](default-1280x900.jpg), [1440×900](default-1440x900.jpg), [1920×1080](default-1920x1080.jpg)
- [Earned details](achievement-earned-details-390.jpg), [in-progress details](achievement-progress-details-390.jpg), [20 milestones](many-badges-390.jpg), [last milestone details](last-milestone-details-390.jpg)
- [Encounter history](patient-history-expanded-390.jpg), [Clinical Performance](clinical-performance-390.jpg), [Achievements](achievements-tab-390.jpg), [milestone categories](milestone-categories-390.jpg), [Competencies](competencies-tab-390.jpg), [settings](settings-390.jpg)
- [Empty](empty-390x844.jpg), [missing data](missing-390x844.jpg), [single score](one-score-390x844.jpg), [account switch](account-switch-390.jpg)
- [Long 320px](long-320x568.jpg), [long 390px](long-390x844.jpg), [long desktop](long-1440x900.jpg)

The local Metro preview renders the actual Portfolio and tab layout with synthetic API/auth fixtures. It does not access production learner records. Measurement JSON files record viewport overflow, natural text sizing and gallery bounds. All six requested viewport widths have page width equal to viewport width. Long text wraps without colliding with hero artwork. At 320px the gallery uses two columns; 390px uses three; desktop uses four. Details and history are normal scrollable content.

## Validation

- Focused: **157 passed, 0 failed** (`focused-tests.txt`). Includes the Portfolio controller, existing Debrief/Portfolio coverage and 17 new V2 cases.
- Complete regression: **413 passed, 0 failed** (`regression-tests.txt`).
- TypeScript: **22 baseline / 22 current / 0 new diagnostics** (`typescript-comparison.json`). Existing diagnostics remain unresolved by this presentation scope.
- Production Expo exports: **web, iOS, Android passed** (`exports.txt`).
- Exact artwork SHA checks passed; the existing chart source is compared with main in focused tests.

Commands: `node --test backend/test/portfolioV2Frontend.test.js backend/test/debriefPortfolioFrontend.test.js backend/test/module0Frontend.test.js`; `npm test` in backend; `node mobile/validation/portfolio-v2-typescript.cjs`; `npx expo export --platform all --max-workers 2` in mobile.

On Windows the asset-integrity suite requires audited SVG bytes from Git (LF); these were temporarily restored for verification and returned to their original CRLF checkout afterward. No SVG content changes are included. Generated bundle and platform exports are ignored; source harnesses and logs are retained.

## Explicit differences from the illustrative frame

- Real backend values replace illustrative Figma examples. Existing vector flame, lock and settings icons replace emoji-like mock icons. Controls retain 44px minimum targets.
- Hero and cards grow naturally for long text. Narrow layouts use two badge columns. Desktop retains the app's centered maximum width.
- The actual scored chart and full Best/Latest competency details remain instead of the static simplified Figma chart/bars; this makes the page longer. The chart's existing contained horizontal scrolling remains when needed.
- The preview uses the approved generic encounter illustration; expanded history retains actual available patient portraits and existing initials fallbacks.
- Exact approved trophy/introduction images contain decorative lock/check marks. These pixels do not determine earned status; backend state labels and accessible descriptions do.
- Native Windows scrollbar gutters can reduce the visible card width. The comparison shows the top 844px of Figma beside the actual 390×844 viewport; lower sections have separate scrolling captures.

## Remaining checks and change control

Physical iOS/Android rendering, device safe areas, real screen-reader behavior, and authenticated live-service/account-switch checks remain outstanding. Exports and local synthetic interaction tests do not establish those checks. No production services, databases or learner records were modified. Approved for publication as one draft PR; no merge or deployment is authorized.


## Final approved title adjustment

The title uses full-width copy with artwork below at narrow widths or when the backend title exceeds the shared content budget (32 characters adjusted for font scale). Typical titles at 390px and wider retain the approved side-by-side arrangement. Copy has an automatic flex basis and natural height. No backend values are abbreviated or truncated. Browser bounds show separate copy/art regions and no page overflow.

Final screenshots: [long 320×568](final-long-320x568.jpg), [normal 390×844](final-normal-390x844.jpg), [long 390×844](final-long-390x844.jpg), [long desktop 1440×900](final-long-1440x900.jpg). See final-title-measurements.json. These supersede the earlier long-title captures. The added responsive test increases the focused total from 156 to 157 and regression total from 412 to 413. TypeScript remains 22 existing diagnostics with zero new.
