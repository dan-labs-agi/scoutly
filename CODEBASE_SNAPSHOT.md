# Scoutly Codebase Snapshot
**Status**: Post-Refactor v1.0 | **Last Updated**: Jan 2026

---

## 📊 Project Overview

**Scoutly** is an AI-driven OSINT agent for discovering pre-seed & seed-stage startups and their founders.

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Convex (serverless database + backend functions)
- **Database**: Convex/PostgreSQL (7 tables)
- **UI Framework**: Tailwind CSS + Lucide Icons
- **Animations**: GSAP
- **Data Viz**: Recharts
- **Scraping**: Puppeteer, Firecrawl API

### Key Metrics
- **Total Files**: ~30 production files + 8 docs
- **Lines of Code**: ~4,000+ TypeScript
- **Convex Tables**: 7 (startups, founders, fundingRounds, dataSources, scrapeJobs, urlCache, enrichmentData)

---

## 📁 Directory Structure

```
scoutly/
├── components/              # React UI components
│   ├── DashboardRefactored.tsx   (530 lines) - Main data table & filters
│   ├── StartupCard.tsx           (74 lines)  - Card component (legacy)
│   ├── StartupModal.tsx          (149 lines) - Detail view modal
│   ├── LandingPage.tsx           (301 lines) - Hero search interface
├── convex/                  # Backend functions & database
│   ├── schema.ts                 (108 lines) - 7-table database schema
│   ├── queries/
│   │   └── startups.ts           (244 lines) - All frontend queries
│   ├── processors/
│   │   └── startup.ts            (269 lines) - Data processing pipeline
│   ├── scrapers/
│   │   ├── yc.ts                 (110 lines) - Y Combinator scraper
│   │   └── hackernews.ts         (?)
│   ├── lib/
│   │   └── firecrawl.ts          (?)
│   ├── crons.ts                  (?) - Scheduled scraper jobs
│   └── _generated/               # Auto-generated Convex API types
├── services/                # Frontend service layer
│   ├── convexService.ts          (71 lines) - Convex hooks wrapper
│   └── webScraper.ts             (?)
├── utils/
│   └── dateUtils.ts              (?)
├── types.ts                 (39 lines) - TypeScript interfaces
├── App.tsx                  (22 lines) - Root component
├── index.tsx                (20 lines) - React entry + ConvexProvider
├── vite.config.ts           - Build config
├── tsconfig.json            - TypeScript config
├── package.json             - Dependencies (Convex, React, GSAP, etc)
├── index.html               - HTML shell
└── [Documentation]
    ├── CODEBASE_INDEX.md
    ├── IMPLEMENTATION_INDEX.md
    ├── CONVEX_REFACTOR_README.md
    ├── FILE_DEPENDENCIES.md
    ├── MIGRATION_GUIDE.md
    └── README.md
```

---

## 🗄️ Database Schema

### Tables (7 total)

#### 1. **startups** (core entity)
```ts
{
  name: string
  canonicalName: string          // Normalized for dedup
  description: string
  website?: string
  location?: string
  fundingAmount?: string
  roundType?: string
  dateAnnounced?: string
  logo?: string
  tags: string[]
  confidenceScore: number        // 0-1 (increases with sources)
  sourceCount: number            // How many sources reported this
  createdAt: number (timestamp)
  updatedAt: number
  lastEnrichedAt?: number
  
  // Indexes:
  by_created(createdAt)
  by_name(canonicalName)
  by_date(dateAnnounced)
  search_startups(name) with filter on tags, dateAnnounced
}
```

#### 2. **founders**
```ts
{
  startupId: id('startups')      // FK
  name: string
  email?: string
  emailVerified?: boolean
  twitter?: string
  linkedin?: string
  phone?: string
  role?: string                  // CEO, Co-founder, etc
  
  // Indexes:
  by_startup(startupId)
  by_email(email)
}
```

#### 3. **fundingRounds**
```ts
{
  startupId: id('startups')      // FK
  roundType: string              // Series A, Seed, Pre-seed
  fundingAmount: string
  investors: string[]            // List of investor names
  dateAnnounced: string
  sourceUrl?: string
  
  // Index: by_startup
}
```

#### 4. **dataSources**
```ts
{
  startupId: id('startups')      // FK
  sourceName: string             // 'yc', 'hn', 'techcrunch', etc
  sourceUrl: string              // Original source URL
  extractedAt: number            // Timestamp
  confidence: number             // 0-1
  
  // Indexes:
  by_startup(startupId)
  by_source(sourceName)
}
```

