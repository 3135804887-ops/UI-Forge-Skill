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
  assert.equal(containsMetadataUrl({ ...validRecord, description: "ftp://assets.example/x" }), true);
  assert.equal(containsMetadataUrl({ ...validRecord, description: "role: component" }), false);
  assert.equal(containsMetadataUrl({ ...validRecord, code_blocks: [{ ...validRecord.code_blocks[0], code: "const image = 'https://example.com/a.png';" }] }), false);
  assert.equal(containsMetadataUrl({ ...validRecord, code_blocks: [{ ...validRecord.code_blocks[0], extra: { code: "https://example.com/hidden" } }] }), true);
});

test("reports exact structural errors", () => {
  const errors = validateRecord({ ...validRecord, id: "Bad ID", code_blocks: [] }, "broken.json");
  assert.ok(errors.some((x) => x.code === "INVALID_ID" && x.file === "broken.json"));
  assert.ok(errors.some((x) => x.code === "MISSING_CODE"));
});

test("validates source identity fields", () => {
  const badSource = validateRecord({ ...validRecord, source: { provider: "21st.dev", author: "", slug: "shimmer-button" } });
  assert.ok(badSource.some((x) => x.path === "source.author"));
  const badSourceId = validateRecord({ ...validRecord, source_id: `sha256:${"A".repeat(64)}` });
  assert.ok(badSourceId.some((x) => x.code === "INVALID_SOURCE_ID"));
});

test("accepts every status and enforces confidence bounds", () => {
  for (const status of ["complete", "recoverable", "incomplete", "invalid"]) {
    assert.deepEqual(validateRecord({ ...validRecord, status }), []);
  }
  assert.ok(validateRecord({ ...validRecord, confidence: -0.01 }).some((x) => x.code === "INVALID_CONFIDENCE"));
  assert.ok(validateRecord({ ...validRecord, confidence: 1.01 }).some((x) => x.code === "INVALID_CONFIDENCE"));
  assert.ok(validateRecord({ ...validRecord, confidence: Number.NaN }).some((x) => x.code === "INVALID_CONFIDENCE"));
});

test("requires sorted unique string metadata arrays", () => {
  for (const field of ["dependencies", "local_imports", "external_assets"]) {
    assert.ok(validateRecord({ ...validRecord, [field]: ["z", "a"] }).some((x) => x.code === "UNSORTED_OR_DUPLICATE" && x.path === field));
    assert.ok(validateRecord({ ...validRecord, [field]: ["a", "a"] }).some((x) => x.code === "UNSORTED_OR_DUPLICATE" && x.path === field));
    assert.ok(validateRecord({ ...validRecord, [field]: "a" }).some((x) => x.code === "INVALID_ARRAY" && x.path === field));
  }
});

test("validates code-block fields and diagnostics", () => {
  const block = validRecord.code_blocks[0];
  assert.ok(validateRecord({ ...validRecord, code_blocks: [{ ...block, index: 1 }] }).some((x) => x.code === "INVALID_CODE_INDEX"));
  for (const field of ["language", "role", "suggested_path", "code"]) {
    assert.ok(validateRecord({ ...validRecord, code_blocks: [{ ...block, [field]: "" }] }).some((x) => x.path === `code_blocks[0].${field}`));
  }
  assert.ok(validateRecord({ ...validRecord, diagnostics: {} }).some((x) => x.code === "INVALID_ARRAY" && x.path === "diagnostics"));
});

test("reports manifest count, ordering, digest, and file errors", () => {
  const first = { id: validRecord.id, path: "z/file.json", sha256: "b".repeat(64) };
  const second = { id: "button/other--12345678", path: "a/file.json", sha256: "d".repeat(64) };
  const errors = validateManifest({ schema_version: 1, component_count: 1, files: [first, second], digest: "bad" });
  assert.ok(errors.some((x) => x.code === "COMPONENT_COUNT_MISMATCH"));
  assert.ok(errors.some((x) => x.code === "UNSORTED_OR_DUPLICATE"));
  assert.ok(errors.some((x) => x.code === "INVALID_DIGEST"));
  assert.ok(validateManifest({ schema_version: 1, component_count: 1, files: [{ ...first, sha256: "bad" }], digest: "c".repeat(64) }).some((x) => x.code === "INVALID_SHA256"));
});
