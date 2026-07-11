import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import {
  createFixtureCatalog,
  makeTempDir,
  runNode,
  writeJson,
} from "./helpers.mjs";

const records = [
  {
    schema_version: 1,
    id: "button/zeta--22222222",
    title: "Zeta",
    description: "Zeta button.",
    category: "button",
    source: { provider: "fixture", author: "maker", slug: "zeta" },
    source_id: `sha256:${"2".repeat(64)}`,
    status: "complete",
    confidence: 1,
    dependencies: [],
    local_imports: [],
    external_assets: [],
    code_blocks: [{ index: 0, language: "js", role: "component", suggested_path: "zeta.js", code: "export const zeta = true;" }],
    diagnostics: [],
  },
  {
    schema_version: 1,
    id: "button/alpha--11111111",
    title: "Alpha",
    description: "Alpha button.",
    category: "button",
    source: { provider: "fixture", author: "maker", slug: "alpha" },
    source_id: `sha256:${"1".repeat(64)}`,
    status: "complete",
    confidence: 1,
    dependencies: [],
    local_imports: [],
    external_assets: [],
    code_blocks: [{ index: 0, language: "js", role: "component", suggested_path: "alpha.js", code: "export const alpha = true;" }],
    diagnostics: [],
  },
];

test("writeJson creates parents and writes stable formatted JSON", async (t) => {
  const root = await makeTempDir();
  t.after(() => rm(root, { recursive: true, force: true }));
  const file = path.join(root, "nested", "value.json");
  await writeJson(file, { value: 1 });
  assert.equal(await readFile(file, "utf8"), "{\n  \"value\": 1\n}\n");
});

test("createFixtureCatalog writes sorted records and deterministic digests", async (t) => {
  const root = await makeTempDir();
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.equal(await createFixtureCatalog(root, records), root);
  const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
  assert.deepEqual(manifest.files.map((entry) => entry.id), [records[1].id, records[0].id]);
  for (const entry of manifest.files) {
    const contents = await readFile(path.join(root, "components", entry.path), "utf8");
    assert.equal(entry.sha256, createHash("sha256").update(contents).digest("hex"));
  }
  const base = { schema_version: 1, component_count: 2, files: manifest.files };
  assert.equal(manifest.digest, createHash("sha256").update(JSON.stringify(base)).digest("hex"));
});

test("runNode captures successful and failing child processes", async () => {
  const success = await runNode(["-e", "process.stdout.write('ok')"]);
  assert.equal(success.code, 0);
  assert.equal(success.stdout, "ok");
  const failure = await runNode(["-e", "process.stderr.write('bad'); process.exit(3)"]);
  assert.equal(failure.code, 3);
  assert.equal(failure.stderr, "bad");
});
