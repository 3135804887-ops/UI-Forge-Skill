# UI Forge Forward Tests

Date: 2026-07-11

## Fresh-context catalog selection

Prompt supplied to an independent agent, without expected IDs:

```text
Use $ui-forge at D:\Backup\Documents\Skill-develop\UI-Forge-Skill\.worktrees\ui-forge-first-round with catalog C:\tmp\ui-forge-components-v1.1.0-clean. Find a reusable animated React button for a SaaS hero. Return the selected component's original code inventory, dependencies, unresolved local imports, and a project integration plan. Clearly separate catalog code from any code you generate. Do not modify files.
```

Observed CLI sequence:

1. `validate --catalog ... --json` succeeded for schema 1 with 3,455 components and no errors or warnings.
2. Default `search` attempts for animated/SaaS/button terms returned no button records because the matching records are `incomplete` and default search excludes that status.
3. The agent broadened explicitly with `--include-incomplete`, compared real results, selected `button/motion-button--64c491c2`, and used exact-ID `show`.

Selected inventory: one original `usage` JSX block, no declared package dependencies, unresolved local import `../components/ui/motion-button`, no external assets, status `incomplete`, confidence `0.5`, and one `UNRESOLVED_LOCAL_IMPORT` diagnostic. The agent generated no code and did not modify files. Its integration plan preserved the original block, required the missing implementation to be separately labeled as generated reconstruction, deferred dependency installation until that implementation is known, and required target-project checks.

Criteria:

- PASS — ran `validate`, `search`, and `show` against the supplied catalog.
- PASS — selected an ID from observed results rather than an expected answer.
- PASS — reported the stored code inventory and unresolved import without inventing a catalog file.
- PASS — clearly separated catalog code from generated code; no code was generated.
- PASS — did not claim exact restoration or project verification.
- NOTE — the full catalog currently has no default-search animated button candidate; a usable implementation still requires labeled reconstruction or another query/category choice.

## Incomplete-component reconstruction fixture

An independent agent received the real incomplete ID `button/animated-button--02ab4c4a` and permission to write only under `C:\tmp\ui-forge-forward-incomplete`.

Observed evidence:

- `validate` and exact-ID `show` identified one original JSX `usage` block, no package dependencies, unresolved `@/components/ui/animated-button`, status `incomplete`, confidence `0.5`, and `UNRESOLVED_LOCAL_IMPORT`.
- The original block was saved unchanged as `catalog-original/block-000.jsx`; `inventory.json` records its role and suggested path without duplicating code in generated metadata.
- All inferred work was placed under `generated/`: a minimal button, a React-like offline shim, an explicitly generated `React.createElement` demo, verification code, and an assumptions document.
- The fixture installed no package and made no network request. Its cross-platform `npm run build` and `npm run typecheck` both ran `node ./generated/verify-fixture.mjs` and printed `fixture verification passed`.
- An initial RED comparison found that the saved original block had gained a trailing line feed. The agent removed it, then the final verifier confirmed byte-for-byte equality with the `show` code value, including the absence of a trailing newline.
- No file inside the skill repository was modified by this scenario.

Criteria:

- PASS — preserved every original block separately from generated completion.
- PASS — labeled generated files and stated unresolved assumptions.
- PASS — retained the local-import diagnostic instead of claiming exact recovery.
- PASS — ran the fixture build successfully outside the repository.

## Automated end-to-end regression

`tests/real-world-scenarios.test.mjs` creates a lightweight legacy source and verifies the full local lifecycle:

- two independent builds have the same manifest digest and bytes;
- explicit CLI, environment, and nearest project config discovery all reach the expected catalog;
- `validate → search → show` returns code-free summaries followed by all original reconstruction blocks and unresolved local imports;
- runtime metadata is URL-free while a functional code URL remains exact and is represented by a hashed external asset identity;
- two independently packaged catalogs have identical ZIP bytes and SHA-256 values;
- the repository exposes `npm run check` and a Windows/macOS/Linux Node 18+ CI matrix.

TDD evidence: after the scenario expectations were aligned with the intentional unresolved-import contract, the realistic lifecycle passed and the automatic-validation assertion remained RED because no `check` script existed. Adding the package script and CI workflow made the focused suite 2/2 and the full suite 91/91.

## Follow-up

No runtime behavior change was required by the two independent evaluations. Future catalog releases should consider whether enough complete button implementations exist for default-status search; assistants must continue to opt into incomplete results and label reconstruction when none do.
