/**
 * Text Normalization Utility for Bilingual (Arabic & English) Food Search
 * 
 * Provides consistent text normalization and search token generation for FoodCatalog items.
 * Satisfies Condition AUD-003: All tokens are lowercased and stripped of diacritics at indexing
 * time, enabling high-performance B-tree index range scans without case-insensitive regex flags.
 */

// Arabic Diacritics (Tashkeel) Unicode Range
const TASHKEEL_REGEX = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g;

// Arabic Tatweel / Kashida
const TATWEEL_REGEX = /\u0640/g;

// Alef Variants: أ, إ, آ, ٱ -> ا
const ALEF_VARIANTS_REGEX = /[أإآٱ]/g;

// Taa Marbuta: ة -> ه
const TAA_MARBUTA_REGEX = /ة/g;

// Alef Maksura: ى -> ي
const ALEF_MAKSURA_REGEX = /ى/g;

/**
 * Normalizes Arabic and English text for indexing and search query matching.
 * - Strips Arabic Tashkeel (diacritics) and Tatweel
 * - Normalizes Alef variants (أ, إ, آ, ٱ -> ا)
 * - Normalizes Taa Marbuta (ة -> ه)
 * - Normalizes Alef Maksura (ى -> ي)
 * - Converts English text to lowercase
 * - Trims and collapses multiple whitespace characters into single spaces
 */
export function normalizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let normalized = text
    .replace(TASHKEEL_REGEX, '')
    .replace(TATWEEL_REGEX, '')
    .replace(ALEF_VARIANTS_REGEX, 'ا')
    .replace(TAA_MARBUTA_REGEX, 'ه')
    .replace(ALEF_MAKSURA_REGEX, 'ي')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  return normalized;
}

/**
 * Tokenizes a string into individual normalized words/tokens.
 * Splits on whitespace, hyphens, slashes, brackets, and punctuation.
 */
function extractTokensFromString(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  // Split on any character that is not a letter (English or Arabic), digit, or underscore
  // \p{L} matches any unicode letter (Latin, Arabic, etc.), \p{N} matches numbers
  const rawTokens = normalized.split(/[^\p{L}\p{N}]+/u);

  return rawTokens
    .map((t) => t.trim())
    .filter((t) => t.length >= 2); // Exclude single characters for search tokens
}

/**
 * Builds an array of unique, lowercased, diacritic-stripped search tokens
 * from English name, Arabic name, and alternative search aliases.
 * 
 * Ensures all tokens are pre-normalized so MongoDB prefix queries can run
 * without case-insensitive regex modifiers ({ searchTokens: { $regex: '^' + normalizedTerm } }).
 */
export function buildSearchTokens(
  nameEn: string,
  nameAr: string,
  aliases: string[] = []
): string[] {
  const tokenSet = new Set<string>();

  // Extract from English name
  for (const token of extractTokensFromString(nameEn)) {
    tokenSet.add(token);
  }

  // Extract from Arabic name
  for (const token of extractTokensFromString(nameAr)) {
    tokenSet.add(token);
  }

  // Extract from aliases
  for (const alias of aliases) {
    for (const token of extractTokensFromString(alias)) {
      tokenSet.add(token);
    }
  }

  return Array.from(tokenSet);
}

