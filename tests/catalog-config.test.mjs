import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { commonCatalogPaths, discoverCatalog, userConfigPath } from "../lib/catalog-config.mjs";
import { createFixtureCatalog, makeTempDir, writeJson } from "./helpers.mjs";

const record = {
  schema_version: 1,
  id: "button/alpha--11111111",
  title: "Alpha",
  description: "Alpha component.",
  category: "button",
  source: { provider: "fixture", author: "maker", slug: "alpha" },
  source_id: `sha256:${"1".repeat(64)}`,
  status: "complete",
  confidence: 1,
  dependencies: [],
  local_imports: [],
  external_assets: [],
  code_blocks: [{ index: 0, language: "js", role: "component", suggested_path: "alpha.js", code: "export const alpha = true;" }],
  diagnostics: [],
};

async function fixtureRoot(t) {
  const root = await makeTempDir();
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

async function catalog(root, name) {
  return createFixtureCatalog(path.join(root, name), [record]);
}

test("CLI path wins over environment and config", async (t) => {
  const root = await fixtureRoot(t);
  const [cliPath, envPath, configPath] = await Promise.all([
    catalog(root, "cli"), catalog(root, "env"), catalog(root, "config"),
  ]);
  const projectDir = path.join(root, "project");
  await writeJson(path.join(projectDir, ".ui-forge.json"), { catalog: configPath });

  const result = await discoverCatalog({
    cliPath,
    env: { UI_FORGE_CATALOG: envPath },
    cwd: projectDir,
    platform: process.platform,
    homeDir: path.join(root, "home"),
  });
  assert.equal(result.path, path.resolve(cliPath));
  assert.equal(result.source, "cli");
  assert.deepEqual(result.checked, []);
});

test("environment wins over project and user configuration", async (t) => {
  const root = await fixtureRoot(t);
  const envPath = await catalog(root, "env");
  const configPath = await catalog(root, "config");
  const projectDir = path.join(root, "project");
  await writeJson(path.join(projectDir, ".ui-forge.json"), { catalog: configPath });

  const result = await discoverCatalog({ env: { UI_FORGE_CATALOG: envPath }, cwd: projectDir, platform: process.platform, homeDir: path.join(root, "home") });
  assert.equal(result.path, path.resolve(envPath));
  assert.equal(result.source, "environment");
});

test("uses the nearest upward project configuration and resolves relative paths", async (t) => {
  const root = await fixtureRoot(t);
  const outerCatalog = await catalog(root, "outer-catalog");
  const projectDir = path.join(root, "project");
  const nestedDir = path.join(projectDir, "packages", "app", "src");
  const nearCatalog = await catalog(path.join(projectDir, "packages"), "near-catalog");
  await mkdir(nestedDir, { recursive: true });
  await writeJson(path.join(projectDir, ".ui-forge.json"), { catalog: outerCatalog });
  await writeJson(path.join(projectDir, "packages", "app", ".ui-forge.json"), { catalog: "../near-catalog" });

  const result = await discoverCatalog({ env: {}, cwd: nestedDir, platform: process.platform, homeDir: path.join(root, "home") });
  assert.equal(result.path, path.resolve(nearCatalog));
  assert.equal(result.source, "project-config");
});

test("uses Windows, macOS, and Linux user config paths", () => {
  assert.equal(userConfigPath("win32", { APPDATA: "C:\\Users\\Ada\\AppData\\Roaming" }, "C:\\Users\\Ada"), "C:\\Users\\Ada\\AppData\\Roaming\\ui-forge\\config.json");
  assert.equal(userConfigPath("darwin", {}, "/Users/ada"), "/Users/ada/Library/Application Support/ui-forge/config.json");
  assert.equal(userConfigPath("linux", { XDG_CONFIG_HOME: "/cfg" }, "/home/ada"), "/cfg/ui-forge/config.json");
});

test("discovers catalogs from user config and common install paths", async (t) => {
  const root = await fixtureRoot(t);
  const homeDir = path.join(root, "home");
  const userCatalog = await catalog(root, "user-catalog");
  await writeJson(userConfigPath(process.platform, {}, homeDir), { catalog: userCatalog });
  const fromUser = await discoverCatalog({ env: {}, cwd: path.join(root, "project"), platform: process.platform, homeDir });
  assert.equal(fromUser.source, "user-config");
  assert.equal(fromUser.path, path.resolve(userCatalog));

  await rm(userConfigPath(process.platform, {}, homeDir));
  const commonPath = commonCatalogPaths(process.platform, {}, homeDir)[0];
  await createFixtureCatalog(commonPath, [record]);
  const fromCommon = await discoverCatalog({ env: {}, cwd: path.join(root, "project"), platform: process.platform, homeDir });
  assert.equal(fromCommon.source, "common-path");
  assert.equal(fromCommon.path, path.resolve(commonPath));
});

test("records invalid candidates and reports CATALOG_NOT_FOUND", async (t) => {
  const root = await fixtureRoot(t);
  const invalid = path.join(root, "invalid");
  await writeJson(path.join(invalid, "manifest.json"), { schema_version: 99, component_count: 0, files: [], digest: "0".repeat(64) });
  const missingEnv = path.join(root, "missing-env");

  await assert.rejects(
    discoverCatalog({ cliPath: invalid, env: { UI_FORGE_CATALOG: missingEnv }, cwd: path.join(root, "project"), platform: process.platform, homeDir: path.join(root, "home") }),
    (error) => {
      assert.equal(error.code, "CATALOG_NOT_FOUND");
      assert.equal(error.checked[0].source, "cli");
      assert.equal(error.checked[0].reason, "UNSUPPORTED_SCHEMA_VERSION");
      assert.equal(error.checked[1].source, "environment");
      assert.deepEqual(
        error.checked.find((candidate) => candidate.source === "user-config"),
        {
          source: "user-config",
          path: userConfigPath(process.platform, {}, path.join(root, "home")),
          reason: "CATALOG_NOT_FOUND",
        },
      );
      return true;
    },
  );
});
