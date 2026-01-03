# Scoutly Testing & Debugging Guide
**Status**: Development v1.0

---

## 🚀 Environment Setup

### Prerequisites
```bash
Node.js 18+ installed
npm or pnpm
Convex account (free tier OK)
```

### Installation
```bash
npm install
npx convex dev --setup  # First time only
```

---

## 🧪 Local Testing

### Start Services

**Terminal 1: Backend**
```bash
cd /path/to/scoutly
npx convex dev
# Output should show: "Backend running at..."
```

**Terminal 2: Frontend**
```bash
cd /path/to/scoutly
npm run dev
# Output should show: "Local: http://localhost:5173"
```

### Verify Connectivity
```
Visit http://localhost:5173
Look for status badge: "Live Database" (not "Loading...")
```

---

## 🔍 Testing Checklist

### Phase 1: Data Availability

**Step 1.1: Check Database**
```
1. Open Convex Dashboard (convex.dev/deployments)
2. Select your deployment → Data tab
3. Verify startups table has 2 entries (Anthropic, Stripe)
4. Verify founders table has 2 entries
5. Verify dataSources table has 2+ entries
```

**Step 1.2: Check Backend**
```bash
# In browser DevTools console:
console.log('Backend running: Convex initialized')

# Should see no errors about VITE_CONVEX_URL or connection
```

### Phase 2: Query Execution

**Step 2.1: Test getRecentStartups**
```
1. Navigate to Dashboard (click domain tag or search)
2. Open browser DevTools → Network tab
3. Filter XHR requests
4. Should see convex_query request to getRecentStartups
5. Response should contain startups array with 2 items
```

**Step 2.2: Verify Response Data**
```
Response structure should be:
[
  {
    id: "...",
    name: "Anthropic",
    fundingAmount: "$300M",
    roundType: "Seed",
    dateAnnounced: "2021-01-01",
    founders: ["Dario Amodei"],
    ...
  },
  {
    id: "...",
    name: "Stripe",
    ...
  }
]
```

### Phase 3: UI Rendering

**Step 3.1: Dashboard Loads**
```
✅ Sidebar visible on desktop (or toggle on mobile)
✅ "Live Database" badge shows
✅ Timeline buttons: Today, Yesterday, 2 Days, Week, Month, Quarter
✅ Domain filter input visible
✅ "Apply Filters" button at bottom
```

**Step 3.2: Table Renders**
```
✅ Column headers: Company, Date, Funding, Description, Action
✅ 2 rows displayed (Anthropic, Stripe)
✅ Pagination shows: "1-2 / 2"
✅ Each row is hoverable (background changes)
✅ Fonts and colors match design
```

**Step 3.3: Interaction**
```
✅ Click a startup row → Modal opens
✅ Modal shows:
   - Company name + funding
   - About section
   - Founders list
   - Website link
   - Draft Outreach button
✅ Click ✕ to close modal
✅ Previous table state remains
```

### Phase 4: Filters

**Step 4.1: Timeline Filter**
```
Actions:
1. Click "Today" button
2. Check: table updates or shows "No startups found"
3. Click "Week" button
4. Check: 2 startups appear (they're old data)
5. Click "Month" or "Quarter"
6. Check: 2 startups still appear
```

**Step 4.2: Domain Filter**
```
Actions:
1. Type "AI" in Domain filter
2. Click "Apply Filters"
3. Expected: Only Anthropic appears (tagged with AI)
4. Clear filter, type "Payments"
5. Click "Apply Filters"
6. Expected: Only Stripe appears
7. Type "NonExistent"
8. Expected: "No startups found" message
```

### Phase 5: Pagination

**Step 5.1: Setup**
```
Modify ITEMS_PER_PAGE to 1 in DashboardRefactored.tsx
This will show pagination with 2 pages
```

**Step 5.2: Test**
```
✅ Page 1 shows first startup
✅ Page 2 button enabled
✅ Click page 2 → shows second startup
✅ Previous page button enabled
✅ Pagination controls: < 1 2 >
✅ Pagination info: "1 / 2" on page 1
✅ Pagination info: "2 / 2" on page 2
```

### Phase 6: Modal

**Step 6.1: Open Modal**
```
1. Click any startup row
2. Modal should fade in with zoom animation
3. Modal centered on screen
4. Backdrop darkened
```

**Step 6.2: Test Buttons**
```
Website button:
- Should open startup.website in new tab
- Or show error if no website

Draft Outreach button:
- Click → opens default email client
- Subject: "Quick question re: [Company] / Partnership"
- Body: Pre-filled message about the company
- To: startup.contactEmail or founders@website

LinkedIn Search (founder name):
- Hover founder row → arrow icon appears
- Click → opens LinkedIn search for "founder name + company"
```

