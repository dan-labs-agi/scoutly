/**
 * Query functions for frontend
 * Replace geminiService with these database queries
 */

import { query } from '../_generated/server';
import { v } from 'convex/values';

/**
 * Search startups by domain, date range, and filters
 * Main endpoint for Dashboard.tsx
 */
export const searchStartups = query({
  args: {
    query: v.optional(v.string()),
    domain: v.optional(v.string()),
    daysBack: v.optional(v.number()),
    minFunding: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get all startups (ignore date filter for now)
    const allStartups = await ctx.db.query('startups').collect();
    
    // Filter by tags/domain if specified
    const filteredStartups = args.domain 
      ? allStartups.filter(s => 
          s.tags?.includes(args.domain!) || 
          s.description?.toLowerCase().includes(args.domain!.toLowerCase())
        )
      : allStartups;

    // Enrich with founders and sources
    const enriched = await Promise.all(
      filteredStartups.map(async (startup) => {
        const founders = await ctx.db
          .query('founders')
          .filter(q => q.eq(q.field('startupId'), startup._id))
          .collect();

        const sources = await ctx.db
          .query('dataSources')
          .filter(q => q.eq(q.field('startupId'), startup._id))
          .collect();

        return {
          id: startup._id,
          name: startup.name,
          description: startup.description,
          website: startup.website,
          fundingAmount: startup.fundingAmount,
          roundType: startup.roundType || 'Undisclosed',
          dateAnnounced: startup.dateAnnounced || new Date().toISOString().split('T')[0],
          location: startup.location || 'Remote',
          tags: startup.tags || [],
          founders: founders.map(f => f.name),
          investors: [], // TODO: Extract from funding rounds if needed
          contactEmail: founders.find(f => f.email)?.email,
          socialLinks: {
            linkedin: founders.find(f => f.linkedin)?.linkedin,
            twitter: founders.find(f => f.twitter)?.twitter,
          },
          sources: sources.map(s => s.sourceUrl),
          confidenceScore: startup.confidenceScore,
        };
      })
    );

    // Sort by date (newest first)
    enriched.sort((a, b) => {
      const dateA = new Date(a.dateAnnounced).getTime();
      const dateB = new Date(b.dateAnnounced).getTime();
      return dateB - dateA;
    });

    return enriched;
  },
});

/**
 * Get detailed information about a single startup
 * Used by StartupModal.tsx
 */
export const getStartupDetail = query({
  args: { startupId: v.id('startups') },
  handler: async (ctx, args) => {
    const startup = await ctx.db.get(args.startupId);
    if (!startup) return null;

    const founders = await ctx.db
      .query('founders')
      .filter(q => q.eq(q.field('startupId'), args.startupId))
      .collect();

    const fundingRounds = await ctx.db
      .query('fundingRounds')
      .filter(q => q.eq(q.field('startupId'), args.startupId))
      .collect();

    const sources = await ctx.db
      .query('dataSources')
      .filter(q => q.eq(q.field('startupId'), args.startupId))
      .collect();

    return {
      startup,
      founders,
      fundingRounds,
      sources,
    };
  },
});

/**
 * Get all startups founded in the last N days
 * Used for "Today", "Yesterday", "Week", etc filters
 */
export const getRecentStartups = query({
  args: {
    timeframe: v.union(
      v.literal('today'),
      v.literal('yesterday'),
      v.literal('2_days'),
      v.literal('week'),
      v.literal('month'),
      v.literal('quarter')
    ),
  },
  handler: async (ctx, args) => {
    const now = new Date();
    let daysBack = 7; // default

    switch (args.timeframe) {
      case 'today':
        daysBack = 0;
        break;
      case 'yesterday':
        daysBack = 1;
        break;
      case '2_days':
        daysBack = 2;
        break;
      case 'week':
        daysBack = 7;
        break;
      case 'month':
        daysBack = 30;
        break;
      case 'quarter':
        daysBack = 90;
        break;
    }

    // For now, ignore date filtering and return all startups
    // TODO: Add proper date filtering once we have recent data
    const startups = await ctx.db
      .query('startups')
      .collect();

    // Enrich same as searchStartups
    return Promise.all(
      startups.map(async (startup) => {
        const founders = await ctx.db
          .query('founders')
          .filter(q => q.eq(q.field('startupId'), startup._id))
          .collect();

        return {
          id: startup._id,
          name: startup.name,
          description: startup.description,
          website: startup.website,
          fundingAmount: startup.fundingAmount,
          roundType: startup.roundType || 'Undisclosed',
          dateAnnounced: startup.dateAnnounced || new Date().toISOString().split('T')[0],
          location: startup.location || 'Remote',
          founders: founders.map(f => f.name),
          investors: [],
          contactEmail: founders.find(f => f.email)?.email,
          socialLinks: { linkedin: undefined, twitter: undefined },
          sources: [],
          tags: startup.tags || [],
        };
      })
    );
  },
});

/**
 * Get scrape job status/history
 * For monitoring & debugging
 */
export const getScrapeJobHistory = query({
  args: {
    sourceName: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query('scrapeJobs');

    if (args.sourceName) {
      q = q.filter(q => q.eq(q.field('sourceName'), args.sourceName));
    }

    const jobs = await q.collect();

    // Sort by startTime descending
    jobs.sort((a, b) => b.startTime - a.startTime);

    return jobs.slice(0, args.limit || 20);
  },
});

/**
 * Get statistics about the database
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const startups = await ctx.db.query('startups').collect();
    const founders = await ctx.db.query('founders').collect();
    const sources = await ctx.db.query('dataSources').collect();

    const sourceBreakdown: Record<string, number> = {};
    sources.forEach(s => {
      sourceBreakdown[s.sourceName] = (sourceBreakdown[s.sourceName] || 0) + 1;
    });

    return {
      totalStartups: startups.length,
      totalFounders: founders.length,
      totalSources: sources.length,
      sourceBreakdown,
      avgConfidenceScore:
        startups.length > 0
          ? startups.reduce((sum, s) => sum + s.confidenceScore, 0) /
            startups.length
          : 0,
      lastUpdated: Math.max(...startups.map(s => s.updatedAt), 0),
    };
  },
});
