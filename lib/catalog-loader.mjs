import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SCHEMA_VERSION, validateManifest, validateRecord } from "./catalog-schema.mjs";

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function makeError(code, message, file = "", issuePath = "") {
  const error = new Error(message);
  error.code = code;
  error.file = file;
  error.path = issuePath;
  return error;
}

function asIssue(error) {
  return {
    code: error.code ?? "CATALOG_UNREADABLE",
    file: error.file ?? "",
    path: error.path ?? "",
    message: error.message,
  };
}

async function readCatalogFile(file, { missingCode = "CATALOG_UNREADABLE" } = {}) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    const code = error?.code === "ENOENT" ? missingCode : "CATALOG_UNREADABLE";
    throw makeError(code, `Unable to read ${file}`, file);
  }
}

function parseJson(contents, file) {
  try {
    return JSON.parse(contents);
  } catch {
    throw makeError("CATALOG_PARSE_ERROR", `Invalid JSON in ${file}`, file);
  }
}

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

export async function loadCatalog(catalogPath) {
  const resolvedPath = path.resolve(catalogPath);
  const manifestFile = path.join(resolvedPath, "manifest.json");
  const manifest = parseJson(
    await readCatalogFile(manifestFile, { missingCode: "CATALOG_NOT_FOUND" }),
    manifestFile,
  );

  if (manifest?.schema_version !== SCHEMA_VERSION) {
    throw makeError(
      "UNSUPPORTED_SCHEMA_VERSION",
      `Unsupported catalog schema version: ${manifest?.schema_version}`,
      manifestFile,
      "schema_version",
    );
  }

  const manifestErrors = validateManifest(manifest, manifestFile);
  if (manifestErrors.length > 0) {
    const first = manifestErrors[0];
    throw makeError(first.code, first.message, first.file, first.path);
  }

  const manifestBase = {
    schema_version: manifest.schema_version,
    component_count: manifest.component_count,
    files: manifest.files,
  };
  if (sha256(JSON.stringify(manifestBase)) !== manifest.digest) {
    throw makeError("MANIFEST_DIGEST_MISMATCH", "Manifest digest does not match its contents", manifestFile, "digest");
  }

  const sortedFiles = [...manifest.files].sort((left, right) => compareStrings(left.path, right.path));
  const records = [];
  const ids = new Set();

  for (const entry of sortedFiles) {
    const file = path.join(resolvedPath, "components", entry.path);
    const contents = await readCatalogFile(file);
    if (sha256(contents) !== entry.sha256) {
      throw makeError("FILE_DIGEST_MISMATCH", `Digest mismatch for ${entry.path}`, file);
    }

    const record = parseJson(contents, file);
    const recordErrors = validateRecord(record, file);
    if (recordErrors.length > 0) {
      const first = recordErrors[0];
      throw makeError(first.code, first.message, first.file, first.path);
    }
    if (ids.has(record.id)) {
      throw makeError("DUPLICATE_ID", `Duplicate component ID: ${record.id}`, file, "id");
    }
    if (record.id !== entry.id) {
      throw makeError("RECORD_ID_MISMATCH", `Record ID does not match manifest entry ${entry.id}`, file, "id");
    }
    ids.add(record.id);
    records.push(record);
  }

  return {
    path: resolvedPath,
    manifest: { ...manifest, files: sortedFiles },
    records,
    errors: [],
    warnings: [],
  };
}

export async function validateCatalog(catalogPath) {
  try {
    const loaded = await loadCatalog(catalogPath);
    return { valid: true, ...loaded };
  } catch (error) {
    return {
      valid: false,
      path: path.resolve(catalogPath),
      manifest: null,
      records: [],
      errors: [asIssue(error)],
      warnings: [],
    };
  }
}
