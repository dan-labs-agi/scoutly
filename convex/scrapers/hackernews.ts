/**
 * Hacker News scraper
 * Targets "Show HN" posts which announce new startups
 * Public API - free & reliable
 */

import { action } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';

interface HNItem {
  objectID: string;
  by: string;
  created_at: number;
  type: 'story' | 'comment';
  title: string;
  text?: string;
  url?: string;
  score: number;
  descendants: number;
}

interface HNSearchResponse {
  hits: HNItem[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  exhaustiveNbHits: boolean;
  query: string;
  processingTimeMs: number;
}

export const fetchShowHN = action({
  args: { daysBack: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const daysBack = args.daysBack || 7;
    const beforeTimestamp = Math.floor(Date.now() / 1000) - daysBack * 86400;
    
    try {
      // Search for "Show HN" posts from the last N days
      const searchUrl = new URL('https://hn.algolia.com/api/v1/search_by_date');
      searchUrl.searchParams.set('query', 'Show HN');
      searchUrl.searchParams.set('tags', 'story');
      searchUrl.searchParams.set('numericFilters', `created_at>${beforeTimestamp}`);
      searchUrl.searchParams.set('hitsPerPage', '100');

      const response = await fetch(searchUrl.toString());

      if (!response.ok) {
        throw new Error(`HN API error: ${response.statusText}`);
      }

      const data: HNSearchResponse = await response.json();
      let processed = 0;
      let failed = 0;

      // Filter and process relevant posts
      for (const item of data.hits) {
        try {
          // Extract startup info from post
          const parsed = parseShowHNPost(item);

          if (!parsed) continue; // Skip if can't parse

          const startupData = {
            rawData: {
              name: parsed.name,
              description: parsed.description,
              website: parsed.website,
              founders: parsed.founders,
              dateAnnounced: new Date(item.created_at * 1000)
                .toISOString()
                .split('T')[0],
              location: parsed.location || 'Remote',
            },
            source: 'hackernews' as const,
            sourceUrl: `https://news.ycombinator.com/item?id=${item.objectID}`,
          };

          // Send to processor
          await ctx.runMutation(internal.processors.startup.processStartup, startupData);
          processed++;
        } catch (err) {
          console.error(`Failed to process HN post ${item.objectID}:`, err);
          failed++;
        }
      }

      return {
        source: 'hackernews',
        processed,
        failed,
        total: data.nbHits,
      };
    } catch (error) {
      console.error('HN scrape failed:', error);
      throw error;
    }
  },
});

/**
 * Parse "Show HN: [Company Name]" format and extract details
 */
function parseShowHNPost(item: HNItem): {
  name: string;
  description: string;
  website: string;
  founders: string[];
  location?: string;
} | null {
  if (!item.title.toLowerCase().startsWith('show hn:')) {
    return null;
  }

  // Extract from title: "Show HN: CompanyName - Description"
  const titleParts = item.title.split(' – ');
  if (titleParts.length < 2) return null;

  const name = titleParts[0].replace(/show hn:\s*/i, '').trim();
  const description = titleParts[1] || item.text || '';
  const website = item.url || '';

  // Try to extract founder info from post text
  const text = item.text || '';
  const byAuthor = item.by || 'Unknown';
  const founders = extractFounders(text, byAuthor);

  if (!name || !website) return null;

  return {
    name,
    description: description.substring(0, 200),
    website,
    founders: founders.length > 0 ? founders : [byAuthor],
  };
}

/**
 * Extract founder names from post text
 */
function extractFounders(text: string, defaultAuthor: string): string[] {
  const founders: string[] = [];

  // Look for patterns like "I'm [Name]" or "We're [Names]"
  const namePattern = /(?:i'm|i am|we're|we are|founder|co-founder)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi;
  let match;

  while ((match = namePattern.exec(text)) !== null) {
    const name = match[1].trim();
    if (name.length > 2 && !founders.includes(name)) {
      founders.push(name);
    }
  }

  return founders.length > 0 ? founders : [defaultAuthor];
}
