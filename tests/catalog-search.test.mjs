import assert from "node:assert/strict";
import test from "node:test";
import { searchCatalog } from "../lib/catalog-search.mjs";

function makeRecord({
  id,
  title,
  description = "",
  category = "button",
  status = "complete",
  confidence = 1,
  author = "maker",
  slug = id.split("/")[1].split("--")[0],
  dependencies = [],
  roles = ["component"],
  diagnostics = [],
}) {
  return {
    schema_version: 1,
    id,
    title,
    description,
    category,
    source: { provider: "fixture", author, slug },
    source_id: `sha256:${"a".repeat(64)}`,
    status,
    confidence,
    dependencies,
    local_imports: [],
    external_assets: [],
    code_blocks: roles.map((role, index) => ({
      index,
      language: "jsx",
      role,
      suggested_path: `src/${slug}.jsx`,
      code: `secret code ${title}`,
    })),
    diagnostics,
  };
}

const records = [
  makeRecord({
    id: "button/shimmer-button--11111111",
    title: "Shimmer Button",
    description: "Animated call to action",
  }),
  makeRecord({
    id: "button/glow-button--22222222",
    title: "Glow Button",
    description: "A shimmer button treatment for animated forms",
  }),
  makeRecord({
    id: "card/animated-card--33333333",
    title: "Animated Card",
    category: "card",
    description: "A moving surface",
  }),
  makeRecord({
    id: "button/incomplete-button--44444444",
    title: "Animated Incomplete Button",
    status: "incomplete",
  }),
  makeRecord({
    id: "button/invalid-button--55555555",
    title: "Animated Invalid Button",
    status: "invalid",
  }),
];

test("ranks exact title and category matches before description matches", () => {
  const results = searchCatalog(records, "shimmer button", { limit: 5 });
  assert.deepEqual(results.map((x) => x.id), [
    "button/shimmer-button--11111111",
    "button/glow-button--22222222",
  ]);
  assert.equal(results[0].score, 180);
  assert.equal(results[1].score, 60);
});

test("breaks score ties by status, title, then id", () => {
  const tiedRecords = [
    makeRecord({ id: "button/zulu--11111111", title: "Button", status: "incomplete" }),
    makeRecord({ id: "button/zulu--22222222", title: "Button", status: "complete" }),
    makeRecord({ id: "button/alpha--33333333", title: "Button", status: "recoverable" }),
  ];
  const results = searchCatalog(tiedRecords, "button", { includeIncomplete: true });
  assert.deepEqual(results.map((x) => x.status), ["complete", "recoverable", "incomplete"]);

  const sameStatus = [
    makeRecord({ id: "button/beta--22222222", title: "zeta button" }),
    makeRecord({ id: "button/beta--33333333", title: "Alpha Button" }),
    makeRecord({ id: "button/beta--11111111", title: "alpha button" }),
  ];
  assert.deepEqual(searchCatalog(sameStatus, "button").map((x) => x.id), [
    "button/beta--11111111",
    "button/beta--33333333",
    "button/beta--22222222",
  ]);
});

test("filters category and excludes incomplete and invalid by default", () => {
  const results = searchCatalog(records, "animated", { category: "button" });
  assert.ok(results.every((x) => x.category === "button"));
  assert.ok(results.every((x) => !["incomplete", "invalid"].includes(x.status)));
});

test("matches Chinese substrings and tokens", () => {
  const chinese = [
    makeRecord({
      id: "button/liuguang--11111111",
      title: "流光按钮",
      description: "适用于登录页面",
      author: "设计师小林",
    }),
  ];
  assert.equal(searchCatalog(chinese, "流光 按钮")[0].id, chinese[0].id);
  assert.equal(searchCatalog(chinese, "光按")[0].id, chinese[0].id);
  assert.equal(searchCatalog(chinese, "登录")[0].id, chinese[0].id);
});

test("case-folds and normalizes punctuation in queries and fields", () => {
  assert.equal(searchCatalog(records, "  SHIMMER---BUTTON!!!  ")[0].id, records[0].id);
  assert.equal(searchCatalog(records, "animated", { category: "BuTToN!!!" })[0].category, "button");
});

test("validates limit and treats an empty normalized query as no results", () => {
  for (const limit of [0, -1, 1.5, "2", Number.NaN]) {
    assert.throws(() => searchCatalog(records, "button", { limit }), /limit must be a positive integer/);
  }
  assert.deepEqual(searchCatalog(records, " -- !!! "), []);
  assert.equal(searchCatalog(records, "button", { limit: 1 }).length, 1);
});

test("includes incomplete and invalid records only when explicitly requested", () => {
  assert.deepEqual(searchCatalog(records, "incomplete").map((x) => x.status), []);
  assert.deepEqual(
    searchCatalog(records, "incomplete", { includeIncomplete: true }).map((x) => x.status),
    ["incomplete"],
  );
  assert.deepEqual(searchCatalog(records, "invalid", { includeIncomplete: true }).map((x) => x.status), []);
  assert.deepEqual(
    searchCatalog(records, "invalid", { includeInvalid: true }).map((x) => x.status),
    ["invalid"],
  );
});

test("returns stable summaries without code or source metadata", () => {
  const [result] = searchCatalog([
    makeRecord({
      id: "button/dependency--11111111",
      title: "Plain",
      dependencies: ["motion-react"],
      roles: ["Motion Helper"],
      diagnostics: [{ code: "FIXTURE" }],
    }),
  ], "motion");
  assert.deepEqual(result, {
    id: "button/dependency--11111111",
    title: "Plain",
    description: "",
    category: "button",
    status: "complete",
    confidence: 1,
    dependencies: ["motion-react"],
    score: 5,
    diagnostics_count: 1,
  });
  assert.equal(JSON.stringify(result).includes("secret code"), false);
});

test("suggests deterministic related categories when a category filter has no results", () => {
  const suggestionRecords = [
    makeRecord({ id: "card/animated-card--11111111", title: "Animated Card", category: "card" }),
    makeRecord({ id: "background/animated-bg--22222222", title: "Animated", category: "background" }),
    makeRecord({ id: "card/animated-alt--33333333", title: "Animated", category: "card" }),
  ];
  const results = searchCatalog(suggestionRecords, "animated", { category: "button" });
  assert.deepEqual(results, []);
  assert.deepEqual(results.relatedCategories, ["background", "card"]);
});
