// Core Types for Agent8 Backend

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  type?: 'text' | 'clarification' | 'workflow' | 'logs'
  data?: any
}

export interface Session {
  id: string
  messages: Message[]
  workflow?: Workflow
  status: SessionStatus
  clarifications?: Record<string, string>
  createdAt: Date
  updatedAt: Date
}

export type SessionStatus = 
  | 'idle' 
  | 'understanding' 
  | 'clarifying' 
  | 'generating' 
  | 'ready' 
  | 'running' 
  | 'completed' 
  | 'error'

// n8n Workflow Types
export interface Workflow {
  id?: string
  name: string
  nodes: Node[]
  connections: Connections
  settings?: WorkflowSettings
  meta?: WorkflowMeta
}

export interface Node {
  id: string
  name: string
  type: string
  typeVersion?: number
  position: [number, number]
  parameters: Record<string, any>
  credentials?: Record<string, string>
  disabled?: boolean
}

export interface Connections {
  [nodeId: string]: {
    main: Connection[][] 
  }
}

export interface Connection {
  node: string
  type: string
  index: number
}

export interface WorkflowSettings {
  executionOrder?: string
  saveManualExecutions?: boolean
  callerPolicy?: string
  executionTimeout?: number
}

export interface WorkflowMeta {
  templateId?: string
  generatedAt?: Date
  prompt?: string
  clarifications?: Record<string, string>
}

// Task Specification Types
export interface TaskSpec {
  goal: string
  trigger: TriggerSpec
  actions: ActionSpec[]
  constraints: string[]
}

export interface TriggerSpec {
  type: 'webhook' | 'cron' | 'event' | 'manual' | 'schedule'
  config: Record<string, any>
}

export interface ActionSpec {
  name: string
  description?: string
  inputs: Record<string, any>
  expectedOutput: string
  tool?: string
  toolType?: 'native' | 'composio' | 'http' | 'custom'
  parameters?: Record<string, any>
}

// Tool Resolution Types
export interface ToolResolution {
  action: string
  resolvedTool: ResolvedTool
}

export interface ResolvedTool {
  type: 'native' | 'composio' | 'http' | 'custom'
  nodeType: string
  nodeName: string
  parameters: Record<string, any>
  credentials?: string
}

// Execution Types
export interface ExecutionRequest {
  workflow: Workflow
  sessionId: string
  dryRun?: boolean
  inputData?: Record<string, any>
}

export interface ExecutionLog {
  id: string
  timestamp: Date
  level: 'info' | 'success' | 'error' | 'warning' | 'debug'
  nodeName: string
  message: string
  data?: any
}

export interface ExecutionStatus {
  executionId: string
  status: 'running' | 'success' | 'error' | 'stopped'
  progress: number
  currentNode?: string
  logs: ExecutionLog[]
  startedAt: Date
  completedAt?: Date
  error?: string
}

// Clarification Types
export interface ClarificationQuestion {
  id: string
  question: string
  options?: string[]
  field: string
  required: boolean
  context?: string
}

// API Types
export interface ChatRequest {
  message: string
  sessionId?: string
  clarifications?: Record<string, string>
}

export interface GenerateRequest {
  prompt: string
  clarifications?: Record<string, string>
}

export interface ExecuteRequest {
  workflow: Workflow
  sessionId: string
  dryRun?: boolean
  inputData?: Record<string, any>
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// LLM Types
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMCompletion {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

// n8n MCP Types
export interface N8nNode {
  name: string
  displayName: string
  description: string
  properties: N8nNodeProperty[]
}

export interface N8nNodeProperty {
  name: string
  displayName: string
  type: string
  required?: boolean
  default?: any
  description?: string
  options?: any[]
}

// Composio Types
export interface ComposioTool {
  id: string
  name: string
  description: string
  category: string
  actions: ComposioAction[]
}

export interface ComposioAction {
  id: string
  name: string
  description: string
  parameters: Record<string, any>
}
