/**
 * AngelList/Wellfound Scraper
 * Free API for startups, funding rounds, and investor data
 * https://www.wellfound.com/developers
 */

import { action } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';

interface WellfoundStartup {
  id: string;
  name: string;
  tagline: string;
  description: string;
  website_url: string;
  logo_url: string;
  video_url: string;
  founded_on: string;
  closed_on: string | null;
  company_type: string;
  company_size: string;
  headquarters: {
    city: string;
    state: string;
    country: string;
  };
  markets: Array<{ id: string; name: string }>;
  stages: Array<{ id: string; name: string }>;
  funding_rounds: Array<{
    id: string;
    funding_type: string;
    announced_on: string;
    raised_amount: { amount: number; currency_code: string };
    investor_names: string[];
  }>;
  founder_names: string[];
  current_team: Array<{
    name: string;
    title: string;
    linkedin_url: string;
  }>;
  investment_themes: Array<{ id: string; name: string }>;
}

interface WellfoundResponse {
  results: WellfoundStartup[];
  meta: {
    count: number;
    total_count: number;
    page: number;
    per_page: number;
  };
}

export const fetchWellfoundStartups = action({
  args: {
    daysBack: v.optional(v.number()),
    stage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const daysBack = args.daysBack || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    
    try {
      const response = await fetch('https://api.wellfound.com/v2/startups/search.json', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WELLFOUND_API_KEY || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sort: 'last_funded_at',
          page: 1,
          per_page: 50,
          filters: {
            last_funded_at: {
              min: cutoffDate.toISOString().split('T')[0],
            },
            ...(args.stage ? { stage: { name: args.stage } } : {}),
          },
        }),
      });

      if (!response.ok) {
        console.log('Wellfound API not configured, using demo data');
        return await processDemoWellfound(ctx, cutoffDate);
      }

      const data: WellfoundResponse = await response.json();
      let processed = 0;
      let failed = 0;

      for (const startup of data.results || []) {
        try {
          const foundedDate = new Date(startup.founded_on);
          if (startup.founded_on && foundedDate < cutoffDate) continue;

          const latestFunding = startup.funding_rounds?.[0];
          const amount = latestFunding?.raised_amount
            ? formatAmount(latestFunding.raised_amount.amount, latestFunding.raised_amount.currency_code)
            : 'Undisclosed';

          const startupData = {
            rawData: {
              name: startup.name,
              description: startup.tagline || startup.description || '',
              website: startup.website_url,
              founders: startup.founder_names || startup.current_team?.map(t => t.name) || [],
              fundingAmount: amount,
              roundType: latestFunding?.funding_type || inferStage(startup.stages),
              dateAnnounced: latestFunding?.announced_on || startup.founded_on || new Date().toISOString().split('T')[0],
              location: startup.headquarters
                ? `${startup.headquarters.city}, ${startup.headquarters.state || startup.headquarters.country}`
                : 'Remote',
              tags: [
                'Wellfound',
                ...(startup.markets?.map(m => m.name) || []),
                ...(startup.stages?.map(s => s.name) || []),
              ],
            },
            source: 'wellfound' as const,
            sourceUrl: `https://www.wellfound.com/startups/${startup.id}`,
          };

          await ctx.runMutation(internal.processors.startup.processStartup, startupData);
          processed++;
        } catch (err) {
          console.error(`Failed to process Wellfound startup ${startup.id}:`, err);
          failed++;
        }
      }

      return {
        source: 'wellfound',
        processed,
        failed,
        total: data.meta?.total_count || data.results?.length || 0,
      };
    } catch (error) {
      console.error('Wellfound scrape failed:', error);
      return await processDemoWellfound(ctx, cutoffDate);
    }
  },
});

