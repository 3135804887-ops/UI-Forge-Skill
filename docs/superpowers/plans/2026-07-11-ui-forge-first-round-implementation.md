# UI Forge First-Round Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a platform-neutral, deterministic UI Forge catalog toolchain that discovers a local component package, validates/searches/shows complete available code, reproducibly repairs and deduplicates legacy data, and exposes concise Codex and Claude Code skill adapters.

**Architecture:** A Node.js 18+ zero-dependency core owns schema validation, configuration discovery, deterministic search, reconstruction analysis, catalog building, and CLI output. `SKILL.md` remains platform-neutral and concise; Codex metadata and Claude Code installation guidance are thin adapters over the same core. The large component catalog remains a separately installed/generated release asset.

**Tech Stack:** Node.js 18+ ESM, Node built-in modules (`node:fs`, `node:path`, `node:crypto`, `node:test`, `node:assert`, `node:child_process`, `node:os`, `node:url`), JSON, Markdown, YAML metadata.

## Global Constraints

- Use Node.js 18 or newer and only Node built-in modules.
- Keep the core platform-neutral; Codex and Claude Code adapters contain installation/invocation details only.
- Keep the component catalog as a separately installed local data package.
- Preserve every available component code block; remove only redundant `_code_*.txt` copies from generated output.
- Remove metadata URLs from runtime records while retaining non-clickable `provider`, `author`, `slug`, and `source_id`.
- Never modify the source catalog in place.
- Produce deterministic IDs, ordering, reports, and output for identical input.
- Trigger UI Forge only for explicit existing React-component discovery/reuse or explicit UI Forge requests.
- Distinguish original catalog code from AI-generated completion.
- Do not claim tested, accessible, licensed, or production-ready status without evidence.
- Follow RED-GREEN-REFACTOR for every behavior change. Run the named test and observe its expected failure before writing implementation.
- Keep generated catalogs, temporary build directories, and ZIP artifacts out of Git.

---

## File Map

| Path | Responsibility |
|---|---|
| `package.json` | Node version, ESM mode, and stable test/CLI scripts. |
| `lib/catalog-schema.mjs` | Schema constants, record/manifest validation, URL checks, and status ranking. |
| `lib/catalog-loader.mjs` | Read manifest and component files deterministically. |
| `lib/catalog-config.mjs` | Resolve catalog path from CLI, environment, project config, user config, and common directories. |
| `lib/catalog-search.mjs` | Normalize queries, score records, filter by category/status, and sort deterministically. |
| `lib/catalog-builder.mjs` | Parse legacy records, recover malformed JSON, merge duplicates, analyze imports/code roles, write atomic output and reports. |
| `scripts/ui-forge.mjs` | User-facing `validate`, `search`, and `show` CLI. |
| `scripts/build-catalog.mjs` | User-facing catalog build CLI. |
| `tests/helpers.mjs` | Temporary directories, JSON writing, fixture catalogs, and CLI process helpers. |
| `tests/catalog-schema.test.mjs` | Runtime schema and manifest tests. |
| `tests/catalog-config.test.mjs` | Cross-platform discovery precedence tests. |
| `tests/catalog-search.test.mjs` | Search scoring/filtering/order tests. |
| `tests/catalog-cli.test.mjs` | CLI output and exit-code tests. |
| `tests/catalog-builder.test.mjs` | Repair, dedupe, analysis, determinism, and source immutability tests. |
| `tests/fixtures/source/` | Minimal legacy records including malformed JSON recovery cases. |
| `tests/skill-trigger-cases.json` | Approved English/Chinese trigger and non-trigger cases. |
| `docs/ai-context/evals/trigger-baseline.md` | Raw baseline observations before `SKILL.md` changes. |
| `references/*.md` | Progressive configuration, format, category, and integration guidance. |
| `adapters/*.md` | Shared adapter contract plus Codex/Claude Code installation. |
| `agents/openai.yaml` | Codex UI metadata and implicit-invocation policy. |
| `SKILL.md` | Concise trigger, core workflow, CLI commands, and reference routing. |

## Stable Interfaces

These signatures are shared across tasks and must not drift:

```js
// lib/catalog-schema.mjs
export const SCHEMA_VERSION = 1;
export const STATUS_RANK = Object.freeze({ complete: 0, recoverable: 1, incomplete: 2, invalid: 3 });
export function validateRecord(record, file = "<memory>") {}
export function validateManifest(manifest, file = "manifest.json") {}
export function containsMetadataUrl(record) {}

// lib/catalog-loader.mjs
export async function loadCatalog(catalogPath) {}
export async function validateCatalog(catalogPath) {}

// lib/catalog-config.mjs
export async function discoverCatalog(options = {}) {}
export function userConfigPath(platform, env, homeDir) {}
export function commonCatalogPaths(platform, env, homeDir) {}

// lib/catalog-search.mjs
export function searchCatalog(records, query, options = {}) {}

// lib/catalog-builder.mjs
export function normalizeSourceUrl(value) {}
export function extractSourceIdentity(value) {}
export function analyzeCodeBlocks(codeBlocks) {}
export async function buildCatalog({ sourcePath, outputPath }) {}
```

`discoverCatalog()` resolves to:

```js
{
  path: "<absolute catalog path>",
  source: "cli" | "environment" | "project-config" | "user-config" | "common-path",
  checked: [{ source, path, reason }]
}
```

`validateCatalog()` resolves to:

```js
{
  valid: true,
  manifest,
  records,
  errors: [],
  warnings: []
}
```

On invalid data it returns `valid: false` with errors rather than throwing; unreadable paths and malformed JSON may throw an `Error` with `code` set to `CATALOG_NOT_FOUND`, `CATALOG_UNREADABLE`, or `CATALOG_PARSE_ERROR`.

---

### Task 1: Establish Trigger Baselines Before Editing the Skill

