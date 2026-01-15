import { v4 as uuidv4 } from 'uuid'
import type { Workflow, Node, Connections, TaskSpec, TriggerSpec, ActionSpec } from '../types/index.js'
import { getMCPManager, getMCPClient } from './mcp/index.js'

export interface WorkflowGeneratorConfig {
  useMCPTools?: boolean
  useSkills?: boolean
  maxNodes?: number
  defaultTrigger?: 'webhook' | 'schedule' | 'manual'
}

export class WorkflowGenerator {
  private nodeCounter: number = 0
  private config: WorkflowGeneratorConfig

  constructor(config?: WorkflowGeneratorConfig) {
    this.config = {
      useMCPTools: true,
      useSkills: true,
      maxNodes: 12,
      defaultTrigger: 'webhook',
      ...config,
    }
  }

  generateId(): string {
    return uuidv4()
  }

  generateNodeName(type: string, index: number): string {
    return `${type.charAt(0).toUpperCase() + type.slice(1)} ${index + 1}`
  }

  // Main workflow generation method using MCP and skills
  async generateFromTaskSpec(taskSpec: TaskSpec): Promise<Workflow> {
    const nodes: Node[] = []
    const connections: Connections = {}
    this.nodeCounter = 0

    // Generate trigger node
    const triggerNode = this.createTriggerNode(taskSpec.trigger)
    nodes.push(triggerNode)

    // Generate action nodes
    const actionNodes: Node[] = []
    for (const action of taskSpec.actions) {
      const actionNode = this.createActionNode(action)
      actionNodes.push(actionNode)
      nodes.push(actionNode)
    }

    // Build connections
    connections[triggerNode.id] = {
      main: [[{ node: actionNodes[0]?.id, type: 'main', index: 0 }]].filter(Boolean) as any
    }

    for (let i = 0; i < actionNodes.length - 1; i++) {
      const currentNode = actionNodes[i]
      const nextNode = actionNodes[i + 1]
      if (currentNode && nextNode) {
        connections[currentNode.id] = {
          main: [[{ node: nextNode.id, type: 'main', index: 0 }]]
        }
      }
    }

    const workflow: Workflow = {
      name: this.generateWorkflowName(taskSpec.goal),
      nodes,
      connections,
      meta: {
        generatedAt: new Date(),
        prompt: taskSpec.goal,
      },
    }

    return workflow
  }

  // Generate from natural language prompt using MCP tools and skills
  async generateFromPrompt(prompt: string, clarifications?: Record<string, string>): Promise<Workflow> {
    const mcpManager = getMCPManager()

    // Try to use n8n-skills for pattern matching
    if (this.config.useSkills) {
      try {
        const bestMatch = await mcpManager.getBestMatchingSkill(prompt)
        
        if (bestMatch && bestMatch.confidence > 0.6) {
          console.log(`[WorkflowGenerator] Using skill pattern: ${bestMatch.skill.name} (${Math.round(bestMatch.confidence * 100)}% confidence)`)
          
          // Create workflow from skill pattern
          const template = await mcpManager.getWorkflowTemplateFromSkill(
            bestMatch.skill.id,
            clarifications
          )
          
          if (template) {
            return this.createWorkflowFromTemplate(template, prompt, clarifications)
          }
        }
      } catch (error) {
        console.warn('[WorkflowGenerator] Skill matching failed, falling back to default:', error)
      }
    }

    // Fall back to prompt analysis
    const taskSpec = await this.analyzePromptToTaskSpec(prompt, clarifications)
    return this.generateFromTaskSpec(taskSpec)
  }

  // Create workflow from skill template
  private createWorkflowFromTemplate(
    template: { name: string; nodes: any[]; connections: any },
    prompt: string,
    clarifications?: Record<string, string>
  ): Workflow {
    const nodes: Node[] = template.nodes.map((node, index) => ({
      id: node.id || uuidv4(),
      name: node.name || this.generateNodeName(node.type.split('.').pop() || 'node', index),
      type: node.type,
      position: node.position || [100 + index * 200, 200],
      parameters: node.parameters || {},
      disabled: node.disabled || false,
    }))

    const connections: Connections = {}
    for (const [sourceId, conns] of Object.entries(template.connections)) {
      connections[sourceId] = conns as Connections[string]
    }

    return {
      name: `${template.name} - ${this.generateWorkflowName(prompt)}`,
      nodes,
      connections,
      meta: {
        generatedAt: new Date(),
        prompt,
        clarifications,
        skillBased: true,
      },
    }
  }