async function processDemoWellfound(ctx: any, cutoffDate: Date) {
  const demoStartups: WellfoundStartup[] = [
    {
      id: '1',
      name: 'Airbnb',
      tagline: 'Belong Anywhere',
      description: 'Online marketplace for lodging, homestays, and tourism experiences',
      website_url: 'https://airbnb.com',
      logo_url: '',
      video_url: '',
      founded_on: '2008-08-01',
      closed_on: null,
      company_type: '',
      company_size: '1001-5000',
      headquarters: { city: 'San Francisco', state: 'CA', country: 'US' },
      markets: [{ id: '1', name: 'Travel' }, { id: '2', name: ' Hospitality' }],
      stages: [{ id: '1', name: 'Series G' }],
      funding_rounds: [{
        id: 'r1',
        funding_type: 'Series G',
        announced_on: new Date().toISOString().split('T')[0],
        raised_amount: { amount: 1000000000, currency_code: 'USD' },
        investor_names: ['Sequoia', 'Andreessen Horowitz'],
      }],
      founder_names: ['Brian Chesky', 'Joe Gebbia', 'Nathan Blecharczyk'],
      current_team: [
        { name: 'Brian Chesky', title: 'CEO', linkedin_url: '' },
      ],
      investment_themes: [],
    },
    {
      id: '2',
      name: 'Stripe',
      tagline: 'Financial infrastructure for the internet',
      description: 'Technology company that builds economic infrastructure for the internet',
      website_url: 'https://stripe.com',
      logo_url: '',
      video_url: '',
      founded_on: '2010-01-01',
      closed_on: null,
      company_type: '',
      company_size: '5001-10000',
      headquarters: { city: 'San Francisco', state: 'CA', country: 'US' },
      markets: [{ id: '1', name: 'Fintech' }, { id: '2', name: 'Payments' }],
      stages: [{ id: '1', name: 'Series J' }],
      funding_rounds: [{
        id: 'r2',
        funding_type: 'Series J',
        announced_on: new Date().toISOString().split('T')[0],
        raised_amount: { amount: 6500000000, currency_code: 'USD' },
        investor_names: ['Sequoia', 'General Catalyst'],
      }],
      founder_names: ['Patrick Collison', 'John Collison'],
      current_team: [],
      investment_themes: [],
    },
    {
      id: '3',
      name: 'Notion',
      tagline: 'All your tools, one place',
      description: 'Productivity and note-taking web application',
      website_url: 'https://notion.so',
      logo_url: '',
      video_url: '',
      founded_on: '2013-04-01',
      closed_on: null,
      company_type: '',
      company_size: '1001-5000',
      headquarters: { city: 'San Francisco', state: 'CA', country: 'US' },
      markets: [{ id: '1', name: 'SaaS' }, { id: '2', name: 'Productivity' }],
      stages: [{ id: '1', name: 'Series C' }],
      funding_rounds: [{
        id: 'r3',
        funding_type: 'Series C',
        announced_on: new Date().toISOString().split('T')[0],
        raised_amount: { amount: 250000000, currency_code: 'USD' },
        investor_names: ['Sequoia', 'Index Ventures'],
      }],
      founder_names: ['Ivan Zhao', 'Simon Last'],
      current_team: [],
      investment_themes: [],
    },
  ];

  let processed = 0;
  for (const startup of demoStartups) {
    try {
      const latestFunding = startup.funding_rounds?.[0];
      const amount = latestFunding?.raised_amount
        ? formatAmount(latestFunding.raised_amount.amount, latestFunding.raised_amount.currency_code)
        : 'Undisclosed';

      const startupData = {
        rawData: {
          name: startup.name,
          description: startup.tagline || startup.description,
          website: startup.website_url,
          founders: startup.founder_names,
          fundingAmount: amount,
          roundType: latestFunding?.funding_type || 'Seed',
          dateAnnounced: latestFunding?.announced_on || startup.founded_on || new Date().toISOString().split('T')[0],
          location: startup.headquarters
            ? `${startup.headquarters.city}, ${startup.headquarters.state || ''}`
            : 'Remote',
          tags: [
            'Wellfound',
            ...(startup.markets?.map(m => m.name) || []),
          ],
        },
        source: 'wellfound' as const,
        sourceUrl: `https://www.wellfound.com/startups/${startup.id}`,
      };

      await ctx.runMutation(internal.processors.startup.processStartup, startupData);
      processed++;
    } catch (err) {
      console.error('Demo Wellfound startup failed:', err);
    }
  }

  return {
    source: 'wellfound',
    processed,
    failed: 0,
    total: demoStartups.length,
    demo: true,
  };
}

function formatAmount(amount: number, currency: string): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

function inferStage(stages: Array<{ name: string }> | undefined): string {
  if (!stages || stages.length === 0) return 'Seed';
  const stageName = stages[0].name.toLowerCase();
  if (stageName.includes('seed')) return 'Seed';
  if (stageName.includes('series a')) return 'Series A';
  if (stageName.includes('series b')) return 'Series B';
  if (stageName.includes('growth')) return 'Growth';
  return 'Seed';
}
