/**
 * AI Chat Interface - Real-time search using existing scrapers
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Sparkles, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Startup } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  startups?: Startup[];
  currentPage?: number;
}

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get stats (reactive)
  const stats = useQuery(api.queries.startups.getStats, {});

  // Unified scraper action - scrapes all 15 sources in parallel
  const scrapeAllAction = useAction(api.actions.scrapeAll.scrapeAll);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsScraping(true);

    try {
      // Parse intent
      const query = input.trim();

      // Add "scraping" message immediately
      const scrapingMessage: Message = {
        id: (Date.now() + 0.5).toString(),
        role: 'assistant',
        content: 'Scraping 15 sources in real-time... This may take 10-20 seconds.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, scrapingMessage]);

      // Call the unified scrapeAll action - runs 15 scrapers in parallel
      console.log('[Chat] Calling scrapeAll with query:', query);
      const result = await scrapeAllAction({ query, daysBack: 7 });
      
      console.log(`[Chat] scrapeAll completed: ${result.summary.successfulSources}/${result.summary.totalSources} sources, ${result.summary.uniqueAfterDedup} unique startups`);

      // Convert scraped data to Startup type for display
      const startups: Startup[] = result.startups.map((s, idx) => ({
        id: `startup-${idx}-${Date.now()}`,
        name: s.name,
        description: s.description,
        fundingAmount: s.fundingAmount || 'Undisclosed',
        roundType: 'Unknown', // StartupData doesn't have roundType
        dateAnnounced: s.dateAnnounced || new Date().toISOString().split('T')[0],
        tags: s.tags || [],
        location: s.location || 'Unknown',
        website: s.website,
        investors: [],
        founders: [],
        sources: s.sources || [],
      }));

      // Generate response with summary
      const summaryText = generateSummary(query, startups, result.summary);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: summaryText,
        timestamp: Date.now(),
        startups: startups.slice(0, 20), // Show top 20 results
      };

      // Remove scraping message and add results
      setMessages(prev => prev.filter(m => m.id !== scrapingMessage.id).concat(assistantMessage));

      if (startups.length > 0) {
        setSelectedStartup(startups[0]);
      }
    } catch (error) {
      console.error('[Chat] Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsScraping(false);
    }
  };

  const filterStartupsByQuery = (query: string, startups: Startup[]): Startup[] => {
    const keywords = extractKeywords(query);

    return startups.filter((s: Startup) => {
      const text = `${s.name} ${s.description} ${s.tags.join(' ')}`.toLowerCase();
      return keywords.some(kw => text.includes(kw));
    }).slice(0, 20);
  };

  const extractKeywords = (query: string): string[] => {
    const lowerQuery = query.toLowerCase();

    // Add full query
    const keywords: string[] = [];
    keywords.push(lowerQuery);

    // Extract individual terms
    const terms = lowerQuery.split(/\s+/).filter(t => t.length > 2);
    keywords.push(...terms);

    // Domain detection
    const domains = ['ai', 'fintech', 'saas', 'biotech', 'crypto', 'climate', 'healthcare', 'ecommerce', 'devtools'];
    domains.forEach(domain => {
      if (lowerQuery.includes(domain)) {
        keywords.push(domain);
      }
    });

    return Array.from(new Set(keywords));
  };

  // Generate summary text from scrapeAll results
  const generateSummary = (query: string, startups: Startup[], summary: any): string => {
    const { successfulSources, totalSources, failedSources, uniqueAfterDedup, executionTimeMs } = summary;
    
    if (startups.length === 0) {
      return `No startups found matching "${query}".\n\n` +
        `Scraped ${successfulSources}/${totalSources} sources in ${(executionTimeMs / 1000).toFixed(1)}s.\n\n` +
        `Try a different search term like "AI", "fintech", or "SaaS".`;
    }

    let text = `Found **${uniqueAfterDedup} startups** matching "${query}"\n\n`;
    text += `Scraped ${successfulSources}/${totalSources} sources in ${(executionTimeMs / 1000).toFixed(1)}s`;
    
    if (failedSources > 0) {
      text += ` (${failedSources} failed)`;
    }
    text += '\n\n';

    // Show top results
    const topResults = startups.slice(0, 10);
    text += topResults.map((s, i) => {
      const funding = s.fundingAmount && s.fundingAmount !== 'Undisclosed' 
        ? ` - ${s.fundingAmount}` 
        : '';
      const source = s.sources?.length ? ` [${s.sources.join(', ')}]` : '';
      return `${i + 1}. **${s.name}**${funding}${source}\n   ${s.description.substring(0, 100)}...`;
    }).join('\n\n');

    if (startups.length > 10) {
      text += `\n\n... and ${startups.length - 10} more`;
    }

    return text;
  };

  const generateResponse = (query: string, startups: Startup[], dbStats: any): string => {
    const lowerQuery = query.toLowerCase();
    const totalStartups = startups.length;

    // Show count
    if (totalStartups > 0) {
      const result = `Found ${totalStartups} startups matching your query:\n\n` +
        startups.slice(0, 10).map((s, i) =>
          `${i + 1}. **${s.name}** - ${s.description.substring(0, 100)}... (${s.fundingAmount} ${s.roundType})`
        ).join('\n\n');

      return result;
    }

    if (lowerQuery.includes('show me') || lowerQuery.includes('list') || lowerQuery.includes('what')) {
      if (totalStartups > 0) {
        return `Found ${totalStartups} startups in my database.\n\n` +
          `I can show you:\n\n` +
          `• Filter by domain: "AI Agents", "Fintech", "SaaS"\n` +
          `• Filter by funding stage: "Series A", "Seed", "Bootstrapped"\n` +
          `• Sort by date: Newest or oldest"\n`;
          `• Or just ask me to search for something specific like "AI startups raised Series A"`;
      }
    }

    if (lowerQuery.includes('funding') || lowerQuery.includes('raised')) {
      if (totalStartups > 0) {
        const funded = startups.filter(s => s.fundingAmount && s.fundingAmount !== 'Undisclosed').slice(0, 10);

        if (funded.length > 0) {
          return `Found ${funded.length} startups with funding:\n\n` +
            funded.map((s, i) =>
              `${i + 1}. **${s.name}**\n   ${s.description.substring(0, 80)}\n   ${s.fundingAmount} (${s.roundType})\n   ${s.dateAnnounced} ${s.location})`
            ).join('\n\n');
        }
      }
    }

    // Domain-specific queries
    const domains = ['ai', 'fintech', 'saas', 'biotech', 'crypto', 'climate', 'healthcare', 'ecommerce', 'devtools'];
    const matchedDomain = domains.find(d => lowerQuery.includes(d));

    if (matchedDomain) {
      const domainStartups = startups.filter((s: Startup) =>
        s.tags.some((t: string) => t.toLowerCase() === matchedDomain)
      ).slice(0, 8);

      if (domainStartups.length > 0) {
        return `Found ${domainStartups.length} ${matchedDomain.toUpperCase()} startups:\n\n` +
          domainStartups.map((s, i) =>
            `${i + 1}. **${s.name}** - ${s.description.substring(0, 80)}...`
          ).join('\n\n');
      }
    }

    // Recent queries
    if (lowerQuery.includes('recent') || lowerQuery.includes('new') || lowerQuery.includes('latest')) {
      const recent = [...startups]
        .sort((a, b) => new Date(b.dateAnnounced).getTime() - new Date(a.dateAnnounced).getTime())
        .slice(0, 10);

      if (recent.length > 0) {
        return `Here are the ${recent.length} most recent startups:\n\n` +
          recent.map((s, i) =>
            `${i + 1}. **${s.name}** - ${s.description.substring(0, 80)}... (${s.dateAnnounced})`
          ).join('\n\n');
      }
    }

    if (lowerQuery.includes('series a') || lowerQuery.includes('series a')) {
      const seriesA = startups.filter((s: Startup) =>
        s.roundType?.toLowerCase().includes('series a')
      ).slice(0, 8);

      if (seriesA.length > 0) {
        return `Found ${seriesA.length} Series A startups:\n\n` +
          seriesA.map((s, i) =>
            `${i + 1}. **${s.name}**\n   ${s.fundingAmount} • ${s.location} (${s.dateAnnounced})`
          ).join('\n\n');
      }
    }

    if (lowerQuery.includes('seed')) {
      const seed = startups.filter((s: Startup) =>
        (s.roundType?.toLowerCase().includes('seed') ||
         s.fundingAmount?.toLowerCase().includes('seed') ||
         s.roundType?.toLowerCase().includes('pre-seed'))
      ).slice(0, 8);

      if (seed.length > 0) {
        return `Found ${seed.length} Seed/Pre-Seed startups:\n\n` +
          seed.map((s, i) =>
            `${i + 1}. **${s.name}**\n   ${s.description.substring(0, 80)}\n   ${s.fundingAmount}\n   ${s.roundType}`
          ).join('\n\n');
      }
    }

    return `I searched through ${totalStartups} startups in my database (${stats?.totalStartups || 0} total).\n\n` +
      `You can search:\n\n` +
      `• By domain (e.g., "AI Agents", "Fintech", "SaaS")\n` +
      `• By funding (e.g., "Series A", "Seed", "Bootstrapped")\n` +
      `• By recency (e.g., "Recent", "Last 7 days")\n\n`;
  };

  const clearChat = () => {
    setMessages([]);
    setSelectedStartup(null);
    setInput('');
  };

  const handlePageChange = (messageId: string, newPage: number, totalPages: number) => {
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, currentPage: Math.max(1, Math.min(newPage, totalPages)) } : m
    ));
  };

  return (
    <div className="min-h-screen bg-transparent text-white selection:bg-white selection:text-black font-sans flex flex-col">
      {/* Header */}
      <div className="border-b border-[#333] bg-black/60 backdrop-blur-md sticky top-0 z-40 h-14 flex-none">
        <div className="w-full px-4 md:px-6 h-full flex items-center justify-between">
          <div className="flex items-end gap-2 cursor-pointer group select-none">
            <h1 className="text-sm font-bold tracking-tight text-white group-hover:text-emerald-400 transition-colors">
              scoutly AI
            </h1>
            <span className="text-[10px] text-[#666] mb-[2px] font-medium group-hover:text-[#888]">
              by dan
            </span>
          </div>
          <button onClick={clearChat} className="text-[10px] text-[#666] hover:text-white transition-colors flex items-center gap-1">
            <X size={14} />
            Clear
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-4xl mx-auto">
          {/* Welcome Message */}
          {messages.length === 0 && (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                AI Startup Search
              </h2>
              <p className="text-[#888] text-sm max-w-md mx-auto mb-8">
                Real-time search across 15 data sources. I'll scrape fresh data when you ask.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setInput('Show me funded startups')}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Funded Startups
                </button>
                <button
                  onClick={() => setInput('AI Startups')}
                  className="px-4 py-2 bg-[#111] text-white text-sm rounded-lg border border-[#222] hover:bg-[#222] transition-colors"
                >
                  AI Startups
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'user' && (
                  <div className="max-w-[80%] bg-emerald-600 text-white rounded-2xl rounded-tl-lg p-4">
                    {message.content}
                  </div>
                )}
                {message.role === 'assistant' && (
                  <div className="max-w-[80%] space-y-3">
                    <div className="bg-[#111] text-white rounded-2xl rounded-tl-lg p-4">
                      <div className="text-xs text-[#666] mb-2">
                        AI Scout • {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="text-[#ccc] whitespace-pre-wrap">{message.content}</div>
                    </div>
                    
                    {/* Startup Results */}
                    {message.startups && message.startups.length > 0 && (() => {
                      const ITEMS_PER_PAGE = 5;
                      const totalPages = Math.ceil(message.startups.length / ITEMS_PER_PAGE);
                      const currentPage = message.currentPage || 1;
                      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                      const endIndex = startIndex + ITEMS_PER_PAGE;
                      const visibleStartups = message.startups.slice(startIndex, endIndex);

                      const pageNumbers: (number | string)[] = [];
                      for (let i = 1; i <= totalPages; i++) {
                        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                          pageNumbers.push(i);
                        } else if (pageNumbers[pageNumbers.length - 1] !== '...') {
                          pageNumbers.push('...');
                        }
                      }

                      return (
                        <div className="bg-[#0A0A0A] border border-[#222] rounded-lg p-4">
                          <div className="text-[10px] text-[#666] uppercase tracking-wider mb-3 flex items-center justify-between">
                            <span>Found {message.startups.length} startups (Page {currentPage}/{totalPages})</span>
                            <button
                              onClick={() => setMessages(prev => prev.filter(m => m.id !== message.id))}
                              className="text-[#666] hover:text-[#888] transition-colors flex items-center gap-1"
                            >
                              Close
                            </button>
                          </div>
                          <div className="space-y-2">
                            {visibleStartups.map((s: Startup) => (
                              <div
                                key={s.id}
                                onClick={() => setSelectedStartup(s)}
                                className="bg-[#222] border border-[#333] rounded-lg p-4 hover:border-emerald-500/50 cursor-pointer transition-colors"
                              >
                                <div className="text-white font-medium mb-1">{s.name}</div>
                                <div className="text-[#888] text-xs mb-2">{s.dateAnnounced}</div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="px-2 py-1 bg-emerald-900/30 text-emerald-400 rounded text-xs">{s.roundType}</span>
                                  {s.fundingAmount && s.fundingAmount !== 'Undisclosed' && (
                                    <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs">{s.fundingAmount}</span>
                                  )}
                                </div>
                                <p className="text-[#666] text-sm line-clamp-2">{s.description}</p>
                              </div>
                            ))}
                          </div>
                          
                          {/* Pagination Controls */}
                          {totalPages > 1 && (
                            <div className="mt-4 flex items-center justify-center gap-2">
                              <button
                                onClick={() => handlePageChange(message.id, currentPage - 1, totalPages)}
                                disabled={currentPage === 1}
                                className={`p-2 rounded-lg transition-colors ${
                                  currentPage === 1 
                                    ? 'bg-[#222] text-[#444] cursor-not-allowed' 
                                    : 'bg-[#333] text-white hover:bg-[#444]'
                                }`}
                              >
                                <ChevronLeft size={16} />
                              </button>
                              
                              <div className="flex gap-1">
                                {pageNumbers.map((pageNum, idx) => {
                                  if (pageNum === '...') {
                                    return (
                                      <span key={`ellipsis-${idx}`} className="px-2 py-2 text-[#666]">...</span>
                                    );
                                  }
                                  
                                  const num = pageNum as number;
                                  const isCurrentPage = num === currentPage;
                                  
                                  return (
                                    <button
                                      key={num}
                                      onClick={() => handlePageChange(message.id, num, totalPages)}
                                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                        isCurrentPage
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-[#333] text-[#888] hover:bg-[#444] hover:text-white'
                                      }`}
                                    >
                                      {num}
                                    </button>
                                  );
                                })}
                              </div>
                              
                              <button
                                onClick={() => handlePageChange(message.id, currentPage + 1, totalPages)}
                                disabled={currentPage === totalPages}
                                className={`p-2 rounded-lg transition-colors ${
                                  currentPage === totalPages 
                                    ? 'bg-[#222] text-[#444] cursor-not-allowed' 
                                    : 'bg-[#333] text-white hover:bg-[#444]'
                                }`}
                              >
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-center py-8">
                <div className="flex items-center gap-3">
                  <Loader2 size={20} className="animate-spin text-emerald-500" />
                  <span className="text-[#666] text-sm">
                    {isScraping ? 'Scraping 15 sources...' : 'Processing results...'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Scroll to bottom */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-[#333] bg-[#0A0A0A]/90 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about startups (e.g., 'AI Agents', 'SaaS', 'Biotech')"
                className="w-full bg-[#111] text-white placeholder-[#555] rounded-xl px-4 py-3 border border-[#222] focus:outline-none focus:border-emerald-500/50 transition-colors text-sm"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all ${
                input.trim() && !isLoading && !isScraping
                  ? 'bg-emerald-500 text-black font-semibold hover:bg-emerald-600'
                  : 'bg-[#333] text-[#666] cursor-not-allowed'
              }`}
            >
              {isLoading || isScraping ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
