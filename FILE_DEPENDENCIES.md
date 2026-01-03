# File Dependencies & Relationships

Complete map of how files import/depend on each other.

---

## 📊 Import Graph

### convex/schema.ts
**No dependencies** (imports only from convex/server)

```typescript
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
```

**Used by**:
- convex/scrapers/yc.ts
- convex/scrapers/hackernews.ts
- convex/processors/startup.ts
- convex/queries/startups.ts

---

### convex/lib/firecrawl.ts
**No dependencies** (pure class + schema)

```typescript
// Self-contained. No imports needed.
```

**Used by**:
- convex/processors/startup.ts (optional enrichment)
- Future scrapers (Twitter, Product Hunt, etc)

---

### convex/scrapers/yc.ts
**Dependencies**:
```typescript
import { action, internalMutation } from '../_generated/server';
import { v } from 'convex/values';
```

**Uses**:
- `ctx.runMutation()` → calls processors/startup.ts

**Called by**:
- convex/crons.ts (every 6 hours)
- Manual trigger via Convex dashboard

---

### convex/scrapers/hackernews.ts
**Dependencies**:
```typescript
import { action } from '../_generated/server';
import { v } from 'convex/values';
```

**Uses**:
- `parseShowHNPost()` (internal helper)
- `extractFounders()` (internal helper)
- Currently: logs only (processor commented out)

**Called by**:
- convex/crons.ts (every 30 minutes)
- Manual trigger via Convex dashboard

---

### convex/processors/startup.ts
**Dependencies**:
```typescript
import { mutation, action, internalMutation } from '../_generated/server';
import { v } from 'convex/values';
```

**Internal Functions**:
- `normalizeCompanyName()` - Normalize for dedup
- `levenshteinDistance()` - String similarity
- `processStartup()` - Internal mutation
- `batchProcessStartups()` - Internal mutation

**Uses**:
- Queries startups table (dedup check)
- Inserts/updates startups table
- Inserts founders table
- Inserts dataSources table

**Called by**:
- convex/scrapers/yc.ts → `ctx.runMutation()`
- convex/scrapers/hackernews.ts → `ctx.runMutation()`
- Direct calls from Convex actions

---

### convex/queries/startups.ts
**Dependencies**:
```typescript
import { query } from '../_generated/server';
import { v } from 'convex/values';
```

**Functions**:
- `searchStartups()` - Main search with filters
- `getStartupDetail()` - Single startup detail
- `getRecentStartups()` - Timeframe-based filter
- `getScrapeJobHistory()` - Monitor scrapers
- `getStats()` - Database statistics

**Queries tables**:
- startups
- founders
- fundingRounds
- dataSources
- scrapeJobs

**Called by**:
- Frontend via React hooks (convexService.ts)
- Dashboard component

---

### convex/crons.ts
**Dependencies**:
```typescript
import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';
```

**Calls**:
- `internal.scrapers.yc.fetchYCCompanies` (every 6h)
- `internal.scrapers.hackernews.fetchShowHN` (every 30m)

**Auto-runs**: Yes, no manual setup

---

### services/convexService.ts
**Dependencies**:
```typescript
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Startup, Timeframe, FilterConfig } from '../types';
```

**React Hooks** (re-exported):
- `useSearchStartups()` - Calls api.queries.startups.searchStartups
- `useRecentStartups()` - Calls api.queries.startups.getRecentStartups
- `useStartupDetail()` - Calls api.queries.startups.getStartupDetail
- `useStats()` - Calls api.queries.startups.getStats

**Used by**:
- components/DashboardRefactored.tsx

---

### components/DashboardRefactored.tsx
**Dependencies**:
```typescript
import { useRecentStartups, useSearchStartups } from '../services/convexService';
import { Startup, Timeframe, FilterConfig } from '../types';
```

**Uses**:
- `useRecentStartups()` hook
- `useSearchStartups()` hook
- `Startup` type definition

**Features**:
- Displays real data from Convex
- Filters by timeframe and domain
- No Gemini API calls
- No fake data generation

---

### types.ts
**No dependencies** (just type definitions)

```typescript
// Pure TypeScript types
export interface Startup { ... }
export type Timeframe = ...
export interface FilterConfig { ... }
```

**Used by**:
- services/convexService.ts
- components/DashboardRefactored.tsx
- All Convex files

---

### package.json
**Key Dependencies**:
```json
{
  "dependencies": {
    "convex": "^1.x",           // Backend framework
    "convex-react": "^1.x"      // React integration
  },
  "devDependencies": {
    "convex-cli": "latest"      // CLI tools
  }
}
```

