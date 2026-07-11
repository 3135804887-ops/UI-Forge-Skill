#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateCatalog } from "../lib/catalog-loader.mjs";
import { packageCatalog } from "../lib/deterministic-zip.mjs";

const USAGE = "node scripts/package-catalog.mjs --source PATH --output FILE [--checksum FILE] [--json]";

function parseArgs(argv) {
  const options = { json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") options.json = true;
    else if (["--source", "--output", "--checksum"].includes(arg)) {
      const value = argv[index += 1];
      if (typeof value !== "string" || value.trim() === "") throw new Error(`${arg} requires a value`);
      options[arg.slice(2)] = value;
    } else throw new Error(`unknown argument: ${arg}`);
  }
  if (!options.source || !options.output) throw new Error(`usage: ${USAGE}`);
  return options;
}

function human(result) {
  const lines = [
    `Packaged ${result.file_count} files (${result.size} bytes)`,
    `SHA-256 ${result.sha256}`,
    `Checksum ${result.checksum}`,
  ];
  for (const warning of result.warnings) {
    lines.push(`Warning: [${warning.code}] ${warning.message}`);
    lines.push(`Backup recovery path: ${warning.diagnostic_backup_path}`);
  }
  lines.push("");
  return lines.join("\n");
}

/** @internal Injectable runner for process wiring and fault-path tests. */
export async function runPackageCli(rawArgs, io = process, internalDependencies = {}) {
  const wantsJson = rawArgs.includes("--json");
  try {
    const options = parseArgs(rawArgs);
    const validation = await validateCatalog(options.source);
    if (!validation.valid) throw new Error(`catalog validation failed with ${validation.errors.length} error(s)`);
    const result = await packageCatalog(
      { sourcePath: options.source, outputPath: options.output, checksumPath: options.checksum },
      internalDependencies,
    );
    io.stdout.write(options.json ? `${JSON.stringify(result, null, 2)}\n` : human(result));
    return 0;
  } catch (error) {
    if (wantsJson) {
      const envelope = { error: error.message, code: error.code ?? "PACKAGE_FAILED", usage: USAGE };
      if (error.state !== undefined) envelope.state = error.state;
      if (error.recovery_paths !== undefined) envelope.recovery_paths = error.recovery_paths;
      io.stderr.write(`${JSON.stringify(envelope, null, 2)}\n`);
    }
    else io.stderr.write(`Error: ${error.message}\nUsage: ${USAGE}\n`);
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await runPackageCli(process.argv.slice(2));
}
