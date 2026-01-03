/**
 * Reddit Scraper
 * Free official API - very stable
 * Monitors r/startups, r/entrepreneurs, etc.
 */

import { action } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  url: string;
  author: string;
  created_utc: number;
  score: number;
  num_comments: number;
  subreddit: string;
}

interface RedditListing {
  data: {
    children: Array<{
      data: RedditPost;
    }>;
    after: string | null;
  };
}

const SUBREDDITS = [
  'startups',
  'entrepreneur',
  'sideproject',
  'ShitEntrepreneurSay',
  'smallbusiness',
];

export const fetchRedditStartups = action({
  args: {
    subreddit: v.optional(v.string()),
    daysBack: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysBack = args.daysBack || 7;
    const cutoffTime = Date.now() / 1000 - daysBack * 86400;
    const subreddits = args.subreddit ? [args.subreddit] : SUBREDDITS;
    
    let totalProcessed = 0;
    let totalFailed = 0;

    for (const sub of subreddits) {
      try {
        const result = await fetchSubreddit(sub, cutoffTime, args.limit || 50, ctx);
        totalProcessed += result.processed;
        totalFailed += result.failed;
      } catch (err) {
        console.error(`Failed to fetch r/${sub}:`, err);
        totalFailed++;
      }
    }

    return {
      source: 'reddit',
      processed: totalProcessed,
      failed: totalFailed,
      subreddits,
    };
  },
});

async function fetchSubreddit(
  subreddit: string,
  cutoffTime: number,
  limit: number,
  ctx: any
): Promise<{ processed: number; failed: number }> {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=${limit}&sort=new`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Scoutly-Bot/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`Reddit API error for r/${subreddit}: ${response.status}`);
      return { processed: 0, failed: 1 };
    }

    const data: RedditListing = await response.json();
    let processed = 0;
    let failed = 0;

    for (const postWrapper of data.data?.children || []) {
      const post = postWrapper.data;
      
      try {
        if (post.created_utc < cutoffTime) continue;

        const content = `${post.title} ${post.selftext}`.toLowerCase();
        const isStartupNews = detectStartupAnnouncement(content);
        
        if (!isStartupNews) continue;

        const startupData = {
          rawData: {
            name: extractCompanyName(post.title),
            description: stripText(post.selftext || post.title).substring(0, 300),
            website: extractWebsite(post.url, post.selftext) || '',
            founders: [post.author],
            fundingAmount: extractFundingAmount(post.title + ' ' + post.selftext),
            roundType: inferRoundType(post.title + ' ' + post.selftext),
            dateAnnounced: new Date(post.created_utc * 1000).toISOString().split('T')[0],
            location: extractLocation(post.selftext + ' ' + post.title),
            tags: ['Reddit', `r/${subreddit}`],
          },
          source: 'reddit' as const,
          sourceUrl: `https://reddit.com/r/${subreddit}/comments/${post.id}`,
        };

        await ctx.runMutation(internal.processors.startup.processStartup, startupData);
        processed++;
      } catch (err) {
        console.error(`Failed to process Reddit post ${post.id}:`, err);
        failed++;
      }
    }

    return { processed, failed };
  } catch (error) {
    console.error(`Reddit fetch error for r/${subreddit}:`, error);
    return { processed: 0, failed: 1 };
  }
}

function detectStartupAnnouncement(text: string): boolean {
  const keywords = [
    'launch', 'started', 'building', 'founded', 'started building',
    'just launched', 'announcing', 'we are', 'we just',
    'my startup', 'our startup', 'check out', 'feedback wanted',
    'show hn', 'github', 'built this', 'shipping',
  ];
  
  return keywords.some(kw => text.includes(kw));
}

function extractCompanyName(title: string): string {
  const patterns = [
    /(?:Introducing|Announcing|Launching|Check out|Feedback on)\s+([A-Z][a-zA-Z0-9&]+(?:\s+[A-Z][a-zA-Z0-9&]+)*)/,
    /([A-Z][a-zA-Z0-9&]+(?:\s+[A-Z][a-zA-Z0-9&]+)*)\s+(?:is|lets|helps|provides|offers)/,
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      const name = match[1].split(' ').slice(0, 4).join(' ');
      if (name.length > 2 && name.length < 50) return name;
    }
  }
  
  return title.split(' ').slice(0, 4).join(' ').substring(0, 50);
}

function stripText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\[?[a-z]+:\/\/[^\s\]]+\]?/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\*+/g, '')
    .replace(/#+/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractWebsite(url: string, text: string): string | undefined {
  if (url && !url.includes('reddit.com')) return url;
  
  const linkMatch = text.match(/\[?\]\((https?:\/\/[^\s\]]+)\)/);
  if (linkMatch) return linkMatch[1];
  
  const bareLinkMatch = text.match(/(https?:\/\/[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z0-9][-a-zA-Z0-9]*[^\s\]]*)/);
  if (bareLinkMatch) return bareLinkMatch[1];
  
  return undefined;
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
  
  if (lowerText.includes('seed') || lowerText.includes('pre-seed')) return 'Seed';
  if (lowerText.includes('series a')) return 'Series A';
  if (lowerText.includes('series b')) return 'Series B';
  if (lowerText.includes('series c')) return 'Series C';
  if (lowerText.includes('bootstrapped') || lowerText.includes('self-funded')) return 'Bootstrapped';
  if (lowerText.includes('pre-revenue') || lowerText.includes('no revenue')) return 'Pre-Revenue';
  
  return 'Pre-Seed';
}

function extractLocation(text: string): string | undefined {
  const cities = [
    'San Francisco', 'New York', 'Los Angeles', 'Boston', 'Seattle',
    'Austin', 'Denver', 'Chicago', 'Miami', 'London', 'Berlin',
    'Paris', 'Tel Aviv', 'Singapore', 'Tokyo', 'Toronto',
    'Remote', 'Worldwide',
  ];
  
  for (const city of cities) {
    if (text.includes(city)) return city;
  }
  
  return undefined;
}

export const fetchRedditSideProjects = action({
  args: { daysBack: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() / 1000 - (args.daysBack || 7) * 86400;
    return fetchSubreddit('sideproject', cutoffTime, 50, ctx);
  },
});

export const fetchRedditEntrepreneur = action({
  args: { daysBack: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() / 1000 - (args.daysBack || 7) * 86400;
    return fetchSubreddit('entrepreneur', cutoffTime, 50, ctx);
  },
});
