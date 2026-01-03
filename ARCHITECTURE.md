# Scoutly Architecture
**System Design & Technical Overview**

---

## 📐 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend (Vite)                    │
│  ┌──────────────────┐      ┌────────────────────────────┐   │
│  │  Landing Page    │      │  Dashboard                 │   │
│  │  (Hero + Search) │─────▶│  (Table + Filters)         │   │
│  └──────────────────┘      │  - useRecentStartups()     │   │
│                             │  - Modal Detail View       │   │
│                             └────────────────────────────┘   │
│                                      │ useQuery()             │
└──────────────────────────────────────┼──────────────────────┘
                                       │
                    ┌──────────────────▼──────────────────┐
                    │  Convex Backend (Serverless)        │
                    │  ┌─────────────────────────────┐    │
                    │  │  Query Layer                │    │
                    │  │  - searchStartups()         │    │
                    │  │  - getRecentStartups()      │    │
                    │  │  - getStartupDetail()       │    │
                    │  │  - getStats()               │    │
                    │  └─────────────────────────────┘    │
                    │  ┌─────────────────────────────┐    │
                    │  │  Mutation Layer             │    │
                    │  │  - processStartup()         │    │
                    │  │  - batchProcessStartups()   │    │
                    │  └─────────────────────────────┘    │
                    │  ┌─────────────────────────────┐    │
                    │  │  Action Layer               │    │
                    │  │  - fetchYCCompanies()       │    │
                    │  │  - scheduleYCFetch()        │    │
                    │  └─────────────────────────────┘    │
                    └──────────────────┬──────────────────┘
                                       │ SQL
                    ┌──────────────────▼──────────────────┐
                    │   PostgreSQL Database                │
                    │  ┌─────────────────────────────┐    │
                    │  │ startups (core)             │    │
                    │  │ founders                    │    │
                    │  │ fundingRounds               │    │
                    │  │ dataSources                 │    │
                    │  │ scrapeJobs                  │    │
                    │  │ urlCache                    │    │
                    │  │ enrichmentData              │    │
                    │  └─────────────────────────────┘    │
                    └─────────────────────────────────────┘
```

---

## 🔀 Data Flow Architecture

### Request-Response Cycle

```
User Input
  │
  ├─ Landing Page: Type domain → Click search
  │  └─ onSearch(domain)
  │      └─ App.tsx: setSearchIntent(domain)
  │
  └─ Dashboard: Change timeframe or filters
     └─ setTimeframe() or setFilters()
        └─ useRecentStartups(timeframe) hook re-runs
           │
           ▼
        Convex Backend executes:
           getRecentStartups({ timeframe })
           │
           ├─ Query timeframe value (today/week/month/etc)
           ├─ Calculate cutoff date
           ├─ SELECT * FROM startups WHERE dateAnnounced >= cutoff
           ├─ For each startup:
           │  └─ JOIN with founders, dataSources
           └─ Return enriched Startup[]
              │
              ▼
        React Hook receives data:
           setData(startups)
           │
           ▼
        Component renders:
           filteredData = useMemo(filter by domain)
           paginatedData = useMemo(slice for current page)
           │
           ├─ Table body renders rows
           ├─ Pagination controls
           └─ Row click → setSelectedStartup()
              └─ Modal opens with startup data
```

---

## 🗄️ Database Schema Architecture

```
┌─────────────────────────────────────────┐
│           startups (core)                │
│  ┌─────────────────────────────────────┐│
│  │ _id (PK)                            ││
│  │ name, canonicalName                 ││
│  │ description, website, location      ││
│  │ fundingAmount, roundType, date      ││
│  │ confidenceScore, sourceCount        ││
│  │ tags[], createdAt, updatedAt        ││
│  │ Indexes: by_created, by_name,       ││
│  │          by_date, search_startups   ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
          │                  │
          │ 1:N             │ 1:N
          ▼                  ▼
  ┌──────────────────┐  ┌──────────────────┐
  │   founders       │  │  fundingRounds   │
  ├──────────────────┤  ├──────────────────┤
  │ startupId (FK)   │  │ startupId (FK)   │
  │ name             │  │ roundType        │
  │ email, twitter   │  │ fundingAmount    │
  │ linkedin, role   │  │ investors[]      │
  │ Index:           │  │ dateAnnounced    │
  │ by_startup,      │  │ Index:           │
  │ by_email         │  │ by_startup       │
  └──────────────────┘  └──────────────────┘

          │
          │ 1:N
          ▼
  ┌──────────────────┐
  │  dataSources     │
  ├──────────────────┤
  │ startupId (FK)   │
  │ sourceName       │
  │ sourceUrl        │
  │ extractedAt      │
  │ confidence       │
  │ Index:           │
  │ by_startup,      │
  │ by_source        │
  └──────────────────┘

