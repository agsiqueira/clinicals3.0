# Clinicals 3.0 image optimization

Baseline: `d67c989c732548e2fd39ee9e0bac9401a9618341` (merged PR #6).
Branch: `perf/optimize-all-images`. Visual and technical review approved.

## Results

| Measurement | Baseline | Optimized | Reduction |
|---|---:|---:|---:|
| Application image storage | 64,037,041 bytes | 46,769,305 bytes | 17,267,736 bytes (26.97%) |
| Production web image assets, including framework images | 60,755,956 bytes | 43,490,527 bytes | 17,265,429 bytes (28.42%) |
| Production web JavaScript | 3,058,125 bytes | 3,057,811 bytes | 314 bytes |
| Application image files | 74 | 72 | Two exact duplicates consolidated |

Storage measures source-tree assets, excluding Git history and local review artifacts. Exported assets are measured output files, not production transfer timings; lazy loading and caching affect actual downloads.

## Implementation and preservation

- Convert 27 referenced Module 0 PNGs to lossless WebP (`lossless=True`, `quality=100`, `method=6`, `exact=True`). Original dimensions, ICC profile and every decoded RGBA pixel are preserved, including transparent edges and hidden RGB.
- Recompress four PNGs in place (`optimize=True`, `compress_level=9`): Android foreground icon, active mentor portrait, and both patient idle portraits. Exact pixels/alpha and applicable color metadata are preserved.
- Consolidate two byte-identical patient talking stills into the existing idle images. State keys, session/case lookup maps, fallback behavior and MP4 speaking loops remain intact.
- Retain all SVGs, nine existing OLD CARTS WebPs, native PNG/JPG formats, unused candidates and approved artwork. No resizing, cropping, recoloring, regenerated imagery or lossy conversion was applied.
- Update production require paths, Figma provenance, teaching inventory resolution and automated integrity tests. No clinical content, grading, navigation, accessibility, authentication, API, storage, progress or migration behavior changed.

The [automated inventory fixture](../backend/test/fixtures/imageAssets.json) records all 74 original paths, final/canonical paths, before/after bytes, hashes, dimensions, transparency and per-file decisions. Seven unreferenced candidates remain; the unused legacy mentor portrait was retained rather than automatically deleted. Authentication JPGs remain 6250x5000; right-sizing requires separate visual approval.

## Compatibility and verification

Module 0 retains its existing Expo Image renderer, with WebP support on web/iOS/Android. Core React Native portrait/auth consumers and Expo icon/splash configuration retain PNG/JPG, avoiding renderer or native-dependency changes.

- Final complete regression run: **311 tests passed, zero failures/skips**, including frontend/navigation, image integrity, patient-state lookup, submission/recovery, voice, auth and backend services.
- Final production web export succeeded. Prior reviewed iOS and Android JavaScript/asset exports also succeeded; these are not physical-device builds or rendering tests.
- Final TypeScript comparison against `main`: **24 baseline diagnostics, 24 current, zero new**.
- Reviewed visual evidence: 170 captures / 85 matched views at 320x568, 390x844 and desktop. All paired image bounds, dimensions, accessibility text and instructional text matched; 81 whole-screen pairs were pixel-identical. Remaining capture differences were unchanged auth-image paint timing and an animated video frame. All optimized raster assets passed exact RGBA/alpha/profile comparison.
- Static require/config existence, encoded hashes, dimensions, canonical aliases, all patient states and mentor/video fallback checks passed. The teaching inventory utility resolves all 49 panels. Whitespace/syntax checks passed.

**Physical iOS/Android and broader browser-engine checks remain outstanding.** Large unchanged auth JPGs can paint progressively in the synthetic browser. No production performance or authenticated deployment claim is made.

Raw screenshots, image backups, temporary scripts/output, production exports and local validation servers are excluded from this release and preserved locally. No merge, deployment, service restart, migration or learner-data change is part of this PR.
