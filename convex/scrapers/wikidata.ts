/**
 * Wikidata Scraper
 * Free structured data API - extremely stable
 * Contains company and founder information
 */

import { action } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';

interface WikidataSearchResult {
  id: string;
  label: string;
  description: string;
}

interface WikidataSearchResponse {
  search: WikidataSearchResult[];
}

export const fetchWikidataCompanies = action({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const searchUrl = new URL('https://www.wikidata.org/w/api.php');
      searchUrl.searchParams.set('action', 'wbsearchentities');
      searchUrl.searchParams.set('search', args.searchTerm);
      searchUrl.searchParams.set('type', 'item');
      searchUrl.searchParams.set('language', 'en');
      searchUrl.searchParams.set('format', 'json');
      searchUrl.searchParams.set('origin', '*');
      searchUrl.searchParams.set('limit', String(args.limit || 20));

      const response = await fetch(searchUrl.toString());
      if (!response.ok) {
        throw new Error(`Wikidata search failed: ${response.statusText}`);
      }

      const data: WikidataSearchResponse = await response.json();
      let processed = 0;
      let failed = 0;

      for (const result of data.search || []) {
        try {
          await processWikidataEntity(result.id, ctx);
          processed++;
        } catch (err) {
          console.error(`Failed to process Wikidata entity ${result.id}:`, err);
          failed++;
        }
      }

      return {
        source: 'wikidata',
        processed,
        failed,
        total: data.search?.length || 0,
      };
    } catch (error) {
      console.error('Wikidata search failed:', error);
      throw error;
    }
  },
});

async function processWikidataEntity(entityId: string, ctx: any): Promise<void> {
  const url = new URL('https://www.wikidata.org/w/api.php');
  url.searchParams.set('action', 'wbgetentities');
  url.searchParams.set('ids', entityId);
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  url.searchParams.set('props', 'labels|descriptions|claims');
  url.searchParams.set('languages', 'en');

  const response = await fetch(url.toString());
  if (!response.ok) return;

  const data = await response.json();
  const entity = data.entities?.[entityId];
  if (!entity) return;

  const name = entity.labels?.en?.value;
  if (!name) return;

  const description = entity.descriptions?.en?.value || '';
  const inception = getClaimValue(entity, 'P571');
  const website = getUrlClaimValue(entity, 'P856');
  const industry = getClaimValue(entity, 'P452');
  const headquarters = getClaimValue(entity, 'P159') || getClaimValue(entity, 'P17');

  const startupData = {
    rawData: {
      name,
      description: description || `Company listed on Wikidata`,
      website: website || '',
      founders: [],
      fundingAmount: 'Undisclosed',
      roundType: 'Unknown',
      dateAnnounced: inception || new Date().toISOString().split('T')[0],
      location: headquarters || 'Unknown',
      tags: ['Wikidata', ...(industry ? [industry] : [])],
    },
    source: 'wikidata' as const,
    sourceUrl: `https://www.wikidata.org/wiki/${entityId}`,
  };

  await ctx.runMutation(internal.processors.startup.processStartup, startupData);
}

function getClaimValue(entity: any, propertyId: string): string | undefined {
  const claims = entity.claims?.[propertyId];
  if (!claims || claims.length === 0) return undefined;
  
  const value = claims[0]?.mainsnak?.datavalue?.value;
  if (!value) return undefined;
  
  if (typeof value === 'object') {
    return value.time?.replace(/^\+/, '') || value.text || value.value;
  }
  
  return String(value);
}

function getUrlClaimValue(entity: any, propertyId: string): string | undefined {
  const claims = entity.claims?.[propertyId];
  if (!claims || claims.length === 0) return undefined;
  
  const value = claims[0]?.mainsnak?.datavalue?.value;
  return typeof value === 'string' ? value : undefined;
}
