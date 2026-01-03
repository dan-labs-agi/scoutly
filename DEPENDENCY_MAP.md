# Scoutly Dependency Map
**Component Relationships & Data Flow**

---

## 📦 NPM Dependencies

```
react@19.2.3
├─ react-dom@19.2.3
├─ convex@1.31.2 (backend + hooks)
├─ gsap@3.12.5 (animations)
├─ lucide-react@0.562.0 (icons)
├─ recharts@3.6.0 (charts - unused currently)
├─ puppeteer@24.34.0 (web scraping)
└─ @google/genai@1.34.0 (legacy - not used)

DevDeps:
├─ vite@6.2.0 (build)
├─ typescript@5.8.2
└─ @vitejs/plugin-react@5.0.0
```

---

## 🔗 Frontend Component Dependencies

### Import Tree

```
index.tsx (entry point)
├─ ConvexProvider wrapper
│  └─ convex config: import.meta.env.VITE_CONVEX_URL
├─ App.tsx
│  ├─ LandingPage.tsx
│  │  ├─ gsap (animations)
│  │  ├─ lucide-react (ArrowRight, Command)
│  │  └─ callback: onSearch(domain)
│  │
│  └─ DashboardRefactored.tsx
│     ├─ useRecentStartups() [services/convexService.ts]
│     ├─ types.ts (Startup, FilterConfig, Timeframe)
│     ├─ StartupModal.tsx
│     │  ├─ types.ts (Startup)
│     │  └─ lucide-react (X, Globe, Mail, Linkedin, etc)
│     ├─ lucide-react (Loader2, RefreshCcw, ChevronLeft, etc)
│     └─ Tailwind CSS styling
```

### File Dependencies Chart

```
index.tsx
  ├─ convex/react (ConvexProvider, ConvexReactClient)
  ├─ App.tsx
  │  ├─ components/DashboardRefactored.tsx
  │  │  ├─ services/convexService.ts
  │  │  │  └─ convex/_generated/api.ts
  │  │  │     └─ convex/queries/startups.ts
  │  │  ├─ types.ts
  │  │  ├─ components/StartupModal.tsx
  │  │  │  └─ types.ts
  │  │  └─ lucide-react
  │  │
  │  └─ components/LandingPage.tsx
  │     ├─ gsap
  │     └─ lucide-react
  │
  └─ types.ts
```

---

## 🗄️ Backend Dependencies

### Convex Module Tree

```
convex/
├─ schema.ts (core definition)
│  ├─ convex/server
│  └─ convex/values
│
├─ queries/startups.ts
│  ├─ convex/_generated/server
│  ├─ convex/values
│  └─ READ: startups, founders, dataSources
│     READ ONLY
│
├─ processors/startup.ts
│  ├─ convex/_generated/server (mutation, action, internalMutation)
│  ├─ convex/values
│  ├─ READ: startups, founders
│  └─ WRITE: startups, founders, dataSources
│
├─ scrapers/
│  ├─ yc.ts
│  │  ├─ convex/_generated/server (action)
│  │  ├─ convex/values
│  │  ├─ convex/_generated/api (internal.processors.startup.processStartup)
│  │  └─ CALLS: ctx.runMutation(internal.processors.startup.processStartup)
│  │
│  └─ hackernews.ts (similar structure)
│
├─ lib/firecrawl.ts
│  └─ Firecrawl API wrapper
│
├─ crons.ts
│  └─ Scheduled job definitions
│
└─ _generated/ (AUTO-GENERATED)
   ├─ api.d.ts (all mutations + queries + actions)
   ├─ server.d.ts (server utilities)
   └─ dataModel.d.ts (database types)
```

---

## 🔄 Data Flow Dependencies

### Query Execution Path

```
React Component (DashboardRefactored.tsx)
    ↓ calls
useRecentStartups(timeframe)
    ↓ from
services/convexService.ts
    ↓ calls
useQuery(api.queries.startups.getRecentStartups, args)
    ↓ invokes
convex/queries/startups.ts → getRecentStartups function
    ↓ executes in Convex backend
ctx.db.query('startups')
    ↓ fetches from
PostgreSQL table: startups
    ↓ JOIN with
ctx.db.query('founders')
    ↓ from
PostgreSQL table: founders
    ↓ returns
Startup[] (transformed)
    ↓ back to
React component (auto re-render on data change)
```

### Mutation Execution Path

```
Scraper Action (fetchYCCompanies)
    ↓ calls
ctx.runMutation(internal.processors.startup.processStartup, data)
    ↓ invokes
convex/processors/startup.ts → processStartup mutation
    ↓ executes steps:
1. normalizeCompanyName()
2. ctx.db.query('startups').filter(canonicalName)
3. Duplicate check + decision (create/update)
4. ctx.db.insert() or ctx.db.patch()
5. ctx.db.insert('founders') for each founder
6. ctx.db.insert('dataSources') for source tracking
    ↓ writes to
PostgreSQL tables: startups, founders, dataSources
    ↓ returns to
Scraper (processed count)
```

---

## 🎯 Component Function Dependencies

### DashboardRefactored.tsx

