# Scoutly Quick Reference
**Updated**: Jan 2026 | **Version**: 1.0

---

## 🚀 Quick Start

```bash
# Terminal 1: Backend
convex dev

# Terminal 2: Frontend
npm run dev

# Visit http://localhost:5173
```

---

## 📊 Database Schema at a Glance

```
startups (core)
├── id, name, canonicalName, description
├── fundingAmount, roundType, dateAnnounced
├── website, location, logo
├── tags[], confidenceScore, sourceCount
├── createdAt, updatedAt

founders ──> startups
├── name, email, twitter, linkedin
└── role (CEO, Co-founder, etc)

fundingRounds ──> startups
├── roundType, fundingAmount, investors[]
└── dateAnnounced

dataSources ──> startups
├── sourceName (yc, hn, techcrunch)
├── sourceUrl, confidence
└── extractedAt

scrapeJobs, urlCache, enrichmentData
(utility tables)
```

---

## 🎯 Main Data Flow

```
YC/HN Scraper
    ↓
Processor (dedupe, normalize, enrich)
    ↓
Database (startups + founders + sources)
    ↓
Frontend Queries (searchStartups, getRecentStartups)
    ↓
React Hooks (useRecentStartups, useStartupDetail)
    ↓
Dashboard UI (table, modal, filters)
```

---

## 🧩 Key Files

| What | File | Lines |
|------|------|-------|
| **UI** | `components/DashboardRefactored.tsx` | 530 |
| **Queries** | `convex/queries/startups.ts` | 244 |
| **Processing** | `convex/processors/startup.ts` | 269 |
| **Schema** | `convex/schema.ts` | 108 |
| **Hooks** | `services/convexService.ts` | 71 |
| **Types** | `types.ts` | 39 |

---

## 💻 Frontend Architecture

```
App.tsx (root)
  ├─ LandingPage (search input + GSAP animation)
  │   └─ onSearch() → opens Dashboard with domain
  │
  └─ DashboardRefactored (main UI)
      ├─ useRecentStartups(timeframe) → fetches data
      ├─ Sidebar (timeline + filters)
      │   └─ states: timeframe, filters
      ├─ Main table (paginated)
      │   └─ onClick startup → opens Modal
      └─ StartupModal (detail view)
          ├─ founders, links, actions
          └─ handleOutreach() → email draft
```

---

## 🗄️ Backend Architecture

```
Scraper (yc.ts, hackernews.ts)
  ↓ fetchYCCompanies() action
Processor (startup.ts)
  ├─ normalizeCompanyName()
  ├─ levenshteinDistance() (fuzzy dedupe)
  ├─ processStartup() mutation
  └─ batchProcessStartups() mutation
  
Query Layer (startups.ts)
  ├─ searchStartups() - domain, date, funding filters
  ├─ getRecentStartups(timeframe) - timeline-based
  ├─ getStartupDetail(startupId) - single record
  └─ getStats() - database metrics
```

---

## 🎨 UI Components

| Component | Purpose | State |
|-----------|---------|-------|
| **LandingPage** | Hero + search | input, focused |
| **DashboardRefactored** | Main view | timeframe, filters, page, selected |
| **StartupModal** | Detail popup | startup, isOpen |
| **StartupCard** | Card view (legacy) | startup, onClick |

---

## 🔑 Frontend Hooks

```ts
// Main hook - returns Startup[] or undefined (loading)
useRecentStartups(timeframe: Timeframe): Startup[] | undefined

// Alternative hook with more filters
useSearchStartups(timeframe, filters): Startup[] | undefined

// Detail view
useStartupDetail(startupId): Detail | undefined

// Stats/metrics
useStats(): Stats | undefined
```

---

## 🎛️ Filters

**Timeline** (in sidebar):
- Today
- Yesterday
- 2 Days
- 1 Week
- 1 Month
- Quarter

**Domain Filter** (text input):
- Filters by: name, description, tags
- Real-time update

