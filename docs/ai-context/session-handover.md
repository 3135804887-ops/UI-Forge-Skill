# Session Handover

## Task status

- Completed: second whole-branch review approved the first-round optimization with no remaining Critical or Important findings. Fresh final verification passes 122/122 tests, skill validation, and the real 3,455-component catalog validation with zero errors or warnings.
- Completed: package path identity hardening rejects non-existing Windows ZIP/checksum names that differ only by case before temporary-file creation; Win32 and POSIX comparison semantics are explicit, focused tests pass 30/30, the full suite passes 122/122, and the formal ZIP hash remains unchanged.
- Completed: final-review Important 1 now passes at `1ebffa9`. After preserving a failed full round (`en-vue-migration`) and an interrupted calibration (`en-category-options`) as RED evidence, two minimal frontmatter/static-test fixes were made. A fully restarted set of 19 new `fork_turns:none` evaluators matched 19/19 verdicts and 13/13 baseline labels; all three broad negatives were stable 3/3 `no-trigger`.
- Historical RED checkpoint: the first final-review rerun scored 18/19 individual verdicts and 12/13 labels because `en-vue-migration` falsely triggered. It is preserved in the raw evidence but superseded as current status by the complete 19/19 rerun at `1ebffa9`.
- Completed: closed-world catalog packaging now derives its allowlist from the validated manifest plus the three fixed reports; rejects extra/missing/non-regular/linked entries and non-canonical paths; canonicalizes package paths physically; preserves CLI recovery state; and keeps the formal ZIP hash unchanged.
- Completed: whole-branch status-consistency hardening now rejects confidence mismatches, unresolved-import diagnostics on complete/recoverable records, missing unresolved-import evidence on incomplete records, and code on invalid records. The builder reuses the schema-owned derivation/mapping; focused tests pass 60/60, its full-suite checkpoint passes 98/98, and the real 3,455-component catalog validates with no errors or warnings.
- Completed: Task 10 added and review-hardened an automated legacy-to-build-to-validate/search/show-to-package scenario. Four distinct subprocess catalogs prove discovery precedence; exact code bytes/order/newline behavior, incomplete filtering, asset hashing, and generated/original isolation are asserted. Cross-platform `npm run check` and Windows/macOS/Linux CI cover Node 18/20/22; the full suite passes 93/93.
- Completed: two independent forward scenarios used the full cleaned catalog. The read-only selector chose `button/motion-button--64c491c2` only after explicitly including incomplete records and reported its missing implementation honestly; the reconstruction scenario preserved `button/animated-button--02ab4c4a` original code outside Git, labeled every generated file, and passed the offline structural verifier. It did not run a JSX compiler, React runtime, TypeScript compiler, or bundler.
- Completed: reconciled contributor and release notes with the platform-neutral core, real CLI/build/package flow, TDD fixture policy, URL-free runtime metadata, current legacy asset, and future cleaned release without claiming publication.
- Completed: replaced the stale handcrafted landing-page example with the real `button/motion-button--64c491c2` discovery/inventory flow and corrected forward evidence so offline structural checks are not described as JSX/React/TypeScript/bundler validation.
- Completed: final local verification passed `quick_validate`, `npm run check`, full catalog validation (schema 1, 3,455 components, no errors/warnings), `git diff --check`, hard-coded-path/URL scans, and tracked-large/generated-artifact checks.
- Completed: validated the entire v1.0 archive after adding real-data string-code-block compatibility; final accounting is 4,360 input = 3,455 emitted + 905 merged + 0 rejected, with 99 complete and 3,356 incomplete records, all 25,885 usable code blocks represented, and no runtime metadata URLs or duplicate text storage.
- Completed: repeated the full build into an independent directory with identical manifest digest, relative paths, per-file SHA-256 values, and report bytes; added a cross-platform deterministic ZIP packager whose independent outputs are byte-identical and whose extracted catalog validates successfully.
- Completed: review-hardened ZIP/checksum publication as one recoverable transaction with unique sibling backups, paired rollback, incomplete-rollback recovery state, non-fatal post-success cleanup warnings, CLI warning output, and direct ZIP-format contract tests; the formal ZIP hash remains unchanged.
- Completed: rewrote `SKILL.md` as a narrow platform-neutral entry, moved detailed guidance into progressive references, added Codex/Claude Code thin adapters and Codex metadata, reconciled public installation/CLI docs, and added static skill regressions; static, quick validation, and full tests pass, and a fresh-context evaluator matched all 18 original-plus-adversarial trigger labels.
- Completed: implemented and review-hardened zero-dependency legacy-record loading, malformed JSON/code-block recovery, normalized-URL deduplication, complete source-to-emitted report mappings, deterministic merge-base selection, project-alias-aware static analysis, URL-free asset identities, and all four reconstruction statuses; focused and full tests pass.
- Completed: added and review-hardened deterministic catalog filesystem output, shared-rule manifest generation, auditable reports, realpath-aware source/output containment, validation-gated atomic promotion, non-fatal post-promotion cleanup warnings, and an absolute-path build CLI; focused and full tests pass.
- Completed: added and review-hardened the zero-dependency `validate`, `search`, and `show` CLI with strict nonblank arguments, stable JSON/human output (including structured JSON usage errors), explicit related-category envelopes, shared exact-ID validation, and exit codes `0`/`1`/`2`; focused and full tests pass.
- Completed: implemented deterministic catalog search with Unicode-aware normalization, documented integer scoring, status/category filters, stable code-free summaries, and no-result related-category suggestions; focused and full tests pass.
- Completed: hardened catalog integrity after review with the Task 7 manifest-digest contract, normalized safe component paths, explicit containment checks, and complete discovery diagnostics.
- Completed: implemented deterministic catalog loading with manifest/component digest checks, schema and record validation, duplicate-ID rejection, and structured validation results.
- Completed: implemented cross-platform catalog discovery precedence for CLI, environment, nearest project config, user config, and common install paths, including rejected-candidate diagnostics.
- Completed: added the zero-dependency Node 18+ test harness, deterministic catalog fixture helpers, and runtime validators for schema version 1 records/manifests; review regressions now cover the full implemented validation surface and exact code URL exemption.
- Completed: established the pre-rewrite trigger baseline with 13 bilingual cases and 19 fresh-context classifications; at that historical baseline all 7 negative cases over-triggered, including stable 3/3 failures for generic English/Chinese page creation and English debugging.
- Next: run the whole-branch review, address any findings, then choose merge/PR integration without publishing a catalog release.
- Completed: cloned `3135804887-ops/UI-Forge-Skill` into the workspace and reviewed the repository, release metadata, and component archive structure.
- Completed: confirmed the first-round architecture, data flow, reconstruction policy, error handling, and testing strategy with the user.
- Completed: wrote `docs/superpowers/specs/2026-07-11-ui-forge-first-round-design.md`.
- Completed: user approved the written first-round specification.
- Superseded historical checkpoint: the plan-review checkpoint moved into execution with the trigger baseline task; the statement that no `SKILL.md` behavior had changed was true only before Task 8.
- Blocked: none.

