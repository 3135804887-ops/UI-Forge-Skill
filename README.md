# UI Forge

UI Forge is a platform-neutral skill and zero-dependency Node CLI for finding and reconstructing ready-made React UI components from a separately installed local catalog. It preserves complete stored code and reports dependencies, unresolved local imports, external-resource identities, completeness, and diagnostics instead of making unsupported quality claims.

## Requirements

- Node.js 18 or newer
- This repository installed as a complete skill directory
- A cleaned UI Forge catalog extracted to a local directory

The catalog is a separate release asset, not committed to this repository and not a `.skill` installer. Building a catalog from the legacy source is reproducible with the included builder.

## Install the skill

Clone or copy the complete repository into your assistant's skills location. Do not copy only `SKILL.md`; the skill depends on adjacent `scripts/`, `lib/`, and `references/` directories.

- Codex: follow [adapters/codex.md](adapters/codex.md).
- Claude Code: follow [adapters/claude-code.md](adapters/claude-code.md).
- Other platforms: implement the narrow contract in [adapters/README.md](adapters/README.md) without forking the core workflow.

## Install and configure the local catalog

Extract the cleaned catalog asset to a directory you control, then use one of the discovery mechanisms:

```bash
node scripts/ui-forge.mjs validate --catalog "/path/to/catalog" --json
```

Or set `UI_FORGE_CATALOG`, add a project `.ui-forge.json`, add a user config, or use a documented common install directory. See [references/configuration.md](references/configuration.md) for precedence and Windows, macOS, and Linux locations.

## CLI

```bash
node scripts/ui-forge.mjs validate [--catalog PATH] [--json]
node scripts/ui-forge.mjs search "animated button" [--category button] [--limit 3] [--include-incomplete] [--catalog PATH] [--json]
node scripts/ui-forge.mjs show "button/component--digest" [--catalog PATH] [--json]
```

`show` returns every original stored code block. If a record is incomplete, consumers must preserve those blocks and clearly distinguish generated reconstruction.

## Build a cleaned catalog

Use absolute, separate source and output paths:

```bash
node scripts/build-catalog.mjs --source "/absolute/legacy/source" --output "/absolute/clean/catalog" --json
```

The builder repairs recoverable data, groups duplicates by source identity, stores code once, removes runtime metadata URLs, emits deterministic reports and manifest bytes, validates temporary output, and promotes it atomically. It never edits the legacy source in place.

## Development

```bash
npm test
```

The runtime and tests use only Node built-in modules. Format and reconstruction details are documented progressively in [references/catalog-format.md](references/catalog-format.md) and [references/integration-workflow.md](references/integration-workflow.md). The category mapping has a single canonical copy in [references/categories.md](references/categories.md).

## 中文摘要

UI Forge 是平台中立的 React 现成组件发现与复原技能。技能代码和本地组件数据包相互独立；Codex 与 Claude Code 只提供薄适配层，共享同一套 Node 18+ CLI、数据规范和复原原则。请先安装完整技能目录，再解压本地 catalog，通过 `--catalog`、环境变量或配置文件发现它。`show` 会返回所有原始代码块；任何补全代码都必须明确标记为生成内容。
