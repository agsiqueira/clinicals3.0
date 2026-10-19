# Separate follow-up: Clerk production instance

Status: documentation only. No instance, key, account, environment variable or production service was changed during final review.

The production console observed during reproduction explicitly identified development keys and an accounts.dev Clerk instance. This configuration was sufficient for the legitimate local test account to obtain tokens accepted by the existing backend, but warrants a separate production-readiness review. The routing bug is independently reproducible while signed out and does not require changing Clerk instances to fix.

A future approved transition needs:

1. An owned production domain, appropriate Clerk production instance setup, DNS/certificates and settings review. Reconfigure sign-in paths and any integrations that do not copy automatically.
2. An identity/account continuity plan before activation. Development and production are separate user pools; preserve the application's existing Clerk-user-to-learner associations through an explicitly reviewed migration/re-enrollment plan. Do not treat the transition as a key rotation or rewrite learner IDs in this PR.
3. Coordinated frontend production publishable key and backend matching publishable/secret keys, with secrets kept server-side. Expo public values are embedded at build time and require a new frontend build. Do not publish actual key values in documentation or the PR.
4. Production authorized-party origins, CORS/Authorization support, redirect URLs, OAuth credentials/webhooks if used, and native application/associated-domain configuration for the actual platforms in use.
5. Staged verification of email/password sign-in, refresh, session expiry, sign-out, deep links, account isolation and existing learner access in desktop/private/mobile browsers and signed native builds; define rollback before cutover.

These are future approval-gated changes. The draft authentication-routing PR does not implement them.

Official references: [Clerk production deployment](https://clerk.com/docs/guides/development/deployment/production) and [Clerk environments](https://clerk.com/docs/guides/development/managing-environments). Clerk documents separate environments/user pools, production domain requirements, production key replacement and platform-specific deployment checks.
