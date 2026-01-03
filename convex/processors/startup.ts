/**
 * Startup data processor
 * Handles: deduplication, validation, normalization, enrichment
 */

import { mutation, action, internalMutation } from '../_generated/server';
import { v } from 'convex/values';

const SIMILARITY_THRESHOLD = 0.80; // 80% name similarity = duplicate

/**
 * Normalize company name for deduplication
 * "The Auth0 Company" -> "auth0"
 */
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(the|a)\s+/i, '') // Remove articles
    .replace(/[^\w\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Calculate Levenshtein distance (simple string similarity)
 */
function levenshteinDistance(a: string, b: string): number {
  const aLen = a.length;
  const bLen = b.length;
  const dp = Array(bLen + 1).fill(0).map(() => Array(aLen + 1).fill(0));

  for (let i = 0; i <= aLen; i++) dp[0][i] = i;
  for (let j = 0; j <= bLen; j++) dp[j][0] = j;

  for (let j = 1; j <= bLen; j++) {
    for (let i = 1; i <= aLen; i++) {
      if (a[i - 1] === b[j - 1]) {
        dp[j][i] = dp[j - 1][i - 1];
      } else {
        dp[j][i] = 1 + Math.min(
          dp[j - 1][i],
          dp[j][i - 1],
          dp[j - 1][i - 1]
        );
      }
    }
  }

  const maxLen = Math.max(aLen, bLen);
  return 1 - (dp[bLen][aLen] / maxLen);
}

/**
 * Main startup processor
 * This is called from each scraper with raw data
 */
export const processStartup = internalMutation({
  args: {
    rawData: v.object({
      name: v.string(),
      description: v.string(),
      website: v.optional(v.string()),
      founders: v.optional(v.array(v.string())),
      fundingAmount: v.optional(v.string()),
      dateAnnounced: v.optional(v.string()),
      location: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
    }),
    source: v.string(),
    sourceUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const { rawData, source, sourceUrl } = args;

    // Step 1: Normalize name
    const canonicalName = normalizeCompanyName(rawData.name);

    // Step 2: Check for duplicates using fuzzy matching
    const existingStartups = await ctx.db
      .query('startups')
      .filter(q => q.eq(q.field('canonicalName'), canonicalName))
      .collect();

    let startupId: string;
    let isUpdate = false;

    if (existingStartups.length > 0) {
      // Found exact match
      const existing = existingStartups[0];
      startupId = existing._id;
      isUpdate = true;

      // Update source count and metadata
      await ctx.db.patch(existing._id, {
        sourceCount: existingStartups[0].sourceCount + 1,
        updatedAt: Date.now(),
        // Update description if new one is better (longer/more detailed)
        description:
          rawData.description.length > existingStartups[0].description.length
            ? rawData.description
            : existingStartups[0].description,
        // Update funding if more recent/specific
        fundingAmount:
          rawData.fundingAmount &&
          rawData.fundingAmount !== 'Undisclosed' &&
          rawData.fundingAmount !== existingStartups[0].fundingAmount
            ? rawData.fundingAmount
            : existingStartups[0].fundingAmount,
      });
    } else {
      // Check for fuzzy matches (typos, variations)
      const allStartups = await ctx.db.query('startups').collect();
      let bestMatch: (typeof allStartups[0]) | null = null;
      let bestSimilarity = 0;

      for (const existing of allStartups) {
        const similarity = levenshteinDistance(
          canonicalName,
          existing.canonicalName
        );
        if (similarity > SIMILARITY_THRESHOLD && similarity > bestSimilarity) {
          bestMatch = existing;
          bestSimilarity = similarity;
        }
      }

      if (bestMatch && bestSimilarity > SIMILARITY_THRESHOLD) {
        // Fuzzy match found
        startupId = bestMatch._id;
        isUpdate = true;

        await ctx.db.patch(bestMatch._id, {
          sourceCount: bestMatch.sourceCount + 1,
          updatedAt: Date.now(),
        });
      } else {
        // Create new startup
        startupId = await ctx.db.insert('startups', {
          name: rawData.name,
          canonicalName,
          description: rawData.description,
          website: rawData.website,
          location: rawData.location || 'Remote',
          fundingAmount: rawData.fundingAmount,
          dateAnnounced: rawData.dateAnnounced,
          tags: rawData.tags || [],
          confidenceScore: 0.85, // Will increase with more sources
          sourceCount: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    // Step 3: Add data source record (for transparency)
    await ctx.db.insert('dataSources', {
      startupId: startupId as any,
      sourceName: source,
      sourceUrl,
      extractedAt: Date.now(),
      confidence: 0.95, // Official APIs have high confidence
    });

    // Step 4: Process founders
    if (rawData.founders && rawData.founders.length > 0) {
      for (const founderName of rawData.founders) {
        // Check if founder already exists
        const existingFounder = await ctx.db
          .query('founders')
          .filter(q =>
            q.and(
              q.eq(q.field('startupId'), startupId as any),
              q.eq(q.field('name'), founderName)
            )
          )
          .first();

        if (!existingFounder) {
          await ctx.db.insert('founders', {
            startupId: startupId as any,
            name: founderName,
          });
        }
      }
    }

    // Step 5: Trigger enrichment (non-blocking)
    // This will find emails, social profiles, etc
    // TODO: Implement enrichment action
    // await ctx.scheduler.runAfter(0, enrichStartup, { startupId });

    return {
      action: isUpdate ? 'updated' : 'created',
      startupId,
      source,
    };
  },
});

/**
 * Batch process multiple startups
 * Useful for initial data imports
 */
export const batchProcessStartups = internalMutation({
  args: {
    startups: v.array(
      v.object({
        name: v.string(),
        description: v.string(),
        website: v.optional(v.string()),
        founders: v.optional(v.array(v.string())),
        fundingAmount: v.optional(v.string()),
        dateAnnounced: v.optional(v.string()),
        location: v.optional(v.string()),
      })
    ),
    source: v.string(),
    sourceUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const results = [];

    for (const startup of args.startups) {
      try {
        // Process each startup individually
        const canonicalName = normalizeCompanyName(startup.name);
        
        // Check for duplicates
        const existingStartups = await ctx.db
          .query('startups')
          .filter(q => q.eq(q.field('canonicalName'), canonicalName))
          .collect();

        let startupId: string;
        if (existingStartups.length > 0) {
          // Update existing
          const existing = existingStartups[0];
          startupId = existing._id;
          await ctx.db.patch(existing._id, {
            sourceCount: existing.sourceCount + 1,
            updatedAt: Date.now(),
          });
        } else {
          // Create new
          startupId = await ctx.db.insert('startups', {
            name: startup.name,
            canonicalName,
            description: startup.description,
            website: startup.website,
            location: startup.location || 'Remote',
            fundingAmount: startup.fundingAmount,
            dateAnnounced: startup.dateAnnounced,
            tags: [],
            confidenceScore: 0.85,
            sourceCount: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }

        results.push({ success: true, startupId });
      } catch (err) {
        results.push({ success: false, error: String(err) });
      }
    }

    return results;
  },
});
