import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { builtinModules } from "node:module";
import { SCHEMA_VERSION } from "./catalog-schema.mjs";

const REACT_PACKAGES = new Set(["react", "react-dom"]);
const NODE_BUILTINS = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]));

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sortedUnique(values) {
  return [...new Set(values)].sort(compareStrings);
}

function slugify(value, fallback = "component") {
  const slug = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function builderError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function normalizeSourceUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw builderError("INVALID_SOURCE_URL", "source URL must be a valid HTTP(S) URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw builderError("INVALID_SOURCE_URL", "source URL must use HTTP(S)");
  }
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();
  url.search = "";
  url.hash = "";
  const segments = url.pathname.split("/");
  for (let index = 0; index < segments.length; index += 1) {
    if (segments[index].startsWith("@")) segments[index] = `@${segments[index].slice(1).toLowerCase()}`;
    if (segments[index - 1]?.toLowerCase() === "components") segments[index] = segments[index].toLowerCase();
  }
  url.pathname = segments.join("/").replace(/\/+$/, "") || "/";
  return url.toString().replace(/\/$/, "");
}

export function extractSourceIdentity(value, title = "component") {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw builderError("INVALID_SOURCE_URL", "source URL must be a valid HTTP(S) URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw builderError("INVALID_SOURCE_URL", "source URL must use HTTP(S)");
  }
  const match = url.pathname.match(/^\/@([^/]+)\/components\/([^/]+)\/?$/i);
  const safeDecode = (entry) => {
    try {
      return decodeURIComponent(entry);
    } catch {
      return entry;
    }
  };
  return match
    ? { provider: url.host.toLowerCase(), author: safeDecode(match[1]), slug: safeDecode(match[2]) }
    : { provider: url.host.toLowerCase(), author: "unknown", slug: slugify(title) };
}

function normalizeCode(code) {
  return String(code ?? "").replace(/\r\n?/g, "\n");
}

function normalizedCodeHash(code) {
  const normalized = normalizeCode(code)
    .split("\n")
    .map((line) => line.replace(/[\t ]+$/g, ""))
    .join("\n")
    .trim();
  return sha256(normalized);
}

function normalizeFunctionalUrl(value) {
  try {
    const url = new URL(value);
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    url.hash = "";
    return url.toString();
  } catch {
    return value;
  }
}

function staticSpecifiers(code) {
  const found = [];
  const patterns = [
    /\bimport\s+(?!\s*\()(?:type\s+)?[^;"']*?\s+from\s*["']([^"']+)["']/g,
    /\bimport\s+(?!\s*\()["']([^"']+)["']/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of code.matchAll(pattern)) found.push(match[1]);
  }
  return found;
}

function isLocalSpecifier(specifier) {
  return /^(?:\.{1,2}\/|\/|@\/|~\/|#\/|\$\/)/.test(specifier);
}

function packageName(specifier) {
  if (specifier.startsWith("@")) return specifier.split("/").slice(0, 2).join("/");
  return specifier.split("/")[0];
}

function isInstallDependency(specifier) {
  if (isLocalSpecifier(specifier) || specifier.endsWith(".css")) return false;
  const root = packageName(specifier);
  return !REACT_PACKAGES.has(root) && !NODE_BUILTINS.has(specifier) && !NODE_BUILTINS.has(root);
}

function hasJsx(code) {
  return /<\/?[A-Za-z][^>]*>|<>|<\/>/.test(code);
}

function hasTypeScript(code) {
  return /\b(?:interface|type|enum|namespace)\s+[A-Za-z_$]|\b(?:as|satisfies)\s+[A-Za-z_$]|\([^)]*:\s*[A-Za-z_$][^)]*\)|\)\s*:\s*[A-Za-z_$]|\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*:\s*[^=;]+/.test(code);
}

