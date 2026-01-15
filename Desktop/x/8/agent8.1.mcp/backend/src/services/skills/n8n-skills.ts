import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import type {
  N8nSkill,
  N8nSkillAction,
  N8nSkillPattern,
  N8nSkillMatch,
} from '../../types/mcp.js'

interface SkillConfig {
  enabled: boolean
  skillsPath?: string
  maxCacheAge: number // milliseconds
}

interface CachedSkill {
  skills: N8nSkill[]
  loadedAt: Date
}

// Default skill patterns for common automation scenarios
const DEFAULT_SKILLS: N8nSkill[] = [
  {
    id: 'email-notification',
    name: 'Email Notification',
    description: 'Send email notifications when events occur',
    category: 'communication',
    triggers: ['webhook', 'schedule', 'github', 'form'],
    actions: [
      {
        name: 'Send Email',
        type: 'gmail',
        description: 'Send an email via Gmail',
        config: {
          resource: 'message',
          operation: 'send',
        },
      },
    ],
    pattern: {
      structure: 'trigger → filter → email',
      nodes: ['webhook', 'set', 'gmail'],
      connections: ['main'],
      transformations: ['format_data'],
    },
    examples: [
      'Send me an email when a webhook is triggered',
      'Email me when a new form is submitted',
      'Send a summary email every morning',
    ],
  },
  {
    id: 'slack-notification',
    name: 'Slack Notification',
    description: 'Send Slack messages when events occur',
    category: 'communication',
    triggers: ['webhook', 'schedule', 'github', 'database'],
    actions: [
      {
        name: 'Send Slack Message',
        type: 'slack',
        description: 'Post a message to Slack',
        config: {
          resource: 'message',
          operation: 'post',
        },
      },
    ],
    pattern: {
      structure: 'trigger → format → slack',
      nodes: ['webhook', 'set', 'slack'],
      connections: ['main'],
      transformations: ['format_message'],
    },
    examples: [
      'Post to Slack when a webhook is called',
      'Notify #alerts when a database change is detected',
      'Send a daily summary to Slack',
    ],
  },
  {
    id: 'github-automation',
    name: 'GitHub Automation',
    description: 'Automate GitHub workflows and issue management',
    category: 'development',
    triggers: ['webhook', 'schedule'],
    actions: [
      {
        name: 'GitHub Action',
        type: 'github',
        description: 'Perform GitHub operations',
        config: {
          resource: 'issue',
          operation: 'get',
        },
      },
    ],
    pattern: {
      structure: 'github-webhook → process → action',
      nodes: ['webhook', 'github', 'set'],
      connections: ['main'],
      transformations: ['parse_payload'],
    },
    examples: [
      'When a GitHub issue is opened, summarize it',
      'Label new issues automatically',
      'Close issues when PRs are merged',
    ],
  },
  {
    id: 'data-sync',
    name: 'Data Synchronization',
    description: 'Sync data between different services',
    category: 'data',
    triggers: ['schedule', 'webhook'],
    actions: [
      {
        name: 'HTTP Request',
        type: 'httpRequest',
        description: 'Make HTTP requests to fetch/send data',
        config: {
          method: 'GET',
        },
      },
      {
        name: 'Airtable',
        type: 'airtable',
        description: 'Read/write to Airtable',
        config: {
          resource: 'record',
          operation: 'get',
        },
      },
    ],
    pattern: {
      structure: 'trigger → fetch → transform → store',
      nodes: ['schedule', 'httpRequest', 'set', 'airtable'],
      connections: ['main'],
      transformations: ['map_fields'],
    },
    examples: [
      'Sync data between Airtable and another service',
      'Fetch and store data from an API on a schedule',
      'Update records when external data changes',
    ],
  },
  {
    id: 'form-processing',
    name: 'Form Processing',
    description: 'Process form submissions and take action',
    category: 'data',
    triggers: ['webhook'],
    actions: [
      {
        name: 'Filter',
        type: 'set',
        description: 'Validate and filter data',
        config: {},
      },
      {
        name: 'Store Data',
        type: 'airtable',
        description: 'Store in database',
        config: {
          resource: 'record',
          operation: 'create',
        },
      },
      {
        name: 'Notify',
        type: 'slack',
        description: 'Send notification',
        config: {
          resource: 'message',
        },
      },
    ],
    pattern: {
      structure: 'form-webhook → validate → store → notify',
      nodes: ['webhook', 'set', 'airtable', 'slack'],
      connections: ['main'],
      transformations: ['extract_fields', 'format_message'],
    },
    examples: [
      'When someone fills out a form, add them to Airtable and notify me',
      'Process Typeform submissions',
      'Store form data and send a confirmation',
    ],
  },
  {
    id: 'scheduled-report',
    name: 'Scheduled Report',
    description: 'Generate and send reports on a schedule',
    category: 'reporting',
    triggers: ['schedule', 'cron'],
    actions: [
      {
        name: 'Fetch Data',
        type: 'httpRequest',
        description: 'Fetch data for report',
        config: {
          method: 'GET',
        },
      },
      {
        name: 'Process Data',
        type: 'code',
        description: 'Transform and calculate metrics',
        config: {
          jsCode: 'return [{ json: { summary: $input.all() } }];',
        },
      },
      {
        name: 'Send Report',
        type: 'gmail',
        description: 'Email the report',
        config: {
          resource: 'message',
        },
      },
    ],
    pattern: {
      structure: 'schedule → fetch → process → email',
      nodes: ['scheduleTrigger', 'httpRequest', 'code', 'gmail'],
      connections: ['main'],
      transformations: ['aggregate', 'format_report'],
    },
    examples: [
      'Send a daily summary email',
      'Weekly report every Monday',
      'Monthly metrics report',
    ],
  },
  {
    id: 'webhook-listener',
    name: 'Webhook Listener',
    description: 'Receive and process webhook requests',
    category: 'integration',
    triggers: ['webhook'],
    actions: [
      {
        name: 'Validate',
        type: 'set',
        description: 'Validate incoming data',
        config: {},
      },
      {
        name: 'Process',
        type: 'code',
        description: 'Process the webhook data',
        config: {
          jsCode: '// Custom processing logic\nreturn $input.all();',
        },
      },
    ],
    pattern: {
      structure: 'webhook → validate → process → response',
      nodes: ['webhook', 'set', 'code'],
      connections: ['main'],
      transformations: ['parse_payload'],
    },
    examples: [
      'Receive webhook and process the data',
      'Validate incoming form submissions',
      'Handle Stripe webhooks',
    ],
  },
  {
    id: 'database-query',
    name: 'Database Query',
    description: 'Query databases and take action on results',
    category: 'data',
    triggers: ['schedule', 'webhook'],
    actions: [
      {
        name: 'Query Database',
        type: 'database',
        description: 'Execute SQL query',
        config: {
          resource: 'query',
          operation: 'execute',
        },
      },
      {
        name: 'Conditional Action',
        type: 'set',
        description: 'Branch based on results',
        config: {},
      },
    ],
    pattern: {
      structure: 'trigger → query → branch → action',
      nodes: ['schedule', 'database', 'set'],
      connections: ['main'],
      transformations: ['filter_results'],
    },
    examples: [
      'Query database on a schedule and email results',
      'Check for new records and notify',
      'Run SQL and process results',
    ],
  },
]

