// Zerant AI Mobile Browser - Type Definitions

// ============================================
// Browser Action Types (Stagehand-inspired)
// ============================================

export type ActionType = 'click' | 'fill' | 'navigate' | 'extract' | 'scroll' | 'wait' | 'observe';

export interface BrowserAction {
    type: ActionType;
    selector?: string;
    value?: string;
    url?: string;
    amount?: number;
    reason: string;
    success?: boolean;
    error?: string;
}

// ============================================
// Page Context
// ============================================

export interface PageContext {
    url: string;
    title: string;
    text: string;
    html: string;
    timestamp: string;
}

// ============================================
// Agent Types
// ============================================

export type AgentProvider = 'claude' | 'gemini' | 'openai' | 'openrouter' | 'lux';

export type LuxMode = 'actor' | 'tasker' | 'thinker';

export interface AgentConfig {
    provider: AgentProvider;
    model: string;
    apiKey: string;
    maxTokens?: number;
    temperature?: number;
    luxMode?: LuxMode; // For Lux provider
}

export interface AgentResponse {
    actions: BrowserAction[];
    explanation?: string;
    provider: AgentProvider;
    rawResponse?: string;
}

// ============================================
// Message Types (WebView Communication)
// ============================================

export type WebViewMessageType =
    | 'agent_ready'
    | 'context'
    | 'action_executed'
    | 'action_error'
    | 'extraction';

export interface WebViewMessage {
    type: WebViewMessageType;
    data?: any;
    action?: BrowserAction;
    success?: boolean;
    error?: string;
    url?: string;
    title?: string;
}

// ============================================
// App State Types
// ============================================

export type AppMode = 'browser' | 'agent';

export type StatusType = 'idle' | 'loading' | 'thinking' | 'executing' | 'success' | 'error';

export interface AppStatus {
    type: StatusType;
    message: string;
}

export interface ActionLogEntry {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'thinking';
    timestamp: Date;
}

// ============================================
// Chat Types
// ============================================

export interface ChatMessage {
    id: string;
    role: 'user' | 'agent';
    content: string;
    actions?: BrowserAction[];
    timestamp: Date;
    isThinking?: boolean;
}

// ============================================
// Theme Colors
// ============================================

export const COLORS = {
    // Base - Midnight Glass Theme
    background: '#000000', // Pure Black
    backgroundSecondary: '#1c1c1e', // Apple System Gray 6
    surface: 'rgba(28, 28, 30, 0.6)', // Glass Surface
    surfaceLight: 'rgba(44, 44, 46, 0.6)', // Lighter Glass

    // Text
    textPrimary: '#ffffff', // White
    textSecondary: '#8e8e93', // Apple System Gray
    textMuted: '#636366', // Apple System Gray 2

    // Borders
    border: 'rgba(255, 255, 255, 0.1)', // Subtle White Border
    borderLight: 'rgba(255, 255, 255, 0.15)',

    // Accents (Apple-style)
    primary: '#0a84ff', // Apple Blue
    primaryDark: '#007aff',

    success: '#30d158', // Apple Green
    error: '#ff453a', // Apple Red
    warning: '#ffd60a', // Apple Yellow

    // Agent State Colors
    thinking: '#bf5af2', // Apple Purple
    executing: '#30d158', // Apple Green
    error_state: '#ff453a', // Apple Red

    // UI Accents
    accent: '#0a84ff',
    accentSecondary: '#5e5ce6', // Apple Indigo
} as const;

// ... existing colors ...

export interface Tab {
    id: string;
    url: string;
    title: string;
    mode: AppMode;
    loading: boolean;
    actions: ActionLogEntry[];
    pageContext: PageContext | null;
    query: string;
    statusType: StatusType;
    statusMessage: string;
    screenshot?: string; // For tab switcher preview
}

export interface TabState {
    tabs: Tab[];
    activeTabId: string;
}

