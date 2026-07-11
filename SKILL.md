---
name: ui-forge
description: Use when the user explicitly asks to find, compare, select, or reuse ready-made React UI components, asks which existing React components are available from a local component catalog, or explicitly requests UI Forge; do not use for Vue, SwiftUI, native HTML, or other non-React component requests.
---

# UI Forge

Search the separately installed local catalog before generating a replacement. Activate only for an explicit request to discover or reuse existing React components, or when the user names UI Forge. Do not activate for ordinary UI creation, debugging, design review, non-React work, or inspiration-only browsing.

## Workflow

1. **Validate** the selected catalog once:
   ```bash
   node scripts/ui-forge.mjs validate --json
   ```
2. **Search** using the user's visual and functional intent. Add a category only when known:
   ```bash
   node scripts/ui-forge.mjs search "animated SaaS hero button" --category button --limit 3 --json
   ```
3. **Show** one exact result ID to retrieve every stored code block:
   ```bash
   node scripts/ui-forge.mjs show "button/shimmer-button--a1b2c3d4" --json
   ```
4. **Inspect the project** for its React framework, package manager, aliases, styling, and existing dependencies.
5. **Integrate** the original catalog code, adapting paths and imports without silently replacing it. Clearly label any generated reconstruction or missing-file completion.
6. **Verify** with the project's own typecheck, tests, lint, or build.

Use `--catalog <path>` on any command for an explicit catalog. The same commands also support environment, project, user, and common-location discovery.

## Preserve Reconstruction Inputs

Treat every returned `code_blocks[].code` value as canonical source material. Preserve all available original blocks even when the component is incomplete. Report `dependencies`, `local_imports`, `external_assets`, `status`, `confidence`, and `diagnostics`. Never claim exact restoration when imports or implementation files remain unresolved.

## Load Details Only When Needed

- Read [references/configuration.md](references/configuration.md) for installation, catalog discovery, or path troubleshooting.
- Read [references/catalog-format.md](references/catalog-format.md) for schema, validation, catalog building, status, or source-policy maintenance.
- Read [references/categories.md](references/categories.md) only to map user language to a category or broaden a search.
- Read [references/integration-workflow.md](references/integration-workflow.md) after selecting a component for project integration and verification.

## Common Failures

- **Catalog missing:** follow the checked-candidate diagnostics; do not invent records.
- **No result:** broaden the query or use reported related categories; say that the catalog had no match.
- **Incomplete component:** return all original blocks and diagnostics, then label any generated reconstruction.
- **Unresolved imports:** inspect project aliases and files before changing paths or adding packages.
