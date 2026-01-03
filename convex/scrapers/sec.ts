/**
 * SEC Edgar Form D Scraper
 * Official US Securities & Exchange Commission database
 * Records of startups that raised $25k+ (official records)
 * Free API - no auth required
 */

import { action } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';

interface SECFormDSearchResponse {
  hits: Array<{
    _id: { secs_filing_id: string };
    cik: string;
    entityName: string;
    submittedAt: string;
    acceptedAt: string;
    periodOfReport: string;
    receivedAmt: string;
    isVoluntaryFiler: string;
    isAmendment: string;
    exemptionRule: string;
    totalOfferingAmount: string;
    totalAmountSold: string;
    totalRemaining: string;
    typesOfSecurities: string;
  }>;
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMs: number;
}

export const fetchSECFormD = action({
  args: { daysBack: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const daysBack = args.daysBack || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    
    try {
      const searchParams = new URLSearchParams({
        ciks: '',
        entityNames: '',
        forms: 'D',
        stateOfIncorporation: '',
        stateOfHeadquarters: '',
        from: '0',
        size: '100',
        sort: 'periodOfReport,desc',
      });

      const cutoffStr = cutoffDate.toISOString().split('T')[0];
      const response = await fetch(
        `https://efts.sec.gov/edgat/search/?${searchParams.toString()}`,
        {
          headers: {
            'User-Agent': 'Scoutly-Bot/1.0 (research project)',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`SEC API error: ${response.statusText}`);
      }

      const data: SECFormDSearchResponse = await response.json();
      let processed = 0;
      let failed = 0;

      for (const item of data.hits || []) {
        try {
          const filingDate = new Date(item.periodOfReport);
          if (filingDate < cutoffDate) continue;

          const amount = parseFundingAmount(item.totalOfferingAmount || item.receivedAmt);
          
          const startupData = {
            rawData: {
              name: item.entityName,
              description: `SEC Form D filing - ${item.typesOfSecurities || 'Exempt offering'}`,
              website: '',
              founders: [],
              fundingAmount: amount,
              roundType: inferRoundType(amount),
              dateAnnounced: filingDate.toISOString().split('T')[0],
              location: 'United States',
              tags: ['SEC', 'Form D', 'Funding', item.exemptionRule || 'Reg D'],
            },
            source: 'sec_edgar' as const,
            sourceUrl: `https://www.sec.gov/edgar/browse/.CIK${parseInt(item.cik)}`,
          };

          await ctx.runMutation(internal.processors.startup.processStartup, startupData);
          processed++;
        } catch (err) {
          console.error(`Failed to process SEC filing ${item.cik}:`, err);
          failed++;
        }
      }

      return {
        source: 'sec_edgar',
        processed,
        failed,
        total: data.nbHits,
      };
    } catch (error) {
      console.error('SEC Form D scrape failed:', error);
      throw error;
    }
  },
});

function parseFundingAmount(amountStr: string): string {
  if (!amountStr) return 'Undisclosed';
  
  const cleaned = amountStr.replace(/[$,]/g, '');
  const amount = parseFloat(cleaned);
  
  if (isNaN(amount)) return 'Undisclosed';
  
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  
  return `$${amount.toLocaleString()}`;
}

function inferRoundType(amount: string): string {
  if (amount === 'Undisclosed') return 'Seed';
  
  const numMatch = amount.match(/\$?([\d.]+)([KM])?/);
  if (!numMatch) return 'Seed';
  
  const num = parseFloat(numMatch[1]);
  const unit = numMatch[2];
  
  let value: number;
  if (unit === 'M') value = num * 1000000;
  else if (unit === 'K') value = num * 1000;
  else value = num;
  
  if (value < 250000) return 'Pre-Seed';
  if (value < 2000000) return 'Seed';
  if (value < 5000000) return 'Series A';
  if (value < 15000000) return 'Series B';
  return 'Growth';
}
