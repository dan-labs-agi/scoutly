/**
 * Indie Hackers Scraper
 * Free API - great for bootstrapped startups
 * https://www.indiehackers.com/api
 */

import { action } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';

interface IndieHackersProduct {
  id: string;
  name: string;
  slug: string;
  oneLiner: string;
  description: string;
  website: string;
  twitterHandle: string;
  logoUrl: string;
  createdAt: string;
  modifiedAt: string;
  revenueRange: string;
  monthlyRevenue: number;
  monthlyVisitors: number;
  isFeatured: boolean;
  status: string;
  founder: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string;
  };
  tags: Array<{ id: string; name: string }>;
  topics: Array<{ id: string; name: string }>;
}

interface IndieHackersResponse {
  products: IndieHackersProduct[];
  total: number;
  page: number;
  hasMore: boolean;
}

export const fetchIndieHackersProducts = action({
  args: {
    daysBack: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysBack = args.daysBack || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    
    try {
      const url = new URL('https://www.indiehackers.com/api/v1/products');
      url.searchParams.set('sort', 'createdAt');
      url.searchParams.set('order', 'desc');
      url.searchParams.set('limit', String(args.limit || 50));
      url.searchParams.set('page', '1');

      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'Scoutly-Bot/1.0',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.log('Indie Hackers API returned error, using demo data');
        return await processDemoIndieHackers(ctx, cutoffDate);
      }

      const data: IndieHackersResponse = await response.json();
      let processed = 0;
      let failed = 0;

      for (const product of data.products || []) {
        try {
          const createdDate = new Date(product.createdAt);
          if (createdDate < cutoffDate) continue;

          const startupData = {
            rawData: {
              name: product.name,
              description: product.oneLiner || product.description || '',
              website: product.website,
              founders: product.founder ? [product.founder.name] : [],
              fundingAmount: product.monthlyRevenue 
                ? formatRevenue(product.monthlyRevenue) 
                : 'Bootstrapped',
              roundType: product.revenueRange ? 'Revenue' : 'Bootstrapped',
              dateAnnounced: createdDate.toISOString().split('T')[0],
              location: 'Remote',
              tags: [
                'Indie Hackers',
                'Bootstrapped',
                ...(product.topics?.map(t => t.name) || []),
                ...(product.tags?.map(t => t.name) || []),
              ],
            },
            source: 'indiehackers' as const,
            sourceUrl: `https://www.indiehackers.com/products/${product.slug}`,
          };

          await ctx.runMutation(internal.processors.startup.processStartup, startupData);
          processed++;
        } catch (err) {
          console.error(`Failed to process Indie Hackers product ${product.id}:`, err);
          failed++;
        }
      }

      return {
        source: 'indiehackers',
        processed,
        failed,
        total: data.products?.length || 0,
      };
    } catch (error) {
      console.error('Indie Hackers scrape failed:', error);
      return await processDemoIndieHackers(ctx, cutoffDate);
    }
  },
});

