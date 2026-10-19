# Authentication fix: final review and verification

Reviewed on 2026-10-19 against freshly fetched origin/main `57daa2fb6bb185d67b67864c35297ea5c5110c64`.

## Review conclusion

No blocking finding remains in the reviewed diff. Five application files implement protected routes, session initialization/recovery, Roadmap error handling, and account-menu recovery. Three test files and authentication documentation complete the change. No approved Today, Roadmap, Patient Brief, Meet Preceptor, Debrief, or Portfolio layout/component styling was changed. No clinical progression rule, clinical content, schema, migration, learner record, credential, environment file, dependency manifest, or deployment configuration belongs to this PR.

The previous SVG status entries are checkout/stat normalization artifacts: the assets match their original Git blobs and have no content diff. They are excluded from the staged change, along with local proxy tooling, environment files, raw logs, and generated exports.

## Security and regression assessment

| Requirement | Evidence and assessment |
|---|---|
| Protected deep links require authentication | Explicit Stack.Protected groups cover every current learner root route and the tabs group. Static/direct navigation redirects to the auth group; the backend independently requires verified Clerk session tokens. |
| Clerk loading cannot expose a dashboard | Root navigation waits for isLoaded; the API bridge also waits for a bound session and a matching loaded user profile. Browser reproduction showed Loading session before sign-in. |
| Missing user/session cannot become successful empty Roadmap | Bridge blocks learner mounting; Roadmap's defensive missing-session paths set an error. Invalid successful API shapes throw rather than normalize to an empty array. Only a valid empty path collection renders the empty message. |
| Persistent 401 has bounded recovery | authenticatedFetch makes at most two attempts, with skipCache on the second; a null token or second 401 emits recovery. The bridge clears its API binding, hides learner children, and invokes Clerk signOut once at a time. No timer retries recovery. Duplicate recovery events are tested. A rejected signOut displays a manual retry. |
| 403 and 503 remain distinct | 403 shows an authorization error; 5xx shows service unavailability. Neither triggers token refresh/sign-out. Network errors retain their own connection/retry message. Browser-injected 403/503 and component tests confirm no empty-success state. |
| Switching accounts rejects stale data | Binding identity/session changes increment the generation and abort pending requests; captured-session assertions reject delayed token, response and body work. The learner boundary remounts on user changes, and mismatched profiles cannot mount learner content. Existing delayed-response/account-switch tests pass. |
| Logout clears authenticated content | Clerk state removes protected routes; bridge gates/remounts learner children. Actual local Sign Out returned to the form and another direct /cases request redirected back to /signin. |
| Credentials and personal data are not logged | No logging call was added to application code. Token retrieval and Authorization construction stay in memory; passwords stay in the existing Clerk form. Published evidence includes only route/status and synthetic test output summaries. No HAR, headers, account identifiers, secrets or response bodies are included. |
| Account menu works during learning failure | Menu opens before optional position measurement. Browser 503 test exposed Sign Out, and web/iOS/Android menu callback tests cover dismissal, failed sign-out, account switch and stale callbacks. |

## Final verification

Commands run from this repository (frontend dependencies installed from the existing lockfile):

- backend: `node --test test/authNavigation.test.js test/sessionToken.test.js test/sharedLearnerHeader.test.js test/roadmapFrontend.test.js test/studentAuth.test.js test/module0Frontend.test.js` — 166 passed, 0 failed.
- backend: `npm test` — 418 passed, 0 failed.
- mobile: `node node_modules/typescript/bin/tsc --noEmit --pretty false` — exit 1, 22 pre-existing diagnostics. An isolated archive of freshly fetched origin/main using the same dependencies produced identical diagnostic lines; zero new diagnostics. This is a comparison pass, not a clean TypeScript build.
- mobile: `node node_modules/expo/bin/cli export --platform all --output-dir dist-review --max-workers 2` — passed for web, iOS and Android. These are production JavaScript/asset exports, not signed device builds.
- Exact staged file/content and whitespace checks performed before commit; no generated output or environment file is included.

The existing 166/418 totals are retained. The final review additionally exercises duplicate expiry notifications inside the existing bridge test, asserting one sign-out call.

## Browser evidence

The initial investigation reproduced the defect both on production and on the untouched main production web export before any source changes. The complete recorded session is summarized in [the investigation](production-authentication-fix.md).

| Check | Result | Evidence provenance |
|---|---|---|
| Anonymous /cases, /portfolio, / and /module-0 | Session loading, then /signin; no dashboard flash observed | Local in-app desktop browser during implementation; /cases rechecked during final review |
| Direct /signin | Existing email/password flow renders | Local in-app browser |
| Mobile web /cases at 390 x 844 | Redirects to /signin | Local in-app browser viewport check |
| Legitimate-account sign-in | User entered credentials directly; Today and Roadmap loaded | Earlier functional validation in this same work session; no password retained |
| Direct authenticated /cases and refresh | Authorized Roadmap loaded after session initialization | Earlier functional validation; authenticated GET learning-paths and Today each returned 200 |
| API failure | 503 service error; 403 authorization error; settings menu still offers Sign Out | Earlier local proxy injection; status-only logs |
| Invalid/expired-token simulation | 401, 401, then sign-in; exactly one forced refresh | Earlier local proxy injection; no Clerk configuration or real token was edited |
| Reauthentication after recovery | User signed in again; Today loaded, HTTP 200 | Earlier functional validation |
| Explicit Sign Out | Account menu Sign Out returned to /signin; subsequent /cases also redirected | Earlier functional validation; signed-out state retained for final review |

Authenticated/failure/Sign Out browser checks above are carried forward from the completed functional validation in this conversation, not claimed as a second credentialed run during final review. The automated suites, exports, and isolated-main TypeScript comparison were rerun for this review.

## Remaining risks and deployment considerations

- Chrome desktop/private browsing, mobile Safari/Chrome and physical iOS/Android runtime verification remain outstanding. An in-app browser viewport and mocked native callbacks do not establish those behaviors.
- Persistent backend 401 was simulated; genuine timed Clerk expiration, offline reconnect and real multi-account browser-tab switching still need device/browser checks.
- A prolonged Clerk outage can prevent initialization/sign-out from completing. Learner content stays gated; initialization/profile delay exposes a recovery action after 10 seconds, and rejected sign-out offers manual retry. An SDK signOut promise that never settles has no application-level deadline; a reload may be necessary. This is an availability limitation, not an automatic retry loop or an authentication bypass.
- New top-level learner routes must be added to the protected group: Expo Router includes undeclared routes by default. Backend authentication remains required regardless of client guards.
- A coordinated Clerk application transition must preserve the backend's existing learner identity mapping; simply replacing keys could strand learner records. It is a separate approved follow-up, documented in [Clerk production configuration](clerk-production-follow-up.md).
- Before a later approved deployment, verify static-host fallback for direct protected URLs, build-time public API/Clerk configuration, backend issuer/authorized parties and CORS. The current tested account/local origin succeeds; that does not prove every production browser/domain combination.

This review authorizes publication of a dedicated draft PR only. No merge, deployment, production service mutation, or Clerk configuration change is part of it.
