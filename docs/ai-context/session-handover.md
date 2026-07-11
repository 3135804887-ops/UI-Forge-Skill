# Session Handover

## Task status

- Completed: rewrote `SKILL.md` as a narrow platform-neutral entry, moved detailed guidance into progressive references, added Codex/Claude Code thin adapters and Codex metadata, reconciled public installation/CLI docs, and added static skill regressions; static, quick validation, and full tests pass, and a fresh-context evaluator matched all 13 frozen trigger labels.
- Completed: implemented and review-hardened zero-dependency legacy-record loading, malformed JSON/code-block recovery, normalized-URL deduplication, complete source-to-emitted report mappings, deterministic merge-base selection, project-alias-aware static analysis, URL-free asset identities, and all four reconstruction statuses; focused and full tests pass.
- Completed: added and review-hardened deterministic catalog filesystem output, shared-rule manifest generation, auditable reports, realpath-aware source/output containment, validation-gated atomic promotion, non-fatal post-promotion cleanup warnings, and an absolute-path build CLI; focused and full tests pass.
- In progress (next): rewrite the skill with progressive disclosure and add portable assistant adapters.
- Completed: added and review-hardened the zero-dependency `validate`, `search`, and `show` CLI with strict nonblank arguments, stable JSON/human output (including structured JSON usage errors), explicit related-category envelopes, shared exact-ID validation, and exit codes `0`/`1`/`2`; focused and full tests pass.
- Completed: implemented deterministic catalog search with Unicode-aware normalization, documented integer scoring, status/category filters, stable code-free summaries, and no-result related-category suggestions; focused and full tests pass.
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

- Keep `SKILL.md` below 650 words with only the trigger boundary, validate/search/show integration workflow, reconstruction preservation rule, direct reference routing, and common failure handling.
- Make `references/categories.md` the only hand-maintained category table; `CATEGORIES.md` is a compatibility pointer rather than a duplicate count source.
- Limit adapters to install location, invocation syntax, and assistant metadata while requiring both Codex and Claude Code to invoke `node scripts/ui-forge.mjs` and use the same discovery configuration.
- Preserve official assistant documentation links only in adapter documentation; keep runtime catalog metadata URL-free and retain functional URLs only inside component code.
- Expose `loadLegacyRecords({ sourcePath }) -> { records, report }` as the recovery/normalization boundary consumed by the future deterministic builder; it performs no output writes, manifest generation, or promotion.
- Expose `buildCatalog({ sourcePath, outputPath }) -> { manifest, report, buildReport, outputPath, warnings }`; component JSON is written in sorted ID order, validated in a sibling temporary directory, and only then promoted over an existing output through a sibling backup.
- Treat source/output overlap in either direction as unsafe in the builder; the CLI additionally requires both paths to be absolute and rejects output nested in source before scanning.
- Canonicalize an existing source with `realpath`; canonicalize a prospective output through its nearest existing ancestor so symlink/junction aliases cannot bypass bidirectional overlap checks.
- Once temporary output promotion succeeds, treat it as authoritative: backup cleanup failure returns a deterministic warning, leaves the complete new output active, and preserves any residual backup recovery material without retrying deletion.
- Keep component file digests over exact formatted bytes and compute the catalog content digest exclusively through the shared manifest newline/NUL contract; reports are deterministic auxiliary files and are not manifest components.
- Include every accepted source path in `report.emitted_sources`, including singleton records, while retaining duplicate-specific merge details separately and keeping all source paths out of runtime records.
- Treat `src/`, `components/`, `lib/`, `hooks/`, `utils/`, `styles/`, `assets/`, `app/`, and `pages/` subpaths as configured-looking local imports; other bare/scoped package subpaths remain install dependencies.
- Filter malformed legacy code-block entries before ranking and merging, attach deterministic `MALFORMED_CODE_BLOCK` diagnostics, preserve every valid neighboring block, and allow `invalid` runtime records to have an empty code-block array when no usable source remains.
- Normalize source URLs only while grouping and hashing, retain non-clickable provider/author/slug identity, and exclude source URLs, scrape timestamps, and source paths from runtime records.
- Represent external functional resources as sorted `sha256:` identities in metadata while preserving their full URLs only inside canonical code block text; diagnostics reference only the hash and block index.
- Select duplicate merge bases by descending usable block count, description length, then ordinal source path; merge complementary blocks in deterministic order and deduplicate normalized content by SHA-256.
- Assign confidence strictly from reconstruction status: complete `1`, recoverable `0.85`, incomplete `0.5`, invalid `0`; recovery or complementary duplicate code produces recoverable only after local imports resolve.
- Treat usage and catalog-validation failures as exit `1`, catalog discovery exhaustion as exit `2`, and successful validation/search/show (including zero search results) as exit `0`.
- Serialize search suggestions as the explicit `relatedCategories` envelope field because the augmented search-array property is deliberately non-enumerable; `show` returns the selected stored record unchanged under `component`.
- Keep successful output on stdout and all usage, discovery, validation, and lookup errors on stderr; JSON uses two-space indentation plus one trailing newline.
- Detect `--json` intent from raw arguments before parsing so malformed invocations still receive a stable `{ command, error, usage }` JSON envelope; reject blank values before discovery or command execution.
- Export `isValidComponentId` from the schema module as the single record, manifest, and CLI component-ID decision.
- Score exact normalized titles once (+100), title token/prefix matches per unique query token (+30 each), and category exact (+25), slug (+20), description (+10), and dependency/author/code-role group (+5) matches once each; all scoring is additive.
- Normalize search text with NFKC, locale-stable English case folding, and Unicode punctuation/whitespace collapsing; support prefix matching for all tokens and substring matching for CJK query tokens.
- Return search results as code-free summary arrays with a non-enumerable `relatedCategories` property on every return path; on a category-filtered miss it holds normalized-deduplicated suggestions, and the CLI must copy it explicitly into its envelope.
- Preserve the ordinal-smallest raw category as the display value for each normalized suggestion key, and clone dependency arrays in summaries so consumers cannot mutate loaded records.
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

- `SKILL.md` — narrow trigger and concise platform-neutral catalog-selection/integration workflow.
- `references/` — progressively disclosed configuration, format, category, and integration guidance.
- `adapters/` and `agents/openai.yaml` — thin Codex/Claude Code integration documentation and Codex display policy.
- `tests/skill-files.test.mjs` — static trigger, portability, adapter, metadata, and unsupported-claim regressions.
- `lib/catalog-builder.mjs` — legacy scanning, recovery, URL normalization, source identity extraction, code analysis, deduplication, reconstruction status, and Task 6 build-report data.
- `scripts/build-catalog.mjs` — deterministic catalog build CLI with stable human/JSON summaries and strict absolute path validation.
- `tests/catalog-builder.test.mjs` — source normalization, dependency/role analysis, no-execution safety, recovery/deduplication, report contract, URL-free metadata, and all-status coverage.
- `tests/fixtures/source/` — minimal anonymized parsed, duplicate, companion, and truncated legacy source fixtures.
- `scripts/ui-forge.mjs` — zero-dependency Node CLI for validation, search, exact-ID show, stable formatting, and exit-code handling.
- `tests/catalog-cli.test.mjs` — process-level CLI coverage for JSON/human output, flags, errors, discovery diagnostics, and complete code preservation.
- `lib/catalog-search.mjs` — Unicode query normalization, deterministic scoring/filtering/ordering, code-free summaries, and related-category suggestions.
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
