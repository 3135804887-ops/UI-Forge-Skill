# Platform Adapter Contract

UI Forge has one platform-neutral `SKILL.md`, catalog schema, reconstruction policy, and Node CLI. An adapter may document an assistant's install location, invocation syntax, and platform metadata. It must not fork or copy the core trigger, workflow, schema, search behavior, or reconstruction rules.

Install the whole skill directory so `scripts/`, `lib/`, and `references/` remain adjacent to `SKILL.md`. Every adapter invokes the shared CLI with `node scripts/ui-forge.mjs` from the skill directory. The separately installed catalog is discovered through the same configuration contract on every assistant.

