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

test("frontmatter itself excludes non-React options and framework migrations", async () => {
  const skill = await read("SKILL.md");
  const description = skill.match(/^description: (.+)$/m)?.[1];
  assert.equal(
    description,
    "Use when the user explicitly asks to find, compare, select, or reuse ready-made React UI components, asks which existing React components are available from a local component catalog, or explicitly requests UI Forge; do not use for framework migrations even when React is the target, or for Vue, SwiftUI, native HTML, or other non-React component requests.",
  );
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

test("README distinguishes the current legacy archive from a future cleaned asset", async () => {
  const readme = await read("README.md");
  assert.match(readme, /current GitHub Release asset is the legacy source archive/i);
  assert.match(readme, /cannot be passed directly to `validate`, `search`, or `show`/i);
  assert.match(readme, /build-catalog\.mjs --source .* --output/i);
  assert.match(readme, /future release may publish the cleaned catalog/i);
  assert.doesNotMatch(readme, /Extract the cleaned catalog asset to a directory you control/i);
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

test("landing-page example is a reproducible catalog reconstruction walkthrough", async () => {
  const example = await read("examples/landing-page.md");
  assert.match(example, /explicitly use UI Forge.*ready-made React/i);
  assert.match(example, /ui-forge\.mjs validate/);
  assert.match(example, /default search.*incomplete/i);
  assert.match(example, /--include-incomplete/);
  assert.match(example, /button\/motion-button--64c491c2/);
  assert.match(example, /suggested path: `examples\/demo-demo\.jsx`/);
  assert.match(example, /status.*incomplete.*confidence.*0\.5/is);
  assert.match(example, /UNRESOLVED_LOCAL_IMPORT/);
  assert.match(example, /222ba53d131653ad042862610f0ca860622f312e020d943520269b0aa281e1ae/);
  assert.match(example, /Catalog original/);
  assert.match(example, /Generated reconstruction/);
  assert.match(example, /offline structural verifier/i);
  assert.match(example, /not.*(?:JSX compiler|React runtime|TypeScript compiler|bundler)/is);
  assert.doesNotMatch(example, /production-ready|fully responsive|accessibility built-in|high-converting/i);
});

test("forward evidence labels structural checks without overstating compilation", async () => {
  const evidence = await read("docs/ai-context/evals/forward-tests.md");
  assert.match(evidence, /offline structural verifier/i);
  assert.match(evidence, /not.*(?:JSX compiler|React runtime|TypeScript compiler|bundler)/is);
  assert.match(evidence, /worktree path.*branch evaluation/i);
});
