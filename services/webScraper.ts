import { Startup } from "../types";
import { getRelativeDateRange } from "../utils/dateUtils";
import puppeteer from 'puppeteer';

// Puppeteer-based web scraper for startup data
export class WebScraper {
  private static async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Scrape Twitter/X for startup signals
  static async scrapeTwitter(domain: string, dateRange: { start: string; end: string }): Promise<Startup[]> {
    console.log(`Scraping Twitter for domain: ${domain}, date range: ${dateRange.start} to ${dateRange.end}`);

    try {
      // Note: Twitter scraping is complex due to anti-bot measures
      // This is a simplified implementation - in practice, you'd need to handle:
      // - Authentication
      // - Rate limiting
      // - Dynamic content loading
      // - CAPTCHA challenges

      // For demo purposes, returning mock data based on search criteria
      // In a real implementation, we would use Puppeteer to scrape actual Twitter content
      const startups: Startup[] = [];

      // This is where actual scraping would occur
      // const browser = await puppeteer.launch({ headless: true });
      // const page = await browser.newPage();
      // await page.goto(`https://twitter.com/search?q=${encodeURIComponent(domain)}%20%22just%20raised%22%20since%3A${dateRange.start}%20until%3A${dateRange.end}&src=typed_query`);
      // ... scraping logic

      return startups;
    } catch (error) {
      console.error(`Error scraping Twitter: ${error}`);
      return [];
    }
  }

  // Scrape LinkedIn for job postings
  static async scrapeLinkedIn(domain: string, dateRange: { start: string; end: string }): Promise<Startup[]> {
    console.log(`Scraping LinkedIn for domain: ${domain}, date range: ${dateRange.start} to ${dateRange.end}`);

    try {
      // LinkedIn scraping is against their Terms of Service
      // Using their official APIs would be the proper approach
      // For now, returning empty array
      return [];
    } catch (error) {
      console.error(`Error scraping LinkedIn: ${error}`);
      return [];
    }
  }

