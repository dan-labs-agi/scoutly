import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import {
  MCPClient,
  StdioClientTransport,
  ListToolsRequest,
  CallToolRequest,
  MCPClientCapabilities,
  Tool,
  CallToolResult,
} from '@modelcontextprotocol/sdk/client/index.js'
import type { MCPTool, MCPCallToolResult, MCPContent } from '../../types/mcp.js'

interface MCPClientConfig {
  serverPath?: string
  serverArgs?: string[]
  env?: Record<string, string>
  connectionTimeout?: number
}

interface MCPToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

interface ConnectionState {
  connected: boolean
  connecting: boolean
  error?: string
  lastConnected?: Date
  toolsLoaded: boolean
}

export class N8nMCPClient extends EventEmitter {
  private client: MCPClient | null = null
  private transport: StdioClientTransport | null = null
  private serverProcess: ChildProcess | null = null
  private config: MCPClientConfig
  private cachedTools: MCPTool[] = []
  private connectionState: ConnectionState = {
    connected: false,
    connecting: false,
    toolsLoaded: false,
  }
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3
  private reconnectDelay = 5000

  constructor(config: MCPClientConfig = {}) {
    super()
    this.config = {
      serverPath: 'npx',
      serverArgs: ['-y', '@czlonkowski/n8n-mcp'],
      connectionTimeout: 30000,
      ...config,
    }
  }

