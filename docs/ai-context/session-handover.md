# Session Handover

## Task status

- Completed: hardened catalog integrity after review with the Task 7 manifest-digest contract, normalized safe component paths, explicit containment checks, and complete discovery diagnostics.
- Completed: implemented deterministic catalog loading with manifest/component digest checks, schema and record validation, duplicate-ID rejection, and structured validation results.
- Completed: implemented cross-platform catalog discovery precedence for CLI, environment, nearest project config, user config, and common install paths, including rejected-candidate diagnostics.
- In progress (next): build deterministic search and reconstruction behavior on top of the loaded catalog records.
- Completed: added the zero-dependency Node 18+ test harness, deterministic catalog fixture helpers, and runtime validators for schema version 1 records/manifests; review regressions now cover the full implemented validation surface and exact code URL exemption.
- Completed: established the pre-rewrite trigger baseline with 13 bilingual cases and 19 fresh-context classifications; all 7 negative cases currently over-trigger, including stable 3/3 failures for generic English/Chinese page creation and English debugging.
- In progress (next): rewrite the skill trigger description against the immutable baseline, then rerun the same prompt matrix as forward tests.
- Completed: cloned `3135804887-ops/UI-Forge-Skill` into the workspace and reviewed the repository, release metadata, and component archive structure.
- Completed: confirmed the first-round architecture, data flow, reconstruction policy, error handling, and testing strategy with the user.
- Completed: wrote `docs/superpowers/specs/2026-07-11-ui-forge-first-round-design.md`.
- Completed: user approved the written first-round specification.
- Superseded: the plan-review checkpoint moved into execution with the trigger baseline task; no `SKILL.md` behavior has been changed yet.
- Blocked: none.

## Recent decisions

- Define the manifest digest as SHA-256 over newline-joined `<normalized relative path>\0<file sha256>` rows sorted by normalized path; fixtures, loaders, and the future builder share this contract through `lib/catalog-integrity.mjs`.
- Reject drive-qualified, POSIX-absolute, backslash-absolute, and any `..` component paths before hashing or file I/O; resolve accepted paths and verify they remain below `<catalog>/components`.
- Treat catalog discovery as a lightweight manifest check; full component parsing, digest verification, and record validation occur only during catalog loading.
- Use platform-specific config/data roots plus `~/.ui-forge/catalog` as deterministic common install candidates; relative config values resolve from the owning config file.
- Treat `SCHEMA_VERSION`, `STATUS_RANK`, `validateRecord`, `validateManifest`, and `containsMetadataUrl` as stable runtime interfaces; fixture and validation ordering uses locale-independent string comparison, and only the direct `code_blocks[].code` value is exempt from metadata URI detection.
- Freeze `tests/skill-trigger-cases.json` as the prompt matrix reused after the trigger rewrite; do not tune cases to the current classifications.
- Treat the current repository as a prompt-driven component catalog adapter, not yet as a self-contained executable skill.
- Preserve the component archive outside Git; inspect release assets from a temporary directory instead of committing or extracting them into the repository.
- Use behavior tests before editing the skill instructions. Future skill changes should follow RED-GREEN-REFACTOR with baseline prompts and forward tests.
- Prioritize portability and deterministic discovery before expanding documentation or adding more examples.
- Use a platform-neutral core with Codex and Claude Code thin adapters in the first release.
- Use Node.js 18+ and built-in modules only for the CLI, catalog builder, and tests.
- Keep the catalog as a separately installed local data package.
- Preserve complete component code in JSON, remove only duplicate `_code_*.txt` copies, and expose reconstruction diagnostics through `show`.
- Remove metadata URLs from runtime records while retaining non-clickable source identity fields.
- Trigger only for explicit existing-component discovery/reuse or explicit UI Forge requests.

## Findings

- `SKILL.md` is structurally valid, 263 lines / about 1,526 words, but contains five hard-coded references to `F:\爬虫\21st_components_full\` and Claude-specific `Glob`/`Grep` pseudo-tool syntax.
- The trigger description is very broad and process-heavy. It can conflict with other frontend/design skills and may cause over-triggering.
- The release has one component archive (`ui-forge-components-v1.0.0.zip`, 26,936,805 bytes), but no standalone `.skill` asset even though README describes one.
- Archive inventory: 47 top-level categories, 4,360 JSON files, 25,885 text code files, 84,903,691 uncompressed bytes.
- Three malformed JSON files: `background/Liquid_Metal.json`, `background/Static_Radial_Gradient.json`, and `background/Swirl.json`.
- Of 4,357 parseable metadata files, only 3,455 URLs are unique; 902 records duplicate an existing source URL.
- Every parseable JSON embeds its complete code in `code_blocks`; all 25,882 corresponding `_code_*.txt` files are newline-normalized duplicates. The archive therefore stores the same source twice.
- Metadata has only `url`, `title`, `description`, `category`, `code_blocks`, and `scraped_at`; it has no dependency, framework, license, accessibility, test, or quality fields. Current "production-ready/tested/accessible" claims are not evidenced by the package.
- README line references are stale (`SKILL.md` path is at line 78, not around line 96), and `CONTRIBUTING.md` still contains `YOUR_USERNAME` links.
- The landing-page example is generic handcrafted React/Tailwind code and does not demonstrate catalog search, provenance, dependency detection, or integration from an actual archived component.

## Recommended optimization order

1. Define realistic trigger and non-trigger prompts; establish baseline failures before editing.
2. Replace the hard-coded library path with configuration/environment discovery and actionable failure messages.
3. Add a deterministic catalog CLI for validate/search/show, with JSON output and dependency/provenance fields.
4. Repair malformed records, deduplicate source URLs, and choose one canonical code representation.
5. Split catalog details and examples out of `SKILL.md`; keep the entry workflow concise and platform-neutral.
6. Add `agents/openai.yaml`, automated validation, fixture-based tests, and forward-test scenarios.
7. Reconcile README/release/install claims with actual packaged assets and supported assistants.

## Key files

- `lib/catalog-integrity.mjs` — shared component-path normalization, containment resolution, and manifest digest contract.
- `lib/catalog-loader.mjs` — strict deterministic loading plus non-throwing structured catalog validation.
- `lib/catalog-config.mjs` — cross-platform config paths and ordered local catalog discovery.
- `lib/catalog-schema.mjs` — schema constants, record/manifest validators, and metadata URL detection.
- `tests/helpers.mjs` — deterministic temporary catalog and child-process test helpers.
- `SKILL.md` — current skill trigger, catalog summary, and manual integration workflow.
- `README.md` — bilingual installation and marketing documentation.
- `CATEGORIES.md` — category counts; the quick-stat table sums to 4,360 across 47 categories.
- `examples/landing-page.md` — current end-to-end example.
- `CONTRIBUTING.md` — contribution guidance with placeholder repository links.
- `RELEASE_NOTES.md` — v1.0.0 release claims.

## Open questions

- Is the primary target Codex/Agent Skills, Claude Code, or a genuinely portable multi-assistant format?
- Should the catalog remain a separately downloaded asset, become a generated index, or be queried remotely?
- What licenses and attribution requirements apply to the scraped 21st.dev component sources?
- Which user workflows matter most: component lookup, full-page composition, repository integration, or catalog maintenance?
