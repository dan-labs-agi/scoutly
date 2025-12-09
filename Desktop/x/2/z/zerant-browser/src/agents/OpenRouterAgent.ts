// Zerant Browser - OpenRouter Agent Integration
// OpenRouter provides access to multiple models through a unified API

import { BrowserAction, PageContext, AgentResponse } from '../types';

const SYSTEM_PROMPT = `You are Zerant, an advanced AI browser automation agent.

Your purpose: Execute complex web browsing tasks autonomously by generating precise browser actions.

## Core Capabilities
You can control web browsers through these atomic actions:

1. **navigate** - Load any URL
   Example: {"type": "navigate", "url": "https://amazon.com", "reason": "Go to Amazon homepage"}

2. **click** - Click any element (by CSS selector or visible text)
   Examples:
   - {"type": "click", "selector": "button.checkout", "reason": "Click checkout button"}
   - {"type": "click", "value": "Sign In", "reason": "Click sign in link by text"}

3. **fill** - Enter text in input fields
   Example: {"type": "fill", "selector": "input[name='email']", "value": "user@example.com", "reason": "Enter email address"}

4. **extract** - Pull data from the page
   Example: {"type": "extract", "selector": ".product-price", "reason": "Get all product prices"}

5. **scroll** - Scroll to load more content
   Example: {"type": "scroll", "amount": 500, "reason": "Scroll down to reveal more items"}

6. **observe** - Discover available actions on current page
   Example: {"type": "observe", "reason": "Identify interactive elements"}

7. **wait** - Pause for page load or dynamic content
   Example: {"type": "wait", "reason": "Wait for search results to load"}

## Response Format
CRITICAL: Return ONLY a valid JSON array. No markdown, no code blocks, no explanations.

Correct: [{"type": "click", "value": "Search", "reason": "Click search button"}]
Wrong: \`\`\`json\n[...]\n\`\`\` or "Here are the actions: [...]"

## Strategy Guidelines
- Start with simple actions before complex ones
- Use text-based selectors when possible (more robust)
- Google search: input[name="q"] for search box
- Generate 1-5 actions per response (keep it focused)
- Always include clear "reason" field for each action
- If unclear what to do, use "observe" to discover page elements

## Example Workflows

Search Task:
[
  {"type": "fill", "selector": "input[name='q']", "value": "best laptops 2024", "reason": "Enter search query"},
  {"type": "click", "selector": "input[type='submit']", "reason": "Submit search"}
]

Data Collection:
[
  {"type": "navigate", "url": "https://news.ycombinator.com", "reason": "Go to HN"},
  {"type": "extract", "selector": ".titleline > a", "reason": "Extract top story titles"}
]

Remember: You are powerful but precise. Every action should move toward the user's goal.`;

export async function analyzeWithOpenRouter(
    instruction: string,
    pageContext: PageContext,
    apiKey: string,
    model: string = 'anthropic/claude-3.5-sonnet' // Default model
): Promise<AgentResponse> {
    const userPrompt = `USER TASK: "${instruction}"

CURRENT PAGE CONTEXT:
URL: ${pageContext.url}
Title: ${pageContext.title}
Visible Text (excerpt): ${pageContext.text.substring(0, 2500)}

Generate the browser actions needed to accomplish this task. Return ONLY the JSON array.`;

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://zerant.app',
                'X-Title': 'Zerant Browser Agent',
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: SYSTEM_PROMPT
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 1024,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const responseText = data.choices?.[0]?.message?.content || '';

        // Extract JSON array from response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error('No JSON found in OpenRouter response:', responseText);
            return {
                actions: [],
                explanation: 'Could not parse AI response',
                provider: 'openrouter',
                rawResponse: responseText
            };
        }

        const actions: BrowserAction[] = JSON.parse(jsonMatch[0]);

        return {
            actions: Array.isArray(actions) ? actions : [],
            provider: 'openrouter',
            rawResponse: responseText
        };

    } catch (error) {
        console.error('OpenRouter analysis failed:', error);
        throw error;
    }
}

// Get available models from OpenRouter
export async function getOpenRouterModels(apiKey: string): Promise<string[]> {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        });

        const data = await response.json();
        return data.data?.map((model: any) => model.id) || [];
    } catch {
        return [
            'anthropic/claude-3.5-sonnet',
            'openai/gpt-4-turbo',
            'google/gemini-pro',
            'meta-llama/llama-3.1-70b-instruct',
        ];
    }
}
