/**
 * Refactored Dashboard using Convex instead of Gemini
 * Replace Dashboard.tsx with this version
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRecentStartups, useStats } from '../services/convexService';
import { api } from '../convex/_generated/api';
import { useConvex } from 'convex/react';
import { Startup, SearchState, Timeframe, FilterConfig } from '../types';
import { StartupModal } from './StartupModal';
import {
  Loader2,
  RefreshCcw,
  ArrowRight,
  Command,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Filter,
  Terminal,
  Clock,
  Activity,
  X,
  Database,
} from 'lucide-react';

const ITEMS_PER_PAGE = 15;

interface DashboardProps {
  initialDomain?: string;
  onBack: () => void;
}

const TIMELINE_STEPS: { id: Timeframe; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '2_days', label: '2 Days' },
  { id: 'week', label: '1 Week' },
  { id: 'month', label: '1 Month' },
  { id: 'quarter', label: 'Quarter' },
];

export const DashboardRefactored: React.FC<DashboardProps> = ({
  initialDomain,
  onBack,
}) => {
  // --- STATE ---
  const [timeframe, setTimeframe] = useState<Timeframe>('week');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [filters, setFilters] = useState<FilterConfig>({
    onlyNew: false,
    domain: initialDomain || '',
    minValuation: '',
    maxValuation: '',
    teamSize: 'Any',
    foundedYear: '',
  });

  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isScraping, setIsScraping] = useState(false);

  // --- CONVEX HOOKS - Real database queries ---
  const convex = useConvex();
  const startups = useRecentStartups(timeframe);
  const stats = useStats();

  // --- TRIGGER SCRAPING ON EMPTY DATA ---
  useEffect(() => {
    const triggerScraping = async () => {
      // Only trigger if:
      // 1. Startups is loaded (not undefined)
      // 2. Data is empty
      // 3. Not already scraping
      if (startups !== undefined && startups.length === 0 && !isScraping) {
        console.log('[Dashboard] No data found, triggering scrapers...');
        setIsScraping(true);
        try {
          await convex.action(api.scrapers.hackernews.fetchShowHN, { daysBack: 7 });
          await convex.action(api.scrapers.rss.fetchRSSFeeds, { daysBack: 7 });
          await convex.action(api.scrapers.reddit.fetchRedditStartups, { daysBack: 7 });
          await convex.action(api.scrapers.indiehackers.fetchIndieHackersProducts, { daysBack: 30 });
          console.log('[Dashboard] Scrapers triggered successfully');
        } catch (err) {
          console.error('[Dashboard] Scraper trigger failed:', err);
        } finally {
          setIsScraping(false);
        }
      }
    };

    triggerScraping();
  }, [startups, isScraping, convex]);

  // Initialize sidebar
  useEffect(() => {
    if (window.innerWidth >= 768) {
      setIsSidebarOpen(true);
    }
  }, []);

  // --- DERIVED STATE ---
  const filteredData = useMemo(() => {
    if (!startups) return [];

    let filtered = [...startups];

    // Filter by domain/tags
    if (filters.domain) {
      filtered = filtered.filter(
        s =>
          s.name.toLowerCase().includes(filters.domain.toLowerCase()) ||
          s.description.toLowerCase().includes(filters.domain.toLowerCase()) ||
          s.tags.some(t =>
            t.toLowerCase().includes(filters.domain.toLowerCase())
          )
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.dateAnnounced).getTime();
      const dateB = new Date(b.dateAnnounced).getTime();
      return dateB - dateA;
    });

    return filtered;
  }, [startups, filters.domain]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  // --- HANDLERS ---
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(p => p + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(p => p - 1);
    }
  };

  const handleRunScan = () => {
    // Reset to first page when filter changes
    setCurrentPage(1);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-transparent text-white selection:bg-white selection:text-black font-sans flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-[#333] bg-black/60 backdrop-blur-md sticky top-0 z-40 h-14 flex-none">
        <div className="w-full px-4 md:px-6 h-full flex items-center justify-between">
          <div
            className="flex items-end gap-2 cursor-pointer group select-none"
            onClick={onBack}
            title="Back to search"
          >
            <h1 className="text-sm font-bold tracking-tight text-white group-hover:text-emerald-400 transition-colors">
              scoutly
            </h1>
            <span className="text-[10px] text-[#666] mb-[2px] font-medium group-hover:text-[#888]">
              by dan
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded border border-[#333] bg-[#111]">
              {isScraping ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></div>
                  <span className="text-[10px] font-medium text-[#888] uppercase tracking-wider">
                    Scraping...
                  </span>
                </>
              ) : startups !== undefined ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-medium text-[#888] uppercase tracking-wider">
                    {startups.length} startups
                  </span>
                </>
              ) : (
                <>
                  <Loader2 size={12} className="animate-spin text-[#666]" />
                  <span className="text-[10px] font-medium text-[#888] uppercase tracking-wider">
                    Loading...
                  </span>
                </>
              )}
            </div>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-[#111] rounded-md text-[#666] transition-colors border border-transparent hover:border-[#333] relative z-50"
            >
              {isSidebarOpen ? (
                <PanelRightClose size={18} />
              ) : (
                <PanelRightOpen size={18} />
              )}
            </button>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Content */}
        <main
          className={`flex-1 overflow-y-auto p-3 md:p-6 transition-all duration-300`}
        >
          {/* Header */}
          <div className="mb-6 md:mb-8 space-y-3 md:space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">
                  Outreach Intelligence
                </h2>
                {filters.domain && (
                  <span className="px-2 py-0.5 md:px-3 md:py-1 rounded-full bg-emerald-900/30 text-emerald-400 border border-emerald-900 text-xs md:text-sm font-medium">
                    {filters.domain}
                  </span>
                )}
              </div>
              <p className="text-[#888] text-xs md:text-sm max-w-2xl leading-relaxed">
                Real startup data from Y Combinator, Hacker News, TechCrunch, and
                more. Updated hourly.
              </p>
            </div>
          </div>

          {/* Data Table */}
          <div className="border border-[#333] rounded-lg bg-black/50 backdrop-blur-sm overflow-hidden min-h-[400px] flex flex-col">
            {startups === undefined ? (
              // Loading state
              <div className="flex flex-col items-center justify-center flex-grow text-[#666] space-y-4">
                <Loader2 size={24} className="animate-spin text-emerald-500" />
                <div className="text-center">
                  <p className="text-sm font-medium">Fetching from database...</p>
                  <p className="text-xs text-[#555] mt-1">
                    {timeframe} • {filters.domain || 'All domains'}
                  </p>
                </div>
              </div>
            ) : filteredData.length === 0 ? (
              // Empty state - check if scraping
              <div className="flex flex-col items-center justify-center flex-grow text-[#666] space-y-2">
                {isScraping ? (
                  <>
                    <Loader2 size={24} className="animate-spin text-emerald-500" />
                    <p className="text-sm font-medium">Scraping data sources...</p>
                    <p className="text-xs text-[#555]">Fetching from Hacker News, RSS, Reddit, and more</p>
                  </>
                ) : (
                  <>
                    <Database size={24} className="opacity-50" />
                    <p className="text-sm font-medium">No startups found</p>
                    <p className="text-xs text-[#555]">
                      Try adjusting your filters or date range
                    </p>
                    <button
                      onClick={() => window.location.reload()}
                      className="mt-2 px-4 py-2 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700"
                    >
                      Refresh Data
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Table */}
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[#1A1A1A] bg-[#0A0A0A]">
                      <tr>
                        <th className="p-3 md:p-4 text-left text-[11px] font-semibold text-[#666] uppercase tracking-wider">
                          Company
                        </th>
                        <th className="p-3 md:p-4 text-left text-[11px] font-semibold text-[#666] uppercase tracking-wider">
                          Date
                        </th>
                        <th className="p-3 md:p-4 text-left text-[11px] font-semibold text-[#666] uppercase tracking-wider">
                          Funding
                        </th>
                        <th className="hidden md:table-cell p-4 text-left text-[11px] font-semibold text-[#666] uppercase tracking-wider">
                          Description
                        </th>
                        <th className="p-3 md:p-4 text-right text-[11px] font-semibold text-[#666] uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1A1A1A]">
                      {paginatedData.map(startup => (
                        <tr
                          key={startup.id}
                          onClick={() => setSelectedStartup(startup)}
                          className="group hover:bg-[#111]/50 transition-colors cursor-pointer"
                        >
                          <td className="p-3 md:p-4 align-top">
                            <div className="font-medium text-white text-sm mb-1 line-clamp-1 md:line-clamp-none">
                              {startup.name}
                            </div>
                            {startup.website && (
                              <div className="text-[10px] md:text-[11px] text-[#666] hover:text-white transition-colors truncate max-w-[120px] md:max-w-none">
                                {new URL(startup.website).hostname.replace(
                                  'www.',
                                  ''
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3 md:p-4 align-top">
                            <div className="flex items-center gap-2 text-[#999] text-xs">
                              <CalendarDays size={12} className="text-[#555]" />
                              <span>{startup.dateAnnounced}</span>
                            </div>
                          </td>
                          <td className="p-3 md:p-4 align-top">
                            <div className="flex flex-col items-start gap-1.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded border border-[#333] bg-black text-[10px] font-medium text-[#ccc] whitespace-nowrap">
                                {startup.roundType}
                              </span>
                              <span className="text-[10px] text-[#666] font-mono whitespace-nowrap">
                                {startup.fundingAmount}
                              </span>
                            </div>
                          </td>
                          <td className="hidden md:table-cell p-4 align-top">
                            <p className="text-[#888] text-sm leading-relaxed line-clamp-2">
                              {startup.description}
                            </p>
                          </td>
                          <td className="p-3 md:p-4 align-middle text-right">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-transparent group-hover:border-[#333] group-hover:bg-black text-[#666] transition-all">
                              <ArrowRight size={14} />
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="border-t border-[#333] bg-[#0A0A0A]/50 p-3 md:p-4 flex items-center justify-between">
                  <div className="text-[10px] text-[#666] font-medium hidden xs:block">
                    {filteredData.length > 0
                      ? `${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} / ${filteredData.length}`
                      : '0 results'}
                  </div>
                  <div className="flex items-center gap-1 w-full justify-between xs:w-auto xs:justify-end">
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-md hover:bg-[#222] text-[#666] disabled:opacity-30"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="flex gap-1 px-2">
                      {getPageNumbers().map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium ${
                            currentPage === page
                              ? 'bg-[#222] text-white border border-[#333]'
                              : 'text-[#666] hover:bg-[#111]'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage >= totalPages}
                      className="p-1.5 rounded-md hover:bg-[#222] text-[#666] disabled:opacity-30"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-between items-center text-[10px] text-[#444] pt-4 pb-20 md:pb-4">
            <div className="flex items-center gap-2">
              <Database size={10} />
              <span>Connected to Convex • Real-time data</span>
            </div>
            <span>
              {filteredData.length} results
              {filters.domain && ` for "${filters.domain}"`}
            </span>
          </div>
        </main>

        {/* Right Sidebar */}
        <aside
          className={`
            fixed inset-0 z-50 bg-black flex flex-col transition-all duration-300
            md:relative md:inset-auto md:bg-[#050505]/90 md:border-l md:border-[#333]
            ${
              isSidebarOpen
                ? 'translate-x-0 w-full md:w-80 opacity-100'
                : 'translate-x-full md:translate-x-0 w-full md:w-0 md:opacity-0 md:overflow-hidden'
            }
          `}
        >
          <div className="p-5 border-b border-[#333] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-emerald-500" />
              <h3 className="text-sm font-semibold text-white">
                Agent Parameters
              </h3>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-2 text-[#666] hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-8">
            {/* Timeline */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-[#666] uppercase tracking-wider flex items-center gap-2">
                  <Clock size={12} /> Timeline
                </label>
                <span className="text-[10px] text-emerald-500 font-mono">
                  {TIMELINE_STEPS.find(s => s.id === timeframe)?.label}
                </span>
              </div>

              <div className="flex flex-col gap-1 bg-[#0A0A0A] p-2 rounded-lg border border-[#222]">
                {TIMELINE_STEPS.map(step => {
                  const isActive = step.id === timeframe;
                  return (
                    <button
                      key={step.id}
                      onClick={() => {
                        setTimeframe(step.id);
                        setCurrentPage(1);
                      }}
                      className={`relative flex items-center px-3 py-2 rounded-md text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-[#1a1a1a] text-white'
                          : 'text-[#555] hover:text-[#888] hover:bg-[#111]'
                      }`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full mr-3 transition-colors ${
                          isActive ? 'bg-emerald-500' : 'bg-[#333]'
                        }`}
                      />
                      {step.label}
                      {isActive && (
                        <Activity size={12} className="absolute right-3 text-emerald-500/50" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filters */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-[#666] uppercase tracking-wider">
                Filters
              </label>

              <div className="space-y-1">
                <span className="text-[10px] text-[#666]">Domain / Industry</span>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. AI, Fintech, Bio"
                    value={filters.domain}
                    onChange={e =>
                      setFilters(prev => ({
                        ...prev,
                        domain: e.target.value,
                      }))
                    }
                    className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-xs text-white placeholder-[#444] focus:outline-none focus:border-emerald-500/50 pl-8"
                  />
                  <Search size={12} className="absolute left-2.5 top-2.5 text-[#444]" />
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="p-5 border-t border-[#333] bg-[#0A0A0A]/50">
            <button
              onClick={handleRunScan}
              className="w-full py-2.5 bg-white text-black text-xs font-bold uppercase tracking-wide rounded hover:bg-[#ccc] transition-colors flex items-center justify-center gap-2"
            >
              <Filter size={14} />
              Apply Filters
            </button>
          </div>
        </aside>
      </div>

      {/* Modal */}
      <StartupModal
        startup={selectedStartup}
        isOpen={!!selectedStartup}
        onClose={() => setSelectedStartup(null)}
      />
    </div>
  );
};
