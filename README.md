# UI Forge

UI Forge is a platform-neutral skill and zero-dependency Node CLI for finding and reconstructing ready-made React UI components from a separately installed local catalog. It preserves complete stored code and reports dependencies, unresolved local imports, external-resource identities, completeness, and diagnostics instead of making unsupported quality claims.

## Requirements

- Node.js 18 or newer
- This repository installed as a complete skill directory
- A legacy source archive or a locally generated cleaned UI Forge catalog

The catalog is not committed to this repository and is not a `.skill` installer. The current GitHub Release asset is the legacy source archive: it cannot be passed directly to `validate`, `search`, or `show`. First extract it, then generate the runtime catalog with the included builder.

## Install the skill

Clone or copy the complete repository into your assistant's skills location. Do not copy only `SKILL.md`; the skill depends on adjacent `scripts/`, `lib/`, and `references/` directories.

- Codex: follow [adapters/codex.md](adapters/codex.md).
- Claude Code: follow [adapters/claude-code.md](adapters/claude-code.md).
- Other platforms: implement the narrow contract in [adapters/README.md](adapters/README.md) without forking the core workflow.

## Build, validate, and configure the local catalog

1. Download the current legacy source archive from the GitHub Release and extract it to a directory you control.
2. Build a cleaned runtime catalog to a different absolute path:

   ```bash
   node scripts/build-catalog.mjs --source "/absolute/legacy/source" --output "/absolute/clean/catalog" --json
   ```

3. Validate the generated output, not the extracted legacy source:

```bash
node scripts/ui-forge.mjs validate --catalog "/absolute/clean/catalog" --json
```

4. Point discovery at that cleaned output with `UI_FORGE_CATALOG`, a project `.ui-forge.json`, a user config, or a documented common install directory. See [references/configuration.md](references/configuration.md) for precedence and Windows, macOS, and Linux locations.

A future release may publish the cleaned catalog directory as a separate asset. If that happens, it can be extracted and validated directly; this README does not claim that asset exists today.

## CLI

```bash
node scripts/ui-forge.mjs validate [--catalog PATH] [--json]
node scripts/ui-forge.mjs search "animated button" [--category button] [--limit 3] [--include-incomplete] [--catalog PATH] [--json]
node scripts/ui-forge.mjs show "button/component--digest" [--catalog PATH] [--json]
```

`show` returns every original stored code block. If a record is incomplete, consumers must preserve those blocks and clearly distinguish generated reconstruction.

## Builder behavior

The builder repairs recoverable data, groups duplicates by source identity, stores code once, removes runtime metadata URLs, emits deterministic reports and manifest bytes, validates temporary output, and promotes it atomically. It never edits the legacy source in place.

## Development

```bash
npm test
```

The runtime and tests use only Node built-in modules. Format and reconstruction details are documented progressively in [references/catalog-format.md](references/catalog-format.md) and [references/integration-workflow.md](references/integration-workflow.md). The category mapping has a single canonical copy in [references/categories.md](references/categories.md).

## 中文摘要

UI Forge 是平台中立的 React 现成组件发现与复原技能。技能代码和本地组件数据包相互独立；Codex 与 Claude Code 只提供薄适配层，共享同一套 Node 18+ CLI、数据规范和复原原则。当前 GitHub Release 提供的是 legacy 源归档，不能直接运行 `validate`：先解压，再用 `build-catalog.mjs` 生成独立的 cleaned catalog，最后对生成目录执行 `validate/search/show` 并配置发现路径。未来可能发布可直接解压验证的 cleaned asset，但当前并不存在该发布物。`show` 会返回所有原始代码块；任何补全代码都必须明确标记为生成内容。
