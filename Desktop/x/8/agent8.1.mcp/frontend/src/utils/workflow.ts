import type { Workflow, Node, Connections } from '../types'

// Convert n8n workflow to React Flow format
export function workflowToReactFlow(workflow: Workflow) {
  const nodes = workflow.nodes.map((node, index) => ({
    id: node.id,
    type: getNodeType(node.type),
    position: {
      x: (index % 3) * 300,
      y: Math.floor(index / 3) * 200,
    },
    data: {
      label: node.name,
      type: node.type,
      parameters: node.parameters,
      disabled: node.disabled,
    },
  }))

  const edges = Object.entries(workflow.connections).flatMap(([nodeId, connections]) => {
    const nodeConnections = connections.main || []
    return nodeConnections.flatMap((connectionGroup, groupIndex) =>
      connectionGroup.map((connection) => ({
        id: `${nodeId}-${connection.node}-${groupIndex}`,
        source: nodeId,
        target: connection.node,
        animated: true,
        style: { stroke: '#38bdf8' },
      }))
    )
  })

  return { nodes, edges }
}

// Convert React Flow format to n8n workflow
export function reactFlowToWorkflow(nodes: any[], edges: any[]): Partial<Workflow> {
  const workflowNodes: Node[] = nodes.map((node, index) => ({
    id: node.id,
    name: node.data.label || `Node ${index + 1}`,
    type: getN8nNodeType(node.type),
    position: [node.position.x, node.position.y],
    parameters: node.data.parameters || {},
    disabled: node.data.disabled || false,
  }))

  const connections: Connections = {}
  
  edges.forEach((edge) => {
    if (!connections[edge.source]) {
      connections[edge.source] = { main: [] }
    }
    if (!connections[edge.source].main[0]) {
      connections[edge.source].main[0] = []
    }
    connections[edge.source].main[0].push({
      node: edge.target,
      type: 'main',
      index: 0,
    })
  })

  return {
    nodes: workflowNodes,
    connections,
  }
}

// Get React Flow node type from n8n node type
function getNodeType(n8nType: string): string {
  const typeMap: Record<string, string> = {
    'n8n-nodes-base.webhook': 'trigger',
    'n8n-nodes-base.httpRequest': 'http',
    'n8n-nodes-base.set': 'set',
    'n8n-nodes-base.function': 'function',
    'n8n-nodes-base.code': 'code',
    'n8n-nodes-base.slack': 'slack',
    'n8n-nodes-base.github': 'github',
    'n8n-nodes-base.gmail': 'gmail',
    'n8n-nodes-base.database': 'database',
    'n8n-nodes-base.schedule': 'schedule',
  }
  return typeMap[n8nType] || 'default'
}

// Get n8n node type from React Flow node type
function getN8nNodeType(flowType: string): string {
  const typeMap: Record<string, string> = {
    trigger: 'n8n-nodes-base.webhook',
    http: 'n8n-nodes-base.httpRequest',
    set: 'n8n-nodes-base.set',
    function: 'n8n-nodes-base.function',
    code: 'n8n-nodes-base.code',
    slack: 'n8n-nodes-base.slack',
    github: 'n8n-nodes-base.github',
    gmail: 'n8n-nodes-base.gmail',
    database: 'n8n-nodes-base.database',
    schedule: 'n8n-nodes-base.schedule',
  }
  return typeMap[flowType] || 'n8n-nodes-base.default'
}

// Get node icon based on type
export function getNodeIcon(type: string): string {
  const iconMap: Record<string, string> = {
    trigger: '⚡',
    http: '🌐',
    slack: '💬',
    github: '🐙',
    gmail: '📧',
    database: '🗄️',
    schedule: '⏰',
    function: '⚙️',
    code: '📝',
    set: '📋',
    default: '📦',
  }
  return iconMap[type] || iconMap.default
}

// Get node color based on type
export function getNodeColor(type: string): string {
  const colorMap: Record<string, string> = {
    trigger: '#f59e0b',
    http: '#3b82f6',
    slack: '#4a154b',
    github: '#24292e',
    gmail: '#ea4335',
    database: '#6366f1',
    schedule: '#10b981',
    function: '#8b5cf6',
    code: '#06b6d4',
    set: '#64748b',
    default: '#475569',
  }
  return colorMap[type] || colorMap.default
}

// Format workflow JSON for display
export function formatWorkflowJson(workflow: Workflow): string {
  return JSON.stringify(
    {
      name: workflow.name,
      nodes: workflow.nodes.map((node) => ({
        id: node.id,
        name: node.name,
        type: node.type,
        position: node.position,
        parameters: node.parameters,
      })),
      connections: workflow.connections,
    },
    null,
    2
  )
}

// Validate workflow structure
export function validateWorkflow(workflow: Workflow): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!workflow.nodes || workflow.nodes.length === 0) {
    errors.push('Workflow must have at least one node')
  }

  const hasTrigger = workflow.nodes.some((node) =>
    node.type.includes('webhook') || node.type.includes('trigger') || node.type.includes('schedule')
  )

  if (!hasTrigger) {
    errors.push('Workflow must have a trigger node (webhook, schedule, or manual)')
  }

  const nodeIds = new Set(workflow.nodes.map((n) => n.id))
  Object.entries(workflow.connections || {}).forEach(([sourceId, connections]) => {
    if (!nodeIds.has(sourceId)) {
      errors.push(`Connection references non-existent node: ${sourceId}`)
    }
    ;(connections.main || []).forEach((group) => {
      group.forEach((conn) => {
        if (!nodeIds.has(conn.node)) {
          errors.push(`Connection references non-existent node: ${conn.node}`)
        }
      })
    })
  })

  return { valid: errors.length === 0, errors }
}