Utility Tables:
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  scrapeJobs      │  │   urlCache       │  │enrichmentData    │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ sourceName       │  │ url              │  │ startupId (FK)   │
│ status (enum)    │  │ content          │  │ provider         │
│ startTime        │  │ cachedAt         │  │ data (JSON)      │
│ itemsProcessed   │  │ expiresAt        │  │ enrichedAt       │
│ error            │  │ Index: by_url    │  │ Index: by_startup│
│ Index:           │  └──────────────────┘  └──────────────────┘
│ by_source_status │
└──────────────────┘
```

---

## 🧩 Component Architecture

```
App.tsx (root)
│
├─ useState(searchIntent)
│
└─ Conditional Render:
   │
   ├─ if !searchIntent:
   │  └─ LandingPage
   │     ├─ Canvas (GSAP starfield)
   │     ├─ SearchInput
   │     └─ TagButtons
   │        └─ onSearch → setSearchIntent
   │
   └─ if searchIntent:
      └─ DashboardRefactored
         ├─ useState(timeframe, filters, selectedStartup, page)
         ├─ useRecentStartups(timeframe) → data
         ├─ useMemo(filteredData, paginatedData)
         ├─ Navbar
         │  ├─ Logo (onClick → onBack)
         │  └─ Status Badge
         ├─ MainContent
         │  ├─ Header (title + active filter badge)
         │  ├─ DataTable
         │  │  ├─ TableHeader (5 columns)
         │  │  ├─ TableBody
         │  │  │  └─ map(paginatedData) → TableRow
         │  │  │     └─ onClick → setSelectedStartup
         │  │  └─ Pagination
         │  │     ├─ PrevButton, PageNumbers[], NextButton
         │  │     └─ ResultCount
         │  └─ Footer (data source info)
         ├─ Sidebar
         │  ├─ Timeline (6 buttons)
         │  │  └─ onClick → setTimeframe
         │  ├─ Filters
         │  │  └─ DomainInput → setFilters
         │  └─ ApplyButton
         │     └─ handleRunScan()
         └─ StartupModal
            ├─ Header (name, funding, date, close button)
            ├─ Body
            │  ├─ About section (description + investors)
            │  ├─ Founders section
            │  │  └─ map(founders) → FounderRow
            │  │     └─ onClick → LinkedIn search
            │  └─ Actions (Website, Draft Outreach)
            └─ Socials (LinkedIn, Twitter)
```

---

## 🔄 State Management Architecture

### React State (DashboardRefactored.tsx)

```typescript
Component State:
├─ timeframe: Timeframe
│  └─ Updates from Timeline buttons
│     └─ Triggers useRecentStartups(timeframe) re-run
│
├─ filters: FilterConfig
│  └─ domain: string (text input)
│  └─ Updates from Domain input
│
├─ selectedStartup: Startup | null
│  └─ Updates on row click
│  └─ Controls modal open/close
│
├─ currentPage: number
│  └─ Updates from pagination buttons
│  └─ Resets on filter change
│
└─ isSidebarOpen: boolean
   └─ Toggle button on mobile/tablet

Derived State (useMemo):
├─ filteredData: Startup[]
│  └─ Filter by domain, sort by date
│  └─ Depends on: startups, filters.domain
│
├─ paginatedData: Startup[]
│  └─ Slice for current page
│  └─ Depends on: filteredData, currentPage
│
└─ totalPages: number
   └─ Math.ceil(filteredData.length / ITEMS_PER_PAGE)
   └─ Depends on: filteredData
```

### Convex Remote State (Query Results)

```typescript
Remote State:
└─ startups: Startup[] | undefined
   ├─ From: useRecentStartups(timeframe)
   ├─ Status: loading (undefined), loaded ([...])
   ├─ Auto-updates when:
   │  - timeframe changes
   │  - Backend data changes
   │  - Connection re-established
   └─ Errors propagated to component
```

---

## 🚀 Processing Pipeline Architecture

### Data Ingestion → Persistence Flow

```
External Source (YC, HN, etc)
  │
  ├─ Scraper Action (fetchYCCompanies)
  │  ├─ Fetch raw data
  │  └─ For each item:
  │     └─ ctx.runMutation(processStartup)
  │
  ▼
Processor Mutation (processStartup)
  ├─ Step 1: Normalize
  │  └─ normalizeCompanyName() → canonicalName
  │
  ├─ Step 2: Deduplicate
  │  ├─ Exact match: canonicalName lookup
  │  ├─ Fuzzy match: levenshteinDistance()
  │  └─ Decision: Update or Create
  │
  ├─ Step 3: Insert/Update startups table
  │  └─ If update: increment sourceCount, update fields
  │  └─ If create: insert with sourceCount=1
  │
  ├─ Step 4: Track data source
  │  └─ INSERT dataSources with sourceName, sourceUrl
  │
  ├─ Step 5: Process founders
  │  └─ For each founder:
  │     └─ INSERT founders with startupId
  │
  └─ Step 6: Trigger enrichment (TODO)
     └─ ctx.scheduler.runAfter() enrichment action