### Phase 7: Responsive Design

**Step 7.1: Desktop (1920x1080)**
```
✅ Sidebar visible on right (not overlaying)
✅ Table takes 75% width
✅ All columns visible
✅ No horizontal scroll
```

**Step 7.2: Tablet (768x1024)**
```
✅ Sidebar toggle button visible
✅ Click toggle → sidebar slides from right
✅ Sidebar overlays content
✅ Click ✕ closes sidebar
✅ Table adapts to remaining width
```

**Step 7.3: Mobile (375x667)**
```
✅ Sidebar hidden by default
✅ Toggle button visible (top right)
✅ Table columns: Company (condensed), Date, Funding, Action
✅ Description column hidden
✅ Pagination controls stack vertically
✅ Modal scales to fit screen
```

---

## 🐛 Debugging Guide

### Issue: "No startups found"

**Root Causes:**
1. Database empty - check Convex dashboard Data tab
2. Query not executing - check Network tab in DevTools
3. Filter too strict - check dateAnnounced filter

**Debug Steps:**
```bash
# 1. Check database
convex dashboard
# Navigate to Data → startups table
# Count rows (should be 2+)

# 2. Check query response
# Browser DevTools → Network → Filter "convex"
# Look for request to getRecentStartups
# Check Response tab - should have startups array

# 3. Check timestamp
# Anthropic dateAnnounced: "2021-01-01"
# Try "Week" timeframe (90+ days)
# Or clear date constraint in searchStartups query

# 4. Check filter state
# Dashboard → Domain filter empty?
# No active filters should show all data
```

### Issue: "Loading..." spinner won't stop

**Root Causes:**
1. useRecentStartups hook not returning data
2. Network request hanging
3. Convex connection broken

**Debug Steps:**
```bash
# 1. Check Convex connection
# Browser DevTools → Console
# Is there an error about VITE_CONVEX_URL?
# Check .env.local has value

# 2. Check Convex dev server
# Terminal with "convex dev"
# Should show: "Backend running at..."
# No error logs?

# 3. Restart backend
# Ctrl+C in convex dev terminal
# Run: convex dev

# 4. Check network request
# DevTools → Network → XHR
# Filter "convex"
# Is getRecentStartups request pending?
# Status should be 200, not 500
```

### Issue: Modal doesn't open

**Root Causes:**
1. onClick handler not wired
2. StartupModal prop not passed
3. CSS z-index issue

**Debug Steps:**
```bash
# 1. Check onClick handler
# DashboardRefactored.tsx line 259:
# onClick={() => setSelectedStartup(startup)}
# Is this firing?

# Browser DevTools → add console.log:
# onClick={() => {
#   console.log('Row clicked:', startup.name);
#   setSelectedStartup(startup);
# }}

# 2. Check modal component
# components/StartupModal.tsx
# Line 11: if (!isOpen || !startup) return null;
# Is isOpen true? Is startup not null?

# 3. Check CSS z-index
# Modal has z-50, backdrop has z-50
# Check for conflicting styles
```

### Issue: Filter doesn't update results

**Root Causes:**
1. Filter state not changing
2. Query not re-executing
3. useMemo dependency issue

**Debug Steps:**
```bash
# 1. Check state update
# Add console.log in handleRunScan:
# console.log('Filter applied:', filters);

# 2. Check query re-execution
# useRecentStartups hook should watch timeframe
# Is timeframe state changing?

# 3. Check useMemo
# Line 78: useMemo(() => { ... }, [startups, filters.domain])
# Should include all dependencies

# 4. Force re-render
# Change timeframe selector
# Does table update?
```

### Issue: Environment variable not loading

**Root Causes:**
1. .env.local file missing
2. Wrong variable name
3. Vite dev server not restarted

**Debug Steps:**
```bash
# 1. Check .env.local exists
ls -la /path/to/scoutly/.env.local

# 2. Check content
cat /path/to/scoutly/.env.local
# Should contain: VITE_CONVEX_URL=https://...

# 3. Check variable name (must start with VITE_)
# If not prefixed with VITE_, Vite won't expose it

# 4. Restart dev server
# Ctrl+C in npm run dev terminal
# Run: npm run dev

# 5. Check in browser
# DevTools → Console
# Type: import.meta.env.VITE_CONVEX_URL
# Should return URL, not undefined
```

---

## 🧬 Unit Test Examples

### Hook Test: useRecentStartups

