#!/usr/bin/env node

import path from "node:path";
import { buildCatalog } from "../lib/catalog-builder.mjs";

const USAGE = "node scripts/build-catalog.mjs --source PATH --output PATH [--json]";

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function usageError(message) {
  const error = new Error(message);
  error.code = "INVALID_USAGE";
  return error;
}

function parseArgs(args) {
  const options = { json: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--json") {
      if (options.json) throw usageError("--json may only be provided once");
      options.json = true;
      continue;
    }
    if (arg !== "--source" && arg !== "--output") throw usageError(`unknown argument: ${arg}`);
    const key = arg.slice(2);
    if (Object.hasOwn(options, key)) throw usageError(`${arg} may only be provided once`);
    const value = args[index + 1];
    if (typeof value !== "string" || value.startsWith("--") || value.trim().length === 0) {
      throw usageError(`${arg} requires a nonblank path`);
    }
    options[key] = value;
    index += 1;
  }
  if (!options.source) throw usageError("--source is required");
  if (!options.output) throw usageError("--output is required");
  if (!path.isAbsolute(options.source) || !path.isAbsolute(options.output)) {
    throw usageError("--source and --output must be absolute paths");
  }
  const source = path.resolve(options.source);
  const output = path.resolve(options.output);
  const relativeOutput = path.relative(source, output);
  if (relativeOutput === "" || (!relativeOutput.startsWith(`..${path.sep}`) && relativeOutput !== ".." && !path.isAbsolute(relativeOutput))) {
    throw usageError("--output must be distinct from and outside --source");
  }
  return { ...options, source, output };
}

function summary(result) {
  return {
    parsed: result.report.parsed_records,
    repaired: result.report.recovered_records,
    merged: result.report.merged_records,
    emitted: result.report.emitted_records,
    rejected: result.report.rejected_records.length,
    component_files: result.manifest.files.length,
    manifest_digest: result.manifest.digest,
  };
}

function human(value) {
  return [
    `Parsed: ${value.parsed}`,
    `Repaired: ${value.repaired}`,
    `Merged: ${value.merged}`,
    `Emitted: ${value.emitted}`,
    `Rejected: ${value.rejected}`,
    `Component files: ${value.component_files}`,
    `Manifest digest: ${value.manifest_digest}`,
    "",
  ].join("\n");
}

const rawArgs = process.argv.slice(2);
const wantsJson = rawArgs.includes("--json");

try {
  const options = parseArgs(rawArgs);
  const value = summary(await buildCatalog({ sourcePath: options.source, outputPath: options.output }));
  process.stdout.write(options.json ? json(value) : human(value));
} catch (error) {
  process.exitCode = 1;
  if (wantsJson) {
    process.stderr.write(json({ error: error.message, code: error.code ?? "BUILD_FAILED", usage: USAGE }));
  } else {
    process.stderr.write(`Error: ${error.message}\nUsage: ${USAGE}\n`);
  }
}
