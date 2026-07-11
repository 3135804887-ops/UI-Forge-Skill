import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, rename, rm, utimes, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { packageCatalog } from "../lib/deterministic-zip.mjs";
import { runPackageCli } from "../scripts/package-catalog.mjs";
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

function checksumText(hash, zipPath) {
  return `${hash}  ${zipPath.split(/[\\/]/).at(-1)}\n`;
}

function centralEntries(archive) {
  const eocd = archive.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.notEqual(eocd, -1);
  const count = archive.readUInt16LE(eocd + 10);
  let offset = archive.readUInt32LE(eocd + 16);
  const entries = [];
  for (let index = 0; index < count; index += 1) {
    assert.equal(archive.readUInt32LE(offset), 0x02014b50);
    const nameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    entries.push({
      name: archive.subarray(offset + 46, offset + 46 + nameLength).toString("utf8"),
      madeBy: archive.readUInt16LE(offset + 4),
      time: archive.readUInt16LE(offset + 12),
      date: archive.readUInt16LE(offset + 14),
      externalAttributes: archive.readUInt32LE(offset + 38),
      localOffset: archive.readUInt32LE(offset + 42),
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function fixturePackage(t, prefix = "ui-forge-package-") {
  const root = await makeTempDir(prefix);
  t.after(() => rm(root, { recursive: true, force: true }));
  return {
    root,
    catalog: await createFixtureCatalog(join(root, "catalog"), [record]),
    output: join(root, "catalog.zip"),
    checksum: join(root, "catalog.zip.sha256"),
  };
}

async function assertNoTemporaryArtifacts(root) {
  const names = await readdir(root);
  assert.deepEqual(names.filter((name) => /\.(?:tmp|backup)-/.test(name)), []);
}

test("creates byte-identical ZIPs despite source mtimes", async (t) => {
  const { root, catalog } = await fixturePackage(t);
  const first = join(root, "first.zip"), firstChecksum = `${first}.sha256`;
  const second = join(root, "second.zip"), secondChecksum = `${second}.sha256`;

  const resultA = await packageCatalog({ sourcePath: catalog, outputPath: first, checksumPath: firstChecksum });
  await utimes(join(catalog, "manifest.json"), new Date("2026-07-11T00:00:00Z"), new Date("2026-07-11T00:00:00Z"));
  const resultB = await packageCatalog({ sourcePath: catalog, outputPath: second, checksumPath: secondChecksum });

  assert.deepEqual(await readFile(first), await readFile(second));
  assert.equal(resultA.sha256, resultB.sha256);
  assert.equal(resultA.file_count, 2);
  assert.equal(resultA.size, resultB.size);
  assert.deepEqual(resultA.warnings, []);
});

test("writes the exact deterministic ZIP and checksum format contract", async (t) => {
  const { catalog, output, checksum } = await fixturePackage(t);
  const result = await packageCatalog({ sourcePath: catalog, outputPath: output, checksumPath: checksum });
  const archive = await readFile(output);
  const entries = centralEntries(archive);
  assert.deepEqual(entries.map(({ name }) => name), [
    "components/button/stable--a1b2c3d4.json",
    "manifest.json",
  ]);
  assert.deepEqual(entries.map(({ name }) => name), entries.map(({ name }) => name).sort());
  for (const entry of entries) {
    assert.equal(entry.madeBy >>> 8, 3);
    assert.equal(entry.time, 0);
    assert.equal(entry.date, 0x21);
    assert.equal(entry.externalAttributes >>> 16, 0o100644);
    assert.equal(archive.readUInt16LE(entry.localOffset + 10), 0);
    assert.equal(archive.readUInt16LE(entry.localOffset + 12), 0x21);
  }
  assert.equal(await readFile(checksum, "utf8"), checksumText(result.sha256, output));
});

for (const failure of [
  { name: "second backup rename", renameCall: 2 },
  { name: "checksum promotion", renameCall: 4 },
]) {
  test(`rolls back both existing artifacts after ${failure.name} failure`, async (t) => {
    const { root, catalog, output, checksum } = await fixturePackage(t, "ui-forge-package-rollback-");
    const oldZip = Buffer.from("old zip bytes\n"), oldChecksum = "old checksum bytes\n";
    await writeFile(output, oldZip);
    await writeFile(checksum, oldChecksum);
    let renameCalls = 0;
    await assert.rejects(packageCatalog(
      { sourcePath: catalog, outputPath: output, checksumPath: checksum },
      { promotionOperations: { rename: async (...args) => {
        renameCalls += 1;
        if (renameCalls === failure.renameCall) throw Object.assign(new Error(`injected ${failure.name} failure`), { code: "EACCES" });
        return rename(...args);
      } } },
    ), (error) => error.code === "PACKAGE_PROMOTION_FAILED" && /rollback succeeded/.test(error.message));
    assert.deepEqual(await readFile(output), oldZip);
    assert.equal(await readFile(checksum, "utf8"), oldChecksum);
    await assertNoTemporaryArtifacts(root);
  });
}

test("keeps a consistent new pair and recovery backups after cleanup warnings", async (t) => {
  const { root, catalog, output, checksum } = await fixturePackage(t, "ui-forge-package-cleanup-");
  await writeFile(output, "old zip bytes\n");
  await writeFile(checksum, "old checksum bytes\n");
  const result = await packageCatalog(
    { sourcePath: catalog, outputPath: output, checksumPath: checksum },
    { promotionOperations: { rm: async (target, options) => {
      if (target.includes(".backup-")) throw Object.assign(new Error("injected cleanup failure"), { code: "EACCES" });
      return rm(target, options);
    } } },
  );
  assert.equal(await readFile(checksum, "utf8"), checksumText(result.sha256, output));
  assert.equal(result.warnings.length, 2);
  assert.deepEqual(result.warnings.map(({ code }) => code), ["BACKUP_CLEANUP_FAILED", "BACKUP_CLEANUP_FAILED"]);
  for (const warning of result.warnings) assert.equal((await readFile(warning.diagnostic_backup_path)).length > 0, true);
  assert.deepEqual((await readdir(root)).filter((name) => name.includes(".tmp-")), []);
});

test("preserves remaining backup and temporary recovery material when rollback is incomplete", async (t) => {
  const { root, catalog, output, checksum } = await fixturePackage(t, "ui-forge-package-incomplete-rollback-");
  await writeFile(output, "old zip bytes\n");
  await writeFile(checksum, "old checksum bytes\n");
  let renameCalls = 0;
  const error = await packageCatalog(
    { sourcePath: catalog, outputPath: output, checksumPath: checksum },
    { promotionOperations: {
      rename: async (...args) => {
        renameCalls += 1;
        if (renameCalls === 4) throw Object.assign(new Error("injected checksum promotion failure"), { code: "EACCES" });
        return rename(...args);
      },
      rm: async (target, options) => {
        if (target === output) throw Object.assign(new Error("injected rollback removal failure"), { code: "EACCES" });
        return rm(target, options);
      },
    } },
  ).then(() => null, (caught) => caught);
  assert.equal(error.code, "PACKAGE_PROMOTION_FAILED");
  assert.equal(error.state.rollback_succeeded, false);
  assert.match(error.message, /rollback was incomplete/);
  assert.equal(error.recovery_paths.length, 4);
  const remaining = (await readdir(root)).filter((name) => /\.(?:tmp|backup)-/.test(name));
  assert.ok(remaining.some((name) => name.startsWith("catalog.zip.tmp-")) || remaining.some((name) => name.startsWith("catalog.zip.sha256.tmp-")));
  assert.ok(remaining.some((name) => name.includes(".backup-")));
});

test("removes temporary output after an ordinary archive write failure", async (t) => {
  const { root, catalog, output, checksum } = await fixturePackage(t, "ui-forge-package-write-failure-");
  await assert.rejects(packageCatalog(
    { sourcePath: catalog, outputPath: output, checksumPath: checksum },
    { archiveOperations: { readFile: async (path, ...args) => {
      if (String(path).endsWith("manifest.json")) throw Object.assign(new Error("injected read failure"), { code: "EIO" });
      return readFile(path, ...args);
    } } },
  ), /injected read failure/);
  await assertNoTemporaryArtifacts(root);
});

test("package CLI reports cleanup warnings in JSON and human output while succeeding", async (t) => {
  const { root, catalog } = await fixturePackage(t, "ui-forge-package-cli-");
  for (const json of [true, false]) {
    const output = join(root, json ? "json.zip" : "human.zip"), checksum = `${output}.sha256`;
    await writeFile(output, "old zip\n");
    await writeFile(checksum, "old checksum\n");
    let stdout = "", stderr = "";
    const code = await runPackageCli(
      ["--source", catalog, "--output", output, "--checksum", checksum, ...(json ? ["--json"] : [])],
      { stdout: { write: (value) => { stdout += value; } }, stderr: { write: (value) => { stderr += value; } } },
      { promotionOperations: { rm: async (target, options) => {
        if (target.includes(".backup-")) throw Object.assign(new Error("injected cleanup failure"), { code: "EACCES" });
        return rm(target, options);
      } } },
    );
    assert.equal(code, 0);
    assert.equal(stderr, "");
    if (json) assert.equal(JSON.parse(stdout).warnings.length, 2);
    else {
      assert.match(stdout, /Warning: \[BACKUP_CLEANUP_FAILED\]/);
      assert.match(stdout, /Backup recovery path:/);
    }
  }
});