```typescript
// services/convexService.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useRecentStartups } from './convexService';

describe('useRecentStartups', () => {
  it('should return startups for week timeframe', async () => {
    const { result } = renderHook(() => useRecentStartups('week'));
    
    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
    
    expect(result.current).toHaveLength(2);
    expect(result.current[0].name).toBe('Anthropic');
  });

  it('should handle empty results', async () => {
    const { result } = renderHook(() => useRecentStartups('today'));
    
    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
    
    // May be empty if no today's announcements
    expect(Array.isArray(result.current)).toBe(true);
  });
});
```

### Component Test: DashboardRefactored

```typescript
// components/DashboardRefactored.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardRefactored } from './DashboardRefactored';

describe('DashboardRefactored', () => {
  it('should render table with startups', () => {
    render(<DashboardRefactored initialDomain="" onBack={jest.fn()} />);
    
    expect(screen.getByText('Anthropic')).toBeInTheDocument();
    expect(screen.getByText('Stripe')).toBeInTheDocument();
  });

  it('should open modal on row click', () => {
    render(<DashboardRefactored initialDomain="" onBack={jest.fn()} />);
    
    const row = screen.getByText('Anthropic');
    fireEvent.click(row);
    
    expect(screen.getByText('AI safety company')).toBeInTheDocument();
  });

  it('should filter by domain', async () => {
    render(<DashboardRefactored initialDomain="" onBack={jest.fn()} />);
    
    const input = screen.getByPlaceholderText(/Domain/);
    fireEvent.change(input, { target: { value: 'Payments' } });
    fireEvent.click(screen.getByText('Apply Filters'));
    
    expect(screen.getByText('Stripe')).toBeInTheDocument();
    expect(screen.queryByText('Anthropic')).not.toBeInTheDocument();
  });
});
```

---

## 📊 Performance Testing

### Metrics to Monitor

```
Metrics:
- Query response time: < 500ms
- Component render time: < 100ms
- Time to interactive: < 3s
- LCP (Largest Contentful Paint): < 2.5s
```

### Testing With DevTools

```
1. Open DevTools → Performance tab
2. Click "Record"
3. Perform action (click row, filter, etc)
4. Click "Stop"
5. Review:
   - Main thread blocked?
   - Rendering taking > 100ms?
   - Layout thrashing?
```

---

## 🚨 Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `VITE_CONVEX_URL is undefined` | Env var not set | Add to .env.local |
| `Cannot read property 'query' of undefined` | Convex not initialized | Check ConvexProvider |
| `startups is undefined` | Query still loading | Add null check in useMemo |
| `Modal doesn't close` | onClick not attached | Check line 474 onClose prop |
| `Date filter shows nothing` | Dates too old | Use 'Week' or 'Month' |
| `No permission to read startups` | Auth rules | Check Convex permissions |

---

## 📝 Test Execution Plan

### Daily Testing (Before Commit)

```bash
# 1. Start services
npm run dev              # Terminal 1
convex dev              # Terminal 2

# 2. Visual smoke test
# Open http://localhost:5173
# - Landing page loads ✅
# - Search input works ✅
# - Can navigate to Dashboard ✅
# - Table shows 2 startups ✅
# - Filters work ✅
# - Modal opens/closes ✅

# 3. Check console
# DevTools → Console
# No red errors? ✅
# No warnings about missing dependencies? ✅
```

### Pre-Deployment Testing

```bash
# 1. Build check
npm run build
# Should complete without errors

# 2. Type check
npx tsc --noEmit
# Should have 0 errors

# 3. Database backup
convex dashboard
# Export startups table to CSV

# 4. Load test
# Open 5 tabs, all on Dashboard
# Try filtering simultaneously
# No crashes? No data corruption? ✅

# 5. Mobile test
# DevTools Device Mode: iPhone 12
# - All UI visible ✅
# - Touch interactions work ✅
# - No layout shift ✅
```

---

## 🔧 Advanced Debugging

### Network Inspection

```javascript
// In browser console
// Intercept all Convex API calls
window.__convex_client__.then(client => {
  const original = client._makeQuery;
  client._makeQuery = function(query, args) {
    console.log('Query:', query.name, 'Args:', args);
    return original.apply(this, arguments);
  };
});
```

### State Inspection

```javascript
// Add to DashboardRefactored.tsx
useEffect(() => {
  console.log('Dashboard State:', {
    timeframe,
    filters,
    selectedStartup,
    currentPage,
    startups: startups?.length
  });
}, [timeframe, filters, selectedStartup, currentPage, startups]);
```

### Query Debugging

```typescript
// In convex/queries/startups.ts
export const searchStartups = query({
  handler: async (ctx, args) => {
    console.log('[Query] searchStartups called with:', args);
    const results = await ctx.db.query('startups').collect();
    console.log('[Query] Found startups:', results.length);
    return results;
  }
});
```

---

**Last Updated**: January 2026
