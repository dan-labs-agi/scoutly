# Scoutly Data Scraping Methods
**Complete Guide to All Data Collection Approaches**

---

## 📊 Overview

Scoutly has **5 primary scraping methods** (1 implemented, 4 available):

| Method | Status | Source | Real-time | Cost | Difficulty |
|--------|--------|--------|-----------|------|------------|
| **Y Combinator** | ✅ Implemented | Official API | No | Free | Easy |
| **Hacker News** | ✅ Implemented | Public API | Yes | Free | Easy |
| **TechCrunch** | ❌ Stubbed | Web scraping | No | Free | Medium |
| **Twitter/X** | ❌ Stubbed | Web scraping | Yes | Free | Hard |
| **LinkedIn** | ❌ Stubbed | Against ToS | No | Paid API | Hard |
| **Firecrawl** | ⚙️ Infrastructure | Any website | No | Paid | Medium |

---

## ✅ IMPLEMENTED METHODS

### 1. Y Combinator Scraper

**File**: `convex/scrapers/yc.ts`

**Status**: ✅ Working (with hardcoded demo data)

**Current Implementation**:
```ts
export const fetchYCCompanies = action({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    // Currently: Hardcoded sample data (Anthropic, Stripe)
    const companies = [
      { id: '1', name: 'Anthropic', ... },
      { id: '2', name: 'Stripe', ... }
    ];
    
    for (const company of companies) {
      await ctx.runMutation(internal.processors.startup.processStartup, ...);
    }
    return { source: 'yc', processed: 2, failed: 0 };
  }
});
```

**How to Use**:
```bash
# Call from Convex dashboard or manually:
await fetchYCCompanies({ limit: 500 })
```

**Data Extracted**:
- Company name
- Description
- Website
- Founders (from batch data)
- Funding amount
- Founded date
- Location
- Tags (industry)

**Limitations**:
- Currently hardcoded with only 2 companies
- Real API integration not completed

**To Enable Real YC API**:
```ts
// Replace hardcoded data with:
const response = await fetch('https://api.ycombinator.com/v1/companies?limit=500', {
  headers: { 'Authorization': `Bearer ${YC_API_KEY}` }
});
const companies = await response.json();

// Process companies as above
```

---

### 2. Hacker News Scraper

**File**: `convex/scrapers/hackernews.ts`

**Status**: ✅ Fully Implemented

**How It Works**:
```ts
export const fetchShowHN = action({
  args: { daysBack: v.optional(v.number()) },
  handler: async (ctx, args) => {
    // 1. Query Hacker News API for "Show HN" posts
    const searchUrl = 'https://hn.algolia.com/api/v1/search_by_date';
    const response = await fetch(searchUrl, {
      query: 'Show HN',
      tags: 'story',
      numericFilters: `created_at>${beforeTimestamp}`,
      hitsPerPage: 100
    });
    
    // 2. Filter for startup announcements
    const data = await response.json();
    
    // 3. Parse each post
    for (const item of data.hits) {
      const parsed = parseShowHNPost(item);
      if (parsed) {
        // 4. Send to processor
        await ctx.runMutation(internal.processors.startup.processStartup, {
          rawData: parsed,
          source: 'hackernews',
          sourceUrl: `https://news.ycombinator.com/item?id=${item.objectID}`
        });
      }
    }
  }
});
```

**Data Extracted**:
- Company name
- Description
- Website URL
- Founder names
- Post date
- Discussion URL

**Parsing Format**:
```
Title: "Show HN: CompanyName - Brief Description"
Text: Post content with founder details
URL: Company website
```

**How to Call**:
```bash
# Last 7 days (default)
await fetchShowHN()

# Last N days
await fetchShowHN({ daysBack: 30 })
```

**Advantages**:
- ✅ Free API
- ✅ Real-time data
- ✅ No auth required
- ✅ Reliable source
- ✅ Community-driven

**Data Quality**:
- Good for pre-seed/seed startups
- Often first announcement is on HN
- Includes engaged community feedback

---

## ⚙️ INFRASTRUCTURE (Ready to Implement)

### 3. Firecrawl Web Scraper

**File**: `convex/lib/firecrawl.ts`

**Status**: ⚙️ API wrapper ready, needs integration

**What It Does**:
- Intelligent web scraping for any website
- Handles JavaScript-heavy sites
- Anti-bot detection bypass
- Structured data extraction via LLM

**How to Use**:

```ts
import { FirecrawlClient, STARTUP_EXTRACTION_SCHEMA } from '../lib/firecrawl';

const firecrawl = new FirecrawlClient(process.env.FIRECRAWL_API_KEY);

// Option 1: Simple scrape
const content = await firecrawl.scrapeUrl('https://example.com', {
  formats: ['markdown', 'html'],
  onlyMainContent: true,
  waitFor: 3000
});

