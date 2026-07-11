import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm, utimes } from "node:fs/promises";
import { join } from "node:path";

import { createDeterministicZip } from "../lib/deterministic-zip.mjs";
import { createFixtureCatalog, makeTempDir } from "./helpers.mjs";

const record = {
  schema_version: 1,
  id: "button/stable--a1b2c3d4",
  title: "Stable",
  description: "Stable archive fixture.",
  category: "button",
  source: { provider: "local", author: "fixture", slug: "stable" },
  source_id: `sha256:${"a".repeat(64)}`,
  status: "complete",
  confidence: 1,
  dependencies: [],
  local_imports: [],
  external_assets: [],
  code_blocks: [{ index: 0, language: "tsx", role: "component", suggested_path: "components/stable.tsx", code: "export const Stable = () => <button />;" }],
  diagnostics: [],
};

test("creates byte-identical ZIPs despite source mtimes", async (t) => {
  const root = await makeTempDir("ui-forge-package-");
  t.after(() => rm(root, { recursive: true, force: true }));
  const catalog = await createFixtureCatalog(join(root, "catalog"), [record]);
  const first = join(root, "first.zip");
  const second = join(root, "second.zip");

  const resultA = await createDeterministicZip({ sourcePath: catalog, outputPath: first });
  await utimes(join(catalog, "manifest.json"), new Date("2026-07-11T00:00:00Z"), new Date("2026-07-11T00:00:00Z"));
  const resultB = await createDeterministicZip({ sourcePath: catalog, outputPath: second });

  assert.deepEqual(await readFile(first), await readFile(second));
  assert.equal(resultA.sha256, resultB.sha256);
  assert.equal(resultA.file_count, 2);
  assert.equal(resultA.size, resultB.size);
});
