# Production authentication and empty Roadmap investigation

Date: 2026-10-19. Base: origin/main, 57daa2f. Local checkout: C:/210 - Clinicals/clinicals3.0.

## Confirmed findings

Before code changes, reproduced the reported unavailable streak/level/XP and empty Roadmap at production /cases in the connected in-app browser. Clicking the settings gear did not open a menu. Direct production /signin showed the expected sign-in form. Reproduced the same /cases defect using an untouched local production web export of main with the production frontend's public Clerk key and API URL.

The conditional SignedIn/SignedOut Stack.Screen lists configure screens but do not deny Expo Router's implicitly included routes. A direct URL can mount the learner tabs while signed out. The tab layout has no independent authentication check. Roadmap turns a missing user and captureSession failure into empty learning paths; its normalizer also turns an unexpected successful payload into an empty array. The account gear refuses to open without a userId, so the incorrectly accessible anonymous dashboard has no usable recovery menu.

Anonymous production GET /cases: HTTP 200 (web document). Anonymous GET https://clinicals3-backend.onrender.com/api/learning-paths: HTTP 401. During initial anonymous reproduction, no authenticated API requests were made. Later the user securely signed in; the local frontend loaded authorized data from the existing API. No learner mutations were initiated and no tokens, passwords, or personal data were retained in verification logs. These observations establish the route/empty-state defect without requiring a stale Clerk session or a backend learning-path outage. They do not establish whether an additional authenticated production configuration defect exists.

The existing API transport already acquires the current Clerk session token, removes caller identity headers, retries 401 once with skipCache, and rejects responses from an obsolete account/session. It previously had no application recovery notification after null tokens or failed refresh. The bridge previously bound the transport in a parent layout effect without delaying learner children.

Production console identifies a Clerk development instance. Its use is a confirmed production configuration concern, but is not necessary to reproduce the route defect. Backend issuer, authorized-party, and credential consistency could not be established from anonymous HTTP 401 alone. Subsequent successful authenticated API requests demonstrate that the current frontend/backend configuration accepts the tested account and local origin; production-origin checks remain a deployment verification item.

## Local changes

- mobile/app/_layout.tsx: one Stack with explicit Stack.Protected groups covering tabs, modal, attempts, attempt-result, module-0 and the clinical-portfolio alias; auth group is available while signed out; unresolved auth cannot mount learner screens.
- mobile/src/components/ApiAuthBridge.tsx: gate learner mounting on a bound API session and matching loaded user profile; recover invalid sessions with the established Clerk sign-out flow; show retryable recovery if sign-out fails; surface prolonged session/profile loading as unavailable.
- mobile/src/api/sessionToken.js: notify the bridge on null token or persistent 401 after the existing refresh retry. Account cancellation, current-token acquisition, and rejection of anonymous requests remain intact.
- mobile/app/(tabs)/cases.tsx: distinguish unavailable session, authorization denial, service failure, network failure, malformed payload and genuinely empty paths; do not silently accept a failed Today summary as a successful Roadmap load.
- mobile/src/components/AccountSettingsButton.tsx: preserve gear/menu/Sign Out and provide a default position before optional measurement; anonymous fallback directs to sign-in.
- backend/test/authNavigation.test.js, backend/test/sessionToken.test.js, backend/test/module0Frontend.test.js: navigation, binding/profile/recovery, token-refresh and error-state regressions.

The existing signin.tsx, tabs layout, API client, backend authentication middleware and clinical progression logic were inspected. No clinical progression, learner data, database schema, deployment configuration or credential was changed.

## Verification

Untouched baseline: production web export succeeded. Local browser reproduced /cases defect before changes. Baseline npm test: 412/413 passed; one image-integrity failure was caused by Windows autocrlf conversion of tracked SVG assets. Restoring the exact HEAD blob bytes resolved this environment artifact; there is no design-content diff.

Local browser after fix: direct /cases, /portfolio, /, and /module-0 resolve through Loading session to /signin; direct /signin renders the email/password flow. Mobile web /cases was checked at 390 x 844. No learner dashboard was observed while auth was unresolved or signed out.

Final focused tests: 166/166 passed. Final full regression: 418/418 passed. Logs are retained locally alongside this checkout. TypeScript comparison has 22 existing diagnostics and no additional diagnostics. Existing sign-in optional-object and legacy encounter style errors are outside this targeted fix.

