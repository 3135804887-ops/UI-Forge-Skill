# UI Forge First-Round Optimization Design

## Objective

Turn UI Forge from a machine-specific prompt into a platform-neutral, testable skill that can discover a separately installed local component catalog, search it deterministically, return the complete available component code, and preserve enough diagnostics for an AI assistant to reconstruct incomplete components honestly.

The first release of this design supports Codex and Claude Code through thin adapters. The core skill, CLI, catalog schema, builder, and tests remain independent of any assistant platform.

## Scope

This optimization includes:

1. Narrowing the skill trigger and establishing trigger/non-trigger baselines.
2. Replacing hard-coded paths with cross-platform catalog discovery.
3. Adding deterministic `validate`, `search`, and `show` CLI commands.
4. Repairing recoverable source records, deduplicating records, and removing duplicate code storage.
5. Reducing `SKILL.md` and moving detail into progressively disclosed references.
6. Adding `agents/openai.yaml`, automated validation, and realistic usage tests.
7. Adding a reproducible catalog build process that produces a local release artifact without committing the large catalog to Git.

Publishing a GitHub Release, implementing Cursor/Windsurf adapters, and remotely hosting the catalog are outside this first round.

## Confirmed Constraints

- The core is platform-neutral.
- Codex and Claude Code receive thin adapters; future platforms follow the same adapter contract.
- The component catalog is a separately installed local data package.
- Runtime tooling uses Node.js 18 or newer and only Node built-in modules.
- Runtime catalog records contain no metadata `http://` or `https://` links.
- Source identity remains available as non-clickable `provider`, `author`, `slug`, and `source_id` fields.
- Component code is preserved in full whenever it exists. Only redundant `_code_*.txt` copies are removed.
- Skill activation is limited to explicit requests to find/select/reuse ready-made React UI components or explicit requests to use UI Forge. Ordinary frontend implementation does not trigger the skill.
- The build process never modifies the source catalog in place.
- Generated IDs, ordering, reports, and output must be deterministic for identical inputs.

## Architecture

```text
UI-Forge-Skill/
├── SKILL.md
├── package.json
├── scripts/
│   ├── ui-forge.mjs
│   └── build-catalog.mjs
├── lib/
│   ├── catalog-config.mjs
│   ├── catalog-loader.mjs
│   ├── catalog-schema.mjs
│   ├── catalog-search.mjs
│   └── catalog-builder.mjs
├── adapters/
│   ├── README.md
│   ├── codex.md
│   └── claude-code.md
├── references/
│   ├── categories.md
│   ├── catalog-format.md
│   ├── configuration.md
│   └── integration-workflow.md
├── agents/
│   └── openai.yaml
└── tests/
    ├── fixtures/
    ├── catalog-config.test.mjs
    ├── catalog-cli.test.mjs
    ├── catalog-builder.test.mjs
    └── skill-trigger-cases.json
```

### File responsibilities

- `SKILL.md`: Trigger boundary, core selection/integration workflow, CLI entry points, and conditions for loading each reference. Target approximately 500 words.
- `scripts/ui-forge.mjs`: Stable user-facing entry point for `validate`, `search`, and `show`.
- `scripts/build-catalog.mjs`: Development/release entry point for converting a source catalog into the normalized runtime package.
- `lib/catalog-config.mjs`: Catalog-path discovery and configuration diagnostics.
- `lib/catalog-schema.mjs`: Runtime schema version, validation, normalization, and status definitions.
- `lib/catalog-loader.mjs`: Deterministic manifest and record loading.
- `lib/catalog-search.mjs`: Query tokenization, filtering, scoring, and stable ordering.
- `lib/catalog-builder.mjs`: Repair, merge, deduplication, source extraction, code analysis, reporting, and atomic output.
- `adapters/`: Installation and invocation details only. Adapters do not duplicate trigger rules, schema rules, search rules, or reconstruction policy.
- `references/`: Detailed category, configuration, schema, and integration guidance loaded only when relevant.
- `agents/openai.yaml`: Codex-facing display metadata. It does not alter core behavior.
- `tests/fixtures/`: Minimal synthetic and anonymized records. The full catalog is not committed.

## Catalog Discovery

Resolve the catalog directory using the first valid candidate in this order:

1. `--catalog <path>` command-line option.
2. `UI_FORGE_CATALOG` environment variable.
3. `.ui-forge.json` found from the current directory upward to the filesystem root.
4. User configuration file:
   - Windows: `%APPDATA%/ui-forge/config.json`
   - macOS: `~/Library/Application Support/ui-forge/config.json`
   - Linux: `${XDG_CONFIG_HOME:-~/.config}/ui-forge/config.json`