  // Analyze prompt into task spec with MCP tool awareness
  private async analyzePromptToTaskSpec(
    prompt: string,
    clarifications?: Record<string, string>
  ): Promise<TaskSpec> {
    const normalizedPrompt = prompt.toLowerCase()
    
    // Get available tools from MCP for better matching
    let availableTools: string[] = []
    try {
      const mcpClient = getMCPClient()
      if (mcpClient.isConnected()) {
        availableTools = mcpClient.getTools().map(t => t.name.toLowerCase())
      }
    } catch {
      // MCP not connected, use default tools
    }

    // Detect trigger type
    let trigger: TriggerSpec = { type: this.config.defaultTrigger || 'manual', config: {} }
    
    if (normalizedPrompt.includes('when') || normalizedPrompt.includes('if') || normalizedPrompt.includes('on')) {
      if (normalizedPrompt.includes('github')) {
        trigger = {
          type: 'webhook',
          config: { path: '/webhook/github', method: 'POST' }
        }
      } else if (normalizedPrompt.includes('schedule') || normalizedPrompt.includes('every') || normalizedPrompt.includes('daily') || normalizedPrompt.includes('hour')) {
        trigger = {
          type: 'schedule',
          config: this.parseScheduleFromPrompt(normalizedPrompt)
        }
      } else if (normalizedPrompt.includes('form') || normalizedPrompt.includes('typeform')) {
        trigger = {
          type: 'webhook',
          config: { path: '/webhook/form', method: 'POST' }
        }
      } else {
        trigger = {
          type: 'webhook',
          config: { path: '/webhook/trigger', method: 'POST' }
        }
      }
    }

    // Detect actions based on keywords and available MCP tools
    const actions: ActionSpec[] = []

    if (normalizedPrompt.includes('slack') || normalizedPrompt.includes('send message') || normalizedPrompt.includes('notify')) {
      actions.push(this.createAction('slack', 'Send Slack Message', clarifications?.slackChannel, '#general'))
    }

    if (normalizedPrompt.includes('email') || normalizedPrompt.includes('gmail') || normalizedPrompt.includes('send')) {
      actions.push(this.createAction('gmail', 'Send Email', clarifications?.emailTo, ''))
    }

    if (normalizedPrompt.includes('github') && !normalizedPrompt.includes('trigger')) {
      actions.push(this.createAction('github', 'GitHub Action', null, null))
    }

    if (normalizedPrompt.includes('airtable') || normalizedPrompt.includes('database') || normalizedPrompt.includes('store')) {
      actions.push(this.createAction('airtable', 'Add to Airtable', null, null))
    }

    if (normalizedPrompt.includes('discord')) {
      actions.push(this.createAction('discord', 'Send Discord Message', null, null))
    }

    if (normalizedPrompt.includes('summarize') || normalizedPrompt.includes('summary') || normalizedPrompt.includes('analyze')) {
      actions.push({
        name: 'Summarize Data',
        inputs: {},
        expectedOutput: 'Summary generated',
        toolType: 'native',
        tool: 'code',
        parameters: {
          jsCode: `
const items = $input.all();
const summary = items.map(item => item.json).slice(0, 5);
return [{ json: { summary, count: items.length } }];
          `.trim(),
        }
      })
    }

    if (normalizedPrompt.includes('http') || normalizedPrompt.includes('api') || normalizedPrompt.includes('fetch') || normalizedPrompt.includes('get')) {
      actions.push({
        name: 'HTTP Request',
        inputs: {},
        expectedOutput: 'Data fetched',
        toolType: 'native',
        tool: 'httpRequest',
        parameters: {
          method: 'GET',
          url: clarifications?.httpUrl || 'https://api.example.com/data',
        }
      })
    }

    // If no specific actions detected, add a Set node
    if (actions.length === 0) {
      actions.push({
        name: 'Process Data',
        inputs: {},
        expectedOutput: 'Data processed',
        toolType: 'native',
        tool: 'set',
        parameters: {
          values: {
            values: [
              { name: 'processed', value: true },
              { name: 'timestamp', value: '={{ new Date().toISOString() }}' },
            ]
          }
        }
      })
    }

    return {
      goal: prompt,
      trigger,
      actions,
      constraints: [],
    }
  }

  // Helper to create action spec
  private createAction(tool: string, name: string, paramValue: string | null, defaultValue: string): ActionSpec {
    const baseParams: Record<string, any> = {}
    
    if (tool === 'slack') {
      baseParams.resource = 'message'
      baseParams.channel = paramValue || defaultValue
      baseParams.text = '{{ $json.body }}'
    } else if (tool === 'gmail') {
      baseParams.resource = 'message'
      baseParams.to = paramValue || ''
      baseParams.subject = 'Automated Update'
      baseParams.bodyContent = '{{ $json.body }}'
    } else if (tool === 'github') {
      baseParams.resource = 'issue'
      baseParams.operation = 'get'
    } else if (tool === 'airtable') {
      baseParams.resource = 'record'
      baseParams.operation = 'create'
    } else if (tool === 'discord') {
      baseParams.resource = 'channelMessage'
      baseParams.webhookUrl = paramValue || ''
      baseParams.text = '{{ $json.body }}'
    }

    return {
      name,
      inputs: {},
      expectedOutput: `${name} completed`,
      toolType: 'native',
      tool,
      parameters: baseParams,
    }
  }

