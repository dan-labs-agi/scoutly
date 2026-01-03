/**
 * RSS Feed Scraper for Tech News
 * Extremely stable - uses standard RSS/Atom feeds
 * No API keys required
 */

import { action } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  creator?: string;
  guid: string;
  categories: string[];
}

interface TechCrunchRSS {
  channel: {
    item: RSSItem[];
  };
}

const RSS_FEEDS = [
  {
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    tags: ['TechCrunch', 'Startups', 'Funding'],
    patterns: ['raised', 'funding', 'series', 'seed', 'launch', 'announce'],
  },
  {
    name: 'VentureBeat',
    url: 'https://venturebeat.com/feed/',
    tags: ['VentureBeat', 'AI', 'Startups'],
    patterns: ['funding', 'raise', 'series', 'seed'],
  },
  {
    name: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
    tags: ['The Verge', 'Tech', 'Startups'],
    patterns: ['launch', 'announce', 'new'],
  },
];

export const fetchRSSFeeds = action({
  args: { daysBack: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const daysBack = args.daysBack || 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    
    let totalProcessed = 0;
    let totalFailed = 0;

    for (const feed of RSS_FEEDS) {
      try {
        const result = await fetchFeedItems(feed, cutoffDate, ctx);
        totalProcessed += result.processed;
        totalFailed += result.failed;
      } catch (err) {
        console.error(`Failed to fetch ${feed.name} RSS:`, err);
        totalFailed++;
      }
    }

    return {
      source: 'rss_feeds',
      processed: totalProcessed,
      failed: totalFailed,
      feeds: RSS_FEEDS.map(f => f.name),
    };
  },
});

async function fetchFeedItems(
  feed: typeof RSS_FEEDS[0],
  cutoffDate: Date,
  ctx: any
): Promise<{ processed: number; failed: number }> {
  try {
    const response = await fetch(feed.url, {
      headers: {
        'User-Agent': 'Scoutly-Bot/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });

    if (!response.ok) {
      console.log(`${feed.name} RSS fetch failed, status: ${response.status}`);
      return { processed: 0, failed: 1 };
    }

    const xml = await response.text();
    const items = parseRSS(xml);
    
    let processed = 0;
    let failed = 0;

    for (const item of items) {
      try {
        const pubDate = new Date(item.pubDate);
        if (pubDate < cutoffDate) continue;

        const content = `${item.title} ${item.description}`.toLowerCase();
        const isStartupNews = feed.patterns.some(p => content.includes(p));
        
        if (!isStartupNews && !item.categories.some(c => 
          ['startup', 'funding', 'venture', 'tech', 'ai', 'saas'].includes(c.toLowerCase())
        )) {
          continue;
        }

        const startupData = {
          rawData: {
            name: extractCompanyName(item.title),
            description: stripHtml(item.description || item.title).substring(0, 300),
            website: item.link,
            founders: item.creator ? [item.creator] : [],
            fundingAmount: extractFundingAmount(item.title + ' ' + item.description),
            roundType: inferRoundType(item.title + ' ' + item.description),
            dateAnnounced: pubDate.toISOString().split('T')[0],
            location: extractLocation(item.description) || 'United States',
            tags: [...feed.tags, ...item.categories.slice(0, 3)],
          },
          source: 'rss' as const,
          sourceUrl: item.link,
        };

        await ctx.runMutation(internal.processors.startup.processStartup, startupData);
        processed++;
      } catch (err) {
        console.error(`Failed to process RSS item:`, err);
        failed++;
      }
    }

    return { processed, failed };
  } catch (error) {
    console.error(`RSS fetch error for ${feed.name}:`, error);
    return { processed: 0, failed: 1 };
  }
}

function parseRSS(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    
    const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
    const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
    const descMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/);
    const dateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
    const creatorMatch = itemXml.match(/<dc:creator><!\[CDATA\[(.*?)\]\]><\/dc:creator>|<author>(.*?)<\/author>/);
    const guidMatch = itemXml.match(/<guid[^>]*>(.*?)<\/guid>/);
    
    const categories: string[] = [];
    const catRegex = /<category><!\[CDATA\[(.*?)\]\]><\/category>|<category>(.*?)<\/category>/g;
    let catMatch;
    while ((catMatch = catRegex.exec(itemXml)) !== null) {
      categories.push(catMatch[1] || catMatch[2]);
    }

    if (titleMatch && linkMatch) {
      items.push({
        title: (titleMatch[1] || titleMatch[2] || '').trim(),
        link: linkMatch[1].trim(),
        description: (descMatch ? (descMatch[1] || descMatch[2] || '') : '').trim(),
        pubDate: dateMatch ? dateMatch[1].trim() : new Date().toISOString(),
        creator: creatorMatch ? (creatorMatch[1] || creatorMatch[2] || '').trim() : undefined,
        guid: guidMatch ? guidMatch[1].trim() : linkMatch[1].trim(),
        categories,
      });
    }
  }
  
  return items;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

function extractCompanyName(title: string): string {
  const patterns = [
    /(?:announces|raises|launches|unveils|introduces)\s+([A-Z][a-zA-Z0-9&]+(?:\s+[A-Z][a-zA-Z0-9&]+)*)/,
    /([A-Z][a-zA-Z0-9&]+(?:\s+[A-Z][a-zA-Z0-9&]+)*)\s+(?:raises|launches|announces|unveils)/,
    /(?:new|startup|company)\s+([A-Z][a-zA-Z0-9&]+(?:\s+[A-Z][a-zA-Z0-9&]+)*)/i,
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      const name = match[1].split(' ').slice(0, 4).join(' ');
      if (name.length > 2 && name.length < 50) return name;
    }
  }
  
  return title.split(' - ')[0].split('|')[0].trim().substring(0, 50);
}

function extractFundingAmount(text: string): string {
  const patterns = [
    /\$([\d.]+)\s*(million|billion|M|B)/i,
    /\$([\d,]+)/,
    /([\d.]+)\s*(million|billion)\s*dollars/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseFloat(match[1].replace(/,/g, ''));
      const unit = match[2]?.toLowerCase();
      
      if (unit?.startsWith('b') || num >= 1000) {
        return `$${(num / 1000).toFixed(0)}M`;
      }
      if (unit?.startsWith('m')) {
        return `$${num}M`;
      }
      return `$${num.toLocaleString()}`;
    }
  }
  
  return 'Undisclosed';
}