5. Common install directories documented in `references/configuration.md`.

A candidate is valid only when it is a readable directory containing a supported `manifest.json`. Discovery returns both the selected path and its source. When no candidate is valid, the CLI lists checked candidates and prints exact configuration examples for the current platform.

## Runtime Catalog Schema

Each component is stored once as a JSON file. The normative shape is:

```json
{
  "schema_version": 1,
  "id": "button/shimmer-button--a1b2c3d4",
  "title": "Shimmer Button",
  "description": "Animated shimmer button.",
  "category": "button",
  "source": {
    "provider": "21st.dev",
    "author": "Shatlyk1011",
    "slug": "shimmer-button"
  },
  "source_id": "sha256:<digest>",
  "status": "complete",
  "confidence": 0.92,
  "dependencies": ["lucide-react"],
  "local_imports": ["@/components/ui/button"],
  "external_assets": [],
  "code_blocks": [
    {
      "index": 0,
      "language": "tsx",
      "role": "usage",
      "suggested_path": "examples/shimmer-button-demo.tsx",
      "code": "..."
    }
  ],
  "diagnostics": []
}
```

Rules:

- No metadata field contains a URL.
- `source_id` is the SHA-256 digest of the normalized source URL used during the build, prefixed by `sha256:`.
- `id` combines normalized category, normalized source slug/title, and the first eight hexadecimal characters of the source digest.
- `code_blocks[].code` is the canonical and only stored source code.
- Arrays are sorted and deduplicated unless their order is semantically significant; `code_blocks` remain in source order.
- `confidence` describes reconstruction completeness, not code quality.
- Generated analysis never claims that a component was tested, accessible, licensed, or production-ready without corresponding evidence.

## Component Completeness and Reconstruction

Every component receives one status:

- `complete`: Component implementation and usage are available, with no unresolved local imports.
- `recoverable`: Source material is incomplete in one record but can be reconstructed from duplicate-source records or companion text files.
- `incomplete`: Some useful code exists, but unresolved local imports or missing implementation files require AI completion.
- `invalid`: No reliable usable code can be recovered or the record remains structurally invalid.

Reconstruction occurs in this order:

1. Parse embedded JSON code blocks.
2. When JSON is truncated or malformed, recover metadata from its valid prefix and code from corresponding `_code_*.txt` files.
3. Group records by normalized source URL before removing the URL.
4. Select the record with the most complete code and metadata as the merge base.
5. Merge complementary code blocks and deduplicate them by normalized content hash.
6. Parse static imports to identify npm dependencies, local imports, styles, and assets.
7. Infer code-block language, role, and suggested path using explicit observable patterns.
8. Record unresolved imports and external assets as diagnostics.

AI-generated repair is not written back into the canonical catalog during the build. At integration time, an assistant may complete missing project code, but it must distinguish original catalog code from generated completion and must verify the result in the user's project.

Search ordering prefers `complete`, then `recoverable`, then `incomplete`. `invalid` records appear only with `--include-invalid`.

## Build Data Flow

```text
source catalog
  → scan category directories
  → parse JSON and companion text
  → repair recoverable records
  → normalize source URL and group duplicates
  → merge complementary code
  → extract non-clickable source identity
  → remove URL and scraped timestamp
  → analyze imports and completeness
  → write normalized records
  → write manifest and reports
  → atomically promote completed output
```

The builder writes to a temporary sibling directory. Only a fully validated build replaces the requested output directory. Existing output remains untouched on failure.

Build reports include:

- Input, parsed, repaired, merged, emitted, and rejected record counts.
- Every duplicate group and its selected merge base.
- Every rejected record and machine-readable reason.
- Every unresolved import and external asset.
- Output file count, schema version, and content digest.

The repository commits the builder and schema, not the generated catalog. A cleaned ZIP is produced locally for later publication as a release asset.

## Runtime CLI

```bash
node scripts/ui-forge.mjs validate [--catalog <path>] [--json]
node scripts/ui-forge.mjs search <query> [--category <name>] [--limit <n>] [--include-incomplete] [--catalog <path>] [--json]
node scripts/ui-forge.mjs show <component-id> [--catalog <path>] [--json]
```

### `validate`

Validates manifest compatibility, unique IDs, record schema, status consistency, file counts, forbidden metadata URLs, and manifest digests. Exit code `0` means valid; `1` means invalid catalog or usage error; `2` means catalog discovery failure.

### `search`

Searches normalized title, description, category, author, slug, dependencies, and diagnostic-free code role. Results use deterministic scoring and break ties by status rank, normalized title, then ID. Human output is concise; `--json` is stable machine-readable output.

### `show`

