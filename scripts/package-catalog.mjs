#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { validateCatalog } from "../lib/catalog-loader.mjs";
import { createDeterministicZip } from "../lib/deterministic-zip.mjs";

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

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
  if (!options.source || !options.output) throw new Error("usage: package-catalog --source PATH --output FILE [--checksum FILE] [--json]");
  return options;
}

try {
  const options = parseArgs(process.argv.slice(2));
  const validation = await validateCatalog(options.source);
  if (!validation.valid) throw new Error(`catalog validation failed with ${validation.errors.length} error(s)`);
  const result = await createDeterministicZip({ sourcePath: options.source, outputPath: options.output });
  const checksum = resolve(options.checksum ?? `${options.output}.sha256`);
  await writeFile(checksum, `${result.sha256}  ${resolve(options.output).split(/[\\/]/).at(-1)}\n`, "utf8");
  const summary = { ...result, checksum };
  process.stdout.write(options.json ? `${JSON.stringify(summary, null, 2)}\n` : `Packaged ${result.file_count} files (${result.size} bytes)\nSHA-256 ${result.sha256}\n`);
} catch (error) {
  fail(error.message);
}