**Scripts**:
```json
{
  "dev": "convex dev & vite",   // Local development
  "build": "vite build",        // Production build
  "deploy": "convex deploy && vite build"
}
```

---

### index.tsx
**Must be updated with**:
```typescript
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { api } from './convex/_generated/api';

const convex = new ConvexReactClient(process.env.VITE_CONVEX_URL);

root.render(
  <ConvexProvider client={convex}>
    <App />
  </ConvexProvider>
);
```

**Wraps**:
- App component (with ConvexProvider)

---

### .env.local
**Required variables**:
```bash
VITE_CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOYMENT=prod:your-project
FIRECRAWL_API_KEY=your-firecrawl-key  (optional)
HUNTER_API_KEY=your-hunter-key        (optional)
CLEARBIT_API_KEY=your-clearbit-key    (optional)
```

**Used by**:
- Convex functions (via environment)
- Frontend (via VITE_ prefix)

---

## 🔗 Call Graph

### Data Ingestion Path

```
crons.ts (scheduler)
  ↓
scrapers/yc.ts (fetchYCCompanies)
  ↓ ctx.runMutation()
processors/startup.ts (processStartup)
  ↓
schema.ts tables:
  ├── startups (created/updated)
  ├── founders (created)
  └── dataSources (created)
```

### Frontend Path

```
components/DashboardRefactored.tsx
  ↓ useRecentStartups()
services/convexService.ts
  ↓ useQuery(api.queries.startups.*)
queries/startups.ts
  ↓
PostgreSQL Database
  ├── startups (query)
  ├── founders (join)
  └── dataSources (join)
  ↓
Results → Dashboard → UI
```

---

## 📦 Module Organization

```
Backend Layer (Convex)
├── schema.ts               (Data model)
├── lib/                    (Utilities)
│   └── firecrawl.ts       (Web scraping)
├── scrapers/               (Data sources)
│   ├── yc.ts              (Y Combinator)
│   └── hackernews.ts      (Hacker News)
├── processors/             (Data processing)
│   └── startup.ts         (Dedup, normalize, enrich)
├── queries/                (Frontend API)
│   └── startups.ts        (4 query functions)
└── crons.ts               (Scheduling)

Frontend Layer (React)
├── services/               (Business logic)
│   └── convexService.ts   (React hooks)
├── components/             (UI)
│   └── DashboardRefactored.tsx
├── types.ts               (Type definitions)
└── index.tsx              (Entry point + provider)
```

---

## 🔄 Data Flow Relationships

### By Table

**startups**
- Written by: `processors/startup.ts`
- Read by: `queries/startups.ts`
- Updated by: Deduplication logic in processor
- Accessed by: All frontend components

**founders**
- Written by: `processors/startup.ts`
- Read by: `queries/startups.ts`
- Joined with: startups table
- Accessed by: Dashboard (for contact info)

**dataSources**
- Written by: `processors/startup.ts`
- Read by: `queries/startups.ts`
- Purpose: Track where data came from
- Accessed by: Transparency/traceability

**scrapeJobs**
- Written by: `scrapers/yc.ts`, `scrapers/hackernews.ts`
- Read by: `queries/startups.ts` (getScrapeJobHistory)
- Purpose: Monitor scraper health
- Accessed by: Admin dashboard

**fundingRounds**
- Written by: (not yet) Future enrichment
- Read by: `queries/startups.ts`
- Purpose: Historical funding events
- Accessed by: Startup detail view

**urlCache**
- Written by: (not yet) Firecrawl wrapper
- Read by: `lib/firecrawl.ts`
- Purpose: Avoid re-scraping
- Accessed by: Caching layer

**enrichmentData**
- Written by: (not yet) Hunter.io, Clearbit, etc
- Read by: `queries/startups.ts`
- Purpose: Third-party enrichment
- Accessed by: Founder email lookup

---

## 🧬 Dependency Types

### Hard Dependencies (Must Have)
- `convex/schema.ts` → Required for DB schema
- `convex/queries/startups.ts` → Required for frontend
- `services/convexService.ts` → Required for React hooks
- `types.ts` → Required for type safety
- `package.json` → Required for dependencies

### Soft Dependencies (Nice to Have)
- `convex/lib/firecrawl.ts` → For dynamic site scraping
- `convex/scrapers/hackernews.ts` → Additional data source
- `convex/crons.ts` → For automated scheduling

### Optional Dependencies
- `FIRECRAWL_API_KEY` → For dynamic site scraping
- `HUNTER_API_KEY` → For email enrichment
- `CLEARBIT_API_KEY` → For company data enrichment

