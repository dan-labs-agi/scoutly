/**
 * Deduplication utility for startup data
 * Handles fuzzy matching and data merging
 */

export interface StartupData {
  name: string;
  description: string;
  website?: string;
  fundingAmount?: string;
  location?: string;
  dateAnnounced?: string;
  tags: string[];
  sources: string[];
  sourceUrls: string[];
  confidenceScore: number;
  relevanceScore?: number;
}

/**
 * Normalize company name for matching
 * "The Auth0 Company, Inc." -> "auth0"
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(the|a|an)\s+/i, '')           // Remove articles
    .replace(/\s*(inc\.?|llc|ltd\.?|corp\.?|co\.?|company)\s*$/i, '') // Remove suffixes
    .replace(/[^\w\s]/g, '')                   // Remove special chars
    .replace(/\s+/g, ' ')                      // Normalize whitespace
    .trim();
}

/**
 * Calculate string similarity (Levenshtein-based)
 * Returns value between 0 and 1
 */
export function calculateSimilarity(a: string, b: string): number {
  const aLen = a.length;
  const bLen = b.length;
  
  if (aLen === 0) return bLen === 0 ? 1 : 0;
  if (bLen === 0) return 0;
  
  const dp: number[][] = Array(bLen + 1).fill(null).map(() => Array(aLen + 1).fill(0));

  for (let i = 0; i <= aLen; i++) dp[0][i] = i;
  for (let j = 0; j <= bLen; j++) dp[j][0] = j;

  for (let j = 1; j <= bLen; j++) {
    for (let i = 1; i <= aLen; i++) {
      if (a[i - 1] === b[j - 1]) {
        dp[j][i] = dp[j - 1][i - 1];
      } else {
        dp[j][i] = 1 + Math.min(
          dp[j - 1][i],     // deletion
          dp[j][i - 1],     // insertion
          dp[j - 1][i - 1]  // substitution
        );
      }
    }
  }

  const maxLen = Math.max(aLen, bLen);
  return 1 - (dp[bLen][aLen] / maxLen);
}

/**
 * Deduplicate startups by fuzzy name matching
 * Merges data from multiple sources for duplicates
 */
export function deduplicateStartups(
  startups: StartupData[],
  similarityThreshold: number = 0.85
): StartupData[] {
  const seen = new Map<string, StartupData>();

  for (const startup of startups) {
    const normalizedName = normalizeName(startup.name);
    
    // Check for exact match first
    if (seen.has(normalizedName)) {
      mergeStartups(seen.get(normalizedName)!, startup);
      continue;
    }

    // Check for fuzzy match
    let foundMatch = false;
    for (const [existingName, existing] of seen.entries()) {
      const similarity = calculateSimilarity(normalizedName, existingName);
      if (similarity >= similarityThreshold) {
        mergeStartups(existing, startup);
        foundMatch = true;
        break;
      }
    }

    if (!foundMatch) {
      // Add as new entry
      seen.set(normalizedName, { ...startup });
    }
  }

  return Array.from(seen.values());
}

/**
 * Merge two startup entries, keeping best data
 */
function mergeStartups(existing: StartupData, newData: StartupData): void {
  // Merge sources
  existing.sources = [...new Set([...existing.sources, ...newData.sources])];
  existing.sourceUrls = [...new Set([...existing.sourceUrls, ...newData.sourceUrls])];
  
  // Keep longer description
  if (newData.description.length > existing.description.length) {
    existing.description = newData.description;
  }
  
  // Keep non-empty funding
  if (newData.fundingAmount && newData.fundingAmount !== 'Undisclosed' && 
      (!existing.fundingAmount || existing.fundingAmount === 'Undisclosed')) {
    existing.fundingAmount = newData.fundingAmount;
  }
  
  // Keep non-empty location
  if (newData.location && newData.location !== 'Remote' && newData.location !== 'Undisclosed' &&
      (!existing.location || existing.location === 'Remote' || existing.location === 'Undisclosed')) {
    existing.location = newData.location;
  }
  
  // Keep non-empty website
  if (newData.website && !existing.website) {
    existing.website = newData.website;
  }
  
  // Merge tags
  existing.tags = [...new Set([...existing.tags, ...newData.tags])];
  
  // Increase confidence (more sources = higher confidence)
  existing.confidenceScore = Math.min(
    1.0,
    existing.confidenceScore + 0.1 * newData.sources.length
  );
}