**Depends on:**
- `useRecentStartups(timeframe)` - main data hook
- `Startup` type from `types.ts`
- `FilterConfig` type from `types.ts`
- `Timeframe` type from `types.ts`
- `StartupModal` component
- Lucide icons

**Provides:**
- State: timeframe, filters, selectedStartup, currentPage
- Derived: filteredData, paginatedData, totalPages
- Handlers: handleNextPage, handlePrevPage, handleRunScan
- Renders: table, sidebar, pagination

### convexService.ts

**Depends on:**
- `useQuery` from `convex/react`
- `api` from `convex/_generated/api` (auto-generated)
- `Startup`, `Timeframe`, `FilterConfig` types

**Provides:**
- `useSearchStartups(timeframe, filters)` hook
- `useRecentStartups(timeframe)` hook
- `useStartupDetail(startupId)` hook
- `useStats()` hook
- `fetchStartupsAsync()` function (error - use hooks instead)

### convex/queries/startups.ts

**Depends on:**
- `query` function from `convex/_generated/server`
- Database: startups, founders, dataSources tables
- Types: Startup (app-side)

**Provides:**
- `searchStartups` query - filters by domain/date/funding
- `getRecentStartups` query - filters by timeframe
- `getStartupDetail` query - single startup + relations
- `getScrapeJobHistory` query - monitoring
- `getStats` query - database metrics

### convex/processors/startup.ts

**Depends on:**
- `internalMutation` from `convex/_generated/server`
- Database: startups, founders, dataSources tables
- Helper functions: normalizeCompanyName, levenshteinDistance

**Provides:**
- `processStartup` mutation - individual startup processing
- `batchProcessStartups` mutation - bulk import
- Deduplication logic
- Enrichment hooks

---

## 📊 Data Type Dependencies

```typescript
// Root type
Startup
├─ string: id, name, fundingAmount, roundType, dateAnnounced
├─ string: description, website, location, contactEmail
├─ string[]: investors, founders, sources, tags
├─ number: confidenceScore (optional, in DB not in API type)
│
└─ Related types:
   ├─ Timeframe (literal union)
   ├─ FilterConfig
   │  └─ string: domain, minValuation, maxValuation, teamSize, foundedYear
   │  └─ boolean: onlyNew
   │
   └─ SearchState
      ├─ boolean: isLoading
      ├─ string | null: error
      ├─ Startup[]: data
      ├─ Date | null: lastUpdated
      └─ number: queryTime
```

---

## 🚀 Initialization Dependencies

```
App Start Sequence:

1. index.tsx loads
   ├─ import.meta.env.VITE_CONVEX_URL
   └─ ConvexReactClient(url)

2. ConvexProvider wraps App
   └─ All useQuery hooks now work

3. App.tsx renders
   ├─ useState(searchIntent)
   └─ conditional render: LandingPage or Dashboard

4. If Dashboard:
   ├─ useRecentStartups('week') triggers
   ├─ Convex backend: getRecentStartups()
   ├─ Database query execution
   ├─ Results returned + re-render
   └─ Table displays startups

5. User clicks row
   ├─ setState(selectedStartup)
   └─ StartupModal opens with startup data
```

---

## 🔐 Environment Variable Dependencies

```
VITE_CONVEX_URL
  ↓ used in
index.tsx → ConvexReactClient(import.meta.env.VITE_CONVEX_URL)
  ↓ enables
All Convex API calls from React components
```

---

## 📱 Build & Dev Dependencies

```
vite@6.2.0
├─ entry: index.html → index.tsx
├─ build: index.tsx + components → dist/
└─ dev: npm run dev → localhost:5173

tsconfig.json
├─ target: ES2020
├─ module: ESNext
└─ jsx: react-jsx

Tailwind CSS
├─ configured in vite.config.ts
└─ classes in all .tsx files
```

---

## 🧪 Test Dependencies (If Added)

```
Potential test setup:
├─ vitest (Vite-native test runner)
├─ @testing-library/react
├─ @testing-library/user-event
└─ msw (mock Convex API calls)
```

---

## 📈 Dependency Graph Summary

```
Total Direct Dependencies:
Frontend: 7 (React, Convex, GSAP, Lucide, Recharts, Puppeteer, GenAI)
Backend: 2 (Convex, Values validator)
DevDeps: 3 (Vite, TypeScript, React plugin)

Auto-Generated:
Convex/_generated/ (API types, server types, data model)
```

---

## ⚠️ Circular Dependency Check

✅ **No circular dependencies detected**

Flow is unidirectional:
```
Components → Hooks → API → Backend → Database
```

---

## 🔗 Cross-File Import Count

| File | Imports From | Count |
|------|--------------|-------|
| DashboardRefactored.tsx | convexService, types, StartupModal, lucide | 4 |
| LandingPage.tsx | gsap, lucide-react | 2 |
| App.tsx | DashboardRefactored, LandingPage | 2 |
| convexService.ts | convex/react, api, types | 3 |
| queries/startups.ts | convex/server, convex/values | 2 |
| processors/startup.ts | convex/server, convex/values | 2 |
| scrapers/yc.ts | convex/server, convex/values | 2 |

---

**Last Updated**: January 2026