---

## 🔍 Dependency Resolution Order

### When Setting Up

1. **Install dependencies** → `npm install convex`
2. **Initialize Convex** → `npx convex init`
3. **Push schema** → `npx convex push` (schema.ts)
4. **Set environment** → `.env.local` with VITE_CONVEX_URL
5. **Wrap app** → Update index.tsx with ConvexProvider
6. **Add service** → Copy services/convexService.ts
7. **Update components** → Use DashboardRefactored.tsx
8. **Start dev** → `npm run dev` (activates crons.ts)
9. **Test locally** → Trigger scrapers manually
10. **Deploy** → `npx convex deploy && npm run build`

### When Running

```
crons.ts activates
  ↓
Scrapers run (yc.ts, hackernews.ts)
  ↓
Processor validates & deduplicates (startup.ts)
  ↓
Data stored in schema.ts tables
  ↓
Frontend queries run (queries/startups.ts)
  ↓
React hooks fetch (convexService.ts)
  ↓
Components display (DashboardRefactored.tsx)
```

---

## ⚠️ Breaking Dependencies

These would break the system if removed:

| File | Impact |
|------|--------|
| schema.ts | Cannot create DB schema |
| queries/startups.ts | Frontend cannot fetch data |
| convexService.ts | React hooks won't work |
| crons.ts | No automatic scraping |
| package.json | Cannot run project |

---

## 🚀 Extension Points

### Easy to Add

**New Data Source**:
```
Create: convex/scrapers/twitter.ts
Follows: Same pattern as yc.ts, hackernews.ts
Calls: processors/startup.ts
Register: In crons.ts
```

**New Query**:
```
Create: New function in queries/startups.ts
Calls: Existing tables
Export: Automatically available to frontend
```

**New Hook**:
```
Create: New export in convexService.ts
Wraps: New query from queries/startups.ts
Use in: React components
```

### Medium Complexity

**Enrichment Pipeline**:
```
Modify: processors/startup.ts (trigger enrichment)
Create: convex/enrichers/hunter.ts
Create: convex/enrichers/clearbit.ts
Uses: Hunter.io API, Clearbit API
Writes: enrichmentData table
```

**Alert System**:
```
Create: convex/jobs/alertChecker.ts
Queries: startups table for new entries
Sends: Email via service
Schedule: In crons.ts
```

---

## 📊 Size & Complexity

| File | LOC | Complexity | Dependencies |
|------|-----|-----------|--------------|
| schema.ts | 108 | Low | 0 |
| firecrawl.ts | 126 | Medium | 0 |
| yc.ts | 118 | Medium | 1 (processor) |
| hackernews.ts | 158 | Medium | 0 |
| startup.ts | 239 | High | 3 (tables) |
| startups.ts | 258 | High | 7 (tables) |
| crons.ts | 71 | Low | 2 (scrapers) |
| convexService.ts | 71 | Low | 1 (queries) |
| DashboardRefactored.tsx | 400 | Medium | 1 (service) |

**Total Backend**: ~1,079 LOC
**Total Frontend**: ~471 LOC
**Total**: ~1,550 LOC

---

## 🔗 External Dependencies

### Required Packages
```json
{
  "convex": "^1.x",              // Framework
  "convex-react": "^1.x",        // React integration
  "react": "^18.x",              // UI library
  "typescript": "^5.x"           // Type safety
}
```

### External APIs
```
Y Combinator API
├── Free
├── No auth required
└── Used by: scrapers/yc.ts

Hacker News API (Algolia)
├── Free
├── No auth required
└── Used by: scrapers/hackernews.ts

Firecrawl API (Optional)
├── Paid (~$20/mo)
├── Auth: API key required
└── Used by: lib/firecrawl.ts

Hunter.io (Optional)
├── Paid (~$50/mo)
├── Auth: API key required
└── Used by: Future enricher

Clearbit (Optional)
├── Paid (~$50/mo)
├── Auth: API key required
└── Used by: Future enricher
```

---

## Summary

**Critical Dependencies**:
- schema.ts → All backend operations
- queries/startups.ts → Frontend data
- convexService.ts → React integration

**Data Flow**:
- Scrapers → Processors → DB → Queries → React Hooks → Components

**Update Order**:
1. Install convex
2. Push schema
3. Set environment
4. Update index.tsx
5. Add convexService
6. Update Dashboard
7. Deploy

**Ready to Extend**: Yes - clear patterns for adding data sources, queries, and features.

---

Created: January 1, 2026
Last Updated: January 1, 2026