export class N8nSkillsLoader {
  private config: SkillConfig
  private cachedSkills: CachedSkill | null = null
  private skillsIndex: Map<string, N8nSkill> = new Map()
  private categoryIndex: Map<string, N8nSkill[]> = new Map()

  constructor(config?: Partial<SkillConfig>) {
    this.config = {
      enabled: true,
      skillsPath: path.resolve(process.cwd(), 'n8n-skills'),
      maxCacheAge: 3600000, // 1 hour
      ...config,
    }

    // Build indexes
    this.buildIndexes()
  }

  /**
   * Build lookup indexes for efficient skill retrieval
   */
  private buildIndexes(): void {
    DEFAULT_SKILLS.forEach((skill) => {
      this.skillsIndex.set(skill.id, skill)
      this.skillsIndex.set(skill.name.toLowerCase().replace(/\s+/g, '-'), skill)

      if (!this.categoryIndex.has(skill.category)) {
        this.categoryIndex.set(skill.category, [])
      }
      this.categoryIndex.get(skill.category)!.push(skill)
    })
  }

  /**
   * Load skills from file system or use defaults
   */
  async loadSkills(): Promise<N8nSkill[]> {
    // Check cache
    if (this.cachedSkills) {
      const age = Date.now() - this.cachedSkills.loadedAt.getTime()
      if (age < this.config.maxCacheAge) {
        return this.cachedSkills.skills
      }
    }

    try {
      // Try to load from file system
      const skills = await this.loadSkillsFromPath()
      this.cachedSkills = {
        skills,
        loadedAt: new Date(),
      }
      return skills
    } catch (error) {
      // Fall back to default skills
      console.log('[Skills] Using default skills')
      return DEFAULT_SKILLS
    }
  }

