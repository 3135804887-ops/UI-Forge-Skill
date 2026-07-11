import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  analyzeCodeBlocks,
  extractSourceIdentity,
  loadLegacyRecords,
  normalizeSourceUrl,
} from "../lib/catalog-builder.mjs";
import { containsMetadataUrl, validateRecord } from "../lib/catalog-schema.mjs";

const fixtureRoot = new URL("./fixtures/source/", import.meta.url);

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
