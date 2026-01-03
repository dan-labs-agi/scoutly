/**
 * Query parser utility
 * Extracts user intent and filters from natural language queries
 */

export interface ParsedQuery {
  searchTerms: string[];          // Main search keywords
  domain?: string;                // Detected domain (AI, fintech, etc.)
  fundingStage?: string;          // Series A, Seed, etc.
  timeframe?: number;             // Days back to search
  location?: string;              // Geographic filter
  intent: 'search' | 'list' | 'recent' | 'funded';
}

const DOMAINS = [
  'ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning',
  'fintech', 'finance', 'banking', 'payments',
  'saas', 'software', 'b2b', 'enterprise',
  'biotech', 'healthcare', 'health', 'medical', 'pharma',
  'crypto', 'blockchain', 'web3', 'defi', 'nft',
  'climate', 'cleantech', 'sustainability', 'green',
  'ecommerce', 'e-commerce', 'retail', 'marketplace',
  'devtools', 'developer', 'infrastructure', 'api',
  'edtech', 'education', 'learning',
  'gaming', 'games', 'entertainment',
  'social', 'community', 'network',
  'security', 'cybersecurity', 'privacy',
  'robotics', 'automation', 'iot',
  'space', 'aerospace',
  'food', 'foodtech', 'agriculture', 'agtech',
  'real estate', 'proptech', 'property',
  'travel', 'hospitality', 'tourism',
  'hr', 'hiring', 'recruitment', 'talent',
  'legal', 'legaltech',
  'insurance', 'insurtech',
];

const FUNDING_STAGES = [
  'pre-seed', 'preseed',
  'seed',
  'series a', 'series-a',
  'series b', 'series-b',
  'series c', 'series-c',
  'series d', 'series-d',
  'bootstrapped', 'bootstrap',
  'ipo', 'public',
];

const TIMEFRAME_PATTERNS: [RegExp, number][] = [
  [/today/i, 1],
  [/yesterday/i, 2],
  [/this week|last 7 days|past week/i, 7],
  [/this month|last 30 days|past month/i, 30],
  [/this quarter|last 90 days|past 3 months/i, 90],
  [/this year|last 365 days|past year/i, 365],
  [/last (\d+) days?/i, -1], // Dynamic
  [/(\d+) days? ago/i, -1],  // Dynamic
];

const LOCATIONS = [
  'usa', 'us', 'united states', 'america',
  'uk', 'united kingdom', 'britain', 'england',
  'europe', 'eu',
  'india',
  'china',
  'germany',
  'france',
  'canada',
  'australia',
  'singapore',
  'israel',
  'japan',
  'remote',
  'san francisco', 'sf', 'bay area', 'silicon valley',
  'new york', 'nyc',
  'london',
  'berlin',
  'paris',
  'bangalore', 'bengaluru',
  'tel aviv',
];

/**
 * Parse a natural language query into structured filters
 */
export function parseQuery(query: string): ParsedQuery {
  const lowerQuery = query.toLowerCase();
  
  // Detect domain
  const domain = DOMAINS.find(d => lowerQuery.includes(d));
  
  // Detect funding stage
  const fundingStage = FUNDING_STAGES.find(f => lowerQuery.includes(f));
  
  // Detect timeframe
  let timeframe: number | undefined;
  for (const [pattern, days] of TIMEFRAME_PATTERNS) {
    const match = lowerQuery.match(pattern);
    if (match) {
      if (days === -1 && match[1]) {
        timeframe = parseInt(match[1], 10);
      } else if (days > 0) {
        timeframe = days;
      }
      break;
    }
  }
  
  // Detect location
  const location = LOCATIONS.find(loc => lowerQuery.includes(loc));
  
  // Detect intent
  let intent: ParsedQuery['intent'] = 'search';
  if (/show me|list|what are|find all/i.test(lowerQuery)) {
    intent = 'list';
  } else if (/recent|new|latest|just launched/i.test(lowerQuery)) {
    intent = 'recent';
  } else if (/funded|raised|funding|investment/i.test(lowerQuery)) {
    intent = 'funded';
  }
  
  // Extract remaining search terms
  let searchTerms = lowerQuery
    .split(/\s+/)
    .filter(term => term.length > 2)
    .filter(term => !isStopWord(term));
  
  // Remove detected filters from search terms
  if (domain) searchTerms = searchTerms.filter(t => !domain.includes(t));
  if (fundingStage) searchTerms = searchTerms.filter(t => !fundingStage.includes(t));
  if (location) searchTerms = searchTerms.filter(t => !location.includes(t));
  
  return {
    searchTerms,
    domain,
    fundingStage,
    timeframe: timeframe || 7, // Default to 7 days
    location,
    intent,
  };
}

/**
 * Check if a term is a stop word
 */
function isStopWord(term: string): boolean {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'show', 'me', 'find', 'search', 'get', 'list', 'all', 'startups', 'companies',
    'startup', 'company', 'are', 'is', 'was', 'were', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'what', 'which', 'who', 'when', 'where', 'why', 'how', 'that', 'this', 'these', 'those',
  ]);
  return stopWords.has(term);
}

/**
 * Check if startup matches parsed query filters
 */
export function matchesFilters(
  startup: { name: string; description: string; tags: string[]; fundingAmount?: string; location?: string },
  parsedQuery: ParsedQuery
): boolean {
  const text = `${startup.name} ${startup.description} ${startup.tags.join(' ')}`.toLowerCase();
  
  // Check domain match
  if (parsedQuery.domain && !text.includes(parsedQuery.domain)) {
    return false;
  }
  
  // Check funding stage match
  if (parsedQuery.fundingStage && startup.fundingAmount) {
    if (!startup.fundingAmount.toLowerCase().includes(parsedQuery.fundingStage)) {
      return false;
    }
  }
  
  // Check location match
  if (parsedQuery.location && startup.location) {
    if (!startup.location.toLowerCase().includes(parsedQuery.location)) {
      return false;
    }
  }
  
  // Check search terms (at least one must match)
  if (parsedQuery.searchTerms.length > 0) {
    const hasMatch = parsedQuery.searchTerms.some(term => text.includes(term));
    if (!hasMatch) return false;
  }
  
  return true;
}
