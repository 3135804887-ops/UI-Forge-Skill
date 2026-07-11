import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, symlink, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { computeManifestDigest, normalizeComponentPath } from "../lib/catalog-integrity.mjs";
import { validateCatalog } from "../lib/catalog-loader.mjs";
import { createFixtureCatalog, makeTempDir, writeJson } from "./helpers.mjs";

const record = {
  schema_version: 1,
  id: "button/secure--a1b2c3d4",
  title: "Secure",
  description: "Secure loader fixture.",
  category: "button",
  source: { provider: "local", author: "fixture", slug: "secure" },
  source_id: `sha256:${"a".repeat(64)}`,
  status: "complete",
  confidence: 1,
  dependencies: [],
  local_imports: [],
  external_assets: [],
  code_blocks: [{ index: 0, language: "tsx", role: "component", suggested_path: "secure.tsx", code: "export const Secure = true;" }],
  diagnostics: [],
};

for (const unsafe of ["button\\secure.json", "./button/secure.json", "button/./secure.json", "button/../secure.json", "/button/secure.json", "C:/button/secure.json", "button//secure.json"]) {
  test(`strictly rejects non-canonical component path ${unsafe}`, () => {
    assert.throws(() => normalizeComponentPath(unsafe), { code: "INVALID_COMPONENT_PATH" });
  });
}

test("rejects a manifest component reached through a junction outside components", async (t) => {
  const root = await makeTempDir("ui-forge-loader-security-");
  t.after(() => rm(root, { recursive: true, force: true }));
  await createFixtureCatalog(root, [record]);
  const manifestFile = path.join(root, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  const original = path.join(root, "components", manifest.files[0].path);
  const outside = path.join(root, "outside");
  await mkdir(outside);
  const contents = await readFile(original);
  await writeFile(path.join(outside, "secure.json"), contents);
  await mkdir(path.dirname(original), { recursive: true });
  await symlink(outside, path.join(root, "components", "linked"), "junction");
  manifest.files[0].path = "linked/secure.json";
  manifest.files[0].sha256 = createHash("sha256").update(contents).digest("hex");
  manifest.digest = computeManifestDigest(manifest.files);
  await writeJson(manifestFile, manifest);

  const result = await validateCatalog(root);
  assert.equal(result.valid, false);
  assert.equal(result.errors[0].code, "UNSAFE_COMPONENT_FILE");
});

test("rejects a symlinked manifest component as non-regular", async (t) => {
  const root = await makeTempDir("ui-forge-loader-symlink-");
  t.after(() => rm(root, { recursive: true, force: true }));
  await createFixtureCatalog(root, [record]);
  const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
  const component = path.join(root, "components", manifest.files[0].path);
  const target = path.join(root, "outside.json");
  await writeFile(target, await readFile(component));
  await unlink(component);
  await symlink(target, component, "file");

  const result = await validateCatalog(root);
  assert.equal(result.valid, false);
  assert.equal(result.errors[0].code, "UNSAFE_COMPONENT_FILE");
});

test("reports a missing components root with a structured code", async (t) => {
  const root = await makeTempDir("ui-forge-loader-missing-root-");
  t.after(() => rm(root, { recursive: true, force: true }));
  await createFixtureCatalog(root, [record]);
  await rm(path.join(root, "components"), { recursive: true });
  const result = await validateCatalog(root);
  assert.equal(result.valid, false);
  assert.equal(result.errors[0].code, "MISSING_CATALOG_ENTRY");
});