  // Parse schedule from natural language
  private parseScheduleFromPrompt(prompt: string): Record<string, any> {
    const rule: any = { interval: [1, 'hour'] }

    if (prompt.includes('every minute')) {
      rule.interval = [1, 'minute']
    } else if (prompt.includes('every hour')) {
      rule.interval = [1, 'hour']
    } else if (prompt.includes('every day') || prompt.includes('daily')) {
      rule.interval = [1, 'day']
    } else if (prompt.includes('every week')) {
      rule.interval = [7, 'day']
    } else if (prompt.includes('every morning')) {
      rule.triggerTimes = { hour: 9, minute: 0 }
    } else if (prompt.includes('every evening')) {
      rule.triggerTimes = { hour: 18, minute: 0 }
    } else if (prompt.includes('every monday')) {
      rule.triggerTimes = { dayOfWeek: 1, hour: 9, minute: 0 }
    } else if (prompt.includes('every friday')) {
      rule.triggerTimes = { dayOfWeek: 5, hour: 17, minute: 0 }
    }

    return rule
  }

  // Create trigger node
  private createTriggerNode(trigger: TriggerSpec): Node {
    const id = this.generateId()
    const nodeType = this.getTriggerNodeType(trigger.type)

    return {
      id,
      name: this.generateNodeName(nodeType, this.nodeCounter++),
      type: `n8n-nodes-base.${nodeType}`,
      position: [100, this.nodeCounter * 150],
      parameters: {
        ...trigger.config,
        authentication: 'none',
      },
    }
  }

  // Create action node
  private createActionNode(action: ActionSpec): Node {
    const id = this.generateId()
    const nodeType = this.getActionNodeType(action.tool || 'set')

    return {
      id,
      name: action.name,
      type: `n8n-nodes-base.${nodeType}`,
      position: [100, this.nodeCounter * 150],
      parameters: action.parameters || {},
    }
  }

  // Get trigger node type
  private getTriggerNodeType(triggerType: string): string {
    const typeMap: Record<string, string> = {
      webhook: 'webhook',
      cron: 'cron',
      schedule: 'scheduleTrigger',
      manual: 'manualTrigger',
      event: 'webhook',
    }
    return typeMap[triggerType] || 'webhook'
  }

  // Get action node type
  private getActionNodeType(tool: string): string {
    const typeMap: Record<string, string> = {
      slack: 'slack',
      github: 'github',
      gmail: 'gmail',
      airtable: 'airtable',
      discord: 'discord',
      httpRequest: 'httpRequest',
      http: 'httpRequest',
      set: 'set',
      code: 'code',
      function: 'function',
      database: 'database',
    }
    return typeMap[tool?.toLowerCase() || ''] || 'set'
  }

  // Generate workflow name from prompt
  private generateWorkflowName(goal: string): string {
    const cleanGoal = goal
      .replace(/^(when|if|every|create|make|send|get|fetch|check|monitor)\s+/i, '')
      .replace(/and\s+send.*$/i, '')
      .substring(0, 50)
    
    return cleanGoal.charAt(0).toUpperCase() + cleanGoal.slice(1)
  }

  // Add node to existing workflow
  addNode(workflow: Workflow, node: Partial<Node>): Workflow {
    const newNode: Node = {
      id: this.generateId(),
      name: node.name || `Node ${workflow.nodes.length + 1}`,
      type: node.type || 'n8n-nodes-base.set',
      position: node.position || [100, (workflow.nodes.length) * 150],
      parameters: node.parameters || {},
      disabled: node.disabled,
      credentials: node.credentials,
    }

    return {
      ...workflow,
      nodes: [...workflow.nodes, newNode],
    }
  }

  // Remove node from workflow
  removeNode(workflow: Workflow, nodeId: string): Workflow {
    const filteredNodes = workflow.nodes.filter(n => n.id !== nodeId)
    const newConnections: Connections = {}

    // Rebuild connections excluding removed node
    Object.entries(workflow.connections).forEach(([sourceId, connections]) => {
      if (sourceId !== nodeId) {
        newConnections[sourceId] = {
          main: connections.main.map(group =>
            group.filter(conn => conn.node !== nodeId)
          ).filter(group => group.length > 0)
        }
      }
    })

    return {
      ...workflow,
      nodes: filteredNodes,
      connections: newConnections,
    }
  }

  // Connect two nodes
  connectNodes(
    workflow: Workflow,
    sourceNodeId: string,
    targetNodeId: string
  ): Workflow {
    const connections = { ...workflow.connections }

    if (!connections[sourceNodeId]) {
      connections[sourceNodeId] = { main: [] }
    }

    connections[sourceNodeId].main.push([{ node: targetNodeId, type: 'main', index: 0 }])

    return {
      ...workflow,
      connections,
    }
  }
}

// Singleton instance with default config
let generatorInstance: WorkflowGenerator | null = null

export function getWorkflowGenerator(config?: WorkflowGeneratorConfig): WorkflowGenerator {
  if (!generatorInstance) {
    generatorInstance = new WorkflowGenerator(config)
  }
  return generatorInstance
}

export { WorkflowGenerator as default }
