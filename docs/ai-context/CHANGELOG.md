# AI Context Changelog

## 2026-07-11

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
