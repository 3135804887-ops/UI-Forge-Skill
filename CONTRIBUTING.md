# Contributing to UI Forge

UI Forge consists of a platform-neutral Node 18+ core, a separately installed local catalog, and thin assistant adapters. Keep core behavior in `lib/`, `scripts/`, `SKILL.md`, and `references/`; adapters may describe installation and invocation but must not fork the trigger, schema, search, or reconstruction rules.

## Development checks

The project has no runtime dependencies. Run the same cross-platform command used by CI:

```bash
npm run check
```

`npm test` is an equivalent local test entry. Before submitting a change, also run the skill validator available in your environment and `git diff --check`.

## Test-driven changes

For every feature or bug fix:

1. Add the smallest failing Node test and record the observed RED failure.
2. Implement only enough behavior to make it pass.
3. Run the focused test, then the complete suite.
4. Update public-interface documentation and `docs/ai-context/` when behavior, schema, configuration, or release output changes.

Trigger changes must retain the original bilingual baseline in `tests/skill-trigger-cases.json`, add adversarial cases rather than rewriting old prompts, and verify both activation and non-activation. CLI changes must test stable JSON, human output, stderr/stdout boundaries, and exit codes.

## Catalog builder fixtures

Never commit the full catalog, generated catalog directories, ZIPs, or checksums. Add only minimal anonymized legacy fixtures under `tests/fixtures/source/` that reproduce one behavior. Preserve realistic legacy shapes, including string code blocks, truncated JSON, companion files, and duplicate source records when relevant.

The source fixture is immutable input. Build tests must use temporary output directories and verify:

- the source remains unchanged;
- identical inputs produce identical records, manifests, reports, and packages;
- every accepted or rejected source is accounted for;
- complete original code remains available through `show`;
- generated completion is never written into canonical catalog records.

To exercise the real conversion flow outside Git:

```bash
node scripts/build-catalog.mjs --source "/absolute/legacy/source" --output "/absolute/clean/catalog" --json
node scripts/ui-forge.mjs validate --catalog "/absolute/clean/catalog" --json
node scripts/package-catalog.mjs --source "/absolute/clean/catalog" --output "/absolute/ui-forge-components.zip" --json
```

Source and output must be distinct absolute paths. Do not edit the legacy source in place.

## Runtime data policy

Runtime component records follow schema version 1 in `references/catalog-format.md`. Metadata must contain no URL. Non-clickable provenance is limited to `provider`, `author`, `slug`, and hashed `source_id`. A functional URL may remain only inside canonical `code_blocks[].code`; `external_assets` and diagnostics use hash identities.

Store component code only once in `code_blocks[].code`. Do not reintroduce `_code_*.txt` output. Preserve all usable original blocks, dependencies, local imports, assets, status, confidence, and diagnostics so consumers can reconstruct incomplete components honestly.

## Documentation and adapters

Keep `SKILL.md` concise and route detailed material to direct files in `references/`. Do not add personal absolute paths, platform-specific pseudo-tools, unsupported quality claims, or duplicated category tables. Codex and Claude Code adapters must continue to invoke `node scripts/ui-forge.mjs` and use the shared discovery precedence.

Pull requests should explain the behavior change, RED/GREEN evidence, commands run, any shared-interface impact, and whether generated release artifacts were intentionally kept outside Git.
