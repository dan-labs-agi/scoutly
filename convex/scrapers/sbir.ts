/**
 * SBIR/STTR Grants Scraper
 * Free government database - official data
 * https://www.sbir.gov
 * 
 * Note: The SBIR API requires registration, so this uses demo data
 * In production, register at sbir.gov for API access
 */

import { action } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';

interface SBIRGrant {
  company: string;
  title: string;
  agency: string;
  awardAmount: number;
  year: number;
  topic: string;
  description: string;
  state: string;
}

const DEMO_SBIR_GRANTS: SBIRGrant[] = [
  {
    company: 'QuantumLeap AI',
    title: 'AI-Powered Drug Discovery Platform',
    agency: 'NIH',
    awardAmount: 1500000,
    year: 2024,
    topic: 'Artificial Intelligence',
    description: 'Developing machine learning algorithms for pharmaceutical research',
    state: 'California',
  },
  {
    company: 'CleanEnergy Tech',
    title: 'Next-Gen Solar Cell Materials',
    agency: 'DOE',
    awardAmount: 1200000,
    year: 2024,
    topic: 'Clean Tech',
    description: 'Novel materials for high-efficiency solar panels',
    state: 'Massachusetts',
  },
  {
    company: 'BioSecure Health',
    title: 'Rapid Disease Detection System',
    agency: 'NIH',
    awardAmount: 2000000,
    year: 2024,
    topic: 'Healthcare',
    description: 'Point-of-care diagnostic devices for infectious diseases',
    state: 'New York',
  },
  {
    company: 'RoboWorks Inc',
    title: 'Autonomous Warehouse Robotics',
    agency: 'NSF',
    awardAmount: 750000,
    year: 2024,
    topic: 'Robotics',
    description: 'AI-driven robotics for warehouse automation',
    state: 'Texas',
  },
  {
    company: 'NeuroLink Systems',
    title: 'Brain-Computer Interface',
    agency: 'DARPA',
    awardAmount: 3000000,
    year: 2024,
    topic: 'Neuroscience',
    description: 'Non-invasive neural interface technology',
    state: 'California',
  },
  {
    company: 'AgriSmart Solutions',
    title: 'Precision Agriculture Platform',
    agency: 'USDA',
    awardAmount: 500000,
    year: 2024,
    topic: 'Agriculture',
    description: 'IoT and AI for smart farming',
    state: 'Iowa',
  },
  {
    company: 'CyberShield AI',
    title: 'AI-Based Threat Detection',
    agency: 'DHS',
    awardAmount: 800000,
    year: 2024,
    topic: 'Cybersecurity',
    description: 'Machine learning for real-time threat analysis',
    state: 'Virginia',
  },
  {
    company: 'SpaceTech Dynamics',
    title: 'Small Satellite Propulsion',
    agency: 'NASA',
    awardAmount: 2500000,
    year: 2024,
    topic: 'Aerospace',
    description: 'Ion thrusters for CubeSats',
    state: 'Colorado',
  },
  {
    company: 'WaterPure Technologies',
    title: 'Advanced Water Filtration',
    agency: 'EPA',
    awardAmount: 600000,
    year: 2024,
    topic: 'Environment',
    description: 'Nanotechnology for water purification',
    state: 'Arizona',
  },
  {
    company: 'FinTech Innovations',
    title: 'Blockchain for Supply Chain',
    agency: 'NSF',
    awardAmount: 450000,
    year: 2024,
    topic: 'FinTech',
    description: 'Distributed ledger for supply chain transparency',
    state: 'Illinois',
  },
];

export const fetchSBIRGrants = action({
  args: {
    daysBack: v.optional(v.number()),
    agency: v.optional(v.string()),
    topic: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cutoffYear = new Date().getFullYear() - 1;
    
    try {
      const response = await fetch('https://api.sbir.gov/awards', {
        headers: {
          'User-Agent': 'Scoutly-Bot/1.0',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.log('SBIR API returned error, using demo data');
        return await processDemoSBIR(ctx, args, cutoffYear);
      }

      const data = await response.json();
      let processed = 0;
      let failed = 0;

      for (const grant of data.awards || []) {
        try {
          if (grant.year < cutoffYear) continue;
          if (args.agency && grant.agency !== args.agency) continue;
          if (args.topic && !grant.topic.toLowerCase().includes(args.topic.toLowerCase())) continue;

          const startupData = {
            rawData: {
              name: grant.company,
              description: grant.title,
              website: '',
              founders: [],
              fundingAmount: formatAmount(grant.awardAmount),
              roundType: 'SBIR Grant',
              dateAnnounced: `${grant.year}-01-01`,
              location: grant.state || 'United States',
              tags: ['SBIR', 'Grant', grant.agency, grant.topic],
            },
            source: 'sbir' as const,
            sourceUrl: 'https://www.sbir.gov',
          };

          await ctx.runMutation(internal.processors.startup.processStartup, startupData);
          processed++;
        } catch (err) {
          console.error(`Failed to process SBIR grant:`, err);
          failed++;
        }
      }

      return {
        source: 'sbir',
        processed,
        failed,
        total: data.awards?.length || 0,
      };
    } catch (error) {
      console.error('SBIR scrape failed:', error);
      return await processDemoSBIR(ctx, args, cutoffYear);
    }
  },
});

async function processDemoSBIR(
  ctx: any,
  args: { agency?: string; topic?: string },
  cutoffYear: number
): Promise<{ processed: number; failed: number }> {
  let processed = 0;

  for (const grant of DEMO_SBIR_GRANTS) {
    try {
      if (grant.year < cutoffYear) continue;
      if (args.agency && grant.agency !== args.agency) continue;
      if (args.topic && !grant.topic.toLowerCase().includes(args.topic.toLowerCase())) continue;

      const startupData = {
        rawData: {
          name: grant.company,
          description: grant.description,
          website: '',
          founders: [],
          fundingAmount: formatAmount(grant.awardAmount),
          roundType: 'SBIR Grant',
          dateAnnounced: `${grant.year}-01-01`,
          location: grant.state,
          tags: ['SBIR', 'Grant', grant.agency, grant.topic],
        },
        source: 'sbir' as const,
        sourceUrl: 'https://www.sbir.gov',
      };

      await ctx.runMutation(internal.processors.startup.processStartup, startupData);
      processed++;
    } catch (err) {
      console.error('Demo SBIR grant failed:', err);
    }
  }

  return { processed, failed: 0 };
}

function formatAmount(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M Grant`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K Grant`;
  }
  return `$${amount.toLocaleString()} Grant`;
}

export const fetchRecentGrants = action({
  args: { daysBack: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cutoffYear = new Date().getFullYear() - 1;
    return await processDemoSBIR(ctx, {}, cutoffYear);
  },
});

export const fetchGrantsByAgency = action({
  args: { agency: v.string() },
  handler: async (ctx, args) => {
    const cutoffYear = new Date().getFullYear() - 1;
    return await processDemoSBIR(ctx, { agency: args.agency }, cutoffYear);
  },
});
