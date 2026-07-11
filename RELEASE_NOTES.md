# UI Forge release notes

## 1.1.0 — prepared, not published

This branch prepares a platform-neutral UI Forge skill and a separately installed cleaned catalog format. It does not publish a GitHub Release or commit the generated catalog.

### Skill and runtime

- Narrowed activation to explicit ready-made React component discovery/reuse or explicit UI Forge requests, with bilingual trigger and non-trigger regression evidence.
- Added a Node 18+ zero-runtime-dependency CLI with deterministic `validate`, `search`, and exact-ID `show` commands.
- Added cross-platform catalog discovery with CLI, environment, nearest project config, user config, and common install precedence.
- Added thin Codex and Claude Code adapters that share the same skill, CLI, catalog schema, and reconstruction rules.
- Moved detailed configuration, schema, categories, and integration guidance into progressive references.

### Cleaned catalog tooling

- Added a deterministic legacy-to-runtime builder that repairs recoverable malformed input, merges duplicate sources, extracts dependencies and local imports, and records completeness diagnostics.
- Runtime schema version 1 stores each component once, keeps all original code in `code_blocks[].code`, removes duplicate `_code_*.txt` representations, and rejects metadata URLs.
- Functional URLs remain unchanged only when they are part of component code; metadata stores hash identities instead.
- Added validation-gated atomic catalog promotion and a deterministic ZIP/checksum packager with recoverable pair promotion.

The verified local migration accounted for all 4,360 legacy JSON inputs as 3,455 emitted records plus 905 merged records and zero rejections. The cleaned catalog contains 99 complete and 3,356 incomplete records. Independent builds and packages were byte-identical. These figures describe local verification evidence, not a published asset.

### Installing the data package

The currently available v1.0 archive is legacy builder input, not a runtime catalog. Extract it outside this repository, then run:

```bash
node scripts/build-catalog.mjs --source "/absolute/legacy/source" --output "/absolute/clean/catalog" --json
node scripts/ui-forge.mjs validate --catalog "/absolute/clean/catalog" --json
```

A future cleaned release asset may be extracted and validated directly. Before publishing it, maintainers must repeat the full accounting, deterministic build/package comparison, checksum verification, and realistic `validate → search → show` scenarios documented under `docs/ai-context/evals/`.

## 1.0.0 — historical legacy archive

The initial release supplied the original skill documentation and a separate legacy component archive organized into 47 categories. Its catalog shape includes duplicated companion text files and does not satisfy the 1.1 runtime schema. Claims about accessibility, licensing, browser support, testing, or production readiness are not implied by the legacy metadata and must be evaluated per selected component and target project.