## Recent decisions

- Compare canonical/prospective package paths with host filename-case semantics: fold case on Windows, preserve case on POSIX, and rely on prior `realpath` resolution for detectable existing aliases. Return `PACKAGE_PATH_COLLISION` for ZIP/checksum or source/output identity collisions.
- Treat the initial 19-run mismatch and the three-run interrupted calibration as preserved RED evidence, not current results. The current strict result is the complete restarted 19/19 run at `1ebffa9`; known UI Forge categories may trigger without an explicit React token, but arbitrary framework-unspecified options still do not.
- Keep the prior review-expanded 18/18 distinct-prompt evaluation as historical coverage, but do not conflate it with the final strict baseline reproduction. Preserve the fresh `en-vue-migration` false positive unchanged as the RED finding resolved by `b0a9900`, not as an open current mismatch.
- Treat the package as a closed world: require `manifest.json` and every exact `components/<manifest path>` entry; allow only optional `reports/build-report.json`, `reports/duplicate-groups.json`, and `reports/rejected-records.json`; reject everything else.
- Require canonical forward-slash manifest paths with no backslash, empty, `.`, or `..` segment, and require each final component realpath to remain under a canonical real `components/` directory without symlink/junction segments.
- Canonicalize package source and prospective ZIP/checksum paths through realpath or the nearest existing physical ancestor before containment and distinctness checks.
- Use normalized ordinal title comparison for deterministic search ties and preserve package promotion `state`/`recovery_paths` in JSON error envelopes.
- Treat status as a schema invariant coupled to confidence, code presence, and `UNRESOLVED_LOCAL_IMPORT`: complete=`1`/code/forbid unresolved, recoverable=`0.85`/code/forbid unresolved, incomplete=`0.5`/code/require unresolved, invalid=`0`/no code/forbid unresolved. Keep the mapping and derivation in `catalog-schema`; builders and validators must reuse it rather than copy it.
- Use `npm run check` as the platform-neutral repository validation entry and run it in CI on Windows, macOS, and Linux starting at Node 18; keep it shell-neutral as `node --test`.
- Treat empty default search for animated buttons as truthful status filtering, not a search failure. Assistants may retry with `--include-incomplete`, but must preserve diagnostics and label missing implementation code as generated reconstruction.
- Keep realistic reconstruction fixtures outside Git. Preserve catalog blocks unchanged in an original inventory and place inferred files plus assumptions in a visibly separate generated directory.
- Treat script names such as `build` and `typecheck` as labels, not evidence: the external fixture ran only a zero-dependency offline structural verifier, so project compilation/runtime claims still require real target-project tools.
- Accept both legacy string code blocks and `{ code }` objects; v1.0 normal records use strings, while recovery and fixtures use structured blocks. Preserve code text while normalizing line endings deterministically.
- Treat `89ea5545695e22b57b57b75ddd403aabad9245119d0ebab0a3dce0d80da89f25` as the only valid full-catalog digest. The earlier `626ba7d...` exploratory output discarded v1.0 string blocks and is invalidated.
- Package catalogs with the Node deterministic ZIP writer, ordinal paths, fixed timestamps/permissions, and no wrapper directory; do not use platform archive utilities for release-byte reproducibility.
- Promote ZIP/checksum as a pair only after both sibling temporary artifacts validate. Restore both previous files on promotion failure; preserve remaining recovery material when rollback is incomplete; never roll back a successfully promoted pair because backup cleanup failed.
- Keep `SKILL.md` below 650 words with only the trigger boundary, validate/search/show integration workflow, reconstruction preservation rule, direct reference routing, and common failure handling.
- Require frontmatter—not only body instructions—to exclude Vue, SwiftUI, native HTML, and other non-React category-option requests; explicit UI Forge requests remain an unconditional activation path.
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
- Treat `SCHEMA_VERSION`, `STATUS_RANK`, `STATUS_CONTRACT`, `deriveReconstructionStatus`, `validateRecord`, `validateManifest`, and `containsMetadataUrl` as stable runtime interfaces; fixture and validation ordering uses locale-independent string comparison, and only the direct `code_blocks[].code` value is exempt from metadata URI detection.
- Preserve the original 13 trigger cases as the baseline; add new adversarial classes without tuning the original prompts to observed classifications.
- Historical initial-audit view: before Tasks 2–8, the repository was a prompt-driven catalog adapter rather than a self-contained executable skill.
- Preserve the component archive outside Git; inspect release assets from a temporary directory instead of committing or extracting them into the repository.
- Use behavior tests before editing the skill instructions. Future skill changes should follow RED-GREEN-REFACTOR with baseline prompts and forward tests.
- Prioritize portability and deterministic discovery before expanding documentation or adding more examples.
- Use a platform-neutral core with Codex and Claude Code thin adapters in the first release.
- Use Node.js 18+ and built-in modules only for the CLI, catalog builder, and tests.
- Keep the catalog as a separately installed local data package.
- Preserve complete component code in JSON, remove only duplicate `_code_*.txt` copies, and expose reconstruction diagnostics through `show`.
- Remove metadata URLs from runtime records while retaining non-clickable source identity fields.
- Trigger only for explicit existing-component discovery/reuse or explicit UI Forge requests.

