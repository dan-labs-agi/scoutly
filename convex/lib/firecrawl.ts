/**
 * Firecrawl API wrapper for intelligent web scraping
 * Handles dynamic JS sites, anti-bot, and structured data extraction
 */

interface FirecrawlOptions {
  formats?: ('markdown' | 'html')[];
  onlyMainContent?: boolean;
  waitFor?: number; // milliseconds
  timeout?: number;
}

interface ExtractionSchema {
  type: 'object';
  properties: Record<string, { type: string; description?: string }>;
  required?: string[];
}

export class FirecrawlClient {
  private apiKey: string;
  private baseUrl = 'https://api.firecrawl.dev/v1';

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('FIRECRAWL_API_KEY not set');
    this.apiKey = apiKey;
  }

  /**
   * Scrape a URL and return raw content (HTML/Markdown)
   */
  async scrapeUrl(url: string, options: FirecrawlOptions = {}) {
    const payload = {
      url,
      formats: options.formats || ['markdown'],
      onlyMainContent: options.onlyMainContent ?? true,
      waitFor: options.waitFor || 3000,
      timeout: options.timeout || 30000,
    };

    const response = await fetch(`${this.baseUrl}/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Firecrawl error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Extract structured data from a URL using LLM
   */
  async extractData(
    url: string,
    schema: ExtractionSchema,
    prompt?: string
  ) {
    const payload = {
      url,
      extractorOptions: {
        mode: 'llm-extraction',
        extractionSchema: schema,
        extractionPrompt: prompt || 'Extract startup funding information',
      },
    };

    const response = await fetch(`${this.baseUrl}/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Firecrawl extraction error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Batch scrape multiple URLs
   */
  async batchScrape(urls: string[]) {
    const results = await Promise.allSettled(
      urls.map(url => this.scrapeUrl(url))
    );

    return results.map((result, idx) => ({
      url: urls[idx],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null,
    }));
  }
}

export const STARTUP_EXTRACTION_SCHEMA: ExtractionSchema = {
  type: 'object',
  properties: {
    companyName: { type: 'string', description: 'Official company name' },
    description: { type: 'string', description: '1-2 sentence summary' },
    website: { type: 'string', description: 'Company website URL' },
    fundingAmount: { type: 'string', description: 'e.g., $5M, Series A' },
    roundType: { type: 'string', description: 'Pre-Seed, Seed, Series A, etc' },
    location: { type: 'string', description: 'City, Country' },
    founderNames: {
      type: 'array',
      description: 'Array of founder full names',
    },
    dateAnnounced: {
      type: 'string',
      description: 'YYYY-MM-DD format',
    },
  },
  required: ['companyName', 'website'],
};