Database Persistence
  └─ All data in PostgreSQL tables
     ├─ startups (canonical records)
     ├─ founders (related records)
     ├─ dataSources (source tracking)
     └─ scrapeJobs (job logging)

Frontend Query
  └─ useRecentStartups(timeframe)
     ├─ Calls getRecentStartups query
     ├─ JOINs with founders, dataSources
     ├─ Returns enriched Startup[]
     └─ React auto-renders on data change
```

---

## 🔐 Security Architecture

### Authentication & Authorization

```
Currently: Public (no auth required)

Planned:
├─ User Authentication (social login)
├─ Session Management
├─ Convex Permissions (isAuthenticated)
└─ Rate Limiting (API calls per user)
```

### Data Protection

```
In Transit:
├─ HTTPS (automatic via Convex)
└─ TLS encryption

At Rest:
├─ PostgreSQL encryption
├─ Convex handles key rotation
└─ No sensitive data in client

Client-Side:
├─ No API keys in frontend
├─ Environment variables prefixed VITE_
├─ No local storage of user data
└─ Modal data only in component state
```

---

## ⚙️ Performance Architecture

### Frontend Optimization

```
Code Splitting:
├─ React lazy() for components (if added)
├─ Dynamic imports for heavy libs
└─ Tree-shaking via Vite

Rendering Optimization:
├─ useMemo for filteredData (avoid re-filter)
├─ React.memo for table rows (if added)
├─ Virtual scrolling for large lists (future)
└─ Pagination (15 items/page)

Caching:
├─ Convex automatic query caching
├─ Browser service worker (if added)
└─ URL cache table (scraping optimization)
```

### Backend Optimization

```
Database Queries:
├─ Indexed fields: createdAt, canonicalName, dateAnnounced
├─ Search index on name field
├─ Index on foreign keys: startupId
└─ Compound indexes: sourceName + status

Caching:
├─ URL cache (urlCache table)
├─ Deduplication (avoid re-scraping)
└─ Source count tracking

Async Processing:
├─ Mutations for writes (automatic persistence)
├─ Actions for external APIs (HTTP calls)
├─ Scheduled jobs (crons.ts)
└─ Non-blocking enrichment (scheduler)
```

---

## 🌐 Integration Points

### External Services

```
Scraping:
├─ Y Combinator API (currently hardcoded)
├─ Hacker News API (not yet implemented)
└─ Firecrawl (web scraping infrastructure)

Enrichment:
├─ Hunter.io (email finder)
├─ Clearbit (company data)
└─ LinkedIn (founder lookup)

Analytics (future):
├─ Sentry (error tracking)
├─ LogRocket (session replay)
└─ Google Analytics (usage metrics)
```

### API Endpoints

```
Internal (Convex):
├─ /api/mutations/startup.processStartup
├─ /api/mutations/startup.batchProcessStartups
├─ /api/queries/startups.searchStartups
├─ /api/queries/startups.getRecentStartups
├─ /api/queries/startups.getStartupDetail
├─ /api/queries/startups.getStats
└─ /api/actions/yc.fetchYCCompanies

External (Browser):
├─ LinkedIn (social search)
├─ Email client (mailto:)
└─ Website links (target="_blank")
```

---

## 📊 Scaling Considerations

### Current Capacity
```
- Small dataset: 2 startups
- Real production: 10K+ startups
- Single table scan: O(n)
- With indexes: O(log n) + O(k)
```

### Scaling Strategies

```
Database:
├─ Add pagination (DONE)
├─ Add indexes (DONE)
├─ Use search indexes for full-text
└─ Archive old records (future)

Frontend:
├─ Virtual scrolling (infinite scroll)
├─ Lazy load modals
├─ Compress data responses
└─ Progressive enhancement

Backend:
├─ Batch processing
├─ Scheduled jobs with delays
├─ Database connection pooling
└─ Read replicas (Convex handles)
```

---

## 🔄 Deployment Architecture

### Development Environment
```
Local Machine:
├─ npm run dev (Vite server on :5173)
├─ convex dev (Local Convex backend)
└─ PostgreSQL (local via Convex)
```

### Production Environment
```
Deployed:
├─ Vite build → Static files (Vercel/Netlify)
├─ Convex deployment → Serverless backend
├─ PostgreSQL → Managed database
└─ CDN → Distributed content
```

---

## 📈 Monitoring Architecture

### Metrics to Track

```
Frontend:
├─ Core Web Vitals (LCP, FID, CLS)
├─ Time to Interactive (TTI)
├─ Custom event tracking
└─ Error logging

Backend:
├─ Query execution time
├─ Mutation duration
├─ Database query performance
├─ Scraper success/fail rate
└─ API error rates
```

---

**Last Updated**: January 2026