## Initial Audit Findings (Historical Baseline)

- At the initial audit, `SKILL.md` was 263 lines / about 1,526 words and contained five hard-coded references to `F:\爬虫\21st_components_full\` plus Claude-specific `Glob`/`Grep` pseudo-tool syntax; Task 8 removed these.
- At the initial audit, the trigger description was broad and process-heavy; Task 8 replaced it and the expanded 18-case evaluation now passes.
- At the initial audit, the Release had one legacy component archive (`ui-forge-components-v1.0.0.zip`, 26,936,805 bytes) and no standalone `.skill` asset; current documentation now describes the legacy-to-cleaned build flow accurately.
- Archive inventory: 47 top-level categories, 4,360 JSON files, 25,885 text code files, 84,903,691 uncompressed bytes.
- Three malformed JSON files: `background/Liquid_Metal.json`, `background/Static_Radial_Gradient.json`, and `background/Swirl.json`.
- Of 4,357 parseable metadata files, only 3,455 URLs are unique; 902 records duplicate an existing source URL.
- Every parseable JSON embeds its complete code in `code_blocks`; all 25,882 corresponding `_code_*.txt` files are newline-normalized duplicates. The archive therefore stores the same source twice.
- Legacy metadata has only `url`, `title`, `description`, `category`, `code_blocks`, and `scraped_at`; it has no dependency, framework, license, accessibility, test, or quality fields. The initial unsupported quality claims were removed in Task 8.
- At the initial audit, README line references were stale and `CONTRIBUTING.md` contained `YOUR_USERNAME` links; Task 8 corrected README, while contributor cleanup remains in Task 10.
- The landing-page example is generic handcrafted React/Tailwind code and does not demonstrate catalog search, provenance, dependency detection, or integration from an actual archived component.

## Initial Recommended Optimization Order (Tasks 1–8 Completed)

1. Define realistic trigger and non-trigger prompts; establish baseline failures before editing.
2. Replace the hard-coded library path with configuration/environment discovery and actionable failure messages.
3. Add a deterministic catalog CLI for validate/search/show, with JSON output and dependency/provenance fields.
4. Repair malformed records, deduplicate source URLs, and choose one canonical code representation.
5. Split catalog details and examples out of `SKILL.md`; keep the entry workflow concise and platform-neutral.
6. Add `agents/openai.yaml`, automated validation, fixture-based tests, and forward-test scenarios.
7. Reconcile README/release/install claims with actual packaged assets and supported assistants.

## Key files

- `.github/workflows/validate.yml` and `package.json` — cross-platform Node 18+ automated validation entry.
- `tests/real-world-scenarios.test.mjs` — lightweight end-to-end legacy build, discovery, CLI reconstruction, URL policy, and deterministic package regression.
- `docs/ai-context/evals/forward-tests.md` — independent full-catalog selection and incomplete reconstruction evidence.
- `examples/landing-page.md` — concise reproducible Motion Button lookup and honest generated-reconstruction boundary.
- `CONTRIBUTING.md` and `RELEASE_NOTES.md` — current contribution, runtime-data, and not-yet-published release contract.
- `lib/deterministic-zip.mjs` and `scripts/package-catalog.mjs` — zero-dependency cross-platform deterministic ZIP output and checksum CLI.
- `tests/catalog-package.test.mjs` — archive-byte determinism regression independent of source mtimes.
- `docs/ai-context/evals/full-catalog-build.md` — complete real-data accounting, integrity, CLI, repeat-build, and package evidence.
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
- `README.md` — current legacy-to-cleaned installation, configuration, and CLI documentation.
- `CATEGORIES.md` — compatibility pointer to the canonical `references/categories.md` table.

## Open questions

- What licenses and attribution requirements apply to the scraped 21st.dev component sources?
- When should the verified cleaned catalog and checksum be published as a release asset?
- Should a future catalog iteration improve complete implementation coverage for common button queries before expanding to more platforms?
