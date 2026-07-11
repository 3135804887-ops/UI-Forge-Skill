# Final Package Security Fix Report

## Scope

This change fixes the final packager, deterministic ZIP, catalog-integrity, loader, package-CLI, and deterministic-search review findings. Schema and trigger behavior are unchanged.

## TDD evidence

- Initial security RED: 17 tests, 4 passed and 13 failed. Missing behaviors were strict path rejection, closed-world extra/missing entry rejection, symlink/junction rejection, and physical output containment.
- Package CLI RED: the injected incomplete rollback JSON omitted `state` and `recovery_paths`.
- Search ordering RED: ICU collation ordered `Éclair` before `Zulu` instead of normalized ordinal order.
- First full-suite run: 116/118; it exposed one obsolete backslash-normalization expectation and the incomplete fixed-report allowlist. Both contracts were corrected.

## Implemented contracts

- ZIP allowlist comes from a successfully loaded manifest and contains `manifest.json`, exact `components/<manifest path>` files, and only the three optional fixed builder reports.
- Extra, missing, symlink/junction, and non-regular entries fail before archive creation.
- Backslash, absolute, empty, `.`, and `..` manifest path forms are invalid.
- Loader walks physical path segments, rejects links/non-files, and requires final realpaths under the canonical components root with structured error codes.
- Package source/output/checksum checks use realpaths or nearest-existing-ancestor canonicalization.
- ZIP/checksum promotion, rollback, recovery-material, and warning behavior is preserved; JSON failures now expose transaction state and recovery paths.
- Search title ties use normalized ordinal comparison without ICU locale dependence.

## Verification

- Focused security and regression set: 58/58 passed.
- Full suite: 120/120 passed with `npm run check`.
- Real catalog validation: schema 1, 3,455 components, no errors or warnings.
- Formal package: 3,459 entries, 44,221,247 bytes, SHA-256 `da9110312036932c6e861cc1741710775280a76093a54a16894c15f238efaa91`.
- The formal ZIP is byte-identical to the pre-hardening artifact because the closed-world allowlist exactly matches the established manifest/components/reports set.
