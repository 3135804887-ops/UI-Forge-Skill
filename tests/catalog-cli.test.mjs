import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { isValidComponentId, STATUS_CONTRACT } from "../lib/catalog-schema.mjs";
import { createFixtureCatalog, makeTempDir, runNode } from "./helpers.mjs";

const cli = "scripts/ui-forge.mjs";
const usageLines = [
  "ui-forge validate [--catalog PATH] [--json]",
  "ui-forge search QUERY [--category NAME] [--limit N] [--include-incomplete] [--include-invalid] [--catalog PATH] [--json]",
  "ui-forge show ID [--catalog PATH] [--json]",
];

function serializedUsageError(command, message) {
  return `${JSON.stringify({
    command,
    error: { code: "INVALID_USAGE", message },
    usage: usageLines,
  }, null, 2)}\n`;
}

function makeRecord({
  id,
  title,
  category = "button",
  status = "complete",
  dependencies = [],
  localImports = [],
  codeBlocks,
}) {
  const slug = id.split("/")[1].split("--")[0];
  const hashCharacter = id.at(-1);
  const confidence = STATUS_CONTRACT[status].confidence;
  return {
    schema_version: 1,
    id,
    title,
    description: `${title} component.`,
    category,
    source: { provider: "fixture", author: "maker", slug },
    source_id: `sha256:${hashCharacter.repeat(64)}`,
    status,
    confidence,
    dependencies,
    local_imports: localImports,
    external_assets: [],
    code_blocks: codeBlocks ?? (status === "invalid" ? [] : [{
      index: 0,
      language: "jsx",
      role: "component",
      suggested_path: `src/${slug}.jsx`,
      code: `export const ${slug.replaceAll("-", "_")} = true;`,
    }]),
    diagnostics: status === "incomplete"
      ? [{ code: "UNRESOLVED_LOCAL_IMPORT", message: "Fixture local import is unresolved." }]
      : [],
  };
}

const shimmer = makeRecord({
  id: "button/shimmer-button--11111111",
  title: "Shimmer Button",
  dependencies: ["motion-react"],
  localImports: ["./helper"],
  codeBlocks: [
    { index: 0, language: "jsx", role: "component", suggested_path: "src/ShimmerButton.jsx", code: "export const ShimmerButton = true;" },
    { index: 1, language: "css", role: "styles", suggested_path: "src/shimmer.css", code: ".shimmer {}" },
  ],
});
const glow = makeRecord({ id: "button/glow-button--22222222", title: "Glow Button" });
const card = makeRecord({ id: "card/shimmer-card--33333333", title: "Shimmer Card", category: "card" });
const incomplete = makeRecord({ id: "button/incomplete-button--44444444", title: "Incomplete Button", status: "incomplete" });
const invalid = {
  ...makeRecord({ id: "button/invalid-button--55555555", title: "Invalid Button", status: "invalid" }),
  source_id: `sha256:${"5".repeat(64)}`,
};

async function withCatalog(t) {
  const root = await makeTempDir("ui-forge-cli-");
  t.after(() => rm(root, { recursive: true, force: true }));
  await createFixtureCatalog(root, [shimmer, glow, card, incomplete, invalid]);
  return root;
}

test("validate emits stable JSON", async (t) => {
  const catalog = await withCatalog(t);
  const result = await runNode([cli, "validate", "--catalog", catalog, "--json"]);
  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout, [
    "{",
    '  "command": "validate",',
    '  "valid": true,',
    '  "schema_version": 1,',
    '  "component_count": 5,',
    '  "errors": [],',
    '  "warnings": []',
    "}",
    "",
  ].join("\n"));
  assert.equal(result.stdout.endsWith("\n\n"), false);
  assert.deepEqual(JSON.parse(result.stdout), {
    command: "validate",
    valid: true,
    schema_version: 1,
    component_count: 5,
    errors: [],
    warnings: [],
  });
});

test("validate rejects a status-confidence mismatch", async (t) => {
  const catalog = await makeTempDir("ui-forge-cli-status-");
  t.after(() => rm(catalog, { recursive: true, force: true }));
  await createFixtureCatalog(catalog, [{ ...shimmer, confidence: 0 }]);
  const result = await runNode([cli, "validate", "--catalog", catalog, "--json"]);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.equal(JSON.parse(result.stderr).errors[0].code, "STATUS_CONFIDENCE_MISMATCH");
});

test("search returns summaries without code and copies related categories", async (t) => {
  const catalog = await withCatalog(t);
  const result = await runNode([cli, "search", "shimmer button", "--catalog", catalog, "--json"]);
  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  const output = JSON.parse(result.stdout);
  assert.equal(output.results[0].id, shimmer.id);
  assert.equal("code_blocks" in output.results[0], false);
  assert.deepEqual(output.relatedCategories, []);

  const miss = await runNode([cli, "search", "shimmer", "--category", "missing", "--catalog", catalog, "--json"]);
  assert.deepEqual(JSON.parse(miss.stdout).relatedCategories, ["button", "card"]);
});

