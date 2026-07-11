export const SCHEMA_VERSION = 1;
export const STATUS_RANK = Object.freeze({
  complete: 0,
  recoverable: 1,
  incomplete: 2,
  invalid: 3,
});

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*--[0-9a-f]{8}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const SOURCE_ID_PATTERN = /^sha256:[0-9a-f]{64}$/;
const URL_PATTERN = /(?:\b[a-z][a-z0-9+.-]*:\/\/|\b(?:data|mailto|tel|urn):\S|\bwww\.)/i;

export function isValidComponentId(value) {
  return typeof value === "string" && ID_PATTERN.test(value);
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function issue(code, file, path, message) {
  return { code, file, path, message };
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireString(errors, value, file, path) {
  if (typeof value !== "string" || value.length === 0) {
    errors.push(issue("INVALID_STRING", file, path, `${path} must be a non-empty string`));
  }
}

function validateSortedUniqueStrings(errors, value, file, path) {
  if (!Array.isArray(value)) {
    errors.push(issue("INVALID_ARRAY", file, path, `${path} must be an array`));
    return;
  }
  if (value.some((entry) => typeof entry !== "string" || entry.length === 0)) {
    errors.push(issue("INVALID_ARRAY_ITEM", file, path, `${path} must contain non-empty strings`));
    return;
  }
  const expected = [...new Set(value)].sort(compareStrings);
  if (expected.length !== value.length || expected.some((entry, index) => entry !== value[index])) {
    errors.push(issue("UNSORTED_OR_DUPLICATE", file, path, `${path} must be sorted and unique`));
  }
}

export function containsMetadataUrl(value) {
  function scan(current) {
    if (typeof current === "string") return URL_PATTERN.test(current);
    if (Array.isArray(current)) return current.some((entry) => scan(entry));
    if (!isObject(current)) return false;
    return Object.entries(current).some(([key, entry]) => {
      if (key === "code_blocks" && Array.isArray(entry)) {
        return entry.some((block) => {
          if (!isObject(block)) return scan(block);
          return Object.entries(block).some(([blockKey, blockValue]) => (
            blockKey === "code" ? false : scan(blockValue)
          ));
        });
      }
      return scan(entry);
    });
  }
  return scan(value);
}

export function validateRecord(record, file = "<memory>") {
  const errors = [];
  if (!isObject(record)) {
    return [issue("INVALID_RECORD", file, "", "record must be an object")];
  }

  if (record.schema_version !== SCHEMA_VERSION) {
    errors.push(issue("INVALID_SCHEMA_VERSION", file, "schema_version", `schema_version must be ${SCHEMA_VERSION}`));
  }
  if (!isValidComponentId(record.id)) {
    errors.push(issue("INVALID_ID", file, "id", "id must match <category>/<slug>--<8 hex>"));
  }
  requireString(errors, record.title, file, "title");
  requireString(errors, record.description, file, "description");
  requireString(errors, record.category, file, "category");

  if (!isObject(record.source)) {
    errors.push(issue("INVALID_SOURCE", file, "source", "source must be an object"));
  } else {
    for (const field of ["provider", "author", "slug"]) {
      requireString(errors, record.source[field], file, `source.${field}`);
    }
  }
  if (typeof record.source_id !== "string" || !SOURCE_ID_PATTERN.test(record.source_id)) {
    errors.push(issue("INVALID_SOURCE_ID", file, "source_id", "source_id must be sha256:<64 lowercase hex>"));
  }
  if (!Object.hasOwn(STATUS_RANK, record.status)) {
    errors.push(issue("INVALID_STATUS", file, "status", "status must be complete, recoverable, incomplete, or invalid"));
  }
  if (typeof record.confidence !== "number" || !Number.isFinite(record.confidence) || record.confidence < 0 || record.confidence > 1) {
    errors.push(issue("INVALID_CONFIDENCE", file, "confidence", "confidence must be a number from 0 to 1"));
  }

  for (const field of ["dependencies", "local_imports", "external_assets"]) {
    validateSortedUniqueStrings(errors, record[field], file, field);
  }

  if (!Array.isArray(record.code_blocks) || record.code_blocks.length === 0) {
    errors.push(issue("MISSING_CODE", file, "code_blocks", "code_blocks must contain at least one block"));
  } else {
    record.code_blocks.forEach((block, index) => {
      const base = `code_blocks[${index}]`;
      if (!isObject(block)) {
        errors.push(issue("INVALID_CODE_BLOCK", file, base, "code block must be an object"));
        return;
      }
      if (!Number.isInteger(block.index) || block.index < 0 || block.index !== index) {
        errors.push(issue("INVALID_CODE_INDEX", file, `${base}.index`, "code block index must match its array position"));
      }
      for (const field of ["language", "role", "suggested_path", "code"]) {
        requireString(errors, block[field], file, `${base}.${field}`);
      }
    });
  }

  if (!Array.isArray(record.diagnostics)) {
    errors.push(issue("INVALID_ARRAY", file, "diagnostics", "diagnostics must be an array"));
  }
  if (containsMetadataUrl(record)) {
    errors.push(issue("METADATA_URL", file, "", "metadata fields must not contain URLs"));
  }
  return errors;
}

export function validateManifest(manifest, file = "manifest.json") {
  const errors = [];
  if (!isObject(manifest)) {
    return [issue("INVALID_MANIFEST", file, "", "manifest must be an object")];
  }
  if (manifest.schema_version !== SCHEMA_VERSION) {
    errors.push(issue("INVALID_SCHEMA_VERSION", file, "schema_version", `schema_version must be ${SCHEMA_VERSION}`));
  }
  if (!Number.isInteger(manifest.component_count) || manifest.component_count < 0) {
    errors.push(issue("INVALID_COMPONENT_COUNT", file, "component_count", "component_count must be a non-negative integer"));
  }
  if (!Array.isArray(manifest.files)) {
    errors.push(issue("INVALID_FILES", file, "files", "files must be an array"));
  } else {
    if (Number.isInteger(manifest.component_count) && manifest.component_count !== manifest.files.length) {
      errors.push(issue("COMPONENT_COUNT_MISMATCH", file, "component_count", "component_count must equal files.length"));
    }
    manifest.files.forEach((entry, index) => {
      const base = `files[${index}]`;
      if (!isObject(entry)) {
        errors.push(issue("INVALID_FILE_ENTRY", file, base, "file entry must be an object"));
        return;
      }
      if (!isValidComponentId(entry.id)) {
        errors.push(issue("INVALID_ID", file, `${base}.id`, "id must match <category>/<slug>--<8 hex>"));
      }
      requireString(errors, entry.path, file, `${base}.path`);
      if (typeof entry.sha256 !== "string" || !SHA256_PATTERN.test(entry.sha256)) {
        errors.push(issue("INVALID_SHA256", file, `${base}.sha256`, "sha256 must contain 64 lowercase hex characters"));
      }
    });
    const paths = manifest.files.map((entry) => entry?.path);
    const expectedPaths = [...paths].sort((left, right) => compareStrings(String(left), String(right)));
    if (expectedPaths.some((entry, index) => entry !== paths[index]) || new Set(paths).size !== paths.length) {
      errors.push(issue("UNSORTED_OR_DUPLICATE", file, "files", "manifest files must have sorted unique paths"));
    }
  }
  if (typeof manifest.digest !== "string" || !SHA256_PATTERN.test(manifest.digest)) {
    errors.push(issue("INVALID_DIGEST", file, "digest", "digest must contain 64 lowercase hex characters"));
  }
  if (containsMetadataUrl(manifest)) {
    errors.push(issue("METADATA_URL", file, "", "metadata fields must not contain URLs"));
  }
  return errors;
}
