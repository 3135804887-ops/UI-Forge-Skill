import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rename, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  analyzeCodeBlocks,
  buildCatalog,
  extractSourceIdentity,
  loadLegacyRecords,
  normalizeSourceUrl,
} from "../lib/catalog-builder.mjs";
import { computeManifestDigest } from "../lib/catalog-integrity.mjs";
import { containsMetadataUrl, validateRecord } from "../lib/catalog-schema.mjs";
import { runNode } from "./helpers.mjs";

const fixtureRoot = new URL("./fixtures/source/", import.meta.url);
const buildCli = fileURLToPath(new URL("../scripts/build-catalog.mjs", import.meta.url));

async function listFiles(root) {
  const files = [];
  async function visit(directory, prefix = "") {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
    for (const entry of entries) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await visit(join(directory, entry.name), relativePath);
      else if (entry.isFile()) files.push(relativePath);
    }
  }
  await visit(root);
  return files;
}

async function hashTree(root) {
  return Object.fromEntries(await Promise.all((await listFiles(root)).map(async (relativePath) => [
    relativePath,
    createHash("sha256").update(await readFile(join(root, relativePath))).digest("hex"),
  ])));
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function withLegacySource(records, callback) {
  const root = await mkdtemp(join(tmpdir(), "ui-forge-builder-"));
  try {
    for (const [relativePath, value] of Object.entries(records)) {
      const target = join(root, relativePath);
      await mkdir(join(target, ".."), { recursive: true });
      await writeFile(target, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`, "utf8");
    }
    return await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function legacy(overrides = {}) {
  return {
    url: "https://legacy.invalid/@maker/components/example",
    title: "Example",
    description: "An anonymized example.",
    category: "example",
    code_blocks: [{ index: 0, code: "export function Example() { return <div />; }" }],
    scraped_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

test("normalizes source URLs for deduplication", () => {
  assert.equal(normalizeSourceUrl("HTTPS://21st.dev/@Maker/components/Shimmer/?utm_source=x#demo"), "https://21st.dev/@maker/components/shimmer");
  let error;
  try {
    normalizeSourceUrl("ftp://21st.dev/component");
  } catch (caught) {
    error = caught;
  }
  assert.ok(error);
  assert.equal(error.code, "INVALID_SOURCE_URL");
});

test("extracts non-clickable source identity and supports a title fallback", () => {
  assert.deepEqual(extractSourceIdentity("https://21st.dev/@Maker/components/shimmer"), { provider: "21st.dev", author: "Maker", slug: "shimmer" });
  assert.deepEqual(extractSourceIdentity("https://catalog.invalid/library/item", "Fallback Title"), { provider: "catalog.invalid", author: "unknown", slug: "fallback-title" });
});

test("analyzes dependencies, aliases, assets, language, and usage roles without evaluating code", () => {
  globalThis.__uiForgeBuilderExecuted = false;
  const code = 'import { motion } from "framer-motion"; import type { Variant } from "@scope/pkg/subpath"; import React from "react"; import { Button } from "@/components/ui/button"; export function Demo(): JSX.Element { globalThis.__uiForgeBuilderExecuted = true; return <img src="https://img.example/a.png"/> }';
  const analysis = analyzeCodeBlocks([{ index: 0, code }]);
  assert.deepEqual(analysis.dependencies, ["@scope/pkg", "framer-motion"]);
  assert.deepEqual(analysis.local_imports, ["@/components/ui/button"]);
  assert.match(analysis.external_assets[0], /^sha256:[0-9a-f]{64}$/);
  assert.equal(analysis.code_blocks[0].language, "tsx");
  assert.equal(analysis.code_blocks[0].role, "usage");
  assert.equal(analysis.code_blocks[0].code, code);
  assert.equal(globalThis.__uiForgeBuilderExecuted, false);
  assert.ok(analysis.diagnostics.some(({ code: diagnosticCode }) => diagnosticCode === "EXTERNAL_RESOURCE"));
  const metadataOnly = { ...analysis, code_blocks: analysis.code_blocks.map(({ code: _code, ...metadata }) => metadata) };
  assert.doesNotMatch(JSON.stringify(metadataOnly), /https?:\/\//i);
});

test("handles CSS and diagnoses dynamic imports without treating them as static dependencies", () => {
  const analysis = analyzeCodeBlocks([
    { index: 0, code: 'import "./theme.css"; export function Card() { return <article />; }' },
    { index: 1, code: ".card { color: rebeccapurple; }" },
    { index: 2, code: 'export async function lazyFeature() { return import("optional-package"); }' },
  ]);
  assert.deepEqual(analysis.dependencies, []);
  assert.deepEqual(analysis.local_imports, ["./theme.css"]);
  assert.equal(analysis.code_blocks[1].language, "css");
  assert.equal(analysis.code_blocks[1].role, "style");
  assert.ok(analysis.diagnostics.some(({ code }) => code === "DYNAMIC_IMPORT"));
});

test("treats configured-looking project aliases as local while preserving npm subpaths", () => {
  const analysis = analyzeCodeBlocks([{
    index: 0,
    code: 'import { Button } from "components/ui/button"; import { cn } from "lib/utils"; import { useX } from "src/hooks/use-x"; import parse from "date-fns/parse"; export function Demo() { return <Button className={cn(useX())}>{parse}</Button>; }',
  }]);
  assert.deepEqual(analysis.local_imports, ["components/ui/button", "lib/utils", "src/hooks/use-x"]);
  assert.deepEqual(analysis.dependencies, ["date-fns"]);
});

test("analyzes require calls and observable component, hook, utility, and unknown roles", () => {
  const analysis = analyzeCodeBlocks([
    { index: 0, code: 'const helper = require("helper-package/subpath"); export function Panel() { return <section />; }' },
    { index: 1, code: "export function useReady(): boolean { return true; }" },
    { index: 2, code: "export const add = (left, right) => left + right;" },
    { index: 3, code: "plain text that is not executable syntax" },
  ]);
  assert.deepEqual(analysis.dependencies, ["helper-package"]);
  assert.deepEqual(analysis.code_blocks.map(({ role }) => role), ["component", "hook", "utility", "unknown"]);
});

test("deduplicates normalized code content while preserving a complete canonical block", async () => {
  await withLegacySource({
    "example/One.json": legacy({ code_blocks: [{ index: 0, code: "export const value = 1;\r\n" }] }),
    "example/Two.json": legacy({ description: "Longer duplicate description.", code_blocks: [{ index: 0, code: "export const value = 1;\n" }] }),
  }, async (sourcePath) => {
    const result = await loadLegacyRecords({ sourcePath });
    assert.equal(result.records.length, 1);
    assert.equal(result.records[0].code_blocks.length, 1);
    assert.equal(result.records[0].code_blocks[0].code, "export const value = 1;\n");
    assert.equal(result.report.merged_records, 1);
    assert.equal(result.report.duplicate_groups[0].selected_base, "example/Two.json");
    assert.deepEqual(result.report.duplicate_groups[0].source_paths, ["example/One.json", "example/Two.json"]);
    assert.deepEqual(result.report.emitted_sources, [{
      emitted_id: result.records[0].id,
      source_paths: ["example/One.json", "example/Two.json"],
    }]);
  });
});

test("recovers truncated JSON from companion code and merges complementary duplicate code", async () => {
  const before = await Promise.all([
    readFile(new URL("background/Liquid_Metal.json", fixtureRoot)),
    readFile(new URL("background/Liquid_Metal_code_0.txt", fixtureRoot)),
    readFile(new URL("button/Shimmer_Button.json", fixtureRoot)),
    readFile(new URL("button/Shimmer_Button_code_0.txt", fixtureRoot)),
    readFile(new URL("button/Shimmer_Button_Duplicate.json", fixtureRoot)),
  ]);
  const { records, report } = await loadLegacyRecords({ sourcePath: fixtureRoot });
  const liquid = records.find(({ title }) => title === "Liquid Metal");
  const shimmer = records.find(({ title }) => title === "Shimmer Button");
  assert.equal(liquid.status, "recoverable");
  assert.equal(liquid.confidence, 0.85);
  assert.match(liquid.code_blocks[0].code, /return <div/);
  assert.equal(shimmer.status, "recoverable");
  assert.equal(shimmer.code_blocks.length, 2);
  assert.equal(report.input_records, 3);
  assert.equal(report.parsed_records, 2);
  assert.equal(report.recovered_records, 1);
  assert.equal(report.merged_records, 1);
  assert.equal(report.emitted_records, 2);
  assert.equal(report.input_records, report.parsed_records + report.recovered_records + report.rejected_records.length);
  assert.equal(report.duplicate_groups.length, 1);
  assert.deepEqual(report.duplicate_groups[0].source_paths, [...report.duplicate_groups[0].source_paths].sort());
  assert.deepEqual(report.emitted_sources, records.map(({ id, title }) => ({
    emitted_id: id,
    source_paths: title === "Liquid Metal"
      ? ["background/Liquid_Metal.json"]
      : ["button/Shimmer_Button.json", "button/Shimmer_Button_Duplicate.json"],
  })));
  assert.deepEqual(records, [...records].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  assert.ok(records.every((record) => validateRecord(record).length === 0));
  assert.ok(records.every((record) => !containsMetadataUrl(record)));
  assert.ok(records.every((record) => !("url" in record) && !("scraped_at" in record) && !("source_path" in record)));
  const after = await Promise.all([
    readFile(new URL("background/Liquid_Metal.json", fixtureRoot)),
    readFile(new URL("background/Liquid_Metal_code_0.txt", fixtureRoot)),
    readFile(new URL("button/Shimmer_Button.json", fixtureRoot)),
    readFile(new URL("button/Shimmer_Button_code_0.txt", fixtureRoot)),
    readFile(new URL("button/Shimmer_Button_Duplicate.json", fixtureRoot)),
  ]);
  assert.deepEqual(after, before);
});

test("emits all four reconstruction statuses with deterministic confidence", async () => {
  await withLegacySource({
    "status/Complete.json": legacy({ url: "https://legacy.invalid/@maker/components/complete", title: "Complete", code_blocks: [{ index: 0, code: "export function Complete() { return <div />; }" }] }),
    "status/Incomplete.json": legacy({ url: "https://legacy.invalid/@maker/components/incomplete", title: "Incomplete", code_blocks: [{ index: 0, code: 'import { Missing } from "./Missing"; export function Incomplete() { return <Missing />; }' }] }),
    "status/Invalid.json": legacy({ url: "https://legacy.invalid/@maker/components/invalid", title: "Invalid", code_blocks: [{ index: 0, code: "   " }] }),
    "status/Recovered.json": '{\n  "url": "https://legacy.invalid/@maker/components/recovered",\n  "title": "Recovered",\n  "description": "Recovered fixture.",\n  "category": "example",\n  "code_blocks": [',
    "status/Recovered_code_0.txt": "export function Recovered() { return <div />; }\n",
  }, async (sourcePath) => {
    const { records } = await loadLegacyRecords({ sourcePath });
    assert.deepEqual(Object.fromEntries(records.map(({ title, status, confidence }) => [title, [status, confidence]])), {
      Complete: ["complete", 1],
      Incomplete: ["incomplete", 0.5],
      Invalid: ["invalid", 0],
      Recovered: ["recoverable", 0.85],
    });
  });
});

test("rejects records without reliable identity metadata and reports deterministic counts", async () => {
  await withLegacySource({
    "bad/Missing.json": { title: "Missing URL", description: "No source.", category: "bad", code_blocks: [{ index: 0, code: "export const x = 1;" }] },
    "bad/Protocol.json": legacy({ url: "file:///private/component", title: "Bad Protocol" }),
  }, async (sourcePath) => {
    const { records, report } = await loadLegacyRecords({ sourcePath });
    assert.deepEqual(records, []);
    assert.equal(report.input_records, 2);
    assert.equal(report.parsed_records, 0);
    assert.equal(report.recovered_records, 0);
    assert.equal(report.rejected_records.length, 2);
    assert.deepEqual(report.rejected_records, [...report.rejected_records].sort((a, b) => a.source_path < b.source_path ? -1 : 1));
  });
});

test("uses non-clickable fallback source identity with a runtime diagnostic", async () => {
  await withLegacySource({
    "fallback/Item.json": legacy({ url: "https://catalog.invalid/library/item", title: "Fallback Item" }),
  }, async (sourcePath) => {
    const { records } = await loadLegacyRecords({ sourcePath });
    assert.deepEqual(records[0].source, { provider: "catalog.invalid", author: "unknown", slug: "fallback-item" });
    assert.ok(records[0].diagnostics.some(({ code }) => code === "SOURCE_IDENTITY_FALLBACK"));
    assert.equal(validateRecord(records[0]).length, 0);
  });
});

test("filters malformed code blocks without losing valid blocks or stopping other records", async () => {
  await withLegacySource({
    "malformed/AllMalformed.json": legacy({
      url: "https://legacy.invalid/@maker/components/all-malformed",
      title: "All Malformed",
      code_blocks: [null],
    }),
    "malformed/Mixed.json": legacy({
      url: "https://legacy.invalid/@maker/components/mixed",
      title: "Mixed",
      code_blocks: [{ index: 0, code: "export function Mixed() { return <div />; }" }, null],
    }),
    "malformed/Other.json": legacy({
      url: "https://legacy.invalid/@maker/components/other",
      title: "Other",
    }),
  }, async (sourcePath) => {
    const { records } = await loadLegacyRecords({ sourcePath });
    assert.equal(records.length, 3);
    const allMalformed = records.find(({ title }) => title === "All Malformed");
    const mixed = records.find(({ title }) => title === "Mixed");
    assert.equal(allMalformed.status, "invalid");
    assert.deepEqual(allMalformed.code_blocks, []);
    assert.equal(validateRecord(allMalformed).length, 0);
    assert.equal(mixed.status, "complete");
    assert.equal(mixed.code_blocks.length, 1);
    assert.match(mixed.code_blocks[0].code, /function Mixed/);
    assert.deepEqual(mixed.diagnostics.filter(({ code }) => code === "MALFORMED_CODE_BLOCK"), [{
      code: "MALFORMED_CODE_BLOCK",
      message: "Ignored malformed legacy code block at index 1.",
    }]);
    assert.ok(records.some(({ title, status }) => title === "Other" && status === "complete"));
  });
});

test("builds deterministic URL-free output, manifest, and complete reports", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "ui-forge-build-output-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const fixturePath = fileURLToPath(new URL(".", fixtureRoot));
  const sourceBefore = await hashTree(fixturePath);
  const outputA = join(root, "catalog-a");
  const outputB = join(root, "catalog-b");

  const first = await buildCatalog({ sourcePath: fixtureRoot, outputPath: outputA });
  const second = await buildCatalog({ sourcePath: fixtureRoot, outputPath: outputB });

  assert.equal(first.manifest.digest, second.manifest.digest);
  assert.deepEqual(await hashTree(outputA), await hashTree(outputB));
  assert.equal((await listFiles(outputA)).some((file) => /_code_\d+\.txt$/.test(file)), false);
  assert.deepEqual(await hashTree(fixturePath), sourceBefore);
  assert.equal(await pathExists(`${outputA}.tmp-${process.pid}`), false);
  assert.equal(await pathExists(`${outputA}.backup-${process.pid}`), false);

  const manifest = JSON.parse(await readFile(join(outputA, "manifest.json"), "utf8"));
  assert.equal(manifest.component_count, 2);
  assert.equal(manifest.digest, computeManifestDigest(manifest.files));
  assert.deepEqual(manifest.files, [...manifest.files].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  for (const entry of manifest.files) {
    const contents = await readFile(join(outputA, "components", entry.path));
    assert.equal(createHash("sha256").update(contents).digest("hex"), entry.sha256);
    const record = JSON.parse(contents);
    const metadata = { ...record, code_blocks: record.code_blocks.map(({ code: _code, ...block }) => block) };
    assert.doesNotMatch(JSON.stringify(metadata), /https?:\/\//i);
  }

  const buildReport = JSON.parse(await readFile(join(outputA, "reports", "build-report.json"), "utf8"));
  const rejected = JSON.parse(await readFile(join(outputA, "reports", "rejected-records.json"), "utf8"));
  const duplicates = JSON.parse(await readFile(join(outputA, "reports", "duplicate-groups.json"), "utf8"));
  assert.deepEqual({
    input: buildReport.input_records,
    parsed: buildReport.parsed_records,
    repaired: buildReport.repaired_records,
    merged: buildReport.merged_records,
    emitted: buildReport.emitted_records,
    rejected: buildReport.rejected_records,
    componentFiles: buildReport.component_files,
    digest: buildReport.content_digest,
  }, { input: 3, parsed: 2, repaired: 1, merged: 1, emitted: 2, rejected: 0, componentFiles: 2, digest: manifest.digest });
  assert.deepEqual(buildReport.emitted_sources, first.report.emitted_sources);
  assert.deepEqual(rejected, []);
  assert.equal(duplicates.length, 1);
  assert.equal(duplicates[0].selected_base, "button/Shimmer_Button_Duplicate.json");
});

test("reports rejected records and preserves existing output when temporary validation fails", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "ui-forge-build-failure-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const output = join(root, "catalog");
  await mkdir(output);
  await writeFile(join(output, "sentinel.txt"), "keep\n", "utf8");

  await withLegacySource({
    "bad/Missing.json": { title: "Missing URL", description: "No source.", category: "bad", code_blocks: [] },
    "bad/MetadataUrl.json": legacy({ description: "Leaked https://metadata.invalid/value" }),
  }, async (sourcePath) => {
    await assert.rejects(
      buildCatalog({ sourcePath, outputPath: output }),
      (error) => error?.code === "CATALOG_VALIDATION_FAILED" && error?.issues?.[0]?.code === "METADATA_URL",
    );
  });

  assert.equal(await readFile(join(output, "sentinel.txt"), "utf8"), "keep\n");
  assert.equal(await pathExists(`${output}.tmp-${process.pid}`), false);
  assert.equal(await pathExists(`${output}.backup-${process.pid}`), false);

  await withLegacySource({
    "bad/Missing.json": { title: "Missing URL", description: "No source.", category: "bad", code_blocks: [] },
    "good/Example.json": legacy(),
  }, async (sourcePath) => {
    const result = await buildCatalog({ sourcePath, outputPath: output });
    assert.equal(result.report.rejected_records.length, 1);
  });
  assert.deepEqual(JSON.parse(await readFile(join(output, "reports", "rejected-records.json"), "utf8")), [{
    source_path: "bad/Missing.json",
    code: "MISSING_REQUIRED_METADATA",
    message: "legacy record requires non-empty url",
  }]);
});

test("build CLI validates paths and emits stable JSON and human summaries", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "ui-forge-build-cli-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = resolve(fileURLToPath(new URL(".", fixtureRoot)));
  const output = join(root, "catalog");
  assert.equal(isAbsolute(source), true);

  const jsonResult = await runNode([buildCli, "--source", source, "--output", output, "--json"]);
  assert.equal(jsonResult.code, 0);
  assert.equal(jsonResult.stderr, "");
  assert.deepEqual(JSON.parse(jsonResult.stdout), {
    parsed: 2,
    repaired: 1,
    merged: 1,
    emitted: 2,
    rejected: 0,
    component_files: 2,
    manifest_digest: JSON.parse(await readFile(join(output, "manifest.json"), "utf8")).digest,
  });
  assert.equal(jsonResult.stdout.endsWith("\n"), true);

  const humanOutput = join(root, "catalog-human");
  const humanResult = await runNode([buildCli, "--source", source, "--output", humanOutput]);
  assert.equal(humanResult.code, 0);
  assert.equal(humanResult.stderr, "");
  assert.match(humanResult.stdout, /^Parsed: 2\nRepaired: 1\nMerged: 1\nEmitted: 2\nRejected: 0\nComponent files: 2\nManifest digest: [0-9a-f]{64}\n$/);

  for (const args of [
    ["--source", "relative", "--output", output],
    ["--source", source, "--output", "relative"],
    ["--source", source, "--output", source],
    ["--source", source, "--output", join(source, "nested")],
  ]) {
    const result = await runNode([buildCli, ...args, "--json"]);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.equal(typeof JSON.parse(result.stderr).error, "string");
  }
});

test("rolls back the promoted catalog when backup cleanup fails", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "ui-forge-build-cleanup-failure-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = fileURLToPath(new URL(".", fixtureRoot));
  const output = join(root, "catalog");
  const backup = `${output}.backup-${process.pid}`;
  const failedOutput = `${output}.failed-${process.pid}`;
  await mkdir(output);
  await writeFile(join(output, "sentinel.txt"), "old-output\n", "utf8");

  await assert.rejects(
    buildCatalog(
      { sourcePath: source, outputPath: output },
      {
        promotionOperations: {
          rm: async (target, options) => {
            if (target === backup) {
              const error = new Error("injected backup removal failure");
              error.code = "EACCES";
              throw error;
            }
            return rm(target, options);
          },
        },
      },
    ),
    (error) => error?.code === "BACKUP_CLEANUP_FAILED"
      && error?.rollback?.old_output_restored === true
      && error?.rollback?.new_output_preserved === false,
  );

  assert.equal(await readFile(join(output, "sentinel.txt"), "utf8"), "old-output\n");
  assert.equal(await pathExists(backup), false);
  assert.equal(await pathExists(failedOutput), false);
  assert.equal(await pathExists(`${output}.tmp-${process.pid}`), false);
});

test("preserves explicit recovery paths when backup restoration also fails", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "ui-forge-build-rollback-failure-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = fileURLToPath(new URL(".", fixtureRoot));
  const output = join(root, "catalog");
  const backup = `${output}.backup-${process.pid}`;
  const failedOutput = `${output}.failed-${process.pid}`;
  await mkdir(output);
  await writeFile(join(output, "sentinel.txt"), "old-output\n", "utf8");

  await assert.rejects(
    buildCatalog(
      { sourcePath: source, outputPath: output },
      {
        promotionOperations: {
          rm: async (target, options) => {
            if (target === backup) throw Object.assign(new Error("injected backup removal failure"), { code: "EACCES" });
            return rm(target, options);
          },
          rename: async (from, to) => {
            if (from === backup && to === output) throw Object.assign(new Error("injected backup restore failure"), { code: "EACCES" });
            return rename(from, to);
          },
        },
      },
    ),
    (error) => error?.code === "PROMOTION_ROLLBACK_FAILED"
      && error?.rollback?.output_path === output
      && error?.rollback?.backup_path === backup
      && error?.rollback?.new_output_path === failedOutput
      && error?.rollback?.old_output_restored === false
      && error?.rollback?.new_output_preserved === true
      && /restore failure/.test(error?.rollback?.restore_error ?? ""),
  );

  assert.equal(await pathExists(output), false);
  assert.equal(await pathExists(backup), true);
  assert.equal(await pathExists(failedOutput), true);
  assert.equal(await readFile(join(backup, "sentinel.txt"), "utf8"), "old-output\n");
});

test("rejects physical source/output overlap through a directory link", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "ui-forge-build-link-safety-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, "source");
  const alias = join(root, "source-alias");
  await mkdir(source);
  await writeFile(join(source, "Example.json"), `${JSON.stringify(legacy(), null, 2)}\n`, "utf8");
  try {
    await symlink(source, alias, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (["EACCES", "EPERM", "ENOSYS"].includes(error?.code)) {
      t.skip(`directory links unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  const sourceBefore = await hashTree(source);

  await assert.rejects(
    buildCatalog({ sourcePath: source, outputPath: join(alias, "nested-output") }),
    { code: "UNSAFE_OUTPUT_PATH" },
  );
  await assert.rejects(
    buildCatalog({ sourcePath: source, outputPath: alias }),
    { code: "UNSAFE_OUTPUT_PATH" },
  );
  await assert.rejects(
    buildCatalog({ sourcePath: alias, outputPath: join(source, "nested-output-from-aliased-source") }),
    { code: "UNSAFE_OUTPUT_PATH" },
  );
  assert.deepEqual(await hashTree(source), sourceBefore);
});

test("rejects blank, non-string, and non-file URL source paths structurally", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "ui-forge-build-source-args-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [index, sourcePath] of [undefined, null, "", "   ", 42, new URL("https://example.invalid/catalog")].entries()) {
    await assert.rejects(
      buildCatalog({ sourcePath, outputPath: join(root, `catalog-${index}`) }),
      (error) => error?.code === "INVALID_SOURCE_PATH" && typeof error.message === "string",
    );
  }
});
