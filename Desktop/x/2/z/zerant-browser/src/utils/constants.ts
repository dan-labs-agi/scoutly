// Zerant Browser - Constants

// API Endpoints
export const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
export const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// AI Models
export const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';
export const GEMINI_MODEL = 'gemini-2.0-flash';

// Default URLs
export const DEFAULT_URL = 'https://www.google.com';
export const DEFAULT_SEARCH_ENGINE = 'https://www.google.com/search?q=';

// Timeouts (ms)
export const AI_TIMEOUT = 30000;
export const ACTION_DELAY = 1500;
export const STATUS_DISPLAY_DURATION = 3000;

// Page Context Limits
export const MAX_TEXT_LENGTH = 5000;
export const MAX_HTML_LENGTH = 10000;

// Status Messages
export const STATUS_MESSAGES = {
    loading: '🔄 Loading...',
    thinking: '🤖 Agent thinking...',
    executing: '⚡ Executing actions...',
    success: '✅ Complete',
    error: '❌ Error occurred',
} as const;

// Action Icons
export const ACTION_ICONS = {
    click: '👆',
    fill: '✏️',
    navigate: '🔗',
    extract: '📋',
    scroll: '📜',
    wait: '⏳',
    observe: '👁️',
} as const;
