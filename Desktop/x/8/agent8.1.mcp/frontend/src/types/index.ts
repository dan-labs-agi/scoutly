// Core Types for Agent8 Platform

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
  status: 'idle' | 'generating' | 'ready' | 'running' | 'completed' | 'error'
  createdAt: Date
  updatedAt: Date
}

// n8n Workflow Types
export interface Workflow {
  id?: string
  name: string
  nodes: Node[]
  connections: Connections
  settings?: WorkflowSettings
}

export interface Node {
  id: string
  name: string
  type: string
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
  executionOrder: string
  saveManualExecutions: boolean
  callerPolicy: string
}

// Task Specification Types
export interface TaskSpec {
  goal: string
  trigger: TriggerSpec
  actions: ActionSpec[]
  constraints: string[]
}

export interface TriggerSpec {
  type: 'webhook' | 'cron' | 'event' | 'manual'
  config: Record<string, any>
}

export interface ActionSpec {
  name: string
  inputs: Record<string, any>
  expectedOutput: string
  tool?: string
  toolType?: 'native' | 'composio' | 'http' | 'custom'
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
  workflowId: string
  dryRun?: boolean
  inputData?: Record<string, any>
}

export interface ExecutionLog {
  id: string
  timestamp: Date
  level: 'info' | 'success' | 'error' | 'warning'
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
}

// Clarification Types
export interface ClarificationQuestion {
  id: string
  question: string
  options?: string[]
  field: string
  required: boolean
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Frontend State Types
export interface AppState {
  messages: Message[]
  currentSession: Session | null
  workflow: Workflow | null
  isGenerating: boolean
  isRunning: boolean
  executionLogs: ExecutionLog[]
  showPreview: boolean
}

// Node Categories for React Flow
export interface NodeCategory {
  id: string
  name: string
  color: string
  nodes: string[]
}