Web, iOS and Android production bundle exports succeeded. Native exports and mocked native menu callbacks do not establish physical-device behavior.

The user securely completed legitimate-account sign-in. Authorized Today/Roadmap data loaded, including direct /cases and authenticated refresh. A local read-only status-recording proxy then confirmed GET /api/learning-paths 200 and GET /api/today 200; logs contain only endpoint and status. Simulated HTTP 503 and 403 produced distinct visible service/authorization errors without the empty-path message. The account menu and Sign Out action remained accessible during API failure. Persistent-401 recovery and explicit Sign Out results follow below. Real timed Clerk expiration has not been forced. Automated Chrome/private browsing is unavailable in the connected browser inventory; the browser checks above used the in-app browser. No Android/iOS device runtime is attached.

## Production requirements for a later approved release

1. Review use of the Clerk development instance. Any migration to production keys/application requires explicit approval and an account/identity continuity plan; do not replace keys as part of this local fix.
2. Verify the build-time EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY and backend CLERK_PUBLISHABLE_KEY/CLERK_SECRET_KEY belong to the same Clerk application. Verify backend CLERK_AUTHORIZED_PARTIES permits the intended production web origin. These values have not been changed or disclosed.
3. Ensure EXPO_PUBLIC_API_BASE_URL is the intended backend and that CORS permits the frontend origin and Authorization header. Expo public values are embedded at build time.
4. Retain static-host deep-link fallback to the exported index document. Production /cases and /signin currently return documents; explicitly protected routes may have no individual generated HTML document. Confirm fallback with the actual exported artifact before deployment.
5. Complete Chrome/private/physical-device and genuine elapsed-expiry checks before claiming full production validation. Legitimate-account sign-in, authorized loading, refresh, persistent-401 recovery, reauthentication and live Sign Out were exercised locally.

At the end of the initial local investigation, no commit, push, PR, merge, deployment, service restart or production configuration change had been performed. The later authorized draft-PR review is documented in [final-review.md](final-review.md).

## Recorded live local failure checks

With the legitimate test session, forced /api/learning-paths 401 twice at the local proxy. The browser made exactly two requests (initial plus refresh retry), then returned to /signin. No empty Roadmap was displayed. This simulates backend rejection of an invalid/expired token without revoking credentials, changing Clerk configuration, or modifying a learner record. Normal upstream routing was restored immediately afterward. Genuine elapsed-time Clerk expiration is still a separate unverified case.

Sanitized network record:

| Request | HTTP result | Source |
|---|---|---|
| GET production /cases document | 200 | Anonymous production reproduction |
| GET production /api/learning-paths | 401 | Anonymous production API |
| GET /api/learning-paths | 200 | Authenticated existing backend, local proxy |
| GET /api/today | 200 | Authenticated existing backend, local proxy |
| GET /api/learning-paths | 503 | Local simulation |
| GET /api/learning-paths | 403 | Local simulation |
| GET /api/learning-paths | 401, 401 | Local simulation; one refresh then sign-in |

Router behavior reference: [Expo protected routes](https://docs.expo.dev/router/advanced/protected/). The installed Expo Router 6 StackClient exposes Stack.Protected; no upgrade was required.

Local logs and the read-only failure-injection proxy are under `.local-auth-verification/`. Final exports are under `mobile/dist-verified/` (generated artifacts; no deployment). The public frontend-only baseline values are in ignored `mobile/.env.local`; this file contains no password or backend secret.
The status-only proxy preserves the existing destination and forwards Authorization in memory only, logs no request headers or response bodies, rejects non-GET API calls, and uses a local mode file to inject failures. It is verification tooling, not a product or deployment change.

Final verification summary: 166 focused tests passed; all 418 full regression tests passed; final web/iOS/Android exports passed; TypeScript produced the same 22 baseline diagnostics with no new diagnostics; targeted git diff whitespace check passed. The final local preview serves the verified export. The user completed the second secure sign-in after persistent-401 recovery; Today loaded again. The actual account menu exposed Sign Out, and clicking it returned to /signin. Mocked web/iOS/Android Sign Out and recovery retry tests also pass.

Reauthentication and explicit Sign Out: after restoring normal API responses, the user securely signed in again. Today loaded with HTTP 200. The actual shared gear opened the Sign Out menu, and clicking Sign Out returned to the complete /signin form. Direct /cases was then checked again while signed out.
