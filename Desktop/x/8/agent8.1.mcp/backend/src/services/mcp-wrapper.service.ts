import type { N8nNode, N8nNodeProperty } from '../types/index.js'

// Node registry with common n8n nodes
const nodeRegistry: Map<string, N8nNode> = new Map()

// Initialize with common nodes
function initializeNodeRegistry() {
  // Triggers
  registerNode({
    name: 'webhook',
    displayName: 'Webhook',
    description: 'Trigger workflow via HTTP webhook',
    properties: [
      { name: 'path', displayName: 'Path', type: 'string', required: true },
      { name: 'method', displayName: 'HTTP Method', type: 'options', options: ['GET', 'POST', 'PUT', 'DELETE'], default: 'POST' },
      { name: 'authentication', displayName: 'Authentication', type: 'options', options: ['none', 'basicAuth', 'headerAuth'] },
    ],
  })

  registerNode({
    name: 'scheduleTrigger',
    displayName: 'Schedule Trigger',
    description: 'Trigger workflow on a schedule',
    properties: [
      { name: 'rule', displayName: 'Rule', type: 'json', default: { interval: [1, 'hour'] } },
    ],
  })

  registerNode({
    name: 'cron',
    displayName: 'Cron',
    description: 'Trigger workflow on cron schedule',
    properties: [
      { name: 'triggerTimes', displayName: 'Trigger Times', type: 'json' },
    ],
  })

  registerNode({
    name: 'manualTrigger',
    displayName: 'Manual Trigger',
    description: 'Manually trigger workflow',
    properties: [],
  })

  // HTTP
  registerNode({
    name: 'httpRequest',
    displayName: 'HTTP Request',
    description: 'Make HTTP requests',
    properties: [
      { name: 'method', displayName: 'Method', type: 'options', options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], default: 'GET' },
      { name: 'url', displayName: 'URL', type: 'string', required: true },
      { name: 'authentication', displayName: 'Authentication', type: 'options', options: ['none', 'genericCredentialType', 'headerAuth', 'queryAuth'] },
      { name: 'sendHeaders', displayName: 'Send Headers', type: 'boolean', default: false },
      { name: 'headerParameters', displayName: 'Headers', type: 'fixedCollection' },
      { name: 'sendQuery', displayName: 'Send Query', type: 'boolean', default: false },
      { name: 'queryParameters', displayName: 'Query Parameters', type: 'fixedCollection' },
      { name: 'sendBody', displayName: 'Send Body', type: 'boolean', default: false },
      { name: 'bodyParameters', displayName: 'Body Parameters', type: 'fixedCollection' },
      { name: 'options', displayName: 'Options', type: 'json' },
    ],
  })

  // Data transformation
  registerNode({
    name: 'set',
    displayName: 'Set',
    description: 'Set node values',
    properties: [
      { name: 'values', displayName: 'Values', type: 'fixedCollection' },
      { name: 'options', displayName: 'Options', type: 'json' },
    ],
  })

  registerNode({
    name: 'code',
    displayName: 'Code',
    description: 'Execute custom JavaScript code',
    properties: [
      { name: 'jsCode', displayName: 'JavaScript Code', type: 'json', default: 'return item;' },
    ],
  })

  registerNode({
    name: 'function',
    displayName: 'Function',
    description: 'Execute custom Node.js code',
    properties: [
      { name: 'functionCode', displayName: 'Function Code', type: 'json', default: 'return item;' },
    ],
  })

  // Common integrations
  registerNode({
    name: 'slack',
    displayName: 'Slack',
    description: 'Send messages to Slack',
    properties: [
      { name: 'resource', displayName: 'Resource', type: 'options', options: ['message'] },
      { name: 'channel', displayName: 'Channel', type: 'string' },
      { name: 'text', displayName: 'Text', type: 'string' },
      { name: 'attachments', displayName: 'Attachments', type: 'json' },
    ],
  })

  registerNode({
    name: 'github',
    displayName: 'GitHub',
    description: 'Interact with GitHub',
    properties: [
      { name: 'resource', displayName: 'Resource', type: 'options', options: ['issue', 'pullRequest', 'repository'] },
      { name: 'operation', displayName: 'Operation', type: 'options' },
      { name: 'owner', displayName: 'Owner', type: 'string' },
      { name: 'repository', displayName: 'Repository', type: 'string' },
    ],
  })

  registerNode({
    name: 'gmail',
    displayName: 'Gmail',
    description: 'Send and receive emails via Gmail',
    properties: [
      { name: 'resource', displayName: 'Resource', type: 'options', options: ['message', 'label', 'draft'] },
      { name: 'to', displayName: 'To', type: 'string' },
      { name: 'subject', displayName: 'Subject', type: 'string' },
      { name: 'bodyContent', displayName: 'Body Content', type: 'string' },
    ],
  })

  registerNode({
    name: 'airtable',
    displayName: 'Airtable',
    description: 'Interact with Airtable',
    properties: [
      { name: 'resource', displayName: 'Resource', type: 'options', options: ['record', 'table'] },
      { name: 'operation', displayName: 'Operation', type: 'options' },
      { name: 'baseId', displayName: 'Base ID', type: 'string' },
      { name: 'tableId', displayName: 'Table ID', type: 'string' },
    ],
  })

  registerNode({
    name: 'notion',
    displayName: 'Notion',
    description: 'Interact with Notion',
    properties: [
      { name: 'resource', displayName: 'Resource', type: 'options', options: ['page', 'database'] },
      { name: 'operation', displayName: 'Operation', type: 'options' },
    ],
  })

  registerNode({
    name: 'discord',
    displayName: 'Discord',
    description: 'Send messages to Discord',
    properties: [
      { name: 'resource', displayName: 'Resource', type: 'options', options: ['channelMessage'] },
      { name: 'webhookUrl', displayName: 'Webhook URL', type: 'string' },
      { name: 'text', displayName: 'Content', type: 'string' },
    ],
  })

  registerNode({
    name: 'database',
    displayName: 'Database',
    description: 'Query databases',
    properties: [
      { name: 'resource', displayName: 'Resource', type: 'options', options: ['query'] },
      { name: 'operation', displayName: 'Operation', type: 'options', options: ['execute'] },
      { name: 'query', displayName: 'Query', type: 'string' },
    ],
  })
}