test("show requires an exact ID and returns the stored record unchanged", async (t) => {
  const catalog = await withCatalog(t);
  const result = await runNode([cli, "show", shimmer.id, "--catalog", catalog, "--json"]);
  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(result.stdout), { command: "show", component: shimmer });

  const partial = await runNode([cli, "show", "shimmer-button", "--catalog", catalog]);
  assert.equal(partial.code, 1);
  assert.equal(partial.stdout, "");
  assert.equal(partial.stderr, "Error: show requires an exact component ID.\n");

  const unknown = await runNode([cli, "show", "button/missing--aaaaaaaa", "--catalog", catalog]);
  assert.equal(unknown.code, 1);
  assert.equal(unknown.stderr, "Error: component not found: button/missing--aaaaaaaa\n");
});

test("search honors category, limit, and incomplete-status flags", async (t) => {
  const catalog = await withCatalog(t);
  const filtered = await runNode([cli, "search", "shimmer", "--category", "card", "--limit", "1", "--catalog", catalog, "--json"]);
  assert.deepEqual(JSON.parse(filtered.stdout).results.map(({ id }) => id), [card.id]);

  const defaults = await runNode([cli, "search", "button", "--catalog", catalog, "--json"]);
  assert.deepEqual(JSON.parse(defaults.stdout).results.map(({ status }) => status), ["complete", "complete"]);

  const included = await runNode([cli, "search", "button", "--include-incomplete", "--include-invalid", "--catalog", catalog, "--json"]);
  assert.deepEqual(JSON.parse(included.stdout).results.map(({ status }) => status), ["complete", "complete", "incomplete", "invalid"]);
});

test("no search results are successful and explicit", async (t) => {
  const catalog = await withCatalog(t);
  const json = await runNode([cli, "search", "does-not-exist", "--catalog", catalog, "--json"]);
  assert.equal(json.code, 0);
  assert.equal(json.stdout, [
    "{",
    '  "command": "search",',
    '  "query": "does-not-exist",',
    '  "category": null,',
    '  "results": [],',
    '  "relatedCategories": []',
    "}",
    "",
  ].join("\n"));
  assert.equal(json.stdout.endsWith("\n\n"), false);
  assert.deepEqual(JSON.parse(json.stdout), {
    command: "search",
    query: "does-not-exist",
    category: null,
    results: [],
    relatedCategories: [],
  });
  const human = await runNode([cli, "search", "does-not-exist", "--catalog", catalog]);
  assert.equal(human.stdout, "No components found for \"does-not-exist\".\n");
  assert.equal(human.stderr, "");
});

test("invalid usage exits 1 and reports incomplete or unknown flags", async (t) => {
  const catalog = await withCatalog(t);
  for (const args of [
    [],
    ["search", "--catalog", catalog],
    ["search", "button", "--limit", "0", "--catalog", catalog],
    ["search", "button", "--limit"],
    ["validate", "--wat"],
    ["validate", "--catalog"],
    ["show", shimmer.id, "extra", "--catalog", catalog],
  ]) {
    const result = await runNode([cli, ...args]);
    assert.equal(result.code, 1, args.join(" "));
    assert.equal(result.stdout, "", args.join(" "));
    assert.match(result.stderr, /^Error: .+\nUsage:\n/, args.join(" "));
  }
});

test("rejects empty and whitespace-only catalog, query, category, and show ID values", async (t) => {
  const catalog = await withCatalog(t);
  const cases = [
    {
      args: ["validate", "--catalog", "", "--json"],
      command: "validate",
      message: "--catalog must not be empty.",
      options: { env: { ...process.env, UI_FORGE_CATALOG: catalog } },
    },
    {
      args: ["validate", "--catalog", "   ", "--json"],
      command: "validate",
      message: "--catalog must not be empty.",
    },
    {
      args: ["search", "", "--catalog", catalog, "--json"],
      command: "search",
      message: "search query must not be empty.",
    },
    {
      args: ["search", " \t ", "--catalog", catalog, "--json"],
      command: "search",
      message: "search query must not be empty.",
    },
    {
      args: ["search", "button", "--category", "", "--catalog", catalog, "--json"],
      command: "search",
      message: "--category must not be empty.",
    },
    {
      args: ["search", "button", "--category", "   ", "--catalog", catalog, "--json"],
      command: "search",
      message: "--category must not be empty.",
    },
    {
      args: ["show", "", "--catalog", catalog, "--json"],
      command: "show",
      message: "show ID must not be empty.",
    },
    {
      args: ["show", " \t ", "--catalog", catalog, "--json"],
      command: "show",
      message: "show ID must not be empty.",
    },
  ];
  for (const { args, command, message, options } of cases) {
    const result = await runNode([cli, ...args], options);
    assert.equal(result.code, 1, args.join(" "));
    assert.equal(result.stdout, "", args.join(" "));
    assert.equal(result.stderr, serializedUsageError(command, message), args.join(" "));
  }
});

