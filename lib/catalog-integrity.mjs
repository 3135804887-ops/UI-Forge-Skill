import { createHash } from "node:crypto";
import path from "node:path";

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function invalidComponentPath(value) {
  const error = new Error(`Invalid component path: ${String(value)}`);
  error.code = "INVALID_COMPONENT_PATH";
  return error;
}

export function normalizeComponentPath(value) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    throw invalidComponentPath(value);
  }

  const separatorsNormalized = value.replaceAll("\\", "/");
  if (separatorsNormalized.startsWith("/") || /^[A-Za-z]:/.test(separatorsNormalized)) {
    throw invalidComponentPath(value);
  }

  const segments = separatorsNormalized.split("/");
  if (segments.includes("..")) {
    throw invalidComponentPath(value);
  }

  const normalized = segments.filter((segment) => segment !== "" && segment !== ".").join("/");
  if (normalized.length === 0) {
    throw invalidComponentPath(value);
  }
  return normalized;
}

export function computeManifestDigest(files) {
  const rows = files
    .map((entry) => {
      const normalizedPath = normalizeComponentPath(entry.path);
      return { path: normalizedPath, row: `${normalizedPath}\0${entry.sha256}` };
    })
    .sort((left, right) => compareStrings(left.path, right.path))
    .map((entry) => entry.row);
  return createHash("sha256").update(rows.join("\n")).digest("hex");
}

export function resolveComponentPath(catalogPath, relativePath) {
  const normalizedPath = normalizeComponentPath(relativePath);
  const componentsPath = path.resolve(catalogPath, "components");
  const resolvedPath = path.resolve(componentsPath, ...normalizedPath.split("/"));
  const relative = path.relative(componentsPath, resolvedPath);
  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw invalidComponentPath(relativePath);
  }
  return { normalizedPath, resolvedPath };
}
