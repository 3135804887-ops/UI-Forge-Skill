# Catalog Format and Maintenance

The local data package contains `manifest.json`, one JSON record per component below `components/`, and deterministic reports below `reports/`. Component source code is stored only in `code_blocks[].code`; generated `_code_*.txt` duplicates are not part of the runtime format.

## Runtime record

Schema version 1 records include `id`, title, description, category, non-clickable source identity, `source_id`, reconstruction status/confidence, dependency and import analysis, external-asset hashes, complete code blocks, and diagnostics. IDs and manifest file paths are unique. Arrays are normalized where their order is not meaningful; code-block order remains source order.

Statuses are:

- `complete`: usable implementation with no unresolved local imports.
- `recoverable`: source records or companion blocks supplied a deterministic repair.
- `incomplete`: useful code exists but project-side completion is required.
- `invalid`: no reliable usable code was recovered.

Confidence measures source completeness, not quality. The catalog does not assert testing, accessibility, licensing, or deployment suitability without evidence.

## Source and URL policy

Runtime metadata contains no clickable source URLs. Provenance remains available through `provider`, `author`, `slug`, and SHA-256 `source_id`. Functional URLs required by component code remain inside the canonical code text; `external_assets` exposes only deterministic hashes. Documentation URLs belong in adapter or maintenance documentation, never runtime records.

## Validation and build

```bash
node scripts/ui-forge.mjs validate --catalog "/absolute/catalog/path" --json
node scripts/build-catalog.mjs --source "/absolute/legacy/source" --output "/absolute/clean/catalog" --json
node scripts/package-catalog.mjs --source "/absolute/clean/catalog" --output "/absolute/ui-forge-components.zip" --checksum "/absolute/ui-forge-components.zip.sha256" --json
```

The builder reads the legacy source without modifying it, validates a sibling temporary output, and atomically promotes a complete catalog. Source and output must be distinct absolute paths with no containment in either direction. Reports account for parsed, recovered, merged, emitted, and rejected records; duplicate groups, source-to-output mappings, unresolved imports, and external assets remain deterministic and auditable. Build reports are not included in the manifest content digest.

The packager first validates the cleaned catalog, then writes a zero-dependency deterministic ZIP with ordinal entry ordering and fixed timestamps and permissions. The archive root directly contains `manifest.json`, `components/`, and `reports/`; it does not add a wrapper directory. Identical catalogs therefore produce byte-identical ZIPs and checksum files across supported platforms.