Requires an exact unique ID and returns complete stored code blocks, inferred roles and paths, dependencies, local imports, external assets, status, confidence, and diagnostics. It never silently chooses an ambiguous component.

## Integration Flow

1. Confirm the user explicitly wants ready-made React components or UI Forge.
2. Run `validate` once for the selected catalog.
3. Run `search` with user intent and optional category.
4. Select a candidate or present a small stable set for user choice.
5. Run `show` for the selected ID.
6. Inspect the user's existing framework, aliases, styling setup, and dependencies.
7. Copy original code, adapt imports and paths, and explicitly label any generated completion.
8. Install only required dependencies with user-authorized project tooling.
9. Run the project's own typecheck, tests, lint, or build as appropriate.

## Error Handling

- Catalog not found: Exit `2`, list checked locations, and print platform-specific setup examples.
- Unsupported schema: Exit `1` and report actual and supported schema versions.
- Malformed runtime JSON: Exit `1` with file and parsing error.
- Duplicate ID: `validate` fails and `show` refuses selection.
- No search result: Return an empty result plus nearby categories and broader query suggestions; never invent a catalog component.
- Incomplete component: Return all available code and diagnostics; do not claim exact restoration.
- Functional URL inside source code: Preserve it and add an external-resource diagnostic.
- Metadata URL after build: Fail validation.
- Build failure: Preserve source and previous successful output; report the temporary failure location only when it is retained for diagnosis.

## Progressive Disclosure and Platform Adapters

`SKILL.md` contains no absolute paths and no `Glob`, `Grep`, or other platform-specific pseudo-tool syntax. It points to references with explicit load conditions:

- Read `references/configuration.md` only for installation or catalog discovery problems.
- Read `references/catalog-format.md` only for validation, building, or schema maintenance.
- Read `references/categories.md` only when broadening or mapping a search.
- Read `references/integration-workflow.md` when integrating selected code into a project.

The Codex adapter is represented by `agents/openai.yaml` and `adapters/codex.md`. The Claude Code adapter is `adapters/claude-code.md`. Both invoke the same `SKILL.md` and Node CLI.

## Trigger Contract

The description triggers only when the user:

- Explicitly asks to find, select, compare, or reuse ready-made React UI components.
- Names a UI component category while asking for existing component options.
- Explicitly asks to build with UI Forge or search the UI Forge catalog.

It does not trigger merely because a request mentions React, frontend work, UI design, Tailwind, a dashboard, or a landing page.

Baseline trigger cases are stored in `tests/skill-trigger-cases.json` before `SKILL.md` is edited. The same cases are evaluated after the edit, with English and Chinese coverage.

## Test Strategy

Use Node's built-in `node:test` runner through `node --test`. No test framework dependency is added.

Automated tests cover:

- Discovery precedence and Windows/macOS/Linux configuration locations.
- Manifest and record schema validation.
- All four component statuses.
- Minimal fixtures reproducing the three known malformed JSON records.
- Recovery from companion text files.
- Source URL normalization and duplicate merging.
- Removal of metadata URLs and retention of functional URLs inside code.
- Exact removal of duplicate code representations.
- Dependency, local-import, asset, role, and language inference.
- Stable CLI JSON output, scoring, ordering, exit codes, and diagnostics.
- Repeat builds producing identical normalized files and manifest digest.
- Source directories remaining unchanged.
- Adapter files containing installation/invocation details without copied core rules.

Skill behavior testing follows RED-GREEN-REFACTOR:

1. Run trigger and application scenarios against the current skill and record baseline failures.
2. Modify the description and `SKILL.md` minimally to address observed failures.
3. Run the same scenarios with the revised skill.
4. Add edge cases only when testing exposes a gap.

At least one forward scenario completes `validate → search → show → integration recommendation` using a fixture catalog. Forward-test agents receive only the skill location, fixture catalog, and realistic user request; they do not receive expected answers or prior diagnosis.

## Acceptance Criteria

- Skill frontmatter validation passes.
- `node --test` passes with no failures.
- All 4,360 source records are accounted for as emitted, merged, or rejected.
- Each of the three known malformed records is recovered or appears in the rejection report with a precise reason.
- Runtime metadata contains no `http://` or `https://` values.
- No `_code_*.txt` file is included in the cleaned package.
- Every non-invalid search result can be retrieved by exact ID with all existing code and reconstruction diagnostics.
- `SKILL.md` contains no hard-coded local path or platform-specific search command.
- The description passes the approved trigger/non-trigger matrix in English and Chinese.
- Codex and Claude Code adapters invoke the same CLI and catalog schema.
- A repeated build from identical input produces identical normalized files and manifest digest.
- A realistic forward test demonstrates component discovery and code reconstruction without fabricating catalog content.