  /**
   * Load skills from the skills path
   */
  private async loadSkillsFromPath(): Promise<N8nSkill[]> {
    if (!this.config.skillsPath || !fs.existsSync(this.config.skillsPath)) {
      throw new Error(`Skills path not found: ${this.config.skillsPath}`)
    }

    const skills: N8nSkill[] = []
    const files = fs.readdirSync(this.config.skillsPath)

    for (const file of files) {
      if (file.endsWith('.json') || file.endsWith('.yaml') || file.endsWith('.yml')) {
        try {
          const skill = await this.loadSkillFile(
            path.join(this.config.skillsPath!, file)
          )
          if (skill) {
            skills.push(skill)
            this.skillsIndex.set(skill.id, skill)
          }
        } catch (error) {
          console.warn(`[Skills] Failed to load skill file ${file}:`, error)
        }
      }
    }

    if (skills.length > 0) {
      return skills
    }

    throw new Error('No skills found in skills path')
  }

  /**
   * Load a single skill file
   */
  private async loadSkillFile(filePath: string): Promise<N8nSkill | null> {
    const content = fs.readFileSync(filePath, 'utf-8')

    if (filePath.endsWith('.json')) {
      const skill = JSON.parse(content)
      return this.validateAndNormalizeSkill(skill)
    } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      // YAML parsing would require js-yaml package
      // For now, return null and fall back to defaults
      console.warn('[Skills] YAML parsing not implemented, skipping:', filePath)
      return null
    }

