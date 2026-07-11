import { readFile } from "node:fs/promises";
import path from "node:path";
import { SCHEMA_VERSION, validateManifest } from "./catalog-schema.mjs";

function platformPath(platform) {
  return platform === "win32" ? path.win32 : path.posix;
}

export function userConfigPath(platform, env = {}, homeDir = "") {
  const paths = platformPath(platform);
  if (platform === "win32") {
    return paths.join(env.APPDATA || paths.join(homeDir, "AppData", "Roaming"), "ui-forge", "config.json");
  }
  if (platform === "darwin") {
    return paths.join(homeDir, "Library", "Application Support", "ui-forge", "config.json");
  }
  return paths.join(env.XDG_CONFIG_HOME || paths.join(homeDir, ".config"), "ui-forge", "config.json");
}

export function commonCatalogPaths(platform, env = {}, homeDir = "") {
  const paths = platformPath(platform);
  let dataCatalog;
  if (platform === "win32") {
    dataCatalog = paths.join(env.LOCALAPPDATA || paths.join(homeDir, "AppData", "Local"), "ui-forge", "catalog");
  } else if (platform === "darwin") {
    dataCatalog = paths.join(homeDir, "Library", "Application Support", "ui-forge", "catalog");
  } else {
    dataCatalog = paths.join(env.XDG_DATA_HOME || paths.join(homeDir, ".local", "share"), "ui-forge", "catalog");
  }
  return [dataCatalog, paths.join(homeDir, ".ui-forge", "catalog")];
}

async function readJson(file) {
  let contents;
  try {
    contents = await readFile(file, "utf8");
  } catch (error) {
    const wrapped = new Error(`Unable to read ${file}`);
    wrapped.code = error?.code === "ENOENT" ? "CATALOG_NOT_FOUND" : "CATALOG_UNREADABLE";
    throw wrapped;
  }
  try {
    return JSON.parse(contents);
  } catch {
    const error = new Error(`Invalid JSON in ${file}`);
    error.code = "CATALOG_PARSE_ERROR";
    throw error;
  }
}

async function checkCatalog(candidatePath) {
  const resolved = path.resolve(candidatePath);
  const manifestFile = path.join(resolved, "manifest.json");
  const manifest = await readJson(manifestFile);
  if (manifest?.schema_version !== SCHEMA_VERSION) {
    const error = new Error(`Unsupported catalog schema version: ${manifest?.schema_version}`);
    error.code = "UNSUPPORTED_SCHEMA_VERSION";
    throw error;
  }
  const errors = validateManifest(manifest, manifestFile);
  if (errors.length > 0) {
    const error = new Error(errors[0].message);
    error.code = errors[0].code;
    throw error;
  }
  return resolved;
}

async function nearestProjectConfig(cwd) {
  let directory = path.resolve(cwd);
  while (true) {
    const file = path.join(directory, ".ui-forge.json");
    try {
      await readFile(file, "utf8");
      return file;
    } catch (error) {
      if (error?.code !== "ENOENT") return file;
    }
    const parent = path.dirname(directory);
    if (parent === directory) return null;
    directory = parent;
  }
}

async function configuredCandidate(configFile) {
  const config = await readJson(configFile);
  if (typeof config?.catalog !== "string" || config.catalog.length === 0) {
    const error = new Error(`Invalid catalog setting in ${configFile}`);
    error.code = "INVALID_CONFIG";
    throw error;
  }
  return path.resolve(path.dirname(configFile), config.catalog);
}

export async function discoverCatalog(options = {}) {
  const {
    cliPath,
    env = process.env,
    cwd = process.cwd(),
    platform = process.platform,
    homeDir = env.HOME || env.USERPROFILE || "",
  } = options;
  const checked = [];

  async function tryCandidate(source, candidatePath) {
    try {
      const resolved = await checkCatalog(candidatePath);
      return { path: resolved, source, checked };
    } catch (error) {
      checked.push({ source, path: path.resolve(candidatePath), reason: error.code ?? "CATALOG_UNREADABLE" });
      return null;
    }
  }

  if (cliPath) {
    const result = await tryCandidate("cli", path.resolve(cwd, cliPath));
    if (result) return result;
  }
  if (env.UI_FORGE_CATALOG) {
    const result = await tryCandidate("environment", path.resolve(cwd, env.UI_FORGE_CATALOG));
    if (result) return result;
  }

  const projectConfig = await nearestProjectConfig(cwd);
  if (projectConfig) {
    try {
      const result = await tryCandidate("project-config", await configuredCandidate(projectConfig));
      if (result) return result;
    } catch (error) {
      checked.push({ source: "project-config", path: projectConfig, reason: error.code ?? "CATALOG_UNREADABLE" });
    }
  }

  const configFile = userConfigPath(platform, env, homeDir);
  try {
    const result = await tryCandidate("user-config", await configuredCandidate(configFile));
    if (result) return result;
  } catch (error) {
    checked.push({ source: "user-config", path: configFile, reason: error.code ?? "CATALOG_UNREADABLE" });
  }

  for (const candidatePath of commonCatalogPaths(platform, env, homeDir)) {
    const result = await tryCandidate("common-path", candidatePath);
    if (result) return result;
  }

  const error = new Error("No valid UI Forge catalog was found");
  error.code = "CATALOG_NOT_FOUND";
  error.checked = checked;
  throw error;
}
