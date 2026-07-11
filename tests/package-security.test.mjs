import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, rename, rm, symlink, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { packageCatalog, pathsReferToSameLocation } from "../lib/deterministic-zip.mjs";
import { runPackageCli } from "../scripts/package-catalog.mjs";
import { createFixtureCatalog, makeTempDir } from "./helpers.mjs";

const record = {
  schema_version: 1,
  id: "button/secure--a1b2c3d4",
  title: "Secure",
  description: "Secure package fixture.",
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

async function fixture(t) {
  const root = await makeTempDir("ui-forge-package-security-");
  t.after(() => rm(root, { recursive: true, force: true }));
  const catalog = await createFixtureCatalog(path.join(root, "catalog"), [record]);
  return { root, catalog, output: path.join(root, "catalog.zip") };
}

test("compares prospective physical path identity with platform case semantics", () => {
  const lower = path.resolve("catalog.zip");
  const upper = path.resolve("CATALOG.ZIP");
  assert.equal(pathsReferToSameLocation(lower, upper, "win32"), true);
  assert.equal(pathsReferToSameLocation(lower, upper, "linux"), false);
  assert.equal(pathsReferToSameLocation(lower, lower, "linux"), true);
});

test("rejects non-existing ZIP and checksum names that collide by Windows case", { skip: process.platform !== "win32" }, async (t) => {
  const { root, catalog } = await fixture(t);
  const output = path.join(root, "catalog.zip");
  const checksum = path.join(root, "CATALOG.ZIP");
  await assert.rejects(
    packageCatalog({ sourcePath: catalog, outputPath: output, checksumPath: checksum }),
    { code: "PACKAGE_PATH_COLLISION" },
  );
});

test("packages only manifest files and the fixed optional reports", async (t) => {
  const { catalog, output } = await fixture(t);
  await mkdir(path.join(catalog, "reports"), { recursive: true });
  for (const report of ["build-report.json", "duplicate-groups.json", "rejected-records.json"]) {
    await writeFile(path.join(catalog, "reports", report), "{}\n");
  }
  const result = await packageCatalog({ sourcePath: catalog, outputPath: output });
  assert.equal(result.file_count, 5);
});

for (const relative of [
  "secret.env",
  "config.json",
  "components/button/secure_code_0.txt",
  "reports/source-urls.json",
]) {
  test(`rejects unexpected catalog entry ${relative}`, async (t) => {
    const { catalog, output } = await fixture(t);
    const file = path.join(catalog, ...relative.split("/"));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, "unexpected\n");
    await assert.rejects(
      packageCatalog({ sourcePath: catalog, outputPath: output }),
      { code: "UNEXPECTED_CATALOG_ENTRY" },
    );
  });
}

test("rejects a missing manifest-declared component", async (t) => {
  const { catalog, output } = await fixture(t);
  await unlink(path.join(catalog, "components", "button", "secure--a1b2c3d4.json"));
  await assert.rejects(
    packageCatalog({ sourcePath: catalog, outputPath: output }),
    (error) => ["MISSING_CATALOG_ENTRY", "CATALOG_UNREADABLE"].includes(error.code),
  );
});

test("rejects an unexpected empty directory", async (t) => {
  const { catalog, output } = await fixture(t);
  await mkdir(path.join(catalog, "secrets"));
  await assert.rejects(
    packageCatalog({ sourcePath: catalog, outputPath: output }),
    { code: "UNEXPECTED_CATALOG_ENTRY" },
  );
});

test("rejects a symlinked catalog file", async (t) => {
  const { root, catalog, output } = await fixture(t);
  const target = path.join(root, "outside.json");
  const component = path.join(catalog, "components", "button", "secure--a1b2c3d4.json");
  const bytes = await readFile(component);
  await writeFile(target, bytes);
  await unlink(component);
  await symlink(target, component, "file");
  await assert.rejects(
    packageCatalog({ sourcePath: catalog, outputPath: output }),
    (error) => ["UNSAFE_COMPONENT_FILE", "UNSUPPORTED_CATALOG_ENTRY"].includes(error.code),
  );
});

test("rejects output paths that physically resolve inside source", async (t) => {
  const { root, catalog } = await fixture(t);
  const alias = path.join(root, "catalog-alias");
  await symlink(catalog, alias, "junction");
  await assert.rejects(
    packageCatalog({ sourcePath: catalog, outputPath: path.join(alias, "nested.zip") }),
    /outputPath must be outside sourcePath/,
  );
});

test("package CLI JSON preserves promotion state and recovery paths", async (t) => {
  const { catalog, output } = await fixture(t);
  const checksum = `${output}.sha256`;
  await writeFile(output, "old zip\n");
  await writeFile(checksum, "old checksum\n");
  let renameCalls = 0;
  let stderr = "";
  const code = await runPackageCli(
    ["--source", catalog, "--output", output, "--checksum", checksum, "--json"],
    { stdout: { write() {} }, stderr: { write(value) { stderr += value; } } },
    { promotionOperations: {
      rename: async (...args) => {
        renameCalls += 1;
        if (renameCalls === 4) throw Object.assign(new Error("injected promotion failure"), { code: "EACCES" });
        return rename(...args);
      },
      rm: async (target, options) => {
        if (target === output) throw Object.assign(new Error("injected rollback failure"), { code: "EACCES" });
        return rm(target, options);
      },
    } },
  );
  const envelope = JSON.parse(stderr);
  assert.equal(code, 1);
  assert.equal(envelope.code, "PACKAGE_PROMOTION_FAILED");
  assert.equal(envelope.state.rollback_succeeded, false);
  assert.equal(envelope.recovery_paths.length, 4);
});
