import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadCatalog, validateCatalog } from "../lib/catalog-loader.mjs";
import { createFixtureCatalog, makeTempDir, writeJson } from "./helpers.mjs";

const recordA = makeRecord("button/alpha--11111111", "Alpha", "1");
const recordB = makeRecord("button/zeta--22222222", "Zeta", "2");

function makeRecord(id, title, hashCharacter) {
  return {
    schema_version: 1,
    id,
    title,
    description: `${title} component.`,
    category: id.split("/")[0],
    source: { provider: "fixture", author: "maker", slug: title.toLowerCase() },
    source_id: `sha256:${hashCharacter.repeat(64)}`,
    status: "complete",
    confidence: 1,
    dependencies: [],
    local_imports: [],
    external_assets: [],
    code_blocks: [{ index: 0, language: "js", role: "component", suggested_path: `${title.toLowerCase()}.js`, code: `export const ${title.toLowerCase()} = true;` }],
    diagnostics: [],
  };
}

async function withCatalog(t, records = [recordA]) {
  const root = await makeTempDir();
  t.after(() => rm(root, { recursive: true, force: true }));
  await createFixtureCatalog(root, records);
  return root;
}

test("loads manifest files in deterministic path order", async (t) => {
  const root = await withCatalog(t, [recordB, recordA]);
  const loaded = await loadCatalog(root);
  assert.deepEqual(loaded.records.map((x) => x.id), [recordA.id, recordB.id].sort());
  assert.equal(loaded.path, path.resolve(root));
  assert.deepEqual(loaded.errors, []);
  assert.deepEqual(loaded.warnings, []);
});

test("rejects unsupported manifests as structured validation errors", async (t) => {
  const root = await withCatalog(t);
  const manifestFile = path.join(root, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  await writeJson(manifestFile, { ...manifest, schema_version: 99 });

  await assert.rejects(loadCatalog(root), { code: "UNSUPPORTED_SCHEMA_VERSION" });
  const result = await validateCatalog(root);
  assert.equal(result.valid, false);
  assert.equal(result.errors[0].code, "UNSUPPORTED_SCHEMA_VERSION");
});

test("rejects duplicate component IDs", async (t) => {
  const root = await withCatalog(t, [recordA, recordB]);
  const manifestFile = path.join(root, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  const secondFile = path.join(root, "components", manifest.files[1].path);
  const duplicateContents = `${JSON.stringify({ ...recordA, title: "Duplicate" }, null, 2)}\n`;
  await writeFile(secondFile, duplicateContents, "utf8");
  manifest.files[1].sha256 = createHash("sha256").update(duplicateContents).digest("hex");
  const base = { schema_version: manifest.schema_version, component_count: manifest.component_count, files: manifest.files };
  manifest.digest = createHash("sha256").update(JSON.stringify(base)).digest("hex");
  await writeJson(manifestFile, manifest);

  const result = await validateCatalog(root);
  assert.equal(result.valid, false);
  assert.equal(result.errors[0].code, "DUPLICATE_ID");
});

test("reports file digest mismatches without throwing from validateCatalog", async (t) => {
  const root = await withCatalog(t);
  const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
  await writeFile(path.join(root, "components", manifest.files[0].path), "{}\n", "utf8");

  await assert.rejects(loadCatalog(root), { code: "FILE_DIGEST_MISMATCH" });
  const result = await validateCatalog(root);
  assert.equal(result.valid, false);
  assert.equal(result.errors[0].code, "FILE_DIGEST_MISMATCH");
});

test("preserves parse and unreadable catalog error codes", async (t) => {
  const root = await withCatalog(t);
  await writeFile(path.join(root, "manifest.json"), "{broken", "utf8");
  assert.equal((await validateCatalog(root)).errors[0].code, "CATALOG_PARSE_ERROR");

  const missing = path.join(root, "missing");
  const result = await validateCatalog(missing);
  assert.equal(result.valid, false);
  assert.equal(result.errors[0].code, "CATALOG_NOT_FOUND");
});
