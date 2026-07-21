// Smart Search Utility for Dynasity-Voult E-commerce
// Supports fuzzy matching, token-based synonym mapping, and precise ranking.

export interface SearchableItem {
  id: string;
  title: string;
  description: string;
  category?: string;
  origin?: string;
  era?: string;
  provenance?: string;
  shortHeadline?: string;
  historicalPeriod?: string;
  conditionReport?: string;
  ownershipHistory?: string;
  sellerStoreName?: string;
  creationYear?: number | null;
  calendarEra?: string | null;
  rawItem: any; // Reference to original item (BuyItem or Auction)
}


function levenshteinDistance(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return matrix[len1][len2];
}

function getSynonyms(word: string): string[] {
  const w = word.toLowerCase().trim();
  if (w.startsWith("egypt")) return ["egypt", "egyptian", "alexandria", "nile", "pharaoh", "cairo"];
  if (w.startsWith("japan") || w === "jp") return ["japan", "japanese", "samurai", "katana", "edo", "tokyo"];
  if (w.startsWith("roman") || w === "rome") return ["rome", "roman", "byzantine", "emperor", "hadrian", "cross", "latin"];
  if (w === "mughal" || w === "india" || w === "indian") return ["mughal", "india", "indian", "empire", "shah", "delhi"];
  if (w === "greek" || w === "greece") return ["greek", "greece", "athenian", "sparta", "olympic", "athens"];
  if (w === "gold" || w === "golden") return ["gold", "golden", "aurum", "pectoral", "easter egg", "mirror"];
  if (w === "samurai") return ["samurai", "katana", "japanese", "sword", "armor", "nihonto"];
  if (w === "bronze") return ["bronze", "dagger", "patina", "metal", "weapon"];
  return [w];
}

function isFuzzyMatch(word1: string, word2: string): boolean {
  const w1 = word1.toLowerCase().trim();
  const w2 = word2.toLowerCase().trim();
  if (w1.length < 3 || w2.length < 3) return w1 === w2;
  const distance = levenshteinDistance(w1, w2);
  const maxAllowed = w1.length > 5 ? 2 : 1;
  return distance <= maxAllowed;
}

export interface SearchResult {
  item: any;
  score: number;
  isExact: boolean;
  matchedFields: string[];
}

export function performSmartSearch(
  items: SearchableItem[],
  query: string
): SearchResult[] {
  const trimmedQuery = query.toLowerCase().trim();
  if (!trimmedQuery) {
    return items.map(item => ({
      item: item.rawItem,
      score: 0,
      isExact: true,
      matchedFields: []
    }));
  }

  const queryTokens = trimmedQuery.split(/\s+/).filter(Boolean);

  const results = items.map((item) => {
    let score = 0;
    const matchedFields: string[] = [];
    let hasExactMatch = false;

    const titleLower = item.title.toLowerCase();
    const descLower = item.description.toLowerCase();
    const categoryLower = (item.category || "").toLowerCase();
    const originLower = (item.origin || "").toLowerCase();
    const eraLower = (item.era || "").toLowerCase();
    const provenanceLower = (item.provenance || "").toLowerCase();
    const headlineLower = (item.shortHeadline || "").toLowerCase();
    const periodLower = (item.historicalPeriod || "").toLowerCase();
    const reportLower = (item.conditionReport || "").toLowerCase();
    const historyLower = (item.ownershipHistory || "").toLowerCase();
    const storeLower = (item.sellerStoreName || "").toLowerCase();

    // Year and Era searching logic
    const creationYearStr = item.creationYear ? String(item.creationYear) : "";
    const calendarEraStr = item.calendarEra ? String(item.calendarEra).toLowerCase() : "";

    // Parse query for explicit year + era (e.g. 120 CE, 120 BC, etc.)
    const eraRegex = /\b(\d+)\s*(bce|bc|ce|ad)\b/gi;
    let eraMatch;
    let matchesYearAndEra = false;
    while ((eraMatch = eraRegex.exec(trimmedQuery)) !== null) {
      const qYear = eraMatch[1];
      const qEra = eraMatch[2].toLowerCase();
      const normEra = (qEra === "bc" ? "bce" : (qEra === "ad" ? "ce" : qEra));
      const normItemEra = (calendarEraStr === "bc" ? "bce" : (calendarEraStr === "ad" ? "ce" : calendarEraStr));
      if (creationYearStr === qYear && normEra === normItemEra) {
        matchesYearAndEra = true;
      }
    }

    if (matchesYearAndEra) {
      score += 15000;
      hasExactMatch = true;
      matchedFields.push("year_era_exact");
    }

    // Direct Year number matching
    if (creationYearStr && queryTokens.includes(creationYearStr)) {
      score += 8000;
      hasExactMatch = true;
      matchedFields.push("year_exact");
    }


    // 1. Exact Title Match
    if (titleLower === trimmedQuery) {
      score += 100000;
      hasExactMatch = true;
      matchedFields.push("title_exact");
    }

    // 2. Prefix Title Match
    else if (titleLower.startsWith(trimmedQuery)) {
      score += 50000;
      hasExactMatch = true;
      matchedFields.push("title_prefix");
    }

    // Evaluate on a token-by-token basis for smart synonyms and scoring rules
    queryTokens.forEach((token) => {
      const synonyms = getSynonyms(token);
      
      synonyms.forEach((syn) => {
        // Keyword Title match
        if (titleLower.includes(syn)) {
          score += 10000;
          hasExactMatch = true;
          matchedFields.push("title_keyword");
        }
        
        // Category Match
        if (categoryLower.includes(syn)) {
          score += 5000;
          hasExactMatch = true;
          matchedFields.push("category");
        }

        // Tags/Keywords Match (Historical Period, Short Headline)
        if (periodLower.includes(syn) || headlineLower.includes(syn)) {
          score += 2000;
          hasExactMatch = true;
          matchedFields.push("tags");
        }

        // Description / Provenance Match
        if (descLower.includes(syn) || provenanceLower.includes(syn) || historyLower.includes(syn)) {
          score += 1000;
          hasExactMatch = true;
          matchedFields.push("description");
        }

        // Origin Match
        if (originLower.includes(syn)) {
          score += 500;
          hasExactMatch = true;
          matchedFields.push("origin");
        }

        // Era Match
        if (eraLower.includes(syn)) {
          score += 200;
          hasExactMatch = true;
          matchedFields.push("era");
        }

        // Material Match (Condition Report / Description)
        if (reportLower.includes(syn)) {
          score += 100;
          hasExactMatch = true;
          matchedFields.push("material");
        }

        // Seller Store Name
        if (storeLower.includes(syn)) {
          score += 50;
          hasExactMatch = true;
          matchedFields.push("seller_store");
        }
      });

      // 10. Fuzzy similarity (typo protection if not matched exactly)
      if (!hasExactMatch) {
        // Test fuzzy matching against individual words in title/description/origin
        const titleWords = titleLower.split(/[^a-z0-9]/).filter(Boolean);
        const originWords = originLower.split(/[^a-z0-9]/).filter(Boolean);

        const titleFuzzy = titleWords.some(w => isFuzzyMatch(token, w));
        const originFuzzy = originWords.some(w => isFuzzyMatch(token, w));

        if (titleFuzzy) {
          score += 30;
          matchedFields.push("title_fuzzy");
        }
        if (originFuzzy) {
          score += 15;
          matchedFields.push("origin_fuzzy");
        }
      }
    });

    return {
      item: item.rawItem,
      score,
      isExact: hasExactMatch,
      matchedFields
    };
  });

  // Filter out zero-score items unless query is blank, and sort by score descending
  return results
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);
}
