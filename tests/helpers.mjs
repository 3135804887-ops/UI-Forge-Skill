import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { computeManifestDigest } from "../lib/catalog-integrity.mjs";

const execFileAsync = promisify(execFile);

export async function makeTempDir(prefix = "ui-forge-") {
  return mkdtemp(path.join(tmpdir(), prefix));
}

export async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function createFixtureCatalog(root, records) {
  const files = [];
  const sortedRecords = [...records].sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);

  for (const record of sortedRecords) {
    const [category, name] = record.id.split("/");
    const relativePath = `${category}/${name}.json`;
    const contents = `${JSON.stringify(record, null, 2)}\n`;
    await mkdir(path.join(root, "components", category), { recursive: true });
    await writeFile(path.join(root, "components", relativePath), contents, "utf8");
    files.push({
      id: record.id,
      path: relativePath,
      sha256: createHash("sha256").update(contents).digest("hex"),
    });
  }

  const manifestBase = {
    schema_version: 1,
    component_count: files.length,
    files,
  };
  const manifest = {
    ...manifestBase,
    digest: computeManifestDigest(files),
  };
  await writeJson(path.join(root, "manifest.json"), manifest);
  return root;
}

export async function runNode(args, options = {}) {
  try {
    const result = await execFileAsync(process.execPath, args, {
      encoding: "utf8",
      ...options,
    });
    return { ...result, code: 0 };
  } catch (error) {
    if (typeof error.code !== "number") throw error;
    return {
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? "",
      code: error.code,
    };
  }
}
