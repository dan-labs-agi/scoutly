/**
 * Relevance scoring for startup search results
 * Scores based on query match, freshness, and data quality
 */

import { StartupData } from './dedup';

export interface ScoringOptions {
  nameWeight?: number;
  descriptionWeight?: number;
  tagWeight?: number;
  sourceWeight?: number;
  freshnessWeight?: number;
}

/**
 * Calculate relevance score for a startup based on query
 */
export function calculateRelevanceScore(
  startup: StartupData,
  query: string,
  options: ScoringOptions = {}
): number {
  const {
    nameWeight = 10,
    descriptionWeight = 5,
    tagWeight = 7,
    sourceWeight = 2,
    freshnessWeight = 5,
  } = options;

  let score = 0;
  const queryTerms = extractQueryTerms(query);

  // Name matches (highest priority)
  const nameLower = startup.name.toLowerCase();
  for (const term of queryTerms) {
    if (nameLower.includes(term)) {
      score += nameWeight;
      // Exact match bonus
      if (nameLower === term || nameLower.startsWith(term + ' ')) {
        score += nameWeight * 0.5;
      }
    }
  }

  // Description matches
  const descLower = startup.description.toLowerCase();
  for (const term of queryTerms) {
    if (descLower.includes(term)) {
      score += descriptionWeight;
    }
  }

  // Tag matches
  const tagsLower = startup.tags.map(t => t.toLowerCase());
  for (const term of queryTerms) {
    if (tagsLower.some(tag => tag.includes(term))) {
      score += tagWeight;
    }
  }

  // Multi-source boost (more sources = higher confidence)
  score += Math.min(startup.sources.length * sourceWeight, sourceWeight * 5);

  // Freshness boost
  if (startup.dateAnnounced) {
    const daysOld = getDaysOld(startup.dateAnnounced);
    if (daysOld < 7) score += freshnessWeight;
    else if (daysOld < 30) score += freshnessWeight * 0.6;
    else if (daysOld < 90) score += freshnessWeight * 0.3;
  }

  // Funding data boost
  if (startup.fundingAmount && startup.fundingAmount !== 'Undisclosed') {
    score += 3;
  }

  // Website presence boost
  if (startup.website) {
    score += 2;
  }

  return score;
}

/**
 * Sort startups by relevance score
 */
export function sortByRelevance(
  startups: StartupData[],
  query: string
): StartupData[] {
  return startups
    .map(startup => ({
      ...startup,
      relevanceScore: calculateRelevanceScore(startup, query),
    }))
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
}

/**
 * Extract meaningful query terms
 */
function extractQueryTerms(query: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'show', 'me', 'find', 'search', 'get', 'list', 'all', 'startups', 'companies',
  ]);

  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(term => term.length > 2 && !stopWords.has(term));
}

/**
 * Calculate days since a date
 */
function getDaysOld(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
