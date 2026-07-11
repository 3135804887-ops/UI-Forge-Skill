import assert from "node:assert/strict";
import { cp, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { makeTempDir, runNode, writeJson } from "./helpers.mjs";

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

test("real workflow builds, discovers, searches, shows, and packages reconstruction inputs deterministically", async (t) => {
  const root = await makeTempDir("ui-forge-forward-");
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, "legacy-source");
  const catalogA = path.join(root, "catalog-a");
  const catalogB = path.join(root, "catalog-b");
  await cp(path.join(repositoryRoot, "tests", "fixtures", "source"), source, { recursive: true });
  await writeJson(path.join(source, "button", "Remote_Glow.json"), {
    url: "https://catalog.example/@fixture/components/remote-glow",
    title: "Remote Glow Button",
    description: "An animated button with a functional image resource.",
    category: "button",
    code_blocks: [
      "import { cn } from '@/lib/utils';\nconst texture = 'https://cdn.example/assets/glow.png';\nexport function RemoteGlow() { return <button className={cn('glow')} style={{ backgroundImage: `url(${texture})` }}>Start</button>; }",
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

  const project = path.join(root, "project");
  const nested = path.join(project, "packages", "app");
  await mkdir(nested, { recursive: true });
  await writeJson(path.join(project, ".ui-forge.json"), { catalog: "../catalog-a" });

  const search = await runNode([runtimeCli, "search", "animated button", "--include-incomplete", "--json"], {
    cwd: nested,
    env: { ...process.env, UI_FORGE_CATALOG: catalogA },
  });
  assert.equal(search.code, 0, search.stderr);
  const results = JSON.parse(search.stdout).results;
  assert.ok(results.length > 0);
  assert.equal(results.some((result) => "code_blocks" in result), false);
  const selected = results.find(({ title }) => title === "Shimmer Button");
  assert.ok(selected, "the realistic search must find the fixture component without an expected ID");

  const show = await runNode([runtimeCli, "show", selected.id, "--json"], {
    cwd: nested,
    env: { ...process.env, UI_FORGE_CATALOG: "" },
  });
  assert.equal(show.code, 0, show.stderr);
  const component = JSON.parse(show.stdout).component;
  assert.equal(component.code_blocks.length, 2);
  assert.ok(component.code_blocks.some(({ code }) => code.includes("export interface ShimmerButtonProps")));
  assert.ok(component.code_blocks.some(({ code }) => code.includes("import { ShimmerButton } from \"./ShimmerButton\"")));
  assert.deepEqual(component.local_imports, ["./ShimmerButton"]);

  const resourceSearch = await runNode([runtimeCli, "search", "remote glow", "--include-incomplete", "--catalog", catalogA, "--json"]);
  assert.equal(resourceSearch.code, 0, resourceSearch.stderr);
  const resourceResult = JSON.parse(resourceSearch.stdout).results[0];
  assert.ok(resourceResult);
  const resourceId = resourceResult.id;
  const resourceShow = await runNode([runtimeCli, "show", resourceId, "--catalog", catalogA, "--json"]);
  const resource = JSON.parse(resourceShow.stdout).component;
  assert.deepEqual(metadataUrls(resource), []);
  assert.match(resource.code_blocks[0].code, /https:\/\/cdn\.example\/assets\/glow\.png/);
  assert.deepEqual(resource.local_imports, ["@/lib/utils"]);
  assert.equal(resource.external_assets.length, 1);

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