---

## 📤 Data Inserted (Current)

```json
{
  "name": "Anthropic",
  "fundingAmount": "$300M",
  "dateAnnounced": "2021-01-01",
  "location": "San Francisco",
  "tags": ["AI", "Y Combinator"]
}

{
  "name": "Stripe",
  "fundingAmount": "$1B",
  "dateAnnounced": "2010-01-01",
  "location": "San Francisco",
  "tags": ["FinTech", "Payments"]
}
```

---

## 🔧 Key Functions

### Processor (startup.ts)
```ts
normalizeCompanyName(name)           // auth0, not "The Auth0 Company"
levenshteinDistance(a, b)             // Fuzzy match (0-1)
processStartup({ rawData, source })   // Insert/update + dedupe
batchProcessStartups(startups)        // Bulk import
```

### Queries (startups.ts)
```ts
searchStartups({ domain, daysBack, minFunding })
getRecentStartups({ timeframe })
getStartupDetail({ startupId })
getStats()
```

### Service (convexService.ts)
```ts
useRecentStartups(timeframe)
useSearchStartups(timeframe, filters)
useStartupDetail(startupId)
useStats()
```

---

## 🐛 Known Issues & Fixes

| Issue | Status | Fix |
|-------|--------|-----|
| Date filtering too strict | ✅ Fixed | Removed dateAnnounced constraint |
| Frontend not showing data | ✅ Fixed | Query returns all startups now |
| Env var loading error | ✅ Fixed | Using `import.meta.env.VITE_CONVEX_URL` |
| Black screen on startup | ✅ Fixed | Restarted frontend server |

---

## 📝 Adding New Data

### Via Manual Insert (Convex Sidebar)
```json
{
  "name": "NewCompany",
  "canonicalName": "newcompany",
  "description": "What they do",
  "fundingAmount": "$5M",
  "roundType": "Seed",
  "dateAnnounced": "2024-12-01",
  "location": "SF",
  "tags": ["AI"],
  "confidenceScore": 0.85,
  "sourceCount": 1,
  "createdAt": 1704067200000,
  "updatedAt": 1704067200000
}
```

### Via Scraper Action
```ts
await fetchYCCompanies({ limit: 500 })
```

---

## 🎯 Deployment Checklist

- [ ] Real YC API key configured
- [ ] HN scraper implemented
- [ ] Firecrawl API key added
- [ ] Email enrichment (Hunter/Clearbit) setup
- [ ] Scheduled cron jobs enabled
- [ ] Error monitoring (Sentry/LogRocket)
- [ ] Performance optimized (lazy loading, caching)
- [ ] Production database backup
- [ ] User authentication added
- [ ] Rate limiting configured

---

## 🔗 Environment Variables

```bash
# Required
VITE_CONVEX_URL=https://your-deployment.convex.cloud

# Optional (for enrichment)
HUNTER_API_KEY=your-key
CLEARBIT_API_KEY=your-key
FIRECRAWL_API_KEY=your-key
YC_API_KEY=your-key
```

---

## 📖 Related Docs

1. **CODEBASE_SNAPSHOT.md** - Full project overview
2. **CONVEX_REFACTOR_README.md** - Migration details
3. **IMPLEMENTATION_INDEX.md** - Feature tracking
4. **FILE_DEPENDENCIES.md** - Import relationships

---

## 🚨 Debugging Tips

### Check Data in Database
```
Navigate to Convex Dashboard → Data tab → Select table
```

### View Query Results
```ts
// In browser console after mounting Dashboard
useRecentStartups('week')  // Check returned data
```

### Check Logs
```
Convex Dashboard → Logs tab → Search for errors
```

### Restart Backend
```
Ctrl+C in convex dev terminal, then convex dev again
```

### Restart Frontend
```
Ctrl+C in npm run dev terminal, then npm run dev again
```

---

**Last Updated**: January 2026