**Files:**
- Create: `tests/skill-trigger-cases.json`
- Create: `docs/ai-context/evals/trigger-baseline.md`
- Do not modify: `SKILL.md`

**Interfaces:**
- Consumes: current committed `SKILL.md` at commit `da48a8b`.
- Produces: immutable prompt matrix used again after the skill rewrite.

- [ ] **Step 1: Create the trigger-case dataset**

Write this exact JSON shape and cases:

```json
{
  "schema_version": 1,
  "cases": [
    {"id":"en-explicit-forge","prompt":"Use UI Forge to find an animated pricing card.","expected":true},
    {"id":"en-existing-component","prompt":"Find three ready-made React magnetic button components I can reuse.","expected":true},
    {"id":"en-category-options","prompt":"What existing shader background components are available?","expected":true},
    {"id":"en-generic-page","prompt":"Build a React landing page for my SaaS.","expected":false},
    {"id":"en-debug","prompt":"Fix the submit bug in this React form.","expected":false},
    {"id":"en-figma-review","prompt":"Review this Figma dashboard design.","expected":false},
    {"id":"en-vue-migration","prompt":"Migrate this Vue page to React.","expected":false},
    {"id":"zh-explicit-forge","prompt":"使用 UI Forge 找一个带光效的按钮。","expected":true},
    {"id":"zh-existing-component","prompt":"帮我挑选三个可以复用的现成 React 定价卡片。","expected":true},
    {"id":"zh-category-options","prompt":"这个组件库里有哪些 shader background？","expected":true},
    {"id":"zh-generic-page","prompt":"帮我写一个 React 管理后台页面。","expected":false},
    {"id":"zh-debug","prompt":"修复这个 React 弹窗关闭后状态没有重置的问题。","expected":false},
    {"id":"zh-html","prompt":"写一个原生 HTML 登录页。","expected":false}
  ]
}
```

- [ ] **Step 2: Validate the dataset syntax**

Run:

```powershell
node -e "const x=require('./tests/skill-trigger-cases.json'); if(x.cases.length!==13) process.exit(1); console.log('13 trigger cases')"
```

Expected: `13 trigger cases` and exit `0`.

- [ ] **Step 3: Run baseline scenarios without changing `SKILL.md`**

Use fresh-context subagents. Give each agent only the current skill path and one prompt, asking whether it would invoke the skill and what it would do first. Do not reveal `expected`. Run all 13 cases at least once; for the broad negative cases (`en-generic-page`, `zh-generic-page`, `en-debug`) run three repetitions to expose variance.

Expected current failure: at least `en-generic-page` or `zh-generic-page` is classified as trigger because the current description says to always use the skill for frontend work. If no negative case fails, stop and report that the proposed trigger rewrite lacks a demonstrated baseline failure.

- [ ] **Step 4: Record raw baseline evidence**

Create `docs/ai-context/evals/trigger-baseline.md` with this fixed structure. Add one row per case using the real verdict gathered in Step 3; write `yes` or `no` in the final column after comparing it with `tests/skill-trigger-cases.json`:

```markdown
# UI Forge Trigger Baseline

- Skill revision: `da48a8b`
- Dataset: `tests/skill-trigger-cases.json`
- Method: fresh-context classification without expected labels

| Case | Expected | Observed verdict | Pass |
|---|---:|---|---:|

## Baseline failure pattern

Quote the exact over-trigger rationale and identify which wording in the current description enabled it.
```

- [ ] **Step 5: Commit the baseline before skill edits**

```powershell
git add tests/skill-trigger-cases.json docs/ai-context/evals/trigger-baseline.md
git commit -m "test: capture UI Forge trigger baseline"
```

---

### Task 2: Add the Node Test Harness and Runtime Schema

**Files:**
- Create: `package.json`
- Create: `tests/helpers.mjs`
- Create: `tests/catalog-schema.test.mjs`
- Create: `lib/catalog-schema.mjs`

**Interfaces:**
- Consumes: schema contract from the design specification.
- Produces: `SCHEMA_VERSION`, `STATUS_RANK`, `validateRecord`, `validateManifest`, and `containsMetadataUrl`.

- [ ] **Step 1: Write failing schema tests**

Create `tests/catalog-schema.test.mjs` with tests that import the stable interfaces and assert:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  SCHEMA_VERSION,
  STATUS_RANK,
  containsMetadataUrl,
  validateManifest,
  validateRecord,
} from "../lib/catalog-schema.mjs";

const validRecord = {
  schema_version: 1,
  id: "button/shimmer-button--a1b2c3d4",
  title: "Shimmer Button",
  description: "Animated shimmer button.",
  category: "button",
  source: { provider: "21st.dev", author: "maker", slug: "shimmer-button" },
  source_id: `sha256:${"a".repeat(64)}`,
  status: "complete",
  confidence: 1,
  dependencies: ["lucide-react"],
  local_imports: [],
  external_assets: [],
  code_blocks: [{ index: 0, language: "tsx", role: "component", suggested_path: "components/shimmer-button.tsx", code: "export function ShimmerButton() { return <button />; }" }],
  diagnostics: [],
};

test("exports schema version and stable status order", () => {
  assert.equal(SCHEMA_VERSION, 1);
  assert.deepEqual(STATUS_RANK, { complete: 0, recoverable: 1, incomplete: 2, invalid: 3 });
});

test("accepts a valid component and manifest", () => {
  assert.deepEqual(validateRecord(validRecord), []);
  assert.deepEqual(validateManifest({ schema_version: 1, component_count: 1, files: [{ id: validRecord.id, path: "button/shimmer-button--a1b2c3d4.json", sha256: "b".repeat(64) }], digest: "c".repeat(64) }), []);
});

test("rejects metadata URLs while allowing URLs inside code", () => {
  assert.equal(containsMetadataUrl(validRecord), false);
  assert.equal(containsMetadataUrl({ ...validRecord, description: "https://21st.dev/x" }), true);
  assert.equal(containsMetadataUrl({ ...validRecord, code_blocks: [{ ...validRecord.code_blocks[0], code: "const image = 'https://example.com/a.png';" }] }), false);
});

