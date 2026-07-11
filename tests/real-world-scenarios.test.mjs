import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createFixtureCatalog, makeTempDir, runNode, writeJson } from "./helpers.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildCli = path.join(repositoryRoot, "scripts", "build-catalog.mjs");
const runtimeCli = path.join(repositoryRoot, "scripts", "ui-forge.mjs");
const packageCli = path.join(repositoryRoot, "scripts", "package-catalog.mjs");

function metadataUrls(value, currentPath = []) {
  if (typeof value === "string") {
    if (currentPath.at(-1) === "code" && currentPath.at(-3) === "code_blocks") return [];
    return /https?:\/\//i.test(value) ? [currentPath.join(".")] : [];
  }
  if (Array.isArray(value)) return value.flatMap((item, index) => metadataUrls(item, [...currentPath, index]));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => metadataUrls(item, [...currentPath, key]));
  }
  return [];
}

function distinctRecord(label, digit) {
  return {
    schema_version: 1,
    id: `button/catalog-${label}--${digit.repeat(8)}`,
    title: `Catalog ${label}`,
    description: `Unique ${label} discovery marker.`,
    category: "button",
    source: { provider: "fixture", author: "discovery", slug: `catalog-${label}` },
    source_id: `sha256:${digit.repeat(64)}`,
    status: "complete",
    confidence: 1,
    dependencies: [],
    local_imports: [],
    external_assets: [],
    code_blocks: [{ index: 0, language: "js", role: "component", suggested_path: `catalog-${label}.js`, code: `export const catalog = "${label}";` }],
    diagnostics: [],
  };
}