    return null
  }

  /**
   * Validate and normalize a skill object
   */
  private validateAndNormalizeSkill(skill: any): N8nSkill {
    return {
      id: skill.id || skill.name?.toLowerCase().replace(/\s+/g, '-'),
      name: skill.name,
      description: skill.description || '',
      category: skill.category || 'general',
      triggers: skill.triggers || [],
      actions: skill.actions || [],
      pattern: skill.pattern || {
        structure: 'trigger → action',
        nodes: [],
        connections: [],
        transformations: [],
      },
      examples: skill.examples || [],
    }
  }

  /**
   * Get all available skills
   */
  async getAllSkills(): Promise<N8nSkill[]> {
    return this.loadSkills()
  }

  /**
   * Get a skill by ID
   */
  async getSkill(skillId: string): Promise<N8nSkill | undefined> {
    await this.loadSkills()
    return this.skillsIndex.get(skillId)
  }

  /**
   * Get skills by category
   */
  async getSkillsByCategory(category: string): Promise<N8nSkill[]> {
    await this.loadSkills()
    return this.categoryIndex.get(category) || []
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<string[]> {
    await this.loadSkills()
    return Array.from(this.categoryIndex.keys())
  }

  /**
   * Find matching skills for a user prompt
   */
  async findMatchingSkills(prompt: string): Promise<N8nSkillMatch[]> {
    const skills = await this.loadSkills()
    const promptLower = prompt.toLowerCase()
    const words = promptLower.split(/\s+/)

    const matches: N8nSkillMatch[] = []

    for (const skill of skills) {
      let score = 0
      const matchedTriggers: string[] = []
      const matchedActions: string[] = []

      // Check name and description
      if (skill.name.toLowerCase().includes(promptLower)) {
        score += 10
      }
      if (skill.description.toLowerCase().includes(promptLower)) {
        score += 5
      }

      // Check triggers
      for (const trigger of skill.triggers) {
        if (promptLower.includes(trigger)) {
          score += 3
          matchedTriggers.push(trigger)
        }
      }

      // Check actions
      for (const action of skill.actions) {
        if (
          promptLower.includes(action.type) ||
          promptLower.includes(action.name.toLowerCase())
        ) {
          score += 2
          matchedActions.push(action.name)
        }
      }

      // Check category
      if (promptLower.includes(skill.category)) {
        score += 2
      }

      // Check examples
      for (const example of skill.examples) {
        if (example.toLowerCase().includes(promptLower)) {
          score += 4
        }
        // Partial match with example
        const exampleWords = example.toLowerCase().split(/\s+/)
        for (const word of words) {
          if (word.length > 2 && exampleWords.some((ew) => ew.includes(word))) {
            score += 1
          }
        }
      }

      // Check pattern nodes
      for (const node of skill.pattern.nodes) {
        if (promptLower.includes(node)) {
          score += 2
        }
      }

      if (score > 0) {
        matches.push({
          skill,
          confidence: Math.min(score / 20, 1), // Normalize to 0-1
          matchedTriggers,
          matchedActions,
        })
      }
    }

    // Sort by confidence and return top matches
    return matches.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Get the best matching skill for a prompt
   */
  async getBestMatchingSkill(prompt: string): Promise<N8nSkillMatch | null> {
    const matches = await this.findMatchingSkills(prompt)
    return matches[0] || null
  }

  /**
   * Generate enhanced prompt with skill context
   */
  async generateEnhancedPrompt(userPrompt: string): Promise<string> {
    const matches = await this.findMatchingSkills(userPrompt)
    const skills = matches.filter((m) => m.confidence > 0.3)

    if (skills.length === 0) {
      return userPrompt
    }

    const skillContext = skills
      .slice(0, 3)
      .map((match) => {
        const skill = match.skill
        return `
## n8n Skill: ${skill.name}
Description: ${skill.description}
Pattern: ${skill.pattern.structure}
Nodes: ${skill.pattern.nodes.join(' → ')}
Example: ${skill.examples[0] || 'N/A'}
`
      })
      .join('\n')

    return `
${userPrompt}

---

**Relevant n8n Skills Found:**

${skillContext}

Use these skill patterns as reference when generating the workflow structure.
The workflow should follow the pattern structure and use similar node types.
`
  }

  /**
   * Get workflow template from skill pattern
   */
  async getWorkflowTemplateFromSkill(
    skillId: string,
    customizations?: Record<string, any>
  ): Promise<{
    name: string
    nodes: any[]
    connections: any
  } | null> {
    const skill = await this.getSkill(skillId)
    if (!skill) {
      return null
    }

    // Build workflow structure from skill pattern
    const nodes: any[] = []
    const connections: any = {}

    // Create trigger node
    const triggerType = skill.triggers[0] || 'webhook'
    const triggerNode = {
      id: 'trigger',
      name: 'Trigger',
      type: `n8n-nodes-base.${triggerType}`,
      position: [100, 200],
      parameters: {},
    }
    nodes.push(triggerNode)

    // Create action nodes
    for (let i = 0; i < skill.actions.length; i++) {
      const action = skill.actions[i]
      const node = {
        id: `action_${i + 1}`,
        name: action.name.replace(/\s+/g, ''),
        type: `n8n-nodes-base.${action.type}`,
        position: [100 + (i + 1) * 200, 200],
        parameters: {
          ...action.config,
          ...(customizations?.[action.name] || {}),
        },
      }
      nodes.push(node)

      // Connect to previous node
      const prevNodeId = i === 0 ? 'trigger' : `action_${i}`
      connections[prevNodeId] = {
        main: [[{ node: node.id, type: 'main', index: 0 }]],
      }
    }

    return {
      name: `Agent8: ${skill.name}`,
      nodes,
      connections,
    }
  }

  /**
   * Refresh skill cache
   */
  async refreshCache(): Promise<void> {
    this.cachedSkills = null
    this.skillsIndex.clear()
    this.categoryIndex.clear()
    this.buildIndexes()
    await this.loadSkills()
  }
}

// Singleton instance
let skillsLoaderInstance: N8nSkillsLoader | null = null

export function getSkillsLoader(config?: Partial<SkillConfig>): N8nSkillsLoader {
  if (!skillsLoaderInstance) {
    skillsLoaderInstance = new N8nSkillsLoader(config)
  }
  return skillsLoaderInstance
}

export { N8nSkillsLoader as default }
