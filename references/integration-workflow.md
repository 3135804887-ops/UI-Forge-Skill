# Integration Workflow

Use this reference after `show` returns the selected record.

## Inspect before writing

Identify the project's React framework and version, package manager, TypeScript settings, module aliases, styling system, component conventions, and existing dependency versions. Compare each returned `suggested_path` and `local_import` with real project files. A catalog alias such as `@/` is a clue, not proof that the target project uses it.

## Preserve and adapt

Keep an inventory of every original code block by index, role, language, and suggested path. Copy source material before adapting imports, paths, framework directives, styling tokens, or public props. Install only dependencies listed by the selected record that the project does not already satisfy, and use the project's package manager with user authorization.

If the record is `incomplete` or diagnostics identify missing files, separate the result into:

- **Catalog code:** ungenerated source returned by `show`.
- **Generated reconstruction:** new glue, missing local modules, inferred styles, or compatibility changes.

Do not overwrite or paraphrase away an original block merely because reconstruction is required. State unresolved assumptions and preserve functional URLs embedded in code when they are necessary to reproduce behavior.

## Verify in the target project

Run the narrowest relevant existing checks, then broaden as risk warrants: TypeScript/typecheck, focused tests, lint, and build. Exercise interaction states when possible. A successful catalog validation proves data integrity only; it does not prove that a component works in a particular application. Report which checks ran, their results, and any remaining unresolved imports or runtime assumptions.