  /**
   * Connect to the n8n MCP server
   */
  async connect(): Promise<void> {
    if (this.connectionState.connecting || this.connectionState.connected) {
      console.log('[MCP] Already connected or connecting')
      return
    }

    this.connectionState.connecting = true
    this.connectionState.error = undefined
    this.emit('connecting')

    try {
      console.log('[MCP] Starting connection to n8n-mcp server...')

      // Create transport for stdio communication
      this.transport = new StdioClientTransport({
        command: this.config.serverPath,
        args: this.config.serverArgs,
        env: {
          ...process.env,
          N8N_API_KEY: process.env.N8N_API_KEY || '',
          N8N_URL: process.env.N8N_URL || 'http://localhost:5678',
          ...this.config.env,
        },
      })

      // Create MCP client
      this.client = new MCPClient(
        {
          name: 'agent8-backend',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: {
              listChanged: true,
            },
          },
        }
      )

      // Set up notification handlers
      this.client.onNotification(
        'notifications/tools/list_changed',
        () => {
          console.log('[MCP] Tools list changed, refreshing cache...')
          this.refreshToolCache()
        }
      )

      // Connect to the server
      await this.client.connect(this.transport)

      this.connectionState.connected = true
      this.connectionState.connecting = false
      this.connectionState.lastConnected = new Date()

      console.log('[MCP] Connected successfully!')

      // Load available tools
      await this.loadTools()

      this.emit('connected')
    } catch (error) {
      this.connectionState.connecting = false
      this.connectionState.connected = false
      this.connectionState.error = error instanceof Error ? error.message : 'Connection failed'

      console.error('[MCP] Connection error:', error)

      // Attempt reconnection
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        console.log(`[MCP] Attempting reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
        setTimeout(() => this.connect(), this.reconnectDelay)
      } else {
        this.emit('error', error)
      }

      throw error
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    console.log('[MCP] Disconnecting...')

    try {
      if (this.client) {
        await this.client.close()
        this.client = null
      }

      if (this.transport) {
        this.transport = null
      }

      if (this.serverProcess) {
        this.serverProcess.kill()
        this.serverProcess = null
      }

      this.connectionState.connected = false
      this.connectionState.toolsLoaded = false
      this.cachedTools = []

      console.log('[MCP] Disconnected successfully')
      this.emit('disconnected')
    } catch (error) {
      console.error('[MCP] Error during disconnect:', error)
      throw error
    }
  }

  /**
   * Get connection status
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState.connected
  }

  /**
   * Load available tools from the server
   */
  async loadTools(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not connected')
    }

    try {
      console.log('[MCP] Loading available tools...')
      const result = await this.client.request(ListToolsRequest, {})

      this.cachedTools = result.tools.map((tool: Tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema as MCPTool['inputSchema'],
      }))

      this.connectionState.toolsLoaded = true
      this.reconnectAttempts = 0 // Reset reconnect attempts on successful load

      console.log(`[MCP] Loaded ${this.cachedTools.length} tools`)
      this.emit('toolsLoaded', this.cachedTools)
    } catch (error) {
      console.error('[MCP] Failed to load tools:', error)
      throw error
    }
  }

  /**
   * Refresh tool cache
   */
  async refreshToolCache(): Promise<void> {
    await this.loadTools()
  }

  /**
   * Get all available tools
   */
  getTools(): MCPTool[] {
    return [...this.cachedTools]
  }

  /**
   * Get a specific tool by name
   */
  getTool(name: string): MCPTool | undefined {
    return this.cachedTools.find((tool) => tool.name === name)
  }

  /**
   * Search tools by name or description
   */
  searchTools(query: string): MCPTool[] {
    const lowerQuery = query.toLowerCase()
    return this.cachedTools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(lowerQuery) ||
        tool.description.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * Call a tool with the given arguments
   */
  async callTool<T = any>(
    toolName: string,
    args: Record<string, any>
  ): Promise<MCPCallToolResult> {
    if (!this.client) {
      throw new Error('Client not connected')
    }

    console.log(`[MCP] Calling tool: ${toolName}`, args)

    try {
      const result = await this.client.request(CallToolRequest, {
        name: toolName,
        arguments: args,
      })

      console.log(`[MCP] Tool ${toolName} executed successfully`)

      // Emit result for logging/debugging
      this.emit('toolResult', {
        tool: toolName,
        result,
      })

      return result
    } catch (error) {
      console.error(`[MCP] Tool ${toolName} failed:`, error)
      this.emit('toolError', { tool: toolName, error })
      throw error
    }
  }

  /**
   * Convert MCP tool to n8n node format
   */
  toolToN8nNode(tool: MCPTool): {
    name: string
    displayName: string
    description: string
    properties: any[]
  } {
    const properties = []

    if (tool.inputSchema.properties) {
      for (const [key, schema] of Object.entries(tool.inputSchema.properties)) {
        const propSchema = schema as any
        properties.push({
          name: key,
          displayName: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          type: this.mapSchemaType(propSchema.type),
          required: tool.inputSchema.required?.includes(key) || false,
          description: propSchema.description || '',
          default: propSchema.default,
          ...(propSchema.enum && { options: propSchema.enum }),
          ...(propSchema.minimum !== undefined && { min: propSchema.minimum }),
          ...(propSchema.maximum !== undefined && { max: propSchema.maximum }),
        })
      }
    }

    return {
      name: tool.name.replace(/_/g, ''),
      displayName: tool.name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      description: tool.description,
      properties,
    }
  }

  /**
   * Map schema type to n8n property type
   */
  private mapSchemaType(type: string): string {
    const typeMap: Record<string, string> = {
      string: 'string',
      number: 'number',
      boolean: 'boolean',
      object: 'json',
      array: 'json',
      null: 'string',
    }
    return typeMap[type] || 'string'
  }

  /**
   * Get n8n workflow operations
   */
  async getWorkflows(): Promise<any[]> {
    try {
      const result = await this.callTool('n8n_get_workflows', {})
      return result.content?.[0]?.text
        ? JSON.parse(result.content[0].text)
        : []
    } catch {
      return []
    }
  }

  /**
   * Get a specific workflow
   */
  async getWorkflow(workflowId: string): Promise<any> {
    try {
      const result = await this.callTool('n8n_get_workflow', {
        workflow_id: workflowId,
      })
      return result.content?.[0]?.text
        ? JSON.parse(result.content[0].text)
        : null
    } catch {
      return null
    }
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(workflow: any): Promise<string> {
    try {
      const result = await this.callTool('n8n_create_workflow', {
        workflow,
      })
      return result.content?.[0]?.text || ''
    } catch {
      throw new Error('Failed to create workflow')
    }
  }

  /**
   * Update an existing workflow
   */
  async updateWorkflow(workflowId: string, workflow: any): Promise<void> {
    await this.callTool('n8n_update_workflow', {
      workflow_id: workflowId,
      workflow,
    })
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    inputData?: Record<string, any>
  ): Promise<any> {
    const result = await this.callTool('n8n_execute_workflow', {
      workflow_id: workflowId,
      ...(inputData && { data: inputData }),
    })
    return result.content?.[0]?.text
      ? JSON.parse(result.content[0].text)
      : null
  }

  /**
   * Run a workflow by name
   */
  async runWorkflow(workflowName: string, inputData?: Record<string, any>): Promise<any> {
    const result = await this.callTool('n8n_run_workflow', {
      name: workflowName,
      ...(inputData && { data: inputData }),
    })
    return result.content?.[0]?.text
      ? JSON.parse(result.content[0].text)
      : null
  }

  /**
   * Get available credentials
   */
  async getCredentials(): Promise<any[]> {
    try {
      const result = await this.callTool('n8n_get_credentials', {})
      return result.content?.[0]?.text
        ? JSON.parse(result.content[0].text)
        : []
    } catch {
      return []
    }
  }

  /**
   * Test a connection to n8n
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.callTool('n8n_test_connection', {})
      return { success: true, message: 'Connection successful' }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      }
    }
  }
}

// Singleton instance
let mcpClientInstance: N8nMCPClient | null = null

export function getMCPClient(config?: MCPClientConfig): N8nMCPClient {
  if (!mcpClientInstance) {
    mcpClientInstance = new N8nMCPClient(config)
  }
  return mcpClientInstance
}

export function resetMCPClient(): void {
  if (mcpClientInstance) {
    mcpClientInstance.disconnect()
    mcpClientInstance = null
  }
}

export { N8nMCPClient as default }