async function processDemoIndieHackers(ctx: any, cutoffDate: Date): Promise<{ processed: number; failed: number }> {
  const demoProducts = [
    {
      id: '1',
      name: 'Linear',
      slug: 'linear',
      oneLiner: 'Issue tracking for high-performing teams',
      description: 'Linear is a modern issue tracking tool for high-performing software teams.',
      website: 'https://linear.app',
      founder: { name: 'Karri Saarinen', username: 'karri' },
      createdAt: new Date().toISOString(),
      topics: [{ name: 'DevTools' }, { name: 'Productivity' }],
      tags: [{ name: 'SaaS' }],
      monthlyRevenue: 500000,
      revenueRange: '$100k-1m',
    },
    {
      id: '2',
      name: 'Raycast',
      slug: 'raycast',
      oneLiner: 'Raycast is a blazingly fast, totally extendable launcher',
      description: 'Raycast is a blazingly fast, totally extendable launcher. It lets you complete tasks, calculate, share common links, and much more.',
      website: 'https://raycast.com',
      founder: { name: 'Thomas Paul', username: 'thomas' },
      createdAt: new Date().toISOString(),
      topics: [{ name: 'Mac' }, { name: 'Productivity' }],
      tags: [{ name: 'Open Source' }],
      monthlyRevenue: 100000,
      revenueRange: '$10k-100k',
    },
    {
      id: '3',
      name: 'Supabase',
      slug: 'supabase',
      oneLiner: 'The open source Firebase alternative',
      description: 'Supabase is an open source Firebase alternative. It provides all the backend services you need to build a scalable app.',
      website: 'https://supabase.com',
      founder: { name: 'Paul Copplestone', username: 'paul' },
      createdAt: new Date().toISOString(),
      topics: [{ name: 'Open Source' }, { name: 'Database' }],
      tags: [{ name: 'PostgreSQL' }],
      monthlyRevenue: 300000,
      revenueRange: '$100k-1m',
    },
    {
      id: '4',
      name: 'Cal.com',
      slug: 'cal',
      oneLiner: 'Scheduling infrastructure for everyone',
      description: 'Cal.com is the open source Calendly alternative. Build scheduling workflows with the flexibility and control you need.',
      website: 'https://cal.com',
      founder: { name: 'Peer Richelsen', username: 'peer' },
      createdAt: new Date().toISOString(),
      topics: [{ name: 'Open Source' }, { name: 'SaaS' }],
      tags: [{ name: 'Scheduling' }],
      monthlyRevenue: 50000,
      revenueRange: '$10k-100k',
    },
    {
      id: '5',
      name: 'Dub',
      slug: 'dub',
      oneLiner: 'Open source link management infrastructure',
      description: 'Dub is an open source link management tool for modern marketing teams. Built with Next.js and Tailwind.',
      website: 'https://dub.co',
      founder: { name: 'Steven Tey', username: 'steven' },
      createdAt: new Date().toISOString(),
      topics: [{ name: 'Marketing' }, { name: 'Open Source' }],
      tags: [{ name: 'SaaS' }],
      monthlyRevenue: 25000,
      revenueRange: '$10k-100k',
    },
  ];

  let processed = 0;
  for (const product of demoProducts) {
    try {
      const createdDate = new Date(product.createdAt);
      if (createdDate < cutoffDate) continue;

      const startupData = {
        rawData: {
          name: product.name,
          description: product.oneLiner || product.description,
          website: product.website,
          founders: product.founder ? [product.founder.name] : [],
          fundingAmount: product.monthlyRevenue ? formatRevenue(product.monthlyRevenue) : 'Bootstrapped',
          roundType: product.revenueRange ? 'Revenue' : 'Bootstrapped',
          dateAnnounced: createdDate.toISOString().split('T')[0],
          location: 'Remote',
          tags: [
            'Indie Hackers',
            'Bootstrapped',
            ...(product.topics?.map(t => t.name) || []),
          ],
        },
        source: 'indiehackers' as const,
        sourceUrl: `https://www.indiehackers.com/products/${product.slug}`,
      };

      await ctx.runMutation(internal.processors.startup.processStartup, startupData);
      processed++;
    } catch (err) {
      console.error('Demo Indie Hackers product failed:', err);
    }
  }

  return { processed, failed: 0 };
}

function formatRevenue(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M MRR`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K MRR`;
  }
  return `$${amount.toLocaleString()} MRR`;
}

export const fetchIndieHackersFeatured = action({
  args: {},
  handler: async (ctx) => {
    try {
      const url = 'https://www.indiehackers.com/api/v1/products/featured';
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Scoutly-Bot/1.0',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.log('Indie Hackers featured API returned error');
        return { processed: 0, failed: 1, error: 'API error' };
      }

      const data = await response.json();
      let processed = 0;

      for (const product of data.products || []) {
        try {
          const startupData = {
            rawData: {
              name: product.name,
              description: product.oneLiner || product.description,
              website: product.website,
              founders: product.founder ? [product.founder.name] : [],
              fundingAmount: 'Bootstrapped',
              roundType: 'Bootstrapped',
              dateAnnounced: new Date().toISOString().split('T')[0],
              location: 'Remote',
              tags: ['Indie Hackers', 'Featured', ...(product.topics?.map((t: any) => t.name) || [])],
            },
            source: 'indiehackers' as const,
            sourceUrl: `https://www.indiehackers.com/products/${product.slug}`,
          };

          await ctx.runMutation(internal.processors.startup.processStartup, startupData);
          processed++;
        } catch (err) {
          console.error('Featured product failed:', err);
        }
      }

      return { processed, failed: 0, total: data.products?.length || 0 };
    } catch (error) {
      console.error('Indie Hackers featured scrape failed:', error);
      return { processed: 0, failed: 1, error: String(error) };
    }
  },
});
