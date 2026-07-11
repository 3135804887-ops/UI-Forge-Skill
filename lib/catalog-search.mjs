import { STATUS_RANK } from "./catalog-schema.mjs";

const DEFAULT_LIMIT = 10;
const CJK_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

/**
 * @typedef {object} CatalogSearchSummary
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} category
 * @property {string} status
 * @property {number} confidence
 * @property {string[]} dependencies
 * @property {number} score
 * @property {number} diagnostics_count
 */

/**
 * An array of code-free search summaries augmented with the explicit suggestion
 * channel consumed by the CLI. The property is deliberately non-enumerable, so
 * consumers that serialize the array must copy it into their response envelope.
 *
 * @typedef {Array<CatalogSearchSummary> & { readonly relatedCategories: string[] }} CatalogSearchResults
 */

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareTitles(left, right) {
  return left.localeCompare(right, "en", { sensitivity: "base" });
}

function normalize(value) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenize(value) {
  const normalized = normalize(value);
  return normalized === "" ? [] : normalized.split(" ");
}

function tokenMatches(queryToken, targetToken) {
  if (targetToken.startsWith(queryToken)) return true;
  return CJK_PATTERN.test(queryToken) && targetToken.includes(queryToken);
}

function matchesAny(queryTokens, targetTokens) {
  return queryTokens.some((queryToken) => (
    targetTokens.some((targetToken) => tokenMatches(queryToken, targetToken))
  ));
}

function scoreRecord(record, normalizedQuery, queryTokens) {
  const normalizedTitle = normalize(record.title);
  const titleTokens = tokenize(record.title);
  const category = normalize(record.category);
  const slugTokens = tokenize(record.source.slug);
  const descriptionTokens = tokenize(record.description);
  const secondaryTokens = [
    ...tokenize(record.source.author),
    ...record.dependencies.flatMap((dependency) => tokenize(dependency)),
    ...record.code_blocks.flatMap((block) => tokenize(block.role)),
  ];

  let score = 0;
  if (normalizedTitle === normalizedQuery) score += 100;
  for (const queryToken of queryTokens) {
    if (titleTokens.some((titleToken) => tokenMatches(queryToken, titleToken))) score += 30;
  }
  if (category === normalizedQuery) score += 25;
  if (matchesAny(queryTokens, slugTokens)) score += 20;
  if (matchesAny(queryTokens, descriptionTokens)) score += 10;
  if (matchesAny(queryTokens, secondaryTokens)) score += 5;
  return score;
}

function isIncluded(record, options) {
  if (record.status === "invalid") return options.includeInvalid === true;
  if (record.status === "incomplete") return options.includeIncomplete === true;
  return true;
}

function compareMatches(left, right) {
  return right.score - left.score
    || STATUS_RANK[left.record.status] - STATUS_RANK[right.record.status]
    || compareTitles(left.record.title, right.record.title)
    || compareStrings(left.record.id, right.record.id);
}

function toSummary({ record, score }) {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    category: record.category,
    status: record.status,
    confidence: record.confidence,
    dependencies: [...record.dependencies],
    score,
    diagnostics_count: record.diagnostics.length,
  };
}

function findMatches(records, normalizedQuery, queryTokens, options, normalizedCategory) {
  return records
    .filter((record) => isIncluded(record, options))
    .filter((record) => normalizedCategory === undefined || normalize(record.category) === normalizedCategory)
    .map((record) => ({ record, score: scoreRecord(record, normalizedQuery, queryTokens) }))
    .filter(({ score }) => score > 0)
    .sort(compareMatches);
}

function relatedCategoriesFor(matches, requestedCategory) {
  const bestByCategory = new Map();
  for (const match of matches) {
    const normalizedCategory = normalize(match.record.category);
    if (normalizedCategory === requestedCategory) continue;
    const current = bestByCategory.get(normalizedCategory);
    if (current === undefined) {
      bestByCategory.set(normalizedCategory, { display: match.record.category, score: match.score });
      continue;
    }
    current.score = Math.max(current.score, match.score);
    if (compareStrings(match.record.category, current.display) < 0) current.display = match.record.category;
  }
  const relatedCategories = [...bestByCategory.values()]
    .sort((left, right) => (
      right.score - left.score
      || compareTitles(left.display, right.display)
      || compareStrings(left.display, right.display)
    ))
    .map(({ display }) => display);
  return relatedCategories;
}

function createResults(summaries, relatedCategories = []) {
  Object.defineProperty(summaries, "relatedCategories", {
    value: relatedCategories,
    enumerable: false,
  });
  return summaries;
}

/**
 * Search validated runtime records and return deterministic code-free summaries.
 * `relatedCategories` exists on every returned array. It is populated only when
 * a category-filtered search has no results and the query matches other categories.
 *
 * @param {object[]} records
 * @param {string} query
 * @param {{ limit?: number, category?: string, includeIncomplete?: boolean, includeInvalid?: boolean }} [options]
 * @returns {CatalogSearchResults}
 */
export function searchCatalog(records, query, options = {}) {
  const limit = options.limit ?? DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new TypeError("limit must be a positive integer");
  }
  if (typeof query !== "string") throw new TypeError("query must be a string");
  if (options.category !== undefined && typeof options.category !== "string") {
    throw new TypeError("category must be a string");
  }

  const normalizedQuery = normalize(query);
  if (normalizedQuery === "") return createResults([]);
  const queryTokens = [...new Set(normalizedQuery.split(" "))];
  const normalizedCategory = options.category === undefined ? undefined : normalize(options.category);
  const matches = findMatches(records, normalizedQuery, queryTokens, options, normalizedCategory);
  const summaries = matches.slice(0, limit).map(toSummary);

  if (summaries.length === 0 && normalizedCategory !== undefined) {
    const unfilteredMatches = findMatches(records, normalizedQuery, queryTokens, options, undefined);
    return createResults(summaries, relatedCategoriesFor(unfilteredMatches, normalizedCategory));
  }
  return createResults(summaries);
}