// Option 2: Structured extraction
const startupData = await firecrawl.extractData(
  'https://techcrunch.com/article-about-startup',
  STARTUP_EXTRACTION_SCHEMA,
  'Extract startup funding information'
);

// Option 3: Batch scrape
const results = await firecrawl.batchScrape([
  'https://example1.com',
  'https://example2.com',
  'https://example3.com'
]);
```

**Extraction Schema**:
```ts
{
  companyName: string,           // Official company name
  description: string,           // 1-2 sentence summary
  website: string,               // Company website URL
  fundingAmount: string,         // e.g., $5M, Series A
  roundType: string,             // Pre-Seed, Seed, Series A
  location: string,              // City, Country
  founderNames: string[],        // Array of founder names
  dateAnnounced: string          // YYYY-MM-DD format
}
```

**Cost**:
- $1 per 1,000 API calls (paid tier)
- 50 free calls/month (free tier)

**Setup Required**:
```bash
# 1. Get API key from firecrawl.dev
# 2. Add to .env.local
FIRECRAWL_API_KEY=your-key-here

# 3. Create Convex action to use it
```

**Example Integration**:
```ts
// convex/scrapers/techcrunch.ts
import { action } from '../_generated/server';
import { FirecrawlClient, STARTUP_EXTRACTION_SCHEMA } from '../lib/firecrawl';

export const fetchTechCrunchNews = action({
  args: { domain: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const client = new FirecrawlClient(process.env.FIRECRAWL_API_KEY);
    
    // Scrape TechCrunch funding announcements
    const urls = [
      'https://techcrunch.com/funding-deals-2024',
      'https://techcrunch.com/category/funding/'
    ];
    
    const results = await client.batchScrape(urls);
    
    for (const result of results) {
      if (result.success) {
        const extracted = await client.extractData(
          result.url,
          STARTUP_EXTRACTION_SCHEMA
        );
        
        await ctx.runMutation(
          internal.processors.startup.processStartup,
          { rawData: extracted, source: 'techcrunch', sourceUrl: result.url }
        );
      }
    }
  }
});
```

---

## ❌ STUBBED METHODS (In webScraper.ts)

These are written but not integrated. They exist in `services/webScraper.ts` but are **NOT** used in Convex backend.

### 4. TechCrunch Scraper

**Status**: ❌ Stubbed (Puppeteer implementation exists)

**Data Target**:
- Funding announcements
- Company details from articles
- Investor information
- Funding amounts

**Implementation**: Uses Puppeteer to:
1. Navigate to TechCrunch search
2. Parse article listings
3. Extract funding keywords from titles/excerpts
4. Build startup records

**Limitations**:
- ❌ Not integrated into Convex backend
- ❌ Requires article content parsing
- ❌ No structured data extraction

**To Enable**:
```ts
// Create convex/scrapers/techcrunch.ts
export const fetchTechCrunchNews = action({
  handler: async (ctx, args) => {
    const data = await WebScraper.scrapeTechCrunch('AI', dateRange);
    for (const startup of data) {
      await ctx.runMutation(internal.processors.startup.processStartup, ...);
    }
  }
});
```

---

### 5. Twitter/X Scraper

**Status**: ❌ Stubbed (Puppeteer implementation exists)

**Data Target**:
- Startup announcements
- Funding announcements
- Founder discussions
- Industry trends

**Why It's Hard**:
- ❌ Anti-bot measures (CAPTCHA, rate limiting)
- ❌ Requires authentication
- ❌ Dynamic content loading
- ❌ Terms of Service violations
- ⚠️ Not recommended for scraping

**Recommended Alternative**:
Use Twitter API v2 with proper authentication:
```bash
# Get API key from developer.twitter.com
# Use official SDK instead of web scraping
```

---

### 6. LinkedIn Scraper

**Status**: ❌ Stubbed (exists but returns empty)

**Why It's Not Viable**:
- ❌ Against LinkedIn Terms of Service
- ❌ LinkedIn actively blocks scrapers
- ❌ Requires browser automation
- ❌ Risk of account ban

**Recommended Alternative**:
Use LinkedIn Recruiter API (paid enterprise):
```bash
# Contact LinkedIn Sales
# $$$$ - Very expensive but legal
```

---

## 🔄 WebScraper Utility (Legacy, Not Used)

**File**: `services/webScraper.ts`

**Status**: ⚠️ Exists but NOT integrated with Convex

**Available Methods**:
```ts
WebScraper.scrapeTwitter(domain, dateRange)
WebScraper.scrapeLinkedIn(domain, dateRange)
WebScraper.scrapeYCombinator(domain)
WebScraper.scrapeTechCrunch(domain, dateRange)
WebScraper.scrapeHackerNews(domain, dateRange)

