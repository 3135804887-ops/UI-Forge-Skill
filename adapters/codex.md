# Codex Adapter

Copy or clone the complete repository directory into a Codex skills location using the installation mechanism supported by your Codex environment. Keep the directory name `ui-forge` and preserve its internal layout; do not copy only `SKILL.md`.

`agents/openai.yaml` supplies Codex-specific display and invocation metadata. It does not change the platform-neutral core. Codex runs the same commands from the skill directory, beginning with:

```bash
node scripts/ui-forge.mjs validate --json
node scripts/ui-forge.mjs search "ready-made React button" --json
```

Configure the separate local catalog as described in `references/configuration.md`. No user-specific absolute path belongs in the adapter or skill.