function registerNode(node: N8nNode) {
  nodeRegistry.set(node.name, node)
}

initializeNodeRegistry()

export class MCPWrapper {
  private n8nUrl: string
  private n8nApiKey: string

  constructor() {
    this.n8nUrl = process.env.N8N_URL || 'http://localhost:5678'
    this.n8nApiKey = process.env.N8N_API_KEY || ''
  }

  // List available n8n nodes
  async listNodes(): Promise<N8nNode[]> {
    return Array.from(nodeRegistry.values())
  }

  // Get specific node details
  async getNode(nodeName: string): Promise<N8nNode | null> {
    return nodeRegistry.get(nodeName) || null
  }

  // Search nodes by capability
  async searchNodes(capability: string): Promise<N8nNode[]> {
    const allNodes = await this.listNodes()
    return allNodes.filter(node => 
      node.description.toLowerCase().includes(capability.toLowerCase()) ||
      node.displayName.toLowerCase().includes(capability.toLowerCase())
    )
  }

  // Get node icon
  getNodeIcon(nodeName: string): string {
    const iconMap: Record<string, string> = {
      webhook: '⚡',
      scheduleTrigger: '⏰',
      cron: '⏰',
      manualTrigger: '▶️',
      httpRequest: '🌐',
      set: '📋',
      code: '📝',
      function: '⚙️',
      slack: '💬',
      github: '🐙',
      gmail: '📧',
      airtable: '📊',
      notion: '📝',
      discord: '🎮',
      database: '🗄️',
    }
    return iconMap[nodeName] || '📦'
  }

  // Get node color
  getNodeColor(nodeName: string): string {
    const colorMap: Record<string, string> = {
      webhook: '#f59e0b',
      scheduleTrigger: '#10b981',
      cron: '#10b981',
      manualTrigger: '#6366f1',
      httpRequest: '#3b82f6',
      set: '#64748b',
      code: '#8b5cf6',
      function: '#8b5cf6',
      slack: '#4a154b',
      github: '#24292e',
      gmail: '#ea4335',
      airtable: '#18bfff',
      notion: '#000000',
      discord: '#5865f2',
      database: '#6366f1',
    }
    return colorMap[nodeName] || '#475569'
  }

  // Validate workflow structure
  validateWorkflow(workflow: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      errors.push('Workflow must have nodes array')
      return { valid: false, errors }
    }

    if (workflow.nodes.length === 0) {
      errors.push('Workflow must have at least one node')
    }

    // Check for trigger node
    const hasTrigger = workflow.nodes.some((node: any) => 
      node.type.includes('webhook') || 
      node.type.includes('schedule') ||
      node.type.includes('cron') ||
      node.type.includes('manual')
    )

    if (!hasTrigger) {
      errors.push('Workflow must have a trigger node (webhook, schedule, or manual)')
    }

    // Validate node references
    const nodeIds = new Set(workflow.nodes.map((n: any) => n.id))
    
    if (workflow.connections) {
      Object.entries(workflow.connections).forEach(([sourceId, connections]: [string, any]) => {
        if (!nodeIds.has(sourceId)) {
          errors.push(`Connection references non-existent node: ${sourceId}`)
        }
        
        if (connections.main) {
          connections.main.forEach((group: any[]) => {
            group.forEach((conn: any) => {
              if (!nodeIds.has(conn.node)) {
                errors.push(`Connection references non-existent node: ${conn.node}`)
              }
            })
          })
        }
      })
    }

    return { valid: errors.length === 0, errors }
  }
}

export const mcpWrapper = new MCPWrapper()
