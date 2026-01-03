export interface Startup {
  id: string;
  name: string;
  fundingAmount: string;
  roundType: string;
  dateAnnounced: string;
  description: string;
  investors: string[];
  founders: string[]; // New field for job seekers
  website?: string;
  location?: string;
  contactEmail?: string;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    crunchbase?: string;
  };
  sources: string[];
  tags: string[];
}

export type Timeframe = 'today' | 'yesterday' | '2_days' | 'week' | 'month' | 'quarter';

export interface FilterConfig {
  onlyNew: boolean;
  minValuation?: string;
  maxValuation?: string;
  domain?: string;
  teamSize?: string;
  foundedYear?: string;
}

export interface SearchState {
  isLoading: boolean;
  error: string | null;
  data: Startup[];
  lastUpdated: Date | null;
  queryTime: number;
}