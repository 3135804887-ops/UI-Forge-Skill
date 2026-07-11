#!/usr/bin/env node

import { discoverCatalog } from "../lib/catalog-config.mjs";
import { validateCatalog } from "../lib/catalog-loader.mjs";
import { searchCatalog } from "../lib/catalog-search.mjs";

const USAGE = `Usage:
  ui-forge validate [--catalog PATH] [--json]
  ui-forge search QUERY [--category NAME] [--limit N] [--include-incomplete] [--include-invalid] [--catalog PATH] [--json]
  ui-forge show ID [--catalog PATH] [--json]
`;
const EXACT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*--[0-9a-f]{8}$/;

class UsageError extends Error {}

function parseArguments(argv) {
  const command = argv[0];
  if (!new Set(["validate", "search", "show"]).has(command)) {
    throw new UsageError(command === undefined ? "a command is required." : `unknown command: ${command}`);
  }

  const allowed = {
    validate: new Set(["--catalog", "--json"]),
    search: new Set(["--category", "--limit", "--include-incomplete", "--include-invalid", "--catalog", "--json"]),
    show: new Set(["--catalog", "--json"]),
  }[command];
  const valueFlags = new Set(["--catalog", "--category", "--limit"]);
  const options = {
    catalog: undefined,
    category: undefined,
    limit: undefined,
    includeIncomplete: false,
    includeInvalid: false,
    json: false,
  };
  const optionNames = {
    "--catalog": "catalog",
    "--category": "category",
    "--limit": "limit",
    "--include-incomplete": "includeIncomplete",
    "--include-invalid": "includeInvalid",
    "--json": "json",
  };
  const seen = new Set();
  const positional = [];

  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) {
      positional.push(argument);
      continue;
    }
    if (!allowed.has(argument)) throw new UsageError(`unknown option for ${command}: ${argument}`);
    if (seen.has(argument)) throw new UsageError(`option may only be used once: ${argument}`);
    seen.add(argument);
    const optionName = optionNames[argument];
    if (valueFlags.has(argument)) {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) throw new UsageError(`${argument} requires a value.`);
      options[optionName] = value;
      index += 1;
    } else {
      options[optionName] = true;
    }
  }

  const expectedPositionals = command === "validate" ? 0 : 1;
  if (positional.length !== expectedPositionals) {
    if (command === "search") throw new UsageError("search requires exactly one query argument.");
    if (command === "show") throw new UsageError("show requires exactly one component ID.");
    throw new UsageError("validate does not accept positional arguments.");
  }
  if (command === "search" && options.limit !== undefined) {
    if (!/^[1-9][0-9]*$/.test(options.limit)) throw new UsageError("--limit must be a positive integer.");
    options.limit = Number(options.limit);
    if (!Number.isSafeInteger(options.limit)) throw new UsageError("--limit must be a positive integer.");
  }
  return { command, value: positional[0], options };
}

function writeJson(stream, value) {
  stream.write(`${JSON.stringify(value, null, 2)}\n`);
}

function writeUsageError(error) {
  process.stderr.write(`Error: ${error.message}\n${USAGE}`);
}

function validationEnvelope(result) {
  return {
    command: "validate",
    valid: result.valid,
    schema_version: result.manifest?.schema_version ?? null,
    component_count: result.manifest?.component_count ?? 0,
    errors: result.errors,
    warnings: result.warnings,
  };
}

function formatList(values) {
  return values.length === 0 ? "none" : values.join(", ");
}

function writeHumanValidation(result) {
  if (result.valid) {
    process.stdout.write(`Catalog valid (schema ${result.manifest.schema_version}).\nComponents: ${result.manifest.component_count}\nWarnings: ${result.warnings.length}\n`);
    return;
  }
  process.stderr.write(`Catalog invalid (${result.errors.length} error${result.errors.length === 1 ? "" : "s"}).\n`);
  for (const issue of result.errors) process.stderr.write(`- ${issue.code}: ${issue.message}\n`);
}

