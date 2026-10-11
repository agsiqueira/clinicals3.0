# Module 0 Practice 2.0 — release verification

Branch: feature/module-0-practice-2. Production target: main.

## Scope

Release includes only:

- mobile/src/components/module0/ApprovedScreens.tsx
- mobile/src/components/module0/PracticeTask.tsx
- mobile/src/components/ClinicalsChatComposer.tsx
- backend/test/module0Frontend.test.js
- This verification report.

Shared task/reference presentation and a persistent multiline composer cover all nine required and optional tasks. Preserve original choice submission, backend request identity, evaluation, saved progress, narration, and voice callbacks. The approved refinements fit mentor/audio controls at 320px while retaining 44px targets and remove the redundant draft-clearing Answer exercise action from active Practice.

No production backend, curriculum, navigation controller, authentication, database, migration, dependency or environment changes. Older untracked artifacts, local preview tooling, generated bundles, screenshots and environment files are excluded. Candidate source/test files were reviewed and scanned for private-key, Clerk secret-key, GitHub token, AWS access-key and database-connection patterns; none were found. Environment files remain ignored.

## Fresh validation

- Module 0 frontend, submission, recording, access, service and evaluation suites: 132 passed, 0 failed.
- Production build: expo export --platform web completed successfully, including /module-0 and current Practice 2 UI strings/assets.
- TypeScript: 24 existing baseline diagnostics and 24 current diagnostics, with 0 newly introduced diagnostics. Whole-project TypeScript is not clean; the existing errors remain outside this change.
- git diff --check passed.
- Prior reviewed responsive validation: required/optional screens at 320x568, 390x844 and desktop; draft retention, mentor return, references and composer expansion. Native device keyboard/microphone verification remains outstanding. Some local preview operations were simulated and do not prove deployed API behavior.

## Established deployment workflow

Verified in the existing Render dashboard:

- Project: clinicals3, environment: Production.
- Service: clinicals3-web, static site; production URL: https://clinicals3-web.onrender.com.
- Repository: agsiqueira/clinicals3.0; configured branch: main.
- Root directory: mobile.
- Build: npm install && npx expo export --platform web.
- Publish directory: dist.
- Auto-Deploy: Off. Pull Request Previews: Off.
- Existing live frontend commit: 480f8ef0e113e5893b7304020d67980b5667984a.

The fetched origin/main matches the existing live commit. The feature branch starts from f93214350d307b03a8e666702c2758ea278d134a; the intervening main merge has the same source tree, so no remote code is overwritten.

Under the requested release rules, open a PR into main and wait for approval rather than merging or bypassing main with a manual feature-commit production deploy. Preview deployment is unavailable in the currently established configuration; do not enable previews or create/change services as a workaround. After approval and merge, manually deploy the merge commit to the existing clinicals3-web service and verify it. Backend redeployment and database changes are unnecessary for this UI-only change.

Deployment has NOT been performed or verified. Production currently serves the previous release. No claim of successful Practice 2 deployment is made.
