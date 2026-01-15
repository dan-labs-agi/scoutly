import { LLMMessage, LLMCompletion } from '../types/index.js'
import { v4 as uuidv4 } from 'uuid'

interface OpenRouterResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class LLMService {
  private apiKey: string
  private model: string
  private baseUrl = 'https://openrouter.ai/api/v1'

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || ''
    this.model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-sonnet-20240229'
  }

  async complete(messages: LLMMessage[]): Promise<LLMCompletion> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Agent8',
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature: 0.7,
        max_tokens: 4096,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenRouter API error: ${error}`)
    }

    const data: OpenRouterResponse = await response.json()
    const choice = data.choices[0]

    return {
      content: choice.message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    }
  }

  async generateWorkflowPrompt(userPrompt: string, context?: string): Promise<string> {
    const systemMessage = `You are an expert n8n workflow architect. Your job is to understand user automation requests and design precise n8n workflows.

## Your Process:
1. Understand the user's automation goal
2. Identify the trigger (webhook, schedule, event, manual)
3. Plan the action steps in order
4. Design the workflow structure

## Rules:
- Always include a trigger node
- Use native n8n nodes when possible
- For external services, use HTTP Request nodes with Composio integration
- Keep workflows simple and focused
- Maximum 12 nodes for MVP

## Response Format:
Return a JSON object describing the workflow:
\`\`\`json
{
  "name": "workflow-name",
  "nodes": [
    {
      "id": "1",
      "name": "Trigger Name",
      "type": "n8n-nodes-base.webhook",
      "position": [100, 200],
      "parameters": {}
    }
  ],
  "connections": {
    "1": {
      "main": [[{ "node": "2", "type": "main", "index": 0 }]]
    }
  }
}
\`\`\`

${context ? `## Context from previous messages:
${context}
` : ''}

Now, create an n8n workflow for this request: "${userPrompt}"

If anything is unclear, ask clarifying questions instead of guessing.`

    const result = await this.complete([
      { role: 'system', content: systemMessage },
      { role: 'user', content: userPrompt },
    ])

    return result.content
  }

  async askClarification(
    userPrompt: string,
    missingInfo: string[]
  ): Promise<{ questions: string[]; suggestions: Record<string, string[]> }> {
    const systemMessage = `You are helping clarify an automation request. The user wants to automate: "${userPrompt}"

The following information is needed:
${missingInfo.map(info => `- ${info}`).join('\n')}

Ask up to 5 clear, specific questions to gather this information. Provide options where helpful.

Return a JSON object:
\`\`\`json
{
  "questions": ["Question 1?", "Question 2?"],
  "suggestions": {
    "question_field": ["option1", "option2"]
  }
}
\`\`\``

    const result = await this.complete([
      { role: 'system', content: systemMessage },
      { role: 'user', content: 'Please ask your questions.' },
    ])

    // Parse the JSON from the response
    const jsonMatch = result.content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0])
      } catch {
        return { questions: missingInfo, suggestions: {} }
      }
    }

    return { questions: missingInfo, suggestions: {} }
  }

  async analyzeIntent(userPrompt: string): Promise<{
    goal: string
    trigger: string
    actions: string[]
    clarifications: string[]
  }> {
    const systemMessage = `Analyze this automation request: "${userPrompt}"

Extract and return JSON:
\`\`\`json
{
  "goal": "Brief description of what they want",
  "trigger": "webhook|schedule|event|manual",
  "actions": ["action1", "action2"],
  "clarifications": ["what specific service?", "which account?"]
}
\`\`\``

    const result = await this.complete([
      { role: 'system', content: systemMessage },
      { role: 'user', content: 'Analyze this request.' },
    ])

    const jsonMatch = result.content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0])
      } catch {
        throw new Error('Failed to parse intent analysis')
      }
    }

    throw new Error('No JSON found in response')
  }
}

export const llmService = new LLMService()