test("reports exact structural errors", () => {
  const errors = validateRecord({ ...validRecord, id: "Bad ID", code_blocks: [] }, "broken.json");
  assert.ok(errors.some((x) => x.code === "INVALID_ID" && x.file === "broken.json"));
  assert.ok(errors.some((x) => x.code === "MISSING_CODE"));
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/catalog-schema.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/catalog-schema.mjs`.

- [ ] **Step 3: Add package metadata and helper primitives**

Create `package.json`:

```json
{
  "name": "ui-forge-skill",
  "version": "1.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=18" },
  "scripts": {
    "test": "node --test",
    "ui-forge": "node scripts/ui-forge.mjs",
    "build:catalog": "node scripts/build-catalog.mjs"
  }
}
```

Create `tests/helpers.mjs` exporting:

```js
export async function makeTempDir(prefix = "ui-forge-") {}
export async function writeJson(file, value) {}
export async function createFixtureCatalog(root, records) {}
export async function runNode(args, options = {}) {}
```

Implement these with `mkdtemp`, `mkdir`, `writeFile`, `tmpdir`, and promisified `execFile`. `createFixtureCatalog` writes sorted records under `<root>/components/<category>/`, computes SHA-256 for each file, and writes a valid deterministic `manifest.json`.

- [ ] **Step 4: Implement minimal schema validation**

In `lib/catalog-schema.mjs`, implement the stable exports. Validation errors use:

```js
{ code: "INVALID_ID", file: "broken.json", path: "id", message: "id must match <category>/<slug>--<8 hex>" }
```

Validate required scalar fields, allowed statuses, confidence range `0..1`, arrays, code block index/language/role/path/code, source object, 64-character SHA-256 source ID, sorted unique dependencies/imports/assets, and metadata URL absence. `containsMetadataUrl` recursively scans all fields except `code_blocks[].code`.

- [ ] **Step 5: Run schema tests and verify GREEN**

Run: `node --test tests/catalog-schema.test.mjs`

Expected: 4 tests pass, 0 fail.

- [ ] **Step 6: Commit the schema foundation**

```powershell
git add package.json lib/catalog-schema.mjs tests/helpers.mjs tests/catalog-schema.test.mjs
git commit -m "feat: define UI Forge catalog schema"
```

---

### Task 3: Implement Catalog Loading and Cross-Platform Discovery

**Files:**
- Create: `lib/catalog-loader.mjs`
- Create: `lib/catalog-config.mjs`
- Create: `tests/catalog-loader.test.mjs`
- Create: `tests/catalog-config.test.mjs`

**Interfaces:**
- Consumes: `validateManifest`, `validateRecord`, `SCHEMA_VERSION`.
- Produces: `loadCatalog`, `validateCatalog`, `discoverCatalog`, `userConfigPath`, `commonCatalogPaths`.

- [ ] **Step 1: Write failing loader and discovery tests**

Test exact behaviors:

```js
test("loads manifest files in deterministic path order", async () => {
  const root = await createFixtureCatalog(await makeTempDir(), [recordB, recordA]);
  const loaded = await loadCatalog(root);
  assert.deepEqual(loaded.records.map((x) => x.id), [recordA.id, recordB.id].sort());
});

test("CLI path wins over environment and config", async () => {
  const result = await discoverCatalog({
    cliPath,
    env: { UI_FORGE_CATALOG: envPath },
    cwd: projectDir,
    platform: "linux",
    homeDir,
  });
  assert.equal(result.path, cliPath);
  assert.equal(result.source, "cli");
});

test("uses Windows, macOS, and Linux user config paths", () => {
  assert.equal(userConfigPath("win32", { APPDATA: "C:\\Users\\Ada\\AppData\\Roaming" }, "C:\\Users\\Ada"), "C:\\Users\\Ada\\AppData\\Roaming\\ui-forge\\config.json");
  assert.equal(userConfigPath("darwin", {}, "/Users/ada"), "/Users/ada/Library/Application Support/ui-forge/config.json");
  assert.equal(userConfigPath("linux", { XDG_CONFIG_HOME: "/cfg" }, "/home/ada"), "/cfg/ui-forge/config.json");
});
```

Also cover environment precedence, nearest upward `.ui-forge.json`, user config, common paths, invalid candidates recorded in `checked`, unsupported manifest, duplicate ID, file digest mismatch, and discovery error code `CATALOG_NOT_FOUND`.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/catalog-loader.test.mjs tests/catalog-config.test.mjs`

Expected: FAIL with missing `catalog-loader.mjs` and `catalog-config.mjs` modules.

- [ ] **Step 3: Implement deterministic loading**

`loadCatalog(catalogPath)` must:

1. Resolve the absolute path.
2. Read and parse `manifest.json`.
3. Reject unsupported schema versions.
4. Sort `manifest.files` by path.
5. Read every component JSON, verify file SHA-256, validate record, and reject duplicate IDs.
6. Return `{ path, manifest, records, errors, warnings }`.

`validateCatalog` wraps `loadCatalog` and returns `{ valid: errors.length === 0, ...loaded }`; it converts parse/digest/schema problems into structured errors but preserves discovery/read error codes.

- [ ] **Step 4: Implement discovery precedence**

`discoverCatalog(options)` accepts injectable `env`, `cwd`, `platform`, and `homeDir` for tests. Project config JSON shape is:

```json
{ "catalog": "/absolute/or/config-relative/path" }
```

Resolve relative config values from the config file's directory. Validate each candidate by reading a supported manifest. Return the first valid candidate and include all prior rejected candidates in `checked`.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `node --test tests/catalog-loader.test.mjs tests/catalog-config.test.mjs`

Expected: all loader/discovery tests pass.

- [ ] **Step 6: Run the full suite**

Run: `npm test`

Expected: all schema, loader, and config tests pass.

- [ ] **Step 7: Commit catalog loading and discovery**

```powershell
git add lib/catalog-loader.mjs lib/catalog-config.mjs tests/catalog-loader.test.mjs tests/catalog-config.test.mjs
git commit -m "feat: discover and load local UI Forge catalogs"
```

---

### Task 4: Implement Deterministic Search

**Files:**
- Create: `lib/catalog-search.mjs`
- Create: `tests/catalog-search.test.mjs`

**Interfaces:**
- Consumes: validated runtime records and `STATUS_RANK`.
- Produces: `searchCatalog(records, query, options)` returning stable result summaries.

- [ ] **Step 1: Write failing search tests**

Cover exact query semantics:

```js
test("ranks exact title and category matches before description matches", () => {
  const results = searchCatalog(records, "shimmer button", { limit: 5 });
  assert.deepEqual(results.map((x) => x.id), ["button/shimmer-button--11111111", "button/glow-button--22222222"]);
});

test("breaks score ties by status, title, then id", () => {
  const results = searchCatalog(tiedRecords, "button", { includeIncomplete: true });
  assert.deepEqual(results.map((x) => x.status), ["complete", "recoverable", "incomplete"]);
});

test("filters category and excludes incomplete and invalid by default", () => {
  const results = searchCatalog(records, "animated", { category: "button" });
  assert.ok(results.every((x) => x.category === "button"));
  assert.ok(results.every((x) => !["incomplete", "invalid"].includes(x.status)));
});
```

Add Chinese substring/token matching, case folding, punctuation normalization, limit validation, empty query, explicit `includeIncomplete`, explicit `includeInvalid`, and no-result related-category suggestions.

- [ ] **Step 2: Run test and verify RED**

Run: `node --test tests/catalog-search.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `catalog-search.mjs`.

- [ ] **Step 3: Implement scoring and stable summaries**

Use deterministic integer weights:

- Exact normalized title: `100`.
- Title token/prefix match: `30` per unique query token.
- Exact category: `25`.
- Slug token match: `20`.
- Description token match: `10`.
- Dependency/author/code-role token match: `5`.

Return summaries only:

```js
{
  id,
  title,
  description,
  category,
  status,
  confidence,
  dependencies,
  score,
  diagnostics_count: diagnostics.length
}
```

Sort by descending score, ascending `STATUS_RANK`, `title.localeCompare(..., "en", { sensitivity: "base" })`, then ID. Do not include code in search output.

- [ ] **Step 4: Run search tests and full suite**

Run:

```powershell
node --test tests/catalog-search.test.mjs
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit deterministic search**

```powershell
git add lib/catalog-search.mjs tests/catalog-search.test.mjs
git commit -m "feat: add deterministic component search"
```

---

### Task 5: Add the `validate`, `search`, and `show` CLI

**Files:**
- Create: `scripts/ui-forge.mjs`
- Create: `tests/catalog-cli.test.mjs`

**Interfaces:**
- Consumes: `discoverCatalog`, `validateCatalog`, `searchCatalog`.
- Produces: documented CLI, stable JSON output, human output, and exit codes `0`, `1`, `2`.

- [ ] **Step 1: Write failing CLI tests**

Use `runNode` to test processes:

```js
test("validate emits stable JSON", async () => {
  const result = await runNode(["scripts/ui-forge.mjs", "validate", "--catalog", catalog, "--json"]);
  assert.equal(result.code, 0);
  assert.deepEqual(JSON.parse(result.stdout), { command: "validate", valid: true, schema_version: 1, component_count: 2, errors: [], warnings: [] });
});

test("search returns summaries without code", async () => {
  const result = await runNode(["scripts/ui-forge.mjs", "search", "shimmer button", "--catalog", catalog, "--json"]);
  const output = JSON.parse(result.stdout);
  assert.equal(result.code, 0);
  assert.equal(output.results[0].id, "button/shimmer-button--11111111");
  assert.equal("code_blocks" in output.results[0], false);
});

test("show returns every stored code block", async () => {
  const result = await runNode(["scripts/ui-forge.mjs", "show", "button/shimmer-button--11111111", "--catalog", catalog, "--json"]);
  assert.equal(result.code, 0);
  assert.equal(JSON.parse(result.stdout).component.code_blocks.length, 2);
});
```

Also test catalog-not-found exit `2`, invalid usage exit `1`, invalid catalog exit `1`, exact ID requirement, unknown ID, no results, category/limit flags, incomplete flags, and human output snapshots using exact strings.

- [ ] **Step 2: Run test and verify RED**

Run: `node --test tests/catalog-cli.test.mjs`

Expected: FAIL because `scripts/ui-forge.mjs` does not exist.

- [ ] **Step 3: Implement argument parsing and command handlers**

Keep parsing internal to `scripts/ui-forge.mjs`; no dependency. Recognize:

```text
validate [--catalog PATH] [--json]
search QUERY [--category NAME] [--limit N] [--include-incomplete] [--include-invalid] [--catalog PATH] [--json]
show ID [--catalog PATH] [--json]
```

Write JSON with `JSON.stringify(value, null, 2) + "\n"`. Send user/validation errors to stderr. On discovery failure, include `checked` candidates. `show` returns the record unchanged under `component`, preserving all code.

- [ ] **Step 4: Run CLI tests and full suite**

Run:

```powershell
node --test tests/catalog-cli.test.mjs
npm test
```

Expected: all tests pass and no stderr on successful commands.

- [ ] **Step 5: Commit the runtime CLI**

```powershell
git add scripts/ui-forge.mjs tests/catalog-cli.test.mjs package.json
git commit -m "feat: add UI Forge catalog CLI"
```

---

### Task 6: Build Legacy Record Recovery, Deduplication, and Reconstruction Analysis

**Files:**
- Create: `lib/catalog-builder.mjs`
- Create: `tests/catalog-builder.test.mjs`
- Create: `tests/fixtures/source/button/Shimmer_Button.json`
- Create: `tests/fixtures/source/button/Shimmer_Button_code_0.txt`
- Create: `tests/fixtures/source/button/Shimmer_Button_Duplicate.json`
- Create: `tests/fixtures/source/background/Liquid_Metal.json`
- Create: `tests/fixtures/source/background/Liquid_Metal_code_0.txt`

**Interfaces:**
- Consumes: legacy `{ url, title, description, category, code_blocks, scraped_at }` records and companion text files.
- Produces: `normalizeSourceUrl`, `extractSourceIdentity`, `analyzeCodeBlocks`, and normalized merged records used by `buildCatalog`.

- [ ] **Step 1: Create minimal fixtures**

Use anonymized code but preserve legacy shape. `Liquid_Metal.json` must end inside the `code_blocks` array to reproduce `Unexpected end`. Its companion text contains a complete component implementation. The duplicate shimmer fixture uses the same normalized URL with a complementary implementation block.

Fixture URL examples are allowed only in legacy source fixtures because the behavior under test is URL removal. Runtime/generated fixtures must remain URL-free.

- [ ] **Step 2: Write failing builder-unit tests**

```js
test("normalizes source URLs for deduplication", () => {
  assert.equal(normalizeSourceUrl("HTTPS://21st.dev/@Maker/components/Shimmer/?utm_source=x#demo"), "https://21st.dev/@maker/components/shimmer");
});

test("extracts non-clickable source identity", () => {
  assert.deepEqual(extractSourceIdentity("https://21st.dev/@Maker/components/shimmer"), { provider: "21st.dev", author: "Maker", slug: "shimmer" });
});

test("analyzes dependencies, local imports, assets, and roles", () => {
  const analysis = analyzeCodeBlocks([{ index: 0, code: 'import { motion } from "framer-motion"; import { Button } from "@/components/ui/button"; export function Demo(){ return <img src="https://img.example/a.png"/> }' }]);
  assert.deepEqual(analysis.dependencies, ["framer-motion"]);
  assert.deepEqual(analysis.local_imports, ["@/components/ui/button"]);
  assert.equal(analysis.external_assets.length, 1);
  assert.equal(analysis.code_blocks[0].language, "tsx");
  assert.equal(analysis.code_blocks[0].role, "usage");
});
```

Add tests for scoped npm packages, React built-ins excluded from dependency installation, CSS imports, dynamic imports diagnosed but not executed, normalized content hashing, duplicate code blocks, malformed JSON recovery from companion files, and all four statuses.

- [ ] **Step 3: Run builder tests and verify RED**

Run: `node --test tests/catalog-builder.test.mjs`

Expected: FAIL with missing `lib/catalog-builder.mjs`.

- [ ] **Step 4: Implement source normalization and identity extraction**

`normalizeSourceUrl` lowercases scheme/host and the author segment, removes query/hash/trailing slash, and preserves the component slug. Reject non-HTTP(S) sources with error code `INVALID_SOURCE_URL`.

`extractSourceIdentity` parses `/@<author>/components/<slug>` and returns provider host without protocol. When the path does not match, use `{ provider: host, author: "unknown", slug: normalized title slug }` and add a diagnostic during record normalization.

- [ ] **Step 5: Implement code analysis and reconstruction status**

Use regular expressions only for static `import ... from`, bare `import`, and `require()` strings. Do not evaluate component code. Derive:

- npm dependencies from bare specifiers; scoped packages retain the first two path segments.
- local imports from `.`, `/`, `@/`, and configured-looking aliases.
- external assets from HTTP(S) strings found inside code.
- `tsx` when JSX and TypeScript syntax appear, `jsx` for JSX, `ts` for TypeScript, `js` otherwise, and `css` for stylesheet blocks/imported standalone CSS.
- `usage` when a block imports a symbol and renders it without exporting the imported implementation.
- `component` when it exports a React component/function/class.
- `style`, `hook`, `utility`, or `unknown` from observable syntax.

Set status:

- `complete` when implementation exists and no local import is unresolved by another emitted block.
- `recoverable` when recovery or duplicate merging supplies missing code and all imports resolve afterward.
- `incomplete` when usable code remains with unresolved local imports.
- `invalid` when no non-empty code exists.

Confidence is deterministic: `1` complete, `0.85` recoverable, `0.5` incomplete, `0` invalid.

- [ ] **Step 6: Implement malformed-record recovery and duplicate merging**

For failed JSON parsing:

1. Extract scalar `url`, `title`, `description`, and `category` using anchored JSON-string field matching against the valid prefix.
2. Discover companion files matching `<base>_code_<index>.txt` sorted numerically.
3. Normalize CRLF to LF and use them as code blocks.
4. Reject only when required metadata or all code is missing.

Group parsed/recovered records by normalized source URL. Pick merge base by descending non-empty code count, description length, then lexicographic source path. Merge code blocks by normalized SHA-256. Record every source path in the build report but not the runtime record.

- [ ] **Step 7: Run builder tests and full suite**

Run:

```powershell
node --test tests/catalog-builder.test.mjs
npm test
```

Expected: all tests pass; fixture source files remain byte-identical before/after tests.

- [ ] **Step 8: Commit reconstruction logic**

```powershell
git add lib/catalog-builder.mjs tests/catalog-builder.test.mjs tests/fixtures/source
git commit -m "feat: recover and deduplicate legacy components"
```

---

### Task 7: Write Deterministic Catalog Output, Manifest, and Reports

**Files:**
- Modify: `lib/catalog-builder.mjs`
- Create: `scripts/build-catalog.mjs`
- Modify: `tests/catalog-builder.test.mjs`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: normalized records from Task 6 and schema validation from Task 2.
- Produces: `buildCatalog({ sourcePath, outputPath })` and build CLI.

- [ ] **Step 1: Extend tests for end-to-end builds**

Assert:

```js
test("builds deterministic URL-free output without duplicate text files", async () => {
  const sourceBefore = await hashTree(source);
  const first = await buildCatalog({ sourcePath: source, outputPath: outputA });
  const second = await buildCatalog({ sourcePath: source, outputPath: outputB });
  assert.equal(first.manifest.digest, second.manifest.digest);
  assert.deepEqual(await hashTree(outputA), await hashTree(outputB));
  assert.equal((await listFiles(outputA)).some((x) => /_code_\d+\.txt$/.test(x)), false);
  assert.equal((await readAllRuntimeMetadata(outputA)).includes("http://"), false);
  assert.equal((await readAllRuntimeMetadata(outputA)).includes("https://"), false);
  assert.deepEqual(await hashTree(source), sourceBefore);
});
```

Also test rejected-record reporting, duplicate-group reporting, known repaired fixture accounting, content digest, existing output preserved on validation failure, and temporary directories cleaned after success.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/catalog-builder.test.mjs`

Expected: FAIL because `buildCatalog` and deterministic output do not exist.

- [ ] **Step 3: Implement output and atomic promotion**

Write component files to `<output>.tmp-<pid>/components/<category>/<id-tail>.json` in sorted ID order. Write:

- `manifest.json`
- `reports/build-report.json`
- `reports/rejected-records.json`
- `reports/duplicate-groups.json`

Use JSON indentation of two spaces and final newline. File digest is SHA-256 of exact bytes. Manifest digest is SHA-256 over newline-joined `<relative path>\0<file sha256>` rows in path order.

Validate the temporary output with `validateCatalog`. Promote by renaming existing output to `<output>.backup-<pid>`, temporary output to final, then removing backup. On promotion failure, restore backup. Never delete or rename the source directory.

- [ ] **Step 4: Implement `build-catalog.mjs`**

Accept:

```text
node scripts/build-catalog.mjs --source PATH --output PATH [--json]
```

Require distinct absolute source/output paths. Reject output nested inside source. Human output lists parsed, repaired, merged, emitted, rejected, component files, and manifest digest. JSON output returns the same fields.

- [ ] **Step 5: Ignore generated artifacts**

Append:

```gitignore
# Generated UI Forge catalogs and release artifacts
dist/
*.ui-forge-catalog.zip
*.ui-forge-catalog.zip.sha256
```

- [ ] **Step 6: Run builder, CLI, and full tests**

Run:

```powershell
node --test tests/catalog-builder.test.mjs tests/catalog-cli.test.mjs
npm test
```

Expected: all tests pass with no generated artifact tracked by Git.

- [ ] **Step 7: Commit catalog output support**

```powershell
git add lib/catalog-builder.mjs scripts/build-catalog.mjs tests/catalog-builder.test.mjs .gitignore package.json
git commit -m "feat: generate deterministic cleaned catalogs"
```

---

### Task 8: Rewrite the Skill with Progressive Disclosure and Add Adapters

**Files:**
- Modify: `SKILL.md`
- Create: `references/categories.md`
- Create: `references/catalog-format.md`
- Create: `references/configuration.md`
- Create: `references/integration-workflow.md`
- Create: `adapters/README.md`
- Create: `adapters/codex.md`
- Create: `adapters/claude-code.md`
- Create: `agents/openai.yaml`
- Create: `tests/skill-files.test.mjs`
- Modify: `README.md`
- Modify: `CATEGORIES.md`

**Interfaces:**
- Consumes: current trigger baseline, CLI commands, schema, and build reports.
- Produces: concise platform-neutral skill plus Codex/Claude Code adapters.

- [ ] **Step 1: Write failing static skill tests before editing `SKILL.md`**

Tests must assert:

```js
test("skill trigger is narrow and platform-neutral", async () => {
  const skill = await readFile("SKILL.md", "utf8");
  assert.match(skill, /description: Use when .*ready-made React UI components.*UI Forge/i);
  assert.doesNotMatch(skill, /ALWAYS use|whenever.*frontend|F:\\|Glob pattern|Grep pattern/);
  assert.ok(skill.split(/\s+/).length <= 650);
});

test("skill routes detailed work to direct references", async () => {
  const skill = await readFile("SKILL.md", "utf8");
  for (const file of ["configuration.md", "catalog-format.md", "categories.md", "integration-workflow.md"]) {
    assert.match(skill, new RegExp(`references/${file.replace(".", "\\.")}`));
  }
});

test("adapters invoke the shared CLI without copying core rules", async () => {
  const codex = await readFile("adapters/codex.md", "utf8");
  const claude = await readFile("adapters/claude-code.md", "utf8");
  for (const text of [codex, claude]) assert.match(text, /node scripts\/ui-forge\.mjs/);
  assert.match(claude, /\.claude\/skills\/ui-forge\/SKILL\.md/);
});

test("Codex metadata has only approved fields", async () => {
  const yaml = await readFile("agents/openai.yaml", "utf8");
  assert.match(yaml, /display_name: "UI Forge"/);
  assert.match(yaml, /short_description: "Find and reconstruct local React UI components"/);
  assert.match(yaml, /default_prompt: "Use \$ui-forge/);
  assert.match(yaml, /allow_implicit_invocation: true/);
});
```

Also scan references and adapters for the removed personal path and prohibit metadata claims `production-ready`, `tested components`, and `accessibility built-in`.

- [ ] **Step 2: Run static tests and verify RED**

Run: `node --test tests/skill-files.test.mjs`

Expected: FAIL because the current trigger is broad and new files do not exist.

- [ ] **Step 3: Rewrite `SKILL.md` minimally from observed baseline failures**

Use frontmatter:

```yaml
---
name: ui-forge
description: Use when the user explicitly asks to find, compare, select, or reuse ready-made React UI components, names an existing component category while asking for options, or explicitly requests UI Forge.
---
```

The body must contain only:

1. Core principle: search the local catalog before generating a replacement.
2. `validate → search → show → inspect project → integrate → verify` workflow.
3. Exact CLI examples using paths relative to the skill directory.
4. Requirement to preserve original code and label generated reconstruction.
5. Reference routing with observable conditions.
6. Common failures: missing catalog, no result, incomplete component, unresolved imports.

Do not duplicate category counts or long dependency lists.

- [ ] **Step 4: Move details into references**

- `references/configuration.md`: precedence, config JSON, platform locations, discovery troubleshooting.
- `references/catalog-format.md`: schema, statuses, reports, build command, URL/source policy.
- `references/categories.md`: canonical 47-category table migrated from `CATEGORIES.md`; avoid duplicating counts in `SKILL.md`.
- `references/integration-workflow.md`: project inspection, dependency handling, import/path adaptation, original-vs-generated labeling, verification commands.

Every reference over 100 lines starts with a table of contents.

- [ ] **Step 5: Add adapter contract and platform instructions**

`adapters/README.md` defines that adapters may specify install location, invocation syntax, and platform metadata but may not fork core workflow/schema/CLI.

`adapters/codex.md` explains copying/installing the whole skill directory to the Codex skills location and confirms `agents/openai.yaml` is Codex-specific metadata.

`adapters/claude-code.md` documents current official locations:

- Personal: `~/.claude/skills/ui-forge/SKILL.md`
- Project: `.claude/skills/ui-forge/SKILL.md`

It states that Claude Code uses the directory name for `/ui-forge`, reads description for automatic invocation, supports bundled references/scripts, and invokes the same Node CLI. Link to the official Claude Code skills page in adapter documentation, not runtime catalog records.

- [ ] **Step 6: Generate Codex metadata deterministically**

Run:

```powershell
$env:PYTHONUTF8='1'
& 'E:\MiniConda\python.exe' 'C:\Users\Administrator\.codex\skills\.system\skill-creator\scripts\generate_openai_yaml.py' '.' --interface 'display_name=UI Forge' --interface 'short_description=Find and reconstruct local React UI components' --interface 'default_prompt=Use $ui-forge to find and reconstruct a ready-made React UI component from my local catalog.'
```

Then add:

```yaml
policy:
  allow_implicit_invocation: true
```

Do not add icons, brand color, or MCP dependencies because the user did not provide them and the core has none.

- [ ] **Step 7: Update public documentation**

Update `README.md` installation and usage to match the local catalog, Node 18+, real CLI, actual Release asset model, and Codex/Claude adapters. Remove stale line-number instructions and unsupported `.skill` asset claims. Convert `CATEGORIES.md` into a short pointer to `references/categories.md` or keep it generated from the same canonical table without duplicating hand-maintained counts.

- [ ] **Step 8: Run static, skill, and full validation**

Run:

```powershell
node --test tests/skill-files.test.mjs
$env:PYTHONUTF8='1'
& 'E:\MiniConda\python.exe' 'C:\Users\Administrator\.codex\skills\.system\skill-creator\scripts\quick_validate.py' '.'
npm test
```

Expected: skill valid; all tests pass.

- [ ] **Step 9: Re-run trigger scenarios with the revised skill**

Use the same agents, prompts, repetition counts, and hidden expected labels as Task 1. Require all 13 cases to match expected labels. Record raw results in `docs/ai-context/evals/trigger-after.md`. If a case fails, make the smallest description/body change that addresses the observed rationale, add the case if it reveals a new class, and re-run.

- [ ] **Step 10: Commit the skill and adapters**

```powershell
git add SKILL.md README.md CATEGORIES.md references adapters agents tests/skill-files.test.mjs docs/ai-context/evals/trigger-after.md
git commit -m "feat: make UI Forge platform-neutral and discoverable"
```

---

### Task 9: Validate Against the Full v1.0.0 Catalog

**Files:**
- Do not commit: `C:\tmp\ui-forge-components-v1.0.0.zip`
- Generate outside Git: `C:\tmp\ui-forge-components-v1.0.0-source\`
- Generate outside Git: `C:\tmp\ui-forge-components-v1.1.0-clean\`
- Generate outside Git: `C:\tmp\ui-forge-components-v1.1.0.zip`
- Generate outside Git: `C:\tmp\ui-forge-components-v1.1.0.zip.sha256`
- Create: `docs/ai-context/evals/full-catalog-build.md`

**Interfaces:**
- Consumes: the downloaded v1.0.0 Release ZIP and `build-catalog.mjs`.
- Produces: verified local clean catalog and an evidence report; no large Git-tracked files.

- [ ] **Step 1: Extract the source ZIP outside the repository**

Run:

```powershell
Expand-Archive -LiteralPath 'C:\tmp\ui-forge-components-v1.0.0.zip' -DestinationPath 'C:\tmp\ui-forge-components-v1.0.0-source' -Force
```

Expected: 47 top-level category directories under the extraction root.

- [ ] **Step 2: Build the cleaned catalog**

Run:

```powershell
node scripts/build-catalog.mjs --source 'C:\tmp\ui-forge-components-v1.0.0-source' --output 'C:\tmp\ui-forge-components-v1.1.0-clean' --json
```

Expected: exit `0`; report accounts for all 4,360 JSON source records as emitted, merged, or rejected.

- [ ] **Step 3: Validate the full output**

Run:

```powershell
node scripts/ui-forge.mjs validate --catalog 'C:\tmp\ui-forge-components-v1.1.0-clean' --json
node scripts/ui-forge.mjs search 'animated button' --category button --limit 5 --catalog 'C:\tmp\ui-forge-components-v1.1.0-clean' --json
```

Expected: validation exit `0`; search returns stable non-invalid results without code bodies.

- [ ] **Step 4: Verify known repairs and data-removal requirements**

Inspect build reports and assert:

- `Liquid_Metal`, `Static_Radial_Gradient`, and `Swirl` are repaired or precisely rejected.
- No generated metadata file contains `http://` or `https://`.
- No generated `_code_*.txt` exists.
- All emitted component IDs are unique.
- Every emitted non-invalid record is returned by `show` with at least one code block.
- Duplicate groups account for the observed repeated source URLs.

- [ ] **Step 5: Repeat the build for determinism**

Build to `C:\tmp\ui-forge-components-v1.1.0-clean-repeat` and compare `manifest.digest` values. Expected: exact equality.

- [ ] **Step 6: Package the cleaned catalog and write its checksum**

Run:

```powershell
Compress-Archive -Path 'C:\tmp\ui-forge-components-v1.1.0-clean\*' -DestinationPath 'C:\tmp\ui-forge-components-v1.1.0.zip' -CompressionLevel Optimal -Force
$hash=(Get-FileHash -Algorithm SHA256 -LiteralPath 'C:\tmp\ui-forge-components-v1.1.0.zip').Hash.ToLowerInvariant()
Set-Content -LiteralPath 'C:\tmp\ui-forge-components-v1.1.0.zip.sha256' -Value "$hash  ui-forge-components-v1.1.0.zip" -Encoding utf8NoBOM
```

Expected: both files exist outside Git; re-extracting the ZIP and running `validate` succeeds.

- [ ] **Step 7: Record evidence**

Write `docs/ai-context/evals/full-catalog-build.md` with command lines, exit codes, report counts, known repair results, digest comparison, clean directory size, ZIP size, ZIP SHA-256, and any rejected reasons. Do not copy original component code or source URLs into the report.

- [ ] **Step 8: Commit the full-catalog evidence**

```powershell
git add docs/ai-context/evals/full-catalog-build.md
git commit -m "test: verify full UI Forge catalog migration"
```

---

### Task 10: Run Realistic Forward Tests and Complete Documentation

**Files:**
- Create: `docs/ai-context/evals/forward-tests.md`
- Modify: `docs/ai-context/session-handover.md`
- Modify: `docs/ai-context/CHANGELOG.md`
- Modify: `CONTRIBUTING.md`
- Modify: `RELEASE_NOTES.md`

**Interfaces:**
- Consumes: finished skill, full cleaned catalog, trigger matrices, and all automated tests.
- Produces: independent usage evidence and final project handover.

- [ ] **Step 1: Run forward scenario with a fresh-context agent**

Prompt exactly:

```text
Use $ui-forge at D:\Backup\Documents\Skill-develop\UI-Forge-Skill with catalog C:\tmp\ui-forge-components-v1.1.0-clean. Find a reusable animated React button for a SaaS hero. Return the selected component's original code inventory, dependencies, unresolved local imports, and a project integration plan. Clearly separate catalog code from any code you generate. Do not modify files.
```

Do not reveal expected component IDs. Success requires the agent to run `validate`, `search`, and `show`; report actual stored code; avoid fabricating catalog files; and distinguish completion suggestions.

- [ ] **Step 2: Run an incomplete-component scenario**

Select one real `incomplete` record from the build report and ask a fresh agent to reconstruct it into a minimal temporary React fixture. The agent must preserve original blocks, label generated files, and state unresolved assumptions. If it modifies a fixture, run the fixture's typecheck/build and keep it outside the skill repository.

- [ ] **Step 3: Record forward-test evidence**

Create `docs/ai-context/evals/forward-tests.md` with prompts, selected IDs, commands observed, success/failure per criterion, generated-vs-original distinction, and follow-up changes. Do not paste full component code.

- [ ] **Step 4: Reconcile contributor and release documentation**

Update `CONTRIBUTING.md` with `npm test`, builder fixture rules, URL-free runtime policy, and TDD expectations. Replace placeholder repository URLs. Update `RELEASE_NOTES.md` for the new architecture and describe cleaned catalog generation without claiming a release was published.

- [ ] **Step 5: Update session handover and changelog**

Set completed/in-progress/blocked status, list final commits, key files, full-catalog counts, rejected records, forward-test findings, and next release steps. Changelog entries use `+`, `~`, `-`, `#` and flag the new runtime schema and CLI as shared interfaces.

- [ ] **Step 6: Run final verification**

Run:

```powershell
npm test
$env:PYTHONUTF8='1'
& 'E:\MiniConda\python.exe' 'C:\Users\Administrator\.codex\skills\.system\skill-creator\scripts\quick_validate.py' '.'
node scripts/ui-forge.mjs validate --catalog 'C:\tmp\ui-forge-components-v1.1.0-clean' --json
git diff --check
git status --short
```

Expected: all tests pass; skill valid; full catalog valid; no whitespace errors; only intended documentation changes remain before the final commit.

- [ ] **Step 7: Commit final evidence and documentation**

```powershell
git add CONTRIBUTING.md RELEASE_NOTES.md docs/ai-context
git commit -m "docs: complete UI Forge optimization evidence"
```

---

## Plan Self-Review Checklist

- [ ] Every approved specification requirement maps to at least one task.
- [ ] Trigger baseline occurs before any `SKILL.md` edit.
- [ ] Every implementation task starts with a failing test and names the expected failure.
- [ ] Shared function names and return shapes match the Stable Interfaces section.
- [ ] Full catalog validation accounts for all 4,360 source JSON records.
- [ ] Original component code remains available through `show`.
- [ ] Runtime metadata URLs and duplicate `_code_*.txt` files are absent.
- [ ] Codex and Claude Code use the same core CLI.
- [ ] No large catalog or generated ZIP is committed.
- [ ] The cleaned catalog ZIP is reproducibly generated outside Git with a SHA-256 checksum.
- [ ] Final verification covers tests, skill validation, full data validation, and Git state.