#### 5. **scrapeJobs**
```ts
{
  sourceName: string             // yc, hackernews, etc
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime: number
  endTime?: number
  itemsProcessed: number
  itemsFailed: number
  error?: string
  
  // Index: by_source_status
}
```

#### 6. **urlCache**
```ts
{
  url: string
  content: string                // Cached HTML/markdown
  cachedAt: number
  expiresAt: number              // 7 days TTL
  
  // Index: by_url
}
```

#### 7. **enrichmentData**
```ts
{
  startupId: id('startups')      // FK
  provider: string               // 'clearbit', 'hunter', 'linkedin'
  data: string                   // JSON stringified
  enrichedAt: number
  
  // Index: by_startup
}
```

---

## 🔄 Data Flow

```
Scrapers → Processor → Database → Queries → Frontend
   ↓           ↓           ↓         ↓         ↓
 [YC]    [Dedupe+]    [Startups]  [Search] [Dashboard]
[HN]     [Enrich]     [Founders]  [Detail] [Modal]
         [Validate]   [Sources]   [Stats]  [Export]
```

### Flow Details:

1. **Data Ingestion** → `convex/scrapers/*.ts`
   - YC scraper (hardcoded demo data: Anthropic, Stripe)
   - Hacker News scraper
   - Firecrawl integration for web scraping

2. **Processing** → `convex/processors/startup.ts`
   - Deduplication: Exact match on canonicalName + fuzzy (Levenshtein 80%)
   - Normalization: Lowercase, remove articles, special chars
   - Enrichment: Add to founders, dataSources, fundingRounds
   - Confidence scoring

3. **Database** → `convex/schema.ts`
   - All data stored in Convex (PostgreSQL backend)
   - Automatic indexing for performance

4. **Frontend Queries** → `convex/queries/startups.ts`
   - `searchStartups()` - Filter by domain, date, funding (used by Dashboard)
   - `getRecentStartups()` - By timeframe (today/week/month/quarter)
   - `getStartupDetail()` - Single startup with all related data
   - `getStats()` - Database metrics

5. **React Hooks** → `services/convexService.ts`
   - `useRecentStartups(timeframe)` - Main Dashboard hook
   - `useSearchStartups(timeframe, filters)` - Advanced search
   - `useStartupDetail(startupId)` - Modal detail
   - `useStats()` - Stats display

6. **UI Rendering** → `components/*.tsx`
   - LandingPage: Hero search input
   - Dashboard: Data table + sidebar filters
   - Modal: Startup detail + outreach tools
   - Cards: Individual startup cards (legacy)

---

## 🎯 Key Features

### 1. **Landing Page** (`LandingPage.tsx`)
- GSAP starfield animation with mouse interaction
- Responsive search input with domain suggestions
- Tags: Crypto, GenAI, SaaS, Biotech, Marketplaces

### 2. **Dashboard** (`DashboardRefactored.tsx`)
- Real-time data table with live database connection
- Pagination (15 items per page)
- Sidebar filters:
  - **Timeline**: Today, Yesterday, 2 Days, 1 Week, 1 Month, Quarter
  - **Domain/Industry**: Text filter
- Sorting: By date (newest first)
- Status indicator: "Live Database" badge
- Responsive: Mobile-optimized with collapsible sidebar

### 3. **Detail Modal** (`StartupModal.tsx`)
- Full startup information display
- Founder list with LinkedIn lookup
- Social links: Website, LinkedIn, Twitter
- Smart email draft generation for outreach
- Copy ID button

### 4. **Backend Processing** (`startup.ts`)
- **Deduplication**: Exact + fuzzy matching
- **Normalization**: Company name standardization
- **Source tracking**: Multiple sources increase confidence
- **Enrichment**: Founder extraction, data source attribution

---

## 📊 Current Data Status

### Sample Data Inserted:
- **Anthropic**: AI safety company, founded 2021, $300M+ funding
- **Stripe**: Payments platform, founded 2010, $1B+ funding

### Known Issues (Fixed):
1. ✅ Date filtering too strict - FIXED (removed date constraints from searchStartups)
2. ✅ Frontend not displaying data - FIXED (query now returns all startups)
3. ✅ Environment variables - FIXED (using `import.meta.env.VITE_CONVEX_URL`)
4. ✅ Black screen error - FIXED (restarted frontend)

### TODO for Production:
- [ ] Real YC API integration (currently using hardcoded demo data)
- [ ] Hacker News scraper implementation
- [ ] Firecrawl web scraping setup
- [ ] Email enrichment (Hunter, Clearbit APIs)
- [ ] Scheduled cron jobs
- [ ] User authentication
- [ ] Data export (CSV/JSON)
- [ ] Advanced filters (valuation range, team size, founded year)

---

## 🚀 Component Hierarchy

