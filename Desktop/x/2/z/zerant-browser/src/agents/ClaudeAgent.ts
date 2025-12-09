// Zerant Browser - Claude Agent Integration

import { BrowserAction, PageContext, AgentResponse } from '../types';
import { CLAUDE_MODEL, AI_TIMEOUT } from '../utils/constants';

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

export async function analyzeWithClaude(
    instruction: string,
    pageContext: PageContext,
    apiKey: string
): Promise<AgentResponse> {
    const userPrompt = `USER INSTRUCTION: "${instruction}"

CURRENT PAGE:
URL: ${pageContext.url}
Title: ${pageContext.title}
Visible Text (first 2000 chars): ${pageContext.text.substring(0, 2000)}

Generate actions to accomplish the user's goal. Return ONLY a JSON array.`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: CLAUDE_MODEL,
                max_tokens: 1024,
                system: SYSTEM_PROMPT,
                messages: [{
                    role: 'user',
                    content: userPrompt
                }]
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Claude API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const responseText = data.content?.[0]?.text || '';

        // Extract JSON array from response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error('No JSON found in Claude response:', responseText);
            return {
                actions: [],
                explanation: 'Could not parse AI response',
                provider: 'claude',
                rawResponse: responseText
            };
        }

        const actions: BrowserAction[] = JSON.parse(jsonMatch[0]);

        return {
            actions: Array.isArray(actions) ? actions : [],
            provider: 'claude',
            rawResponse: responseText
        };

    } catch (error) {
        console.error('Claude analysis failed:', error);
        throw error;
    }
}

// Explain an action (for UI feedback)
export async function explainAction(
    action: BrowserAction,
    apiKey: string
): Promise<string> {
    const prompt = `Explain this browser action in one short sentence: ${JSON.stringify(action)}`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: CLAUDE_MODEL,
                max_tokens: 100,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            }),
        });

        const data = await response.json();
        return data.content?.[0]?.text || action.reason;
    } catch {
        return action.reason;
    }
}
