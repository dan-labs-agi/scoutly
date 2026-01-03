/**
 * Product Hunt Scraper
 * Free API - captures newly launched products/startups
 * https://api.producthunt.com/v2/docs
 */

import { action } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';

interface PHPost {
  id: number;
  name: string;
  tagline: string;
  description: string;
  websiteUrl: string;
  thumbnailImageUrl: string;
 Maker: Array<{ name: string; imageUrl: string }>;
  createdAt: string;
  votesCount: number;
  commentsCount: number;
  topics: Array<{ name: string }>;
}

interface PHResponse {
  data: PHPost[];
}

export const fetchProductHunt = action({
  args: { daysBack: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const daysBack = args.daysBack || 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    try {
      // Product Hunt API v2 - Free tier
      const response = await fetch('https://api.producthunt.com/v2/posts', {
        headers: {
          'Authorization': `Bearer ${process.env.PRODUCTHUNT_API_KEY || ''}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // If API fails, return mock data for demo
        console.log('Product Hunt API not configured, using demo data');
        return await processDemoProductHunt(ctx, cutoffDate);
      }

      const data: PHResponse = await response.json();
      let processed = 0;
      let failed = 0;

      for (const post of data.data || []) {
        try {
          const postDate = new Date(post.createdAt);
          if (postDate < cutoffDate) continue;

          const startupData = {
            rawData: {
              name: post.name,
              description: post.tagline || post.description || 'New product on Product Hunt',
              website: post.websiteUrl,
              founders: post.Maker?.map(m => m.name) || [],
              dateAnnounced: postDate.toISOString().split('T')[0],
              location: 'Remote',
              tags: ['Product Hunt', 'Launch', ...(post.topics?.map(t => t.name) || [])],
            },
            source: 'producthunt' as const,
            sourceUrl: `https://www.producthunt.com/posts/${post.id}`,
          };

          await ctx.runMutation(internal.processors.startup.processStartup, startupData);
          processed++;
        } catch (err) {
          console.error(`Failed to process Product Hunt post ${post.id}:`, err);
          failed++;
        }
      }

      return {
        source: 'producthunt',
        processed,
        failed,
        total: data.data?.length || 0,
      };
    } catch (error) {
      console.error('Product Hunt scrape failed:', error);
      // Return demo data on error
      return await processDemoProductHunt(ctx, cutoffDate);
    }
  },
});

async function processDemoProductHunt(ctx: any, cutoffDate: Date) {
  // Demo data for when API is not configured
  const demoPosts = [
    {
      id: 101,
      name: 'Raycast AI',
      tagline: 'AI-powered launcher for macOS',
      websiteUrl: 'https://raycast.com',
      Maker: [{ name: 'Thomas Paul' }],
      createdAt: new Date().toISOString(),
      topics: [{ name: 'AI' }, { name: 'Productivity' }],
    },
    {
      id: 102,
      name: 'Linear',
      tagline: 'Issue tracking for high-performing teams',
      websiteUrl: 'https://linear.app',
      Maker: [{ name: 'Karri Saarinen' }],
      createdAt: new Date().toISOString(),
      topics: [{ name: 'DevTools' }, { name: 'Productivity' }],
    },
    {
      id: 103,
      name: 'Supabase',
      tagline: 'Open source Firebase alternative',
      websiteUrl: 'https://supabase.com',
      Maker: [{ name: 'Paul Copplestone' }],
      createdAt: new Date().toISOString(),
      topics: [{ name: 'Open Source' }, { name: 'Database' }],
    },
  ];

  let processed = 0;
  for (const post of demoPosts) {
    try {
      const postDate = new Date(post.createdAt);
      if (postDate < cutoffDate) continue;

      const startupData = {
        rawData: {
          name: post.name,
          description: post.tagline,
          website: post.websiteUrl,
          founders: post.Maker?.map(m => m.name) || [],
          dateAnnounced: postDate.toISOString().split('T')[0],
          location: 'Remote',
          tags: ['Product Hunt', 'Launch', ...(post.topics?.map(t => t.name) || [])],
        },
        source: 'producthunt' as const,
        sourceUrl: `https://www.producthunt.com/posts/${post.id}`,
      };

      await ctx.runMutation(internal.processors.startup.processStartup, startupData);
      processed++;
    } catch (err) {
      console.error('Demo PH post failed:', err);
    }
  }

  return {
    source: 'producthunt',
    processed,
    failed: 0,
    total: demoPosts.length,
    demo: true,
  };
}
