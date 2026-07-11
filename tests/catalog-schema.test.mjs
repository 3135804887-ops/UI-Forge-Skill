import test from "node:test";
import assert from "node:assert/strict";
import {
  SCHEMA_VERSION,
  STATUS_RANK,
  containsMetadataUrl,
  validateManifest,
  validateRecord,
} from "../lib/catalog-schema.mjs";

const validRecord = {
  schema_version: 1,
  id: "button/shimmer-button--a1b2c3d4",
  title: "Shimmer Button",
  description: "Animated shimmer button.",
  category: "button",
  source: { provider: "21st.dev", author: "maker", slug: "shimmer-button" },
  source_id: `sha256:${"a".repeat(64)}`,
  status: "complete",
  confidence: 1,
  dependencies: ["lucide-react"],
  local_imports: [],
  external_assets: [],
  code_blocks: [{ index: 0, language: "tsx", role: "component", suggested_path: "components/shimmer-button.tsx", code: "export function ShimmerButton() { return <button />; }" }],
  diagnostics: [],
};

test("exports schema version and stable status order", () => {
  assert.equal(SCHEMA_VERSION, 1);
  assert.deepEqual(STATUS_RANK, { complete: 0, recoverable: 1, incomplete: 2, invalid: 3 });
});

test("accepts a valid component and manifest", () => {
  assert.deepEqual(validateRecord(validRecord), []);
  assert.deepEqual(validateManifest({ schema_version: 1, component_count: 1, files: [{ id: validRecord.id, path: "button/shimmer-button--a1b2c3d4.json", sha256: "b".repeat(64) }], digest: "c".repeat(64) }), []);
});

test("rejects metadata URLs while allowing URLs inside code", () => {
  assert.equal(containsMetadataUrl(validRecord), false);
  assert.equal(containsMetadataUrl({ ...validRecord, description: "https://21st.dev/x" }), true);
  assert.equal(containsMetadataUrl({ ...validRecord, code_blocks: [{ ...validRecord.code_blocks[0], code: "const image = 'https://example.com/a.png';" }] }), false);
});

test("reports exact structural errors", () => {
  const errors = validateRecord({ ...validRecord, id: "Bad ID", code_blocks: [] }, "broken.json");
  assert.ok(errors.some((x) => x.code === "INVALID_ID" && x.file === "broken.json"));
  assert.ok(errors.some((x) => x.code === "MISSING_CODE"));
});
