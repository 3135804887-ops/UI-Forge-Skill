# AI Context Changelog

## 2026-07-11

+ Added the zero-dependency `validate`, `search`, and `show` catalog CLI with stable JSON and human-readable output.
+ Added process-level CLI regression coverage for exact-ID lookup, complete code preservation, search flags, empty results, invalid usage/catalogs, discovery diagnostics, and exit codes `0`/`1`/`2`.
~ Copied the search result array's non-enumerable `relatedCategories` property into the stable CLI response envelope.
# Successful commands write only to stdout; usage, discovery, validation, and lookup failures write only to stderr for reliable automation.
+ Added platform-neutral deterministic catalog search with Unicode normalization, weighted field scoring, status/category filtering, stable summaries, and related-category suggestions.
~ Formalized `relatedCategories` on every result array, deduplicated suggestions by normalized category, and isolated summary dependency arrays from source records.
# Search reads titles, descriptions, categories, source identity, dependencies, and code-block roles, but never indexes or returns code bodies.
+ Added shared catalog integrity helpers for normalized component paths, containment-safe resolution, and the Task 7 newline/NUL manifest digest contract.
~ Hardened catalog loading against traversal and absolute Windows/POSIX manifest paths, and made missing user config visible in discovery diagnostics.
# Shared digest generation prevents fixture, loader, and future builder implementations from drifting apart.
+ Added deterministic catalog loading with manifest and component SHA-256 verification, record validation, duplicate-ID detection, and structured validation results.
+ Added catalog discovery precedence across CLI, environment, nearest project config, platform-specific user config, and common install locations.
# Discovery checks only readable supported manifests; full catalog integrity validation remains the loader's responsibility.
+ Added committed regression coverage for source identity, statuses, confidence bounds, arrays, code blocks, diagnostics, manifests, and all test helpers.
~ Expanded metadata URI detection beyond HTTP(S) schemes and narrowed the functional-URL exemption to direct `code_blocks[].code` strings.
# Nested metadata, including `code_blocks[].extra.code`, must not inherit the canonical code exemption.
+ Added the Node 18+ zero-dependency test harness, deterministic fixture-catalog helpers, and schema version 1 runtime validation.
~ Established stable public schema exports: `SCHEMA_VERSION`, `STATUS_RANK`, `validateRecord`, `validateManifest`, and `containsMetadataUrl`.
# Runtime metadata rejects URLs outside canonical code block source; deterministic ordering avoids locale-dependent comparisons.
+ Added an immutable 13-case bilingual UI Forge trigger matrix and recorded 19 fresh-context baseline classifications.
# Baseline RED evidence: all seven negative cases over-triggered under the current broad frontend wording; `SKILL.md` remains unchanged.
+ Added a task-by-task TDD implementation plan for the approved first-round optimization.
+ Added the approved first-round optimization design covering platform-neutral architecture, local catalog discovery, deterministic CLI behavior, data repair/deduplication, component reconstruction, progressive disclosure, adapters, and tests.
+ Added `docs/ai-context/session-handover.md` with the initial repository and release-asset audit, current state, decisions, and prioritized next steps.
+ Added `.codegraph/` to `.gitignore` so the local code knowledge index does not appear as repository content.
# Analysis-only checkpoint: no skill behavior, public API, schema, or component asset was changed.
