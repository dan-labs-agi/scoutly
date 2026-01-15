// MCP Types for Agent8
// Based on @modelcontextprotocol/sdk specifications

export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, MCPProperty>
    required?: string[]
  }
}

export interface MCPProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null'
  description?: string
  default?: any
  enum?: string[]
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  properties?: Record<string, MCPProperty>
  items?: MCPProperty
}

export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export interface MCPResourceTemplate {
  uriTemplate: string
  name: string
  description?: string
  mimeType?: string
}

export interface MCPListResourcesResult {
  resources: MCPResource[]
  nextCursor?: string
}

export interface MCPListResourceTemplatesResult {
  resourceTemplates: MCPResourceTemplate[]
  nextCursor?: string
}

export interface MCPCallToolResult {
  content: MCPContent[]
  isError?: boolean
}

export interface MCPContent {
  type: 'text' | 'image' | 'audio' | 'resource'
  text?: string
  data?: string
  mimeType?: string
  resource?: {
    uri: string
  }
}

export interface MCPClientCapabilities {
  tools?: {
    listChanged?: boolean
  }
  resources?: {
    listChanged?: boolean
    subscribe?: boolean
  }
}

export interface MCPInitializeParams {
  protocolVersion: string
  capabilities: MCPClientCapabilities
  clientInfo: {
    name: string
    version: string
  }
}

export interface MCPInitializeResult {
  protocolVersion: string
  capabilities: {
    tools: {
      listChanged?: boolean
    }
    resources?: {
      listChanged?: boolean
      subscribe?: boolean
    }
  }
  serverInfo: {
    name: string
    version: string
  }
}

// n8n MCP Server specific types
export interface N8nMcpTool {
  name: string
  description: string
  parameters: Record<string, any>
}

export interface N8nWorkflowTemplate {
  id: string
  name: string
  nodes: N8nWorkflowNode[]
  connections: Record<string, any>
}

export interface N8nWorkflowNode {
  id: string
  name: string
  type: string
  position: [number, number]
  parameters: Record<string, any>
}

// n8n-skills types
export interface N8nSkill {
  id: string
  name: string
  description: string
  category: string
  triggers: string[]
  actions: N8nSkillAction[]
  pattern: N8nSkillPattern
  examples: string[]
}

export interface N8nSkillAction {
  name: string
  type: string
  description: string
  config: Record<string, any>
}

export interface N8nSkillPattern {
  structure: string
  nodes: string[]
  connections: string[]
  transformations: string[]
}

export interface N8nSkillMatch {
  skill: N8nSkill
  confidence: number
  matchedTriggers: string[]
  matchedActions: string[]
}