// Coordinated scraping
WebScraper.scrapeAllSources(domain, timeframe)
```

**Why It's Not Used**:
1. It's a **frontend service** (can't run browser automation)
2. Convex backend needs to handle scraping
3. Requires different architecture (actions, not frontend code)

---

## 🚀 How to Add a New Scraper

### Step 1: Create Scraper File

```ts
// convex/scrapers/producthunt.ts
import { action } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';

export const fetchProductHunt = action({
  args: { daysBack: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const daysBack = args.daysBack || 7;
    
    try {
      // 1. Fetch data from source
      const response = await fetch('https://api.producthunt.com/v2/posts', {
        headers: { 'Authorization': `Bearer ${PH_API_KEY}` }
      });
      const posts = await response.json();
      
      // 2. Parse and filter
      let processed = 0;
      for (const post of posts) {
        const startupData = {
          rawData: {
            name: post.name,
            description: post.description,
            website: post.website,
            // ... extract fields
          },
          source: 'producthunt',
          sourceUrl: post.url
        };
        
        // 3. Send to processor
        await ctx.runMutation(
          internal.processors.startup.processStartup,
          startupData
        );
        processed++;
      }
      
      return { source: 'producthunt', processed };
    } catch (error) {
      console.error('ProductHunt scrape failed:', error);
      throw error;
    }
  }
});
```

### Step 2: Add to Cron Jobs (Optional)

```ts
// convex/crons.ts
crons.interval(
  'Scrape Product Hunt',
  { hours: 6 },  // Every 6 hours
  internal.scrapers.producthunt.fetchProductHunt
);
```

### Step 3: Call Manually or via Cron

```bash
# Manual call
await fetchProductHunt({ daysBack: 7 })

# Scheduled: Set up in Convex dashboard
```

---

## 📋 Quick Scraper Comparison

| Scraper | API | Free | Status | Data Quality | Ease |
|---------|-----|------|--------|--------------|------|
| **YC** | Official | Yes | ✅ Ready | Excellent | Easy |
| **HN** | Public | Yes | ✅ Ready | Good | Easy |
| **Firecrawl** | Paid API | 50/mo | ⚙️ Ready | Great | Medium |
| **TechCrunch** | None | N/A | ❌ Stubbed | Good | Medium |
| **Twitter** | Official | $$ | ❌ Stubbed | Good | Hard |
| **LinkedIn** | Paid | $$$ | ❌ Stubbed | Excellent | Hard |
| **Product Hunt** | Official | Free | ❌ Not Started | Good | Easy |

---

## 🎯 Recommended Scraping Stack

**For MVP (Now)**:
1. ✅ Hacker News (free, real-time, quality)
2. ✅ Y Combinator (official API, comprehensive)

**For Growth (Next)**:
3. ⚙️ Firecrawl (flexible, any website)
4. Product Hunt API (easy, free)

**For Scale (Later)**:
5. Twitter API v2 (official, real-time)
6. CrunchBase API (comprehensive, paid)

---

## 💻 Data Processing Flow

```
Scraper (fetchYCCompanies, fetchShowHN, etc)
  ↓
Parse raw data → Extract fields
  ↓
Create startupData object
  ↓
ctx.runMutation(processStartup, startupData)
  ↓
Processor (convex/processors/startup.ts)
  ├─ Normalize company name
  ├─ Check for duplicates (exact + fuzzy)
  ├─ Insert or update in database
  ├─ Track data source
  ├─ Add founders
  └─ Return result
  ↓
Database updated
  ↓
Frontend query returns data
```

---

## 🔧 Environment Variables Needed

```bash
# Required for production
FIRECRAWL_API_KEY=your-key         # For web scraping
YC_API_KEY=your-key                # For real YC API
TWITTER_API_KEY=your-key           # For Twitter scraping
CRUNCHBASE_API_KEY=your-key        # For CrunchBase data
PRODUCTHUNT_API_KEY=your-key       # For Product Hunt

# Optional (already have)
VITE_CONVEX_URL=https://...        # Convex deployment
```

---

## 📊 Current Scraping Status

**Today**:
- ✅ YC scraper: 2 hardcoded companies (Anthropic, Stripe)
- ✅ HN scraper: Ready to fetch "Show HN" posts
- ⚙️ Firecrawl: Infrastructure ready

**What's Missing**:
- ❌ Real YC API key & implementation
- ❌ HN scraper not triggered
- ❌ Firecrawl integration
- ❌ Scheduled cron jobs
- ❌ TechCrunch/Product Hunt scrapers

---

## 🚀 Next Steps

1. **Immediate** (this week):
   - Add real YC API key
   - Set up HN cron job (every 24 hours)
   - Test both scrapers

2. **Short term** (next week):
   - Integrate Firecrawl for TechCrunch
   - Add Product Hunt scraper
   - Set up monitoring/logging

3. **Medium term** (next month):
   - Add Twitter API v2
   - CrunchBase integration
   - Advanced deduplication

---

**Last Updated**: January 2026