function writeHumanSearch(query, results) {
  if (results.length === 0) {
    process.stdout.write(`No components found for "${query}".\n`);
    if (results.relatedCategories.length > 0) {
      process.stdout.write(`Related categories: ${results.relatedCategories.join(", ")}\n`);
    }
    return;
  }
  const lines = [`Results for "${query}" (${results.length})`];
  results.forEach((result, index) => {
    lines.push(
      `${index + 1}. ${result.title}`,
      `   ID: ${result.id}`,
      `   Category: ${result.category}`,
      `   Status: ${result.status} | Confidence: ${result.confidence} | Score: ${result.score}`,
      `   Dependencies: ${formatList(result.dependencies)}`,
    );
  });
  process.stdout.write(`${lines.join("\n")}\n`);
}

function writeHumanComponent(component) {
  const lines = [
    component.title,
    `ID: ${component.id}`,
    `Category: ${component.category}`,
    `Status: ${component.status}`,
    `Confidence: ${component.confidence}`,
    `Dependencies: ${formatList(component.dependencies)}`,
    `Local imports: ${formatList(component.local_imports)}`,
    `External assets: ${formatList(component.external_assets)}`,
    `Diagnostics: ${component.diagnostics.length}`,
    `Code blocks: ${component.code_blocks.length}`,
  ];
  for (const block of component.code_blocks) {
    lines.push("", `[${block.index}] ${block.role} (${block.language}) -> ${block.suggested_path}`, block.code);
  }
  process.stdout.write(`${lines.join("\n")}\n`);
}

function writeCommandError(command, code, message, json, details = {}) {
  if (json) {
    writeJson(process.stderr, { command, error: { code, message, ...details } });
  } else {
    process.stderr.write(`Error: ${message}\n`);
  }
}

async function run(parsed) {
  let discovered;
  try {
    discovered = await discoverCatalog({ cliPath: parsed.options.catalog });
  } catch (error) {
    if (parsed.options.json) {
      writeJson(process.stderr, {
        error: {
          code: error.code ?? "CATALOG_NOT_FOUND",
          message: error.message,
          checked: error.checked ?? [],
        },
      });
    } else {
      process.stderr.write(`Error: ${error.message}\n`);
      for (const candidate of error.checked ?? []) {
        process.stderr.write(`- ${candidate.source}: ${candidate.path} (${candidate.reason})\n`);
      }
    }
    return 2;
  }

  const catalog = await validateCatalog(discovered.path);
  if (!catalog.valid) {
    if (parsed.command === "validate") {
      if (parsed.options.json) writeJson(process.stderr, validationEnvelope(catalog));
      else writeHumanValidation(catalog);
    } else {
      writeCommandError(parsed.command, "INVALID_CATALOG", "catalog validation failed", parsed.options.json, { errors: catalog.errors });
    }
    return 1;
  }

  if (parsed.command === "validate") {
    if (parsed.options.json) writeJson(process.stdout, validationEnvelope(catalog));
    else writeHumanValidation(catalog);
    return 0;
  }

  if (parsed.command === "search") {
    const results = searchCatalog(catalog.records, parsed.value, {
      category: parsed.options.category,
      limit: parsed.options.limit,
      includeIncomplete: parsed.options.includeIncomplete,
      includeInvalid: parsed.options.includeInvalid,
    });
    if (parsed.options.json) {
      writeJson(process.stdout, {
        command: "search",
        query: parsed.value,
        category: parsed.options.category ?? null,
        results: [...results],
        relatedCategories: [...results.relatedCategories],
      });
    } else {
      writeHumanSearch(parsed.value, results);
    }
    return 0;
  }

  if (!EXACT_ID.test(parsed.value)) {
    writeCommandError("show", "INVALID_COMPONENT_ID", "show requires an exact component ID.", parsed.options.json);
    return 1;
  }
  const component = catalog.records.find(({ id }) => id === parsed.value);
  if (component === undefined) {
    writeCommandError("show", "COMPONENT_NOT_FOUND", `component not found: ${parsed.value}`, parsed.options.json);
    return 1;
  }
  if (parsed.options.json) writeJson(process.stdout, { command: "show", component });
  else writeHumanComponent(component);
  return 0;
}

let parsed;
try {
  parsed = parseArguments(process.argv.slice(2));
} catch (error) {
  if (!(error instanceof UsageError)) throw error;
  writeUsageError(error);
  process.exitCode = 1;
}

if (parsed !== undefined) process.exitCode = await run(parsed);