test("real workflow builds, discovers, searches, shows, and packages reconstruction inputs deterministically", async (t) => {
  const root = await makeTempDir("ui-forge-forward-");
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, "legacy-source");
  const catalogA = path.join(root, "catalog-a");
  const catalogB = path.join(root, "catalog-b");
  await cp(path.join(repositoryRoot, "tests", "fixtures", "source"), source, { recursive: true });
  const functionalUrl = "https://cdn.example/assets/glow.png";
  const functionalCode = "import { cn } from '@/lib/utils';\nconst texture = 'https://cdn.example/assets/glow.png';\nexport function RemoteGlow() { return <button className={cn('glow')} style={{ backgroundImage: `url(${texture})` }}>Start</button>; }";
  await writeJson(path.join(source, "button", "Remote_Glow.json"), {
    url: "https://catalog.example/@fixture/components/remote-glow",
    title: "Remote Glow Button",
    description: "An animated button with a functional image resource.",
    category: "button",
    code_blocks: [
      functionalCode,
    ],
    scraped_at: "2026-01-01T00:00:00Z",
  });

  const buildA = await runNode([buildCli, "--source", source, "--output", catalogA, "--json"]);
  const buildB = await runNode([buildCli, "--source", source, "--output", catalogB, "--json"]);
  assert.equal(buildA.code, 0, buildA.stderr);
  assert.equal(buildB.code, 0, buildB.stderr);
  assert.equal(JSON.parse(buildA.stdout).manifest_digest, JSON.parse(buildB.stdout).manifest_digest);
  assert.deepEqual(await readFile(path.join(catalogA, "manifest.json")), await readFile(path.join(catalogB, "manifest.json")));

  const validate = await runNode([runtimeCli, "validate", "--catalog", catalogA, "--json"]);
  assert.equal(validate.code, 0, validate.stderr);
  assert.equal(JSON.parse(validate.stdout).valid, true);

  const discoveryRecords = {
    cli: distinctRecord("cli", "1"),
    env: distinctRecord("env", "2"),
    outer: distinctRecord("project-outer", "3"),
    inner: distinctRecord("project-inner", "4"),
  };
  const discoveryCatalogs = {};
  for (const [name, record] of Object.entries(discoveryRecords)) {
    discoveryCatalogs[name] = await createFixtureCatalog(path.join(root, `catalog-${name}`), [record]);
  }
  const project = path.join(root, "project");
  const innerProject = path.join(project, "packages", "app");
  const nested = path.join(innerProject, "src");
  const outerOnlyCwd = path.join(project, "other");
  await Promise.all([mkdir(nested, { recursive: true }), mkdir(outerOnlyCwd, { recursive: true })]);
  await writeJson(path.join(project, ".ui-forge.json"), { catalog: path.relative(project, discoveryCatalogs.outer) });
  await writeJson(path.join(innerProject, ".ui-forge.json"), { catalog: path.relative(innerProject, discoveryCatalogs.inner) });

  const showDiscovered = async (record, args, env, cwd = nested) => {
    const result = await runNode([runtimeCli, "show", record.id, ...args, "--json"], { cwd, env: { ...process.env, UI_FORGE_CATALOG: "", ...env } });
    assert.equal(result.code, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).component.title, record.title);
  };
  await showDiscovered(discoveryRecords.cli, ["--catalog", discoveryCatalogs.cli], { UI_FORGE_CATALOG: discoveryCatalogs.env });
  await showDiscovered(discoveryRecords.env, [], { UI_FORGE_CATALOG: discoveryCatalogs.env });
  await showDiscovered(discoveryRecords.inner, [], {});
  await showDiscovered(discoveryRecords.outer, [], {}, outerOnlyCwd);

  const search = await runNode([runtimeCli, "search", "animated button", "--include-incomplete", "--json"], {
    cwd: repositoryRoot,
    env: { ...process.env, UI_FORGE_CATALOG: catalogA },
  });
  assert.equal(search.code, 0, search.stderr);
  const results = JSON.parse(search.stdout).results;
  assert.ok(results.length > 0);
  assert.equal(results.some((result) => "code_blocks" in result), false);
  const selected = results.find(({ title }) => title === "Shimmer Button");
  assert.ok(selected, "the realistic search must find the fixture component without an expected ID");

  const show = await runNode([runtimeCli, "show", selected.id, "--json"], {
    cwd: repositoryRoot,
    env: { ...process.env, UI_FORGE_CATALOG: catalogA },
  });
  assert.equal(show.code, 0, show.stderr);
  const component = JSON.parse(show.stdout).component;
  assert.deepEqual(component.code_blocks, [
    {
      index: 0,
      language: "tsx",
      role: "component",
      suggested_path: "components/shimmer-button.tsx",
      code: "export interface ShimmerButtonProps { label: string; }\nexport function ShimmerButton({ label }: ShimmerButtonProps) { return <button>{label}</button>; }",
    },
    {
      index: 1,
      language: "jsx",
      role: "usage",
      suggested_path: "examples/example-demo.jsx",
      code: "import { ShimmerButton } from \"./ShimmerButton\";\nexport function Example() { return <ShimmerButton label=\"Save\" />; }",
    },
  ]);
  for (const block of component.code_blocks) assert.doesNotMatch(block.code, /\r?\n$/);
  assert.deepEqual(component.local_imports, ["./ShimmerButton"]);

  const reconstruction = path.join(root, "reconstruction");
  const originals = path.join(reconstruction, "catalog-original");
  const generated = path.join(reconstruction, "generated");
  await mkdir(originals, { recursive: true });
  await mkdir(generated, { recursive: true });
  for (const block of component.code_blocks) {
    await writeFile(path.join(originals, `block-${String(block.index).padStart(3, "0")}.${block.language}`), block.code, "utf8");
  }
  await writeJson(path.join(generated, "inventory.generated.json"), { label: "Generated reconstruction", original_block_count: component.code_blocks.length });
  await writeFile(path.join(generated, "README.generated.md"), "# Generated reconstruction\n\nThis directory is inferred output, not catalog original code.\n", "utf8");
  assert.deepEqual((await readdir(reconstruction)).sort(), ["catalog-original", "generated"]);
  assert.deepEqual((await readdir(generated)).sort(), ["README.generated.md", "inventory.generated.json"]);
  for (const block of component.code_blocks) {
    const original = await readFile(path.join(originals, `block-${String(block.index).padStart(3, "0")}.${block.language}`));
    assert.deepEqual(original, Buffer.from(block.code));
    assert.doesNotMatch(original.toString("utf8"), /Generated reconstruction/);
  }
  for (const file of ["inventory.generated.json", "README.generated.md"]) {
    assert.match(await readFile(path.join(generated, file), "utf8"), /Generated reconstruction/);
  }

  const defaultResourceSearch = await runNode([runtimeCli, "search", "remote glow", "--catalog", catalogA, "--json"]);
  assert.equal(defaultResourceSearch.code, 0, defaultResourceSearch.stderr);
  assert.deepEqual(JSON.parse(defaultResourceSearch.stdout).results, []);
  const resourceSearch = await runNode([runtimeCli, "search", "remote glow", "--include-incomplete", "--catalog", catalogA, "--json"]);
  assert.equal(resourceSearch.code, 0, resourceSearch.stderr);
  const resourceResult = JSON.parse(resourceSearch.stdout).results[0];
  assert.ok(resourceResult);
  const resourceId = resourceResult.id;
  const resourceShow = await runNode([runtimeCli, "show", resourceId, "--catalog", catalogA, "--json"]);
  const resource = JSON.parse(resourceShow.stdout).component;
  assert.deepEqual(metadataUrls(resource), []);
  assert.equal(resource.code_blocks[0].code, functionalCode);
  assert.deepEqual(resource.local_imports, ["@/lib/utils"]);
  assert.deepEqual(resource.external_assets, [`sha256:${createHash("sha256").update(functionalUrl).digest("hex")}`]);

  const firstZip = path.join(root, "first.zip");
  const secondZip = path.join(root, "second.zip");
  const packageA = await runNode([packageCli, "--source", catalogA, "--output", firstZip, "--json"]);
  const packageB = await runNode([packageCli, "--source", catalogB, "--output", secondZip, "--json"]);
  assert.equal(packageA.code, 0, packageA.stderr);
  assert.equal(packageB.code, 0, packageB.stderr);
  assert.equal(JSON.parse(packageA.stdout).sha256, JSON.parse(packageB.stdout).sha256);
  assert.deepEqual(await readFile(firstZip), await readFile(secondZip));
});

test("repository exposes cross-platform automated validation", async () => {
  const packageJson = JSON.parse(await readFile(path.join(repositoryRoot, "package.json"), "utf8"));
  assert.equal(packageJson.scripts.check, "node --test");

  const workflow = await readFile(path.join(repositoryRoot, ".github", "workflows", "validate.yml"), "utf8");
  assert.match(workflow, /os: \[ubuntu-latest, windows-latest, macos-latest\]/);
  assert.match(workflow, /node-version: \[18, 20, 22\]/);
  assert.match(workflow, /run: npm run check/);
});
