// Zerant Browser - Gemini Agent Integration

import { BrowserAction, PageContext, AgentResponse } from '../types';
import { GEMINI_MODEL, AI_TIMEOUT } from '../utils/constants';

const SYSTEM_PROMPT = `You are Zerant, an AI browser automation agent.

Generate browser actions based on user instructions and page context.

Available actions: click, fill, navigate, extract, scroll, wait

RESPOND WITH ONLY A JSON ARRAY. No markdown, no explanation.

Example: [{"type": "click", "selector": "button", "reason": "Click button"}]`;

export async function analyzeWithGemini(
    instruction: string,
    pageContext: PageContext,
    apiKey: string
): Promise<AgentResponse> {
    const prompt = `${SYSTEM_PROMPT}

PAGE URL: ${pageContext.url}
PAGE TITLE: ${pageContext.title}
PAGE TEXT: ${pageContext.text.substring(0, 2000)}

USER WANTS: "${instruction}"

Generate actions as JSON array:`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 1024,
                    }
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Extract JSON array from response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error('No JSON found in Gemini response:', responseText);
            return {
                actions: [],
                explanation: 'Could not parse AI response',
                provider: 'gemini',
                rawResponse: responseText
            };
        }

        const actions: BrowserAction[] = JSON.parse(jsonMatch[0]);

        return {
            actions: Array.isArray(actions) ? actions : [],
            provider: 'gemini',
            rawResponse: responseText
        };

    } catch (error) {
        console.error('Gemini analysis failed:', error);
        throw error;
    }
}

// Summarize page content
export async function summarizeWithGemini(
    pageText: string,
    apiKey: string
): Promise<string> {
    const prompt = `Summarize this webpage content in 2-3 sentences:\n\n${pageText.substring(0, 3000)}`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.5,
                        maxOutputTokens: 200,
                    }
                }),
            }
        );

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Summary unavailable';
    } catch {
        return 'Summary unavailable';
    }
}

// Explain for demo purposes
export async function explainWithGemini(
    instruction: string,
    pageContext: string,
    apiKey: string
): Promise<string> {
    const prompt = `You are explaining what a browser agent should do.

User wants: "${instruction}"
Page contains: ${pageContext.substring(0, 1500)}

Explain the steps needed in 2-3 sentences.`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 200,
                    }
                }),
            }
        );

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No explanation available';
    } catch {
        return 'Unable to generate explanation';
    }
}
