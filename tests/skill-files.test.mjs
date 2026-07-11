import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("skill trigger is narrow and platform-neutral", async () => {
  const skill = await read("SKILL.md");
  assert.match(skill, /description: Use when .*ready-made React UI components.*UI Forge/i);
  assert.doesNotMatch(skill, /ALWAYS use|whenever.*frontend|F:\\|Glob pattern|Grep pattern/);
  assert.ok(skill.split(/\s+/).length <= 650);
});

test("skill routes detailed work to direct references", async () => {
  const skill = await read("SKILL.md");
  for (const file of ["configuration.md", "catalog-format.md", "categories.md", "integration-workflow.md"]) {
    assert.match(skill, new RegExp(`references/${file.replace(".", "\\.")}`));
  }
});

test("adapters invoke the shared CLI without copying core rules", async () => {
  const codex = await read("adapters/codex.md");
  const claude = await read("adapters/claude-code.md");
  for (const text of [codex, claude]) assert.match(text, /node scripts\/ui-forge\.mjs/);
  assert.match(claude, /\.claude\/skills\/ui-forge\/SKILL\.md/);
});

test("Codex metadata has only approved fields", async () => {
  const yaml = await read("agents/openai.yaml");
  assert.match(yaml, /display_name: "UI Forge"/);
  assert.match(yaml, /short_description: "Find and reconstruct local React UI components"/);
  assert.match(yaml, /default_prompt: "Use \$ui-forge/);
  assert.match(yaml, /allow_implicit_invocation: true/);
  assert.doesNotMatch(yaml, /^\s*(icon_|brand_color|mcp_)\w*:/m);
});

test("skill documentation has no personal path or unsupported quality claims", async () => {
  const paths = [
    "SKILL.md",
    "references/configuration.md",
    "references/catalog-format.md",
    "references/categories.md",
    "references/integration-workflow.md",
    "adapters/README.md",
    "adapters/codex.md",
    "adapters/claude-code.md",
  ];
  for (const path of paths) {
    const text = await read(path);
    assert.doesNotMatch(text, /F:\\|production-ready|tested components|accessibility built-in/i, path);
  }
});
