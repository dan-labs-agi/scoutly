// Zerant Browser - Lux Agent Integration
// Lux by AGI Open - World's Best Computer-Use Model

import { BrowserAction, PageContext, AgentResponse } from '../types';

// Lux Operating Modes
export type LuxMode = 'actor' | 'tasker' | 'thinker';

// Lux API Base URL (placeholder - will need actual endpoint)
const LUX_API_BASE = 'https://api.agiopen.org/v1';

// System prompts for each mode
const MODE_PROMPTS: Record<LuxMode, string> = {
    actor: `You are Lux in Actor mode. Execute immediate, well-defined browser tasks with near-instant speed.
Focus on: Speed, precision, single-action tasks.
Generate minimal, direct actions.`,

    tasker: `You are Lux in Tasker mode. Follow step-by-step instructions with ultra-stable, controllable execution.
Focus on: Reliability, step-by-step progression, clear feedback.
Execute each step methodically.`,

    thinker: `You are Lux in Thinker mode. Handle complex, vague goals with deep reasoning.
Focus on: Complex workflows, multi-step planning, autonomous decision-making.
Plan thoroughly before executing.`
};

// Mode-specific configurations
const MODE_CONFIG: Record<LuxMode, { temperature: number; maxTokens: number; timeout: number }> = {
    actor: { temperature: 0.1, maxTokens: 512, timeout: 15000 },      // Fast, precise
    tasker: { temperature: 0.3, maxTokens: 1024, timeout: 30000 },    // Balanced
    thinker: { temperature: 0.7, maxTokens: 4096, timeout: 120000 },  // Deep reasoning
};

export async function analyzeWithLux(
    instruction: string,
    pageContext: PageContext,
    apiKey: string,
    mode: LuxMode = 'actor'
): Promise<AgentResponse> {
    const config = MODE_CONFIG[mode];
    const systemPrompt = MODE_PROMPTS[mode];

    const prompt = `${systemPrompt}

PAGE URL: ${pageContext.url}
PAGE TITLE: ${pageContext.title}
PAGE CONTENT: ${pageContext.text.substring(0, mode === 'thinker' ? 4000 : 2000)}

USER TASK: "${instruction}"

Generate browser actions as a JSON array. Available actions: click, fill, navigate, extract, scroll, wait.
RESPOND WITH ONLY JSON. Example: [{"type": "click", "selector": "button.submit", "reason": "Submit form"}]`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        const response = await fetch(`${LUX_API_BASE}/computer-use/actions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'X-Lux-Mode': mode,
            },
            body: JSON.stringify({
                prompt: prompt,
                mode: mode,
                page_context: {
                    url: pageContext.url,
                    title: pageContext.title,
                    content: pageContext.text.substring(0, 5000),
                },
                generation_config: {
                    temperature: config.temperature,
                    max_tokens: config.maxTokens,
                },
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Lux API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Map Lux response to our action format
        const actions = mapLuxActionsToZerant(data.actions || data.result || []);

        return {
            actions,
            explanation: data.explanation || `Lux ${mode} mode executed`,
            provider: 'lux' as any, // Will add 'lux' to AgentProvider type
            rawResponse: JSON.stringify(data),
        };

    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw new Error(`Lux ${mode} mode timed out after ${config.timeout}ms`);
        }
        console.error(`Lux ${mode} analysis failed:`, error);
        throw error;
    }
}

// Alternative: Use OpenRouter/Gemini as fallback with Lux-style prompts
// This allows testing without actual Lux API access
export async function analyzeWithLuxFallback(
    instruction: string,
    pageContext: PageContext,
    apiKey: string,
    mode: LuxMode = 'actor',
    fallbackProvider: 'gemini' | 'openrouter' = 'gemini'
): Promise<AgentResponse> {
    const config = MODE_CONFIG[mode];
    const systemPrompt = MODE_PROMPTS[mode];

    const prompt = `${systemPrompt}

PAGE URL: ${pageContext.url}
PAGE TITLE: ${pageContext.title}
PAGE CONTENT: ${pageContext.text.substring(0, mode === 'thinker' ? 4000 : 2000)}

USER TASK: "${instruction}"

Generate browser actions as a JSON array. Available actions: click, fill, navigate, extract, scroll, wait.
RESPOND WITH ONLY JSON. No markdown, no explanation.
Example: [{"type": "click", "selector": "button.submit", "reason": "Submit form"}]`;

    // Use Gemini as fallback
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: config.temperature,
                    maxOutputTokens: config.maxTokens,
                },
            }),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Lux fallback error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON array from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
        return {
            actions: [],
            explanation: 'Could not parse Lux response',
            provider: 'lux' as any,
            rawResponse: responseText,
        };
    }

    const actions: BrowserAction[] = JSON.parse(jsonMatch[0]);

    return {
        actions: Array.isArray(actions) ? actions : [],
        explanation: `Lux ${mode} mode (via fallback)`,
        provider: 'lux' as any,
        rawResponse: responseText,
    };
}

// Map Lux's action format to Zerant's BrowserAction type
function mapLuxActionsToZerant(luxActions: any[]): BrowserAction[] {
    if (!Array.isArray(luxActions)) return [];

    return luxActions.map((action): BrowserAction => {
        // Handle different possible Lux action formats
        if (action.type) {
            // Already in our format
            return {
                type: action.type,
                selector: action.selector || action.target,
                value: action.value || action.text || action.input,
                url: action.url,
                amount: action.amount || action.scroll_amount,
                reason: action.reason || action.description || 'Lux action',
            };
        }

        // Handle Lux-specific formats (hypothetical based on computer-use patterns)
        if (action.action) {
            const actionType = action.action.toLowerCase();
            return {
                type: mapLuxActionType(actionType),
                selector: action.element || action.selector,
                value: action.text || action.value,
                url: action.url,
                reason: action.reason || 'Lux computer-use action',
            };
        }

        // Fallback
        return {
            type: 'observe',
            reason: 'Unrecognized Lux action format',
        };
    });
}

// Map Lux action types to our ActionType
function mapLuxActionType(luxType: string): BrowserAction['type'] {
    const typeMap: Record<string, BrowserAction['type']> = {
        'click': 'click',
        'type': 'fill',
        'input': 'fill',
        'fill': 'fill',
        'navigate': 'navigate',
        'goto': 'navigate',
        'scroll': 'scroll',
        'wait': 'wait',
        'extract': 'extract',
        'observe': 'observe',
    };
    return typeMap[luxType] || 'observe';
}

// Get mode description for UI
export function getLuxModeDescription(mode: LuxMode): string {
    const descriptions: Record<LuxMode, string> = {
        actor: 'Fast, immediate tasks with near-instant speed',
        tasker: 'Step-by-step instructions with stable execution',
        thinker: 'Complex goals with deep reasoning',
    };
    return descriptions[mode];
}