function inferRoundType(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('seed') || lowerText.includes('pre-seed') || lowerText.includes('pre seed')) {
    return 'Seed';
  }
  if (lowerText.includes('series a')) return 'Series A';
  if (lowerText.includes('series b')) return 'Series B';
  if (lowerText.includes('series c')) return 'Series C';
  if (lowerText.includes('series d')) return 'Series D';
  if (lowerText.includes('series e')) return 'Series E';
  if (lowerText.includes('ipo') || lowerText.includes('public')) return 'IPO';
  if (lowerText.includes('acqui') || lowerText.includes('acquisition')) return 'Acquisition';
  if (lowerText.includes('grant')) return 'Grant';
  
  return 'Seed';
}

function extractLocation(description: string): string | undefined {
  const cities = [
    'San Francisco', 'New York', 'Los Angeles', 'Boston', 'Seattle',
    'Austin', 'Denver', 'Chicago', 'Miami', 'London', 'Berlin',
    'Paris', 'Tel Aviv', 'Singapore', 'Tokyo', 'Toronto',
  ];
  
  for (const city of cities) {
    if (description.includes(city)) return city;
  }
  
  const statePattern = /(?:based in|headquartered in|located in)\s+([A-Z][a-zA-Z\s]+?)(?:,|\.)/i;
  const match = description.match(statePattern);
  if (match) return match[1].trim();
  
  return undefined;
}

export const fetchTechCrunch = action({
  args: { daysBack: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (args.daysBack || 7));
    return fetchFeedItems(RSS_FEEDS[0], cutoffDate, ctx);
  },
});

export const fetchVentureBeat = action({
  args: { daysBack: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (args.daysBack || 7));
    return fetchFeedItems(RSS_FEEDS[1], cutoffDate, ctx);
  },
});