  // Scrape Y Combinator companies
  static async scrapeYCombinator(domain: string): Promise<Startup[]> {
    console.log(`Scraping Y Combinator for domain: ${domain}`);

    try {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      // Navigate to YC companies page
      await page.goto('https://www.ycombinator.com/companies', { waitUntil: 'networkidle2' });

      // Wait for content to load
      await page.waitForSelector('.company-name-link', { timeout: 10000 });

      // Extract company data
      const companies = await page.evaluate((domain) => {
        const elements = document.querySelectorAll('.ycds-company-card');
        const results: Startup[] = [];

        elements.forEach(el => {
          const nameEl = el.querySelector('.company-name-link');
          const name = nameEl ? nameEl.textContent?.trim() : '';
          const description = el.querySelector('.company-description')?.textContent?.trim() || '';
          const website = el.querySelector('a[aria-label="Website"]')?.getAttribute('href') || '';

          // Filter by domain if specified
          if (!domain || (name && name.toLowerCase().includes(domain.toLowerCase())) ||
              (description && description.toLowerCase().includes(domain.toLowerCase()))) {
            results.push({
              id: `yc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: name || 'Unknown Startup',
              fundingAmount: 'Undisclosed',
              roundType: 'Pre-Seed',
              dateAnnounced: new Date().toISOString().split('T')[0],
              description: description || 'YC startup in the application process',
              founders: [],
              investors: ['Y Combinator'],
              website: website,
              location: 'Remote',
              contactEmail: '',
              socialLinks: {},
              sources: ['https://www.ycombinator.com/companies'],
              tags: [domain || 'tech', 'YC']
            });
          }
        });

        return results;
      }, domain);

      await browser.close();
      return companies.slice(0, 10); // Limit to 10 results
    } catch (error) {
      console.error(`Error scraping Y Combinator: ${error}`);
      return [];
    }
  }

  // Scrape TechCrunch for funding announcements
  static async scrapeTechCrunch(domain: string, dateRange: { start: string; end: string }): Promise<Startup[]> {
    console.log(`Scraping TechCrunch for domain: ${domain}, date range: ${dateRange.start} to ${dateRange.end}`);

    try {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      // Navigate to TechCrunch and search for funding announcements
      const searchUrl = `https://techcrunch.com/search/${encodeURIComponent(domain)}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });

      // Wait for search results to load
      await page.waitForSelector('article.wp-block-post', { timeout: 10000 });

      // Extract article data
      const articles = await page.evaluate((domain, startDate, endDate) => {
        const articles = document.querySelectorAll('article.wp-block-post');
        const results: Startup[] = [];

        articles.forEach(article => {
          const titleEl = article.querySelector('h2 a');
          const title = titleEl ? titleEl.textContent?.trim() : '';
          const link = titleEl ? titleEl.getAttribute('href') : '';
          const dateEl = article.querySelector('time');
          const date = dateEl ? dateEl.getAttribute('datetime')?.split('T')[0] : '';
          const excerpt = article.querySelector('.post-excerpt')?.textContent?.trim() || '';

          // Check if date is within our range and if it's a funding announcement
          const articleDate = new Date(date || '');
          const start = new Date(startDate);
          const end = new Date(endDate);

          if (title && link && date &&
              articleDate >= start && articleDate <= end &&
              (title.toLowerCase().includes('funding') ||
               title.toLowerCase().includes('raises') ||
               title.toLowerCase().includes('funds') ||
               excerpt.toLowerCase().includes('funding') ||
               excerpt.toLowerCase().includes('raises'))) {

            results.push({
              id: `tc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: title.replace(/funding|raises|funds/i, '').trim(),
              fundingAmount: 'Undisclosed', // Would extract from content in real implementation
              roundType: 'Series Unknown',
              dateAnnounced: date,
              description: excerpt || title,
              founders: [],
              investors: [],
              website: '',
              location: 'Unknown',
              contactEmail: '',
              socialLinks: {},
              sources: [link],
              tags: [domain, 'TechCrunch']
            });
          }
        });

        return results;
      }, domain, dateRange.start, dateRange.end);

      await browser.close();
      return articles.slice(0, 10); // Limit to 10 results
    } catch (error) {
      console.error(`Error scraping TechCrunch: ${error}`);
      return [];
    }
  }

  // Scrape Hacker News
  static async scrapeHackerNews(domain: string, dateRange: { start: string; end: string }): Promise<Startup[]> {
    console.log(`Scraping Hacker News for domain: ${domain}, date range: ${dateRange.start} to ${dateRange.end}`);

    try {
      // Use Hacker News API instead of scraping HTML
      // Get top stories
      const response = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json?limitToFirst=100&print=pretty');
      const storyIds = await response.json();

      // Get story details
      const storyPromises = storyIds.slice(0, 20).map(async (id: number) => {
        const storyResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json?print=pretty`);
        return storyResponse.json();
      });

      const stories = await Promise.all(storyPromises);

      // Filter stories by domain and date range
      const filteredStories = stories.filter((story: any) => {
        if (!story || !story.title) return false;

        const storyDate = new Date(story.time * 1000); // Convert Unix timestamp
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);

        return (
          storyDate >= start &&
          storyDate <= end &&
          (story.title.toLowerCase().includes(domain.toLowerCase()) ||
           (story.text && story.text.toLowerCase().includes(domain.toLowerCase()))) &&
          (story.title.toLowerCase().includes('show hn') ||
           story.title.toLowerCase().includes('launch') ||
           story.title.toLowerCase().includes('startup'))
        );
      });

      // Convert to Startup format
      const startups: Startup[] = filteredStories.map((story: any) => ({
        id: `hn-${story.id}`,
        name: story.title.replace(/Show HN: |Launch HN: /i, ''),
        fundingAmount: 'N/A',
        roundType: 'Pre-funding',
        dateAnnounced: new Date(story.time * 1000).toISOString().split('T')[0],
        description: story.text ? story.text.substring(0, 100) + '...' : story.title,
        founders: [],
        investors: [],
        website: story.url || '',
        location: 'N/A',
        contactEmail: '',
        socialLinks: {
          twitter: `https://news.ycombinator.com/item?id=${story.id}`
        },
        sources: [`https://news.ycombinator.com/item?id=${story.id}`],
        tags: [domain, 'Hacker News']
      }));

      return startups;
    } catch (error) {
      console.error(`Error scraping Hacker News: ${error}`);
      return [];
    }
  }

  // Main method to coordinate scraping across all sources
  static async scrapeAllSources(
    domain: string,
    timeframe: 'today' | 'yesterday' | '2_days' | 'week' | 'month' | 'quarter',
    excludeNames: string[] = []
  ): Promise<Startup[]> {
    const dateRange = getRelativeDateRange(timeframe);

    // Scrape all sources in parallel
    const [twitterData, linkedInData, ycData, techCrunchData, hackerNewsData] = await Promise.all([
      this.scrapeTwitter(domain, dateRange),
      this.scrapeLinkedIn(domain, dateRange),
      this.scrapeYCombinator(domain),
      this.scrapeTechCrunch(domain, dateRange),
      this.scrapeHackerNews(domain, dateRange)
    ]);

    // Combine all results
    let allStartups = [
      ...twitterData,
      ...linkedInData,
      ...ycData,
      ...techCrunchData,
      ...hackerNewsData
    ];

    // Remove duplicates based on name
    const uniqueStartups = allStartups.filter((startup, index, self) =>
      index === self.findIndex(s => s.name.toLowerCase() === startup.name.toLowerCase())
    );

    // Remove excluded names
    const filteredStartups = uniqueStartups.filter(startup =>
      !excludeNames.some(exclude =>
        startup.name.toLowerCase().includes(exclude.toLowerCase())
      )
    );

    return filteredStartups;
  }
}