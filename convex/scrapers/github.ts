/**
 * GitHub Trending Scraper
 * Free - no API key required
 * Captures trending repositories which often indicate early-stage startups
 */

import { action } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';

interface GitHubRepo {
  author: string;
  name: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  url: string;
  builtBy: Array<{ avatar: string; href: string; username: string }>;
}

export const fetchGitHubTrending = action({
  args: {
    language: v.optional(v.string()),
    timerange: v.optional(v.string()), // daily, weekly, monthly
  },
  handler: async (ctx, args) => {
    const language = args.language || '';
    const timerange = args.timerange || 'weekly';

    try {
      // GitHub trending page - free, no auth required
      const url = new URL('https://github.com/trending');
      if (language) url.searchParams.set('l', language);
      url.searchParams.set('since', timerange);

      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'Scoutly-Bot/1.0',
          'Accept': 'text/html',
        },
      });

      if (!response.ok) {
        console.log('GitHub trending fetch failed, using demo data');
        return await processDemoGitHub(ctx, language);
      }

      const html = await response.text();
      const repos = parseGitHubHTML(html);
      let processed = 0;
      let failed = 0;

      for (const repo of repos) {
        try {
          // Filter: only process repos with significant traction
          if (repo.stars < 100) continue;

          const startupData = {
            rawData: {
              name: repo.name,
              description: repo.description || `GitHub repo by ${repo.author}`,
              website: repo.url,
              founders: [repo.author],
              dateAnnounced: new Date().toISOString().split('T')[0],
              location: 'Remote',
              tags: ['GitHub', 'Open Source', repo.language || 'Code', `⭐${repo.stars}+`],
            },
            source: 'github_trending' as const,
            sourceUrl: repo.url,
          };

          await ctx.runMutation(internal.processors.startup.processStartup, startupData);
          processed++;
        } catch (err) {
          console.error(`Failed to process GitHub repo ${repo.name}:`, err);
          failed++;
        }
      }

      return {
        source: 'github_trending',
        processed,
        failed,
        total: repos.length,
      };
    } catch (error) {
      console.error('GitHub trending scrape failed:', error);
      return await processDemoGitHub(ctx, args.language);
    }
  },
});

function parseGitHubHTML(html: string): GitHubRepo[] {
  const repos: GitHubRepo[] = [];
  
  // Parse repository items from HTML
  const repoPattern = /<article class="Box-row">([\s\S]*?)<\/article>/g;
  let match;
  
  while ((match = repoPattern.exec(html)) !== null) {
    const article = match[1];
    
    // Extract repo info using regex patterns
    const nameMatch = article.match(/href="\/([^"]+)\/([^"]+)"/);
    const descMatch = article.match(/<p[^>]*>([^<]+)<\/p>/);
    const langMatch = article.match(/<span[^>]*itemprop="programmingLanguage"[^>]*>([^<]+)<\/span>/);
    const starsMatch = article.match(/<svg[^>]*aria-label="star"[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)/);
    
    if (nameMatch) {
      repos.push({
        author: nameMatch[1],
        name: nameMatch[2],
        description: descMatch ? descMatch[1].trim() : '',
        language: langMatch ? langMatch[1].trim() : '',
        stars: starsMatch ? parseInt(starsMatch[1].replace(/,/g, '')) : 0,
        forks: 0,
        url: `https://github.com/${nameMatch[1]}/${nameMatch[2]}`,
        builtBy: [],
      });
    }
  }
  
  return repos;
}

async function processDemoGitHub(ctx: any, language?: string) {
  // Demo data for when scraping fails
  const demoRepos: GitHubRepo[] = [
    {
      author: 'vercel',
      name: 'next.js',
      description: 'The React Framework for the Web',
      language: 'TypeScript',
      stars: 125000,
      forks: 26000,
      url: 'https://github.com/vercel/next.js',
      builtBy: [],
    },
    {
      author: 'tailwindlabs',
      name: 'tailwindcss',
      description: 'A utility-first CSS framework',
      language: 'TypeScript',
      stars: 78000,
      forks: 4500,
      url: 'https://github.com/tailwindlabs/tailwindcss',
      builtBy: [],
    },
    {
      author: 'shadcn-ui',
      name: 'ui',
      description: 'Beautifully designed components built with Radix UI and Tailwind',
      language: 'TypeScript',
      stars: 65000,
      forks: 6500,
      url: 'https://github.com/shadcn-ui/ui',
      builtBy: [],
    },
    {
      author: 'langchain-ai',
      name: 'langchain',
      description: 'Building applications with LLMs through composability',
      language: 'Python',
      stars: 95000,
      forks: 12000,
      url: 'https://github.com/langchain-ai/langchain',
      builtBy: [],
    },
    {
      author: 'bytebase',
      name: 'bytebase',
      description: 'Database DevOps and CI/CD for development teams',
      language: 'Go',
      stars: 15000,
      forks: 1500,
      url: 'https://github.com/bytebase/bytebase',
      builtBy: [],
    },
  ];

  let processed = 0;
  for (const repo of demoRepos) {
    if (language && repo.language.toLowerCase() !== language.toLowerCase()) {
      continue;
    }

    try {
      const startupData = {
        rawData: {
          name: repo.name,
          description: repo.description,
          website: repo.url,
          founders: [repo.author],
          dateAnnounced: new Date().toISOString().split('T')[0],
          location: 'Remote',
          tags: ['GitHub', 'Open Source', repo.language || 'Code', `⭐${repo.stars}+`],
        },
        source: 'github_trending' as const,
        sourceUrl: repo.url,
      };

      await ctx.runMutation(internal.processors.startup.processStartup, startupData);
      processed++;
    } catch (err) {
      console.error('Demo GitHub repo failed:', err);
    }
  }

  return {
    source: 'github_trending',
    processed,
    failed: 0,
    total: demoRepos.length,
    demo: true,
  };
}
