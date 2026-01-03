import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // Main startups table
  startups: defineTable({
    // Core identity
    name: v.string(),
    canonicalName: v.string(), // Normalized for deduplication
    website: v.optional(v.string()),
    description: v.string(),
    logo: v.optional(v.string()),
    location: v.optional(v.string()),
    
    // Funding info
    fundingAmount: v.optional(v.string()),
    roundType: v.optional(v.string()),
    dateAnnounced: v.optional(v.string()),
    
    // Metadata
    tags: v.array(v.string()),
    confidenceScore: v.number(), // 0-1, based on source count & data quality
    sourceCount: v.number(), // How many sources reported this
    
    // Tracking
    createdAt: v.number(),
    updatedAt: v.number(),
    lastEnrichedAt: v.optional(v.number()),
  })
    .index('by_created', ['createdAt'])
    .index('by_name', ['canonicalName'])
    .index('by_date', ['dateAnnounced'])
    .searchIndex('search_startups', {
      searchField: 'name',
      filterFields: ['tags', 'dateAnnounced']
    }),

  // Founders linked to startups
  founders: defineTable({
    startupId: v.id('startups'),
    name: v.string(),
    email: v.optional(v.string()),
    emailVerified: v.optional(v.boolean()),
    twitter: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(v.string()), // CEO, Co-founder, etc
  })
    .index('by_startup', ['startupId'])
    .index('by_email', ['email']),

  // Funding rounds (separate for historical tracking)
  fundingRounds: defineTable({
    startupId: v.id('startups'),
    roundType: v.string(),
    fundingAmount: v.string(),
    investors: v.array(v.string()),
    dateAnnounced: v.string(),
    sourceUrl: v.optional(v.string()),
  })
    .index('by_startup', ['startupId']),

  // Track data sources for transparency
  dataSources: defineTable({
    startupId: v.id('startups'),
    sourceName: v.string(), // 'yc', 'techcrunch', 'twitter', 'hn', 'producthunt'
    sourceUrl: v.string(),
    extractedAt: v.number(),
    confidence: v.number(), // 0-1
  })
    .index('by_startup', ['startupId'])
    .index('by_source', ['sourceName']),

  // Scraping job logs
  scrapeJobs: defineTable({
    sourceName: v.string(),
    status: v.union(
      v.literal('pending'),
      v.literal('running'),
      v.literal('completed'),
      v.literal('failed')
    ),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    itemsProcessed: v.number(),
    itemsFailed: v.number(),
    error: v.optional(v.string()),
  })
    .index('by_source_status', ['sourceName', 'status']),

  // Firecrawl request cache (avoid re-scraping same URLs)
  urlCache: defineTable({
    url: v.string(),
    content: v.string(), // Cached HTML/markdown
    cachedAt: v.number(),
    expiresAt: v.number(), // 7 days
  })
    .index('by_url', ['url']),

  // Enrichment data from third-party APIs
  enrichmentData: defineTable({
    startupId: v.id('startups'),
    provider: v.string(), // 'clearbit', 'hunter', 'linkedin'
    data: v.string(), // JSON stringified
    enrichedAt: v.number(),
  })
    .index('by_startup', ['startupId']),
});
