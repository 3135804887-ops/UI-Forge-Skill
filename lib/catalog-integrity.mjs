import { createHash } from "node:crypto";
import { lstat, realpath, stat } from "node:fs/promises";
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
  if (typeof value !== "string" || value.length === 0 || value.includes("\0") || value.includes("\\")) {
    throw invalidComponentPath(value);
  }

  if (value.startsWith("/") || /^[A-Za-z]:/.test(value)) {
    throw invalidComponentPath(value);
  }

  const segments = value.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw invalidComponentPath(value);
  }

  return segments.join("/");
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

function unsafeComponentFile(file, message) {
  const error = new Error(message);
  error.code = "UNSAFE_COMPONENT_FILE";
  error.file = file;
  return error;
}

export function isPathContained(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

export async function canonicalizeProspectivePath(target) {
  const resolved = path.resolve(target);
  let existing = resolved;
  const missing = [];
  while (true) {
    try {
      await stat(existing);
      return path.resolve(await realpath(existing), ...missing.reverse());
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      const parent = path.dirname(existing);
      if (parent === existing) throw error;
      missing.push(path.basename(existing));
      existing = parent;
    }
  }
}

export async function resolveComponentFile(catalogPath, relativePath) {
  const canonicalCatalog = await realpath(catalogPath);
  const componentsRoot = path.join(canonicalCatalog, "components");
  let rootInfo;
  try {
    rootInfo = await lstat(componentsRoot);
  } catch (error) {
    if (error?.code === "ENOENT") {
      const missing = unsafeComponentFile(componentsRoot, "Catalog components root is missing");
      missing.code = "MISSING_CATALOG_ENTRY";
      throw missing;
    }
    throw error;
  }
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) {
    throw unsafeComponentFile(componentsRoot, "Catalog components root must be a real directory");
  }
  const { normalizedPath, resolvedPath } = resolveComponentPath(canonicalCatalog, relativePath);
  let cursor = componentsRoot;
  for (const segment of normalizedPath.split("/")) {
    cursor = path.join(cursor, segment);
    let info;
    try {
      info = await lstat(cursor);
    } catch (error) {
      if (error?.code === "ENOENT") {
        const missing = unsafeComponentFile(cursor, `Manifest component file is missing: ${normalizedPath}`);
        missing.code = "MISSING_CATALOG_ENTRY";
        throw missing;
      }
      throw error;
    }
    if (info.isSymbolicLink()) throw unsafeComponentFile(cursor, `Manifest component path contains a symbolic link: ${normalizedPath}`);
  }
  const info = await lstat(resolvedPath);
  if (!info.isFile()) throw unsafeComponentFile(resolvedPath, `Manifest component must be a regular file: ${normalizedPath}`);
  const physicalPath = await realpath(resolvedPath);
  const canonicalComponentsRoot = await realpath(componentsRoot);
  if (!isPathContained(canonicalComponentsRoot, physicalPath)) {
    throw unsafeComponentFile(resolvedPath, `Manifest component resolves outside components root: ${normalizedPath}`);
  }
  return { normalizedPath, resolvedPath, physicalPath };
}
