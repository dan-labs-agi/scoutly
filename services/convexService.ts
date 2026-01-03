/**
 * Convex service - replaces geminiService.ts
 * Real database queries instead of fake LLM generation
 */

import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Startup, Timeframe, FilterConfig } from '../types';

/**
 * Main hook for fetching startups
 */
export function useSearchStartups(
  timeframe: Timeframe,
  filters: FilterConfig
): Startup[] | undefined {
  const daysBackMap: Record<Timeframe, number> = {
    today: 0,
    yesterday: 1,
    '2_days': 2,
    week: 7,
    month: 30,
    quarter: 90,
  };

  return useQuery(api.queries.startups.searchStartups, {
    query: filters.domain || undefined,
    domain: filters.domain || undefined,
    daysBack: daysBackMap[timeframe],
    minFunding: filters.minValuation || undefined,
  });
}

/**
 * Hook for fetching recent startups by timeframe
 */
export function useRecentStartups(timeframe: Timeframe): Startup[] | undefined {
  return useQuery(api.queries.startups.getRecentStartups, {
    timeframe,
  });
}

/**
 * Hook for getting startup details
 */
export function useStartupDetail(startupId: string | null) {
  return useQuery(
    startupId ? api.queries.startups.getStartupDetail : null,
    startupId ? { startupId: startupId as any } : 'skip'
  );
}

/**
 * Hook for getting statistics
 */
export function useStats() {
  return useQuery(api.queries.startups.getStats, {});
}

/**
 * Mutation to trigger scraping on-demand
 * Call this when user searches and no data exists
 */
export function useScrapeSource() {
  return useAction(api.scrapers.hackernews.fetchShowHN);
}

export function useScrapeRSS() {
  return useAction(api.scrapers.rss.fetchRSSFeeds);
}

export function useScrapeReddit() {
  return useAction(api.scrapers.reddit.fetchRedditStartups);
}

export function useScrapeIndieHackers() {
  return useAction(api.scrapers.indiehackers.fetchIndieHackersProducts);
}

export function useScrapeAll() {
  return useAction(api.actions.scrapeAll.scrapeAll);
}

/**
 * Trigger all scrapers and return after completion
 */
export async function triggerAllScrapers(): Promise<{ success: boolean; count: number }> {
  try {
    const results = await Promise.allSettled([
      fetch(`${window.location.origin}/api/scraper/hackernews`, { method: 'POST' }),
      fetch(`${window.location.origin}/api/scraper/rss`, { method: 'POST' }),
      fetch(`${window.location.origin}/api/scraper/reddit`, { method: 'POST' }),
      fetch(`${window.location.origin}/api/scraper/indiehackers`, { method: 'POST' }),
    ]);
    
    let successCount = 0;
    for (const result of results) {
      if (result.status === 'fulfilled') {
        successCount++;
      }
    }
    
    return { success: successCount > 0, count: successCount };
  } catch (error) {
    console.error('Failed to trigger scrapers:', error);
    return { success: false, count: 0 };
  }
}
