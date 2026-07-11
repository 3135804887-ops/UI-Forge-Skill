# Claude Code Adapter

Install the complete skill directory at either:

- Personal: `~/.claude/skills/ui-forge/SKILL.md`
- Project: `.claude/skills/ui-forge/SKILL.md`

The paths name the entry file; keep `scripts/`, `lib/`, and `references/` beside it. Claude Code uses the directory name for `/ui-forge`, reads the frontmatter description for automatic invocation, and supports bundled references and scripts. It invokes the same shared CLI from the skill directory:

```bash
node scripts/ui-forge.mjs validate --json
node scripts/ui-forge.mjs search "ready-made React card" --json
```

See the [official Claude Code skills documentation](https://docs.anthropic.com/en/docs/claude-code/skills) for platform behavior. Catalog records remain local and URL-free; this documentation link is not catalog metadata.