function isStylesheet(code) {
  const withoutComments = code.replace(/\/\*[\s\S]*?\*\//g, "").trim();
  return !/\b(?:import|export|require|function|const|let|var)\b/.test(withoutComments)
    && /(?:^|\})\s*(?:[.#][\w-]+|[a-z][\w-]*|@(?:media|supports|keyframes))[^{}]*\{[^{}]*:[^{}]*\}/i.test(withoutComments);
}

function importedNames(code) {
  const names = new Set();
  for (const match of code.matchAll(/\bimport\s+(?!\s*\()(?:type\s+)?([^;"']*?)\s+from\s*["'][^"']+["']/g)) {
    const clause = match[1].trim();
    const defaultMatch = clause.match(/^([A-Za-z_$][\w$]*)/);
    if (defaultMatch) names.add(defaultMatch[1]);
    const namespaceMatch = clause.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
    if (namespaceMatch) names.add(namespaceMatch[1]);
    const braceMatch = clause.match(/\{([^}]+)\}/);
    if (braceMatch) {
      for (const part of braceMatch[1].split(",")) {
        const name = part.trim().split(/\s+as\s+/i).at(-1)?.trim();
        if (/^[A-Za-z_$][\w$]*$/.test(name ?? "")) names.add(name);
      }
    }
  }
  return names;
}

function exportedNames(code) {
  const names = new Set();
  for (const match of code.matchAll(/\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g)) names.add(match[1]);
  for (const match of code.matchAll(/\bexport\s*\{([^}]+)\}/g)) {
    for (const part of match[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/i).at(-1)?.trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name ?? "")) names.add(name);
    }
  }
  return names;
}

function inferLanguage(code) {
  if (isStylesheet(code)) return "css";
  const jsx = hasJsx(code);
  const typescript = hasTypeScript(code);
  if (jsx && typescript) return "tsx";
  if (jsx) return "jsx";
  if (typescript) return "ts";
  return "js";
}

function inferRole(code, language) {
  if (language === "css") return "style";
  const imports = importedNames(code);
  if ([...imports].some((name) => /^[A-Z]/.test(name)) && hasJsx(code)) return "usage";
  if (/\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|const)\s+use[A-Z0-9_]/.test(code)) return "hook";
  if (/\bexport\s+(?:default\s+)?(?:function|class|const)\s+[A-Z][\w$]*/.test(code) && hasJsx(code)) return "component";
  if (/\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\b|\bmodule\.exports\b/.test(code)) return "utility";
  return "unknown";
}

function primaryExport(code, fallback) {
  return [...exportedNames(code)][0] ?? fallback;
}

function suggestedPath(code, language, role, index) {
  const extension = language;
  const name = slugify(primaryExport(code, `block-${index}`), `block-${index}`);
  if (role === "style") return `styles/${name}.css`;
  if (role === "usage") return `examples/${name}-demo.${extension}`;
  if (role === "component") return `components/${name}.${extension}`;
  if (role === "hook") return `hooks/${name}.${extension}`;
  if (role === "utility") return `lib/${name}.${extension}`;
  return `source/${name}.${extension}`;
}

function importedBindings(code) {
  const bindings = [];
  for (const match of code.matchAll(/\bimport\s+(?!\s*\()(?:type\s+)?([^;"']*?)\s+from\s*["']([^"']+)["']/g)) {
    if (isLocalSpecifier(match[2])) bindings.push({ specifier: match[2], names: [...importedNames(match[0])] });
  }
  for (const match of code.matchAll(/\bimport\s+(?!\s*\()["']([^"']+)["']/g)) {
    if (isLocalSpecifier(match[1])) bindings.push({ specifier: match[1], names: [] });
  }
  return bindings;
}

function pathKey(value) {
  return value
    .replace(/^@\//, "")
    .replace(/^\.\.?(?:\/|$)/, "")
    .replace(/\.(?:[cm]?[jt]sx?|css)$/i, "")
    .replace(/\/index$/i, "")
    .toLowerCase();
}

export function analyzeCodeBlocks(blocks) {
  const usable = (Array.isArray(blocks) ? blocks : [])
    .map((block, sourceIndex) => ({ index: Number.isInteger(block?.index) ? block.index : sourceIndex, code: normalizeCode(block?.code) }))
    .filter(({ code }) => code.trim().length > 0);
  const dependencies = [];
  const localImports = [];
  const diagnostics = [];
  const assetLocations = new Map();
  const codeBlocks = usable.map(({ code }, index) => {
    for (const specifier of staticSpecifiers(code)) {
      if (isLocalSpecifier(specifier)) localImports.push(specifier);
      else if (isInstallDependency(specifier)) dependencies.push(packageName(specifier));
    }
    if (/\bimport\s*\(/.test(code)) {
      diagnostics.push({ code: "DYNAMIC_IMPORT", message: `Dynamic import in code block ${index} was not analyzed as a static dependency.` });
    }
    for (const match of code.matchAll(/https?:\/\/[^\s"'`<>)\]}]+/gi)) {
      const identity = `sha256:${sha256(normalizeFunctionalUrl(match[0]))}`;
      if (!assetLocations.has(identity)) assetLocations.set(identity, index);
    }
    const language = inferLanguage(code);
    const role = inferRole(code, language);
    return { index, language, role, suggested_path: suggestedPath(code, language, role, index), code };
  });

  for (const identity of [...assetLocations.keys()].sort(compareStrings)) {
    diagnostics.push({ code: "EXTERNAL_RESOURCE", message: `External resource retained in code block ${assetLocations.get(identity)} as ${identity}.` });
  }

  const allExports = new Set(codeBlocks.flatMap(({ code }) => [...exportedNames(code)]));
  const emittedPaths = new Set(codeBlocks.map(({ suggested_path }) => pathKey(suggested_path)));
  const unresolved = [];
  for (const block of codeBlocks) {
    for (const binding of importedBindings(block.code)) {
      const byName = binding.names.length > 0 && binding.names.every((name) => allExports.has(name));
      const importKey = pathKey(binding.specifier);
      const byPath = [...emittedPaths].some((candidate) => candidate === importKey || candidate.endsWith(`/${importKey}`) || importKey.endsWith(`/${candidate}`));
      const cssResolved = binding.specifier.endsWith(".css") && codeBlocks.some(({ language }) => language === "css");
      if (!byName && !byPath && !cssResolved) unresolved.push(binding.specifier);
    }
  }
  for (const specifier of sortedUnique(unresolved)) {
    diagnostics.push({ code: "UNRESOLVED_LOCAL_IMPORT", message: `Local import ${specifier} has no matching emitted code block.` });
  }

  return {
    dependencies: sortedUnique(dependencies),
    local_imports: sortedUnique(localImports),
    external_assets: [...assetLocations.keys()].sort(compareStrings),
    code_blocks: codeBlocks,
    diagnostics,
    unresolved_local_imports: sortedUnique(unresolved),
  };
}

async function listJsonFiles(root) {
  const files = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => compareStrings(left.name, right.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && extname(entry.name).toLowerCase() === ".json") files.push(path);
    }
  }
  await visit(root);
  return files;
}

function sourcePathLabel(root, path) {
  return relative(root, path).split(sep).join("/");
}

function extractScalar(prefix, field) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = prefix.match(new RegExp(`(?:^|[\\r\\n])\\s*"${escaped}"\\s*:\\s*("(?:\\\\.|[^"\\\\])*")\\s*,?`));
  if (!match) return undefined;
  try {
    return JSON.parse(match[1]);
  } catch {
    return undefined;
  }
}

async function companionBlocks(jsonPath) {
  const directory = resolve(jsonPath, "..");
  const base = jsonPath.slice(directory.length + 1, -extname(jsonPath).length);
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escaped}_code_(\\d+)\\.txt$`, "i");
  const matches = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const match = entry.isFile() && entry.name.match(pattern);
    if (match) matches.push({ index: Number(match[1]), name: entry.name });
  }
  matches.sort((left, right) => left.index - right.index || compareStrings(left.name, right.name));
  return Promise.all(matches.map(async ({ index, name }) => ({ index, code: normalizeCode(await readFile(join(directory, name), "utf8")) })));
}

function requiredMetadata(record) {
  for (const field of ["url", "title", "description", "category"]) {
    if (typeof record?.[field] !== "string" || record[field].trim().length === 0) {
      throw builderError("MISSING_REQUIRED_METADATA", `legacy record requires non-empty ${field}`);
    }
  }
}

function candidateRank(left, right) {
  const leftCount = left.code_blocks.filter(({ code }) => String(code ?? "").trim()).length;
  const rightCount = right.code_blocks.filter(({ code }) => String(code ?? "").trim()).length;
  return rightCount - leftCount
    || right.description.length - left.description.length
    || compareStrings(left.source_path, right.source_path);
}

function deduplicateBlocks(candidates, base) {
  const ordered = [base, ...candidates.filter((candidate) => candidate !== base).sort((a, b) => compareStrings(a.source_path, b.source_path))];
  const seen = new Set();
  const blocks = [];
  let suppliedByMerge = false;
  for (const candidate of ordered) {
    for (const block of candidate.code_blocks) {
      if (typeof block?.code !== "string" || block.code.trim().length === 0) continue;
      const digest = normalizedCodeHash(block.code);
      if (seen.has(digest)) continue;
      seen.add(digest);
      blocks.push({ index: blocks.length, code: normalizeCode(block.code) });
      if (candidate !== base) suppliedByMerge = true;
    }
  }
  if (blocks.length === 0) {
    const firstBlock = ordered.flatMap(({ code_blocks }) => code_blocks).find((block) => typeof block?.code === "string");
    if (firstBlock) blocks.push({ index: 0, code: normalizeCode(firstBlock.code) });
  }
  return { blocks, suppliedByMerge };
}

function normalizedRecord(group, normalizedUrl) {
  const ranked = [...group].sort(candidateRank);
  const base = ranked[0];
  const { blocks, suppliedByMerge } = deduplicateBlocks(group, base);
  const analysis = analyzeCodeBlocks(blocks);
  const identity = extractSourceIdentity(normalizedUrl, base.title);
  const identityMatched = /^\/@[^/]+\/components\/[^/]+\/?$/i.test(new URL(normalizedUrl).pathname);
  const sourceDigest = sha256(normalizedUrl);
  const categorySlug = slugify(base.category, "uncategorized");
  const slug = slugify(identity.slug || base.title);
  const diagnostics = [...analysis.diagnostics];
  if (!identityMatched) diagnostics.push({ code: "SOURCE_IDENTITY_FALLBACK", message: "Source path did not match the provider component pattern; title-derived identity was used." });
  const hasUsableCode = analysis.code_blocks.length > 0;
  const reconstructionApplied = base.recovered || suppliedByMerge;
  let status;
  if (!hasUsableCode) status = "invalid";
  else if (analysis.unresolved_local_imports.length > 0) status = "incomplete";
  else if (reconstructionApplied) status = "recoverable";
  else status = "complete";
  const confidence = { complete: 1, recoverable: 0.85, incomplete: 0.5, invalid: 0 }[status];
  return {
    record: {
      schema_version: SCHEMA_VERSION,
      id: `${categorySlug}/${slug}--${sourceDigest.slice(0, 8)}`,
      title: base.title,
      description: base.description,
      category: base.category,
      source: identity,
      source_id: `sha256:${sourceDigest}`,
      status,
      confidence,
      dependencies: analysis.dependencies,
      local_imports: analysis.local_imports,
      external_assets: analysis.external_assets,
      code_blocks: analysis.code_blocks.length > 0
        ? analysis.code_blocks
        : blocks.map(({ code }, index) => ({ index, language: "js", role: "unknown", suggested_path: `source/block-${index}.js`, code })),
      diagnostics,
    },
    base,
  };
}

export async function loadLegacyRecords({ sourcePath }) {
  if (sourcePath === undefined || sourcePath === null) throw builderError("INVALID_SOURCE_PATH", "sourcePath is required");
  const root = sourcePath instanceof URL ? fileURLToPath(sourcePath) : resolve(sourcePath);
  const files = await listJsonFiles(root);
  const report = {
    input_records: files.length,
    parsed_records: 0,
    recovered_records: 0,
    merged_records: 0,
    emitted_records: 0,
    duplicate_groups: [],
    rejected_records: [],
  };
  const candidates = [];
  for (const file of files) {
    const source_path = sourcePathLabel(root, file);
    const raw = await readFile(file, "utf8");
    let legacyRecord;
    let recovered = false;
    try {
      legacyRecord = JSON.parse(raw);
    } catch {
      recovered = true;
      legacyRecord = Object.fromEntries(["url", "title", "description", "category"].map((field) => [field, extractScalar(raw, field)]));
      legacyRecord.code_blocks = await companionBlocks(file);
    }
    try {
      requiredMetadata(legacyRecord);
      const normalized_url = normalizeSourceUrl(legacyRecord.url);
      const code_blocks = Array.isArray(legacyRecord.code_blocks) ? legacyRecord.code_blocks : [];
      if (recovered && !code_blocks.some(({ code }) => typeof code === "string" && code.trim())) {
        throw builderError("RECOVERY_CODE_MISSING", "malformed record has no usable companion code");
      }
      if (!recovered && !code_blocks.some(({ code }) => typeof code === "string" && code.length > 0)) {
        throw builderError("CODE_MISSING", "parsed record has no code block content");
      }
      candidates.push({
        normalized_url,
        source_path,
        title: legacyRecord.title,
        description: legacyRecord.description,
        category: legacyRecord.category,
        code_blocks,
        recovered,
      });
      if (recovered) report.recovered_records += 1;
      else report.parsed_records += 1;
    } catch (error) {
      report.rejected_records.push({
        source_path,
        code: error.code ?? "INVALID_LEGACY_RECORD",
        message: error.message,
      });
    }
  }

  const groups = new Map();
  for (const candidate of candidates) {
    const group = groups.get(candidate.normalized_url) ?? [];
    group.push(candidate);
    groups.set(candidate.normalized_url, group);
  }
  const records = [];
  for (const normalizedUrl of [...groups.keys()].sort(compareStrings)) {
    const group = groups.get(normalizedUrl);
    const { record, base } = normalizedRecord(group, normalizedUrl);
    records.push(record);
    if (group.length > 1) {
      report.merged_records += group.length - 1;
      report.duplicate_groups.push({
        source_id: record.source_id,
        source_paths: group.map(({ source_path }) => source_path).sort(compareStrings),
        selected_base: base.source_path,
        emitted_id: record.id,
      });
    }
  }
  records.sort((left, right) => compareStrings(left.id, right.id));
  report.duplicate_groups.sort((left, right) => compareStrings(left.source_id, right.source_id));
  report.rejected_records.sort((left, right) => compareStrings(left.source_path, right.source_path));
  report.emitted_records = records.length;
  return { records, report };
}
