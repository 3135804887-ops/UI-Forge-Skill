# Example: Reusing a UI Forge Button in a SaaS Landing Page

This example is deliberately narrow: it finds one existing React button for a hero and records what still has to be reconstructed. It does not claim that the catalog entry is tested or ready for a target project.

## Prompt

> Explicitly use UI Forge to find and reuse a ready-made React animated button for a SaaS landing-page hero. Preserve catalog original code, label any generated reconstruction, and report missing files before integration.

Set `<CATALOG>` to a cleaned local catalog produced by `build-catalog.mjs` or extracted from a future cleaned release asset.

## 1. Validate

```bash
node scripts/ui-forge.mjs validate --catalog "<CATALOG>" --json
```

Verified local evidence: schema 1, 3,455 records, no validation errors or warnings.

## 2. Search with the default status filter

```bash
node scripts/ui-forge.mjs search "animated SaaS hero button" --category button --limit 3 --catalog "<CATALOG>" --json
```

The verified catalog returns no default result. This is expected: matching button records are `incomplete`, and default search excludes incomplete entries. Do not invent a complete match.

Retry only after accepting reconstruction work:

```bash
node scripts/ui-forge.mjs search "animated SaaS hero button" --category button --limit 5 --include-incomplete --catalog "<CATALOG>" --json
```

One observed candidate is `button/motion-button--64c491c2` (`Motion Button`).

## 3. Retrieve the exact inventory

```bash
node scripts/ui-forge.mjs show "button/motion-button--64c491c2" --catalog "<CATALOG>" --json
```

Observed inventory:

- status: `incomplete`; confidence: `0.5`
- dependencies: none declared
- unresolved local import: `../components/ui/motion-button`
- diagnostic: `UNRESOLVED_LOCAL_IMPORT`
- code blocks: one JSX `usage` block; no implementation block
- suggested path: `examples/demo-demo.jsx`
- original code SHA-256: `222ba53d131653ad042862610f0ca860622f312e020d943520269b0aa281e1ae`

The hash summarizes the observed block without duplicating its source here. The missing implementation means this is not an exact restoration.

## 4. Separate source from inference

### Catalog original

Save the single returned `code_blocks[0].code` byte-for-byte in an original-only directory. Keep its role, language, index, hash, unresolved import, and diagnostic in an inventory. Do not add a trailing newline or rewrite imports silently.

### Generated reconstruction

If the project does not already contain `motion-button`, create the missing implementation only in a separate generated area and label every inferred file and assumption as `Generated reconstruction`. Inspect the target project's React version, aliases, styling, package manager, and existing dependencies before choosing its API or adding packages.

After integration, run the target project's real typecheck, tests, lint, and build. Those project commands—not this catalog example—determine whether the reconstruction works.

## Evidence boundary

The forward evaluation also used an offline structural verifier to compare original bytes, check generated/original directory separation, and inspect a dependency-free element data shape. That verifier is not a JSX compiler, React runtime, TypeScript compiler, or bundler. Its scripts happened to be named `build` and `typecheck`, but those names do not provide compilation or runtime evidence.