```
App
├── LandingPage (if no search)
│   ├── Canvas (GSAP starfield)
│   ├── Search Input
│   └── Tag Buttons
│
└── Dashboard (if search active)
    ├── Navbar
    │   ├── Logo/Title
    │   └── Status Badge
    ├── Main Content
    │   ├── Header (Title + Active Filter)
    │   ├── Data Table
    │   │   ├── TableHeader
    │   │   ├── TableBody
    │   │   │   └── TableRows (clickable)
    │   │   └── Pagination Controls
    │   └── Footer (Result Count)
    ├── Sidebar (Right)
    │   ├── Timeline Buttons
    │   ├── Filter Inputs
    │   └── Apply Filters Button
    └── StartupModal
        ├── Header (Name, Round, Date)
        ├── Body
        │   ├── About/Description
        │   ├── Founders List
        │   └── Social Links
        └── Action Buttons (Website, Outreach)
```

---

## 🔧 Type Definitions (`types.ts`)

```ts
// Main entity
interface Startup {
  id: string
  name: string
  fundingAmount: string
  roundType: string
  dateAnnounced: string
  description: string
  investors: string[]
  founders: string[]
  website?: string
  location?: string
  contactEmail?: string
  socialLinks?: {
    linkedin?: string
    twitter?: string
    crunchbase?: string
  }
  sources: string[]
  tags: string[]
}

type Timeframe = 'today' | 'yesterday' | '2_days' | 'week' | 'month' | 'quarter'

interface FilterConfig {
  onlyNew: boolean
  minValuation?: string
  maxValuation?: string
  domain?: string
  teamSize?: string
  foundedYear?: string
}

interface SearchState {
  isLoading: boolean
  error: string | null
  data: Startup[]
  lastUpdated: Date | null
  queryTime: number
}
```

---

## 🧪 Testing & Development

### Local Development
```bash
npm run dev           # Start Vite dev server
convex dev            # Start Convex backend (separate terminal)
```

### Current State
- ✅ Convex project initialized
- ✅ PostgreSQL database created with 7 tables
- ✅ Sample data inserted (Anthropic, Stripe)
- ✅ Frontend queries working
- ✅ React components rendering
- ✅ Environment variables configured

### Next Steps
1. Restart both servers
2. Test dashboard data display
3. Verify all queries return data
4. Test filters and pagination
5. Test modal detail view

---

## 📝 File Reference Guide

| File | Lines | Purpose |
|------|-------|---------|
| `components/DashboardRefactored.tsx` | 530 | Main UI component - data table + filters |
| `components/LandingPage.tsx` | 301 | Hero page with GSAP animations |
| `components/StartupModal.tsx` | 149 | Startup detail modal |
| `convex/schema.ts` | 108 | Database schema definition |
| `convex/queries/startups.ts` | 244 | Frontend query functions |
| `convex/processors/startup.ts` | 269 | Data processing pipeline |
| `convex/scrapers/yc.ts` | 110 | Y Combinator scraper |
| `services/convexService.ts` | 71 | React hooks for Convex queries |
| `types.ts` | 39 | TypeScript interfaces |
| `App.tsx` | 22 | Root component |
| `index.tsx` | 20 | Entry point + ConvexProvider |

---

## 🎨 UI/UX Highlights

- **Dark mode** theme (black, #111, #333 colors)
- **Emerald accent color** (#10b981, #34d399)
- **Responsive design**: Mobile-first, desktop optimizations
- **Interactive elements**: Hover states, transitions, animations
- **Data density**: Table optimized for ~15 rows per view
- **Accessibility**: Semantic HTML, focus states, ARIA labels

---

## 🔐 Environment Variables

Required in `.env.local`:
```
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

---

## 📚 Documentation Files

1. **CODEBASE_SNAPSHOT.md** (this file) - Complete project overview
2. **CODEBASE_INDEX.md** - Detailed file-by-file breakdown
3. **IMPLEMENTATION_INDEX.md** - Feature implementation details
4. **CONVEX_REFACTOR_README.md** - Migration from Gemini to Convex
5. **FILE_DEPENDENCIES.md** - Import/export relationships
6. **MIGRATION_GUIDE.md** - Step-by-step refactor guide
7. **README.md** - User-facing documentation

---

## 🎯 Next Priorities

1. **Production Scrapers** - Real YC API, Hacker News
2. **Data Enrichment** - Email discovery, social profile lookup
3. **Performance** - Pagination optimization, lazy loading
4. **Authentication** - User accounts, saved searches
5. **Advanced Features** - Export, alerts, API access

---

**Last Indexed**: January 2026 | **Version**: 1.0-post-refactor
