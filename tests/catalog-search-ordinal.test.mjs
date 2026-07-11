import test from "node:test";
import assert from "node:assert/strict";

import { searchCatalog } from "../lib/catalog-search.mjs";

function record(id, title) {
  return {
    schema_version: 1,
    id,
    title,
    description: "Matched component",
    category: "button",
    source: { provider: "fixture", author: "maker", slug: "neutral" },
    source_id: `sha256:${id.startsWith("button/z") ? "a".repeat(64) : "b".repeat(64)}`,
    status: "complete",
    confidence: 1,
    dependencies: [],
    local_imports: [],
    external_assets: [],
    code_blocks: [{ index: 0, language: "js", role: "component", suggested_path: null, code: "export default null;" }],
    diagnostics: [],
  };
}

test("uses normalized ordinal title ordering instead of locale collation", () => {
  const results = searchCatalog([
    record("button/e--11111111", "Éclair"),
    record("button/z--22222222", "Zulu"),
  ], "component");
  assert.deepEqual(results.map(({ title }) => title), ["Zulu", "Éclair"]);
});