test("JSON intent survives every argument parsing failure", async (t) => {
  const catalog = await withCatalog(t);
  const cases = [
    { args: ["validate", "--wat", "--json"], command: "validate", message: "unknown option for validate: --wat" },
    { args: ["validate", "--json", "--json"], command: "validate", message: "option may only be used once: --json" },
    { args: ["validate", "--catalog", catalog, "--catalog", catalog, "--json"], command: "validate", message: "option may only be used once: --catalog" },
    { args: ["validate", "--catalog", "--json"], command: "validate", message: "--catalog requires a value." },
    { args: ["search", "button", "--category", "--json"], command: "search", message: "--category requires a value." },
    { args: ["search", "button", "--limit", "--json"], command: "search", message: "--limit requires a value." },
    { args: ["validate", "extra", "--json"], command: "validate", message: "validate does not accept positional arguments." },
    { args: ["search", "button", "--limit", "0", "--catalog", catalog, "--json"], command: "search", message: "--limit must be a positive integer." },
  ];
  for (const { args, command, message } of cases) {
    const result = await runNode([cli, ...args]);
    assert.equal(result.code, 1, args.join(" "));
    assert.equal(result.stdout, "", args.join(" "));
    assert.equal(result.stderr, serializedUsageError(command, message), args.join(" "));
    assert.equal(result.stderr.endsWith("\n\n"), false, args.join(" "));
  }
});

test("CLI exact-ID decisions match the shared schema helper", async (t) => {
  const catalog = await withCatalog(t);
  const cases = [
    { id: shimmer.id, code: 0 },
    { id: "Button/missing--aaaaaaaa", code: 1 },
    { id: "button/missing", code: 1 },
  ];
  for (const { id, code } of cases) {
    const result = await runNode([cli, "show", id, "--catalog", catalog, "--json"]);
    assert.equal(result.code, code, id);
    assert.equal(isValidComponentId(id), code === 0, id);
  }
});

test("catalog discovery failure exits 2 and includes checked candidates", async (t) => {
  const root = await makeTempDir("ui-forge-cli-missing-");
  t.after(() => rm(root, { recursive: true, force: true }));
  const env = {
    ...process.env,
    UI_FORGE_CATALOG: "",
    HOME: root,
    USERPROFILE: root,
    APPDATA: path.join(root, "appdata"),
    LOCALAPPDATA: path.join(root, "localappdata"),
    XDG_CONFIG_HOME: path.join(root, "config"),
    XDG_DATA_HOME: path.join(root, "data"),
  };
  const result = await runNode([path.resolve(cli), "validate", "--catalog", path.join(root, "missing"), "--json"], { cwd: root, env });
  assert.equal(result.code, 2);
  assert.equal(result.stdout, "");
  const error = JSON.parse(result.stderr);
  assert.equal(error.error.code, "CATALOG_NOT_FOUND");
  assert.ok(error.error.checked.length >= 1);
  assert.deepEqual(error.error.checked[0], {
    source: "cli",
    path: path.join(root, "missing"),
    reason: "CATALOG_NOT_FOUND",
  });
});

test("invalid catalog exits 1 and emits structured validation errors", async (t) => {
  const catalog = await withCatalog(t);
  const manifest = JSON.parse(await readFile(path.join(catalog, "manifest.json"), "utf8"));
  await writeFile(path.join(catalog, "components", manifest.files[0].path), "{}\n", "utf8");
  const result = await runNode([cli, "validate", "--catalog", catalog, "--json"]);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  const output = JSON.parse(result.stderr);
  assert.equal(output.command, "validate");
  assert.equal(output.valid, false);
  assert.equal(output.errors[0].code, "FILE_DIGEST_MISMATCH");
});

test("human output is stable for validate, search, and show", async (t) => {
  const catalog = await withCatalog(t);
  const validate = await runNode([cli, "validate", "--catalog", catalog]);
  assert.equal(validate.stdout, "Catalog valid (schema 1).\nComponents: 5\nWarnings: 0\n");

  const search = await runNode([cli, "search", "shimmer button", "--limit", "1", "--catalog", catalog]);
  assert.equal(search.stdout, [
    "Results for \"shimmer button\" (1)",
    "1. Shimmer Button",
    `   ID: ${shimmer.id}`,
    "   Category: button",
    "   Status: complete | Confidence: 1 | Score: 190",
    "   Dependencies: motion-react",
    "",
  ].join("\n"));

  const show = await runNode([cli, "show", shimmer.id, "--catalog", catalog]);
  assert.equal(show.stdout, [
    "Shimmer Button",
    `ID: ${shimmer.id}`,
    "Category: button",
    "Status: complete",
    "Confidence: 1",
    "Dependencies: motion-react",
    "Local imports: ./helper",
    "External assets: none",
    "Diagnostics: 0",
    "Code blocks: 2",
    "",
    "[0] component (jsx) -> src/ShimmerButton.jsx",
    "export const ShimmerButton = true;",
    "",
    "[1] styles (css) -> src/shimmer.css",
    ".shimmer {}",
    "",
  ].join("\n"));
});
