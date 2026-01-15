import { EventEmitter } from 'events'
import { getMCPClient, N8nMCPClient, MCPClientConfig } from './n8n-mcp-client.js'
import { getSkillsLoader, N8nSkillsLoader, SkillConfig } from '../skills/n8n-skills.js'
import type { N8nSkill, N8nSkillMatch, MCPTool } from '../../types/mcp.js'

interface MCPManagerConfig {
  mcp?: MCPClientConfig
  skills?: Partial<SkillConfig>
  autoConnect?: boolean
}

interface ManagerState {
  initialized: boolean
  connected: boolean
  toolsLoaded: boolean
  skillsLoaded: boolean
}

export class MCPManager extends EventEmitter {
  private config: MCPManagerConfig
  private mcpClient: N8nMCPClient
  private skillsLoader: N8nSkillsLoader
  private state: ManagerState = {
    initialized: false,
    connected: false,
    toolsLoaded: false,
    skillsLoaded: false,
  }

  constructor(config: MCPManagerConfig = {}) {
    super()
    this.config = {
      autoConnect: true,
      ...config,
    }

    this.mcpClient = getMCPClient(config.mcp)
    this.skillsLoader = getSkillsLoader(config.skills)

    // Set up event forwarding
    this.mcpClient.on('connected', () => {
      this.state.connected = true
      this.emit('connected')
    })

    this.mcpClient.on('disconnected', () => {
      this.state.connected = false
      this.emit('disconnected')
    })

    this.mcpClient.on('toolsLoaded', (tools) => {
      this.state.toolsLoaded = true
      this.emit('toolsLoaded', tools)
    })

    this.mcpClient.on('error', (error) => {
      this.emit('error', error)
    })
  }

  /**
   * Initialize the MCP manager
   */
  async initialize(): Promise<void> {
    if (this.state.initialized) {
      console.log('[MCP Manager] Already initialized')
      return
    }

    console.log('[MCP Manager] Initializing...')

    try {
      // Load skills first (doesn't require connection)
      await this.skillsLoader.loadSkills()
      this.state.skillsLoaded = true
      console.log('[MCP Manager] Skills loaded')

      // Auto-connect if enabled
      if (this.config.autoConnect) {
        await this.connect()
      }

      this.state.initialized = true
      this.emit('initialized')
      console.log('[MCP Manager] Initialization complete')
    } catch (error) {
      console.error('[MCP Manager] Initialization failed:', error)
      throw error
    }
  }

  /**
   * Connect to the n8n MCP server
   */
  async connect(): Promise<void> {
    if (this.state.connected) {
      console.log('[MCP Manager] Already connected')
      return
    }

    console.log('[MCP Manager] Connecting to n8n MCP server...')
    await this.mcpClient.connect()
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    console.log('[MCP Manager] Disconnecting...')
    await this.mcpClient.disconnect()
    this.state.connected = false
    this.state.toolsLoaded = false
  }

  /**
   * Get connection state
   */
  getState(): ManagerState {
    return { ...this.state }
  }

  /**
   * Check if ready to use
   */
  isReady(): boolean {
    return this.state.initialized && this.state.connected
  }

  /**
   * Get available tools from MCP
   */
  getTools(): MCPTool[] {
    return this.mcpClient.getTools()
  }

  /**
   * Search for tools
   */
  searchTools(query: string): MCPTool[] {
    return this.mcpClient.searchTools(query)
  }

  /**
   * Get a specific tool
   */
  getTool(name: string): MCPTool | undefined {
    return this.mcpClient.getTool(name)
  }

  /**
   * Call an MCP tool
   */
  async callTool<T = any>(
    toolName: string,
    args: Record<string, any>
  ): Promise<T> {
    const result = await this.mcpClient.callTool(toolName, args)
    
    // Parse JSON result if present
    if (result.content?.[0]?.text) {
      try {
        return JSON.parse(result.content[0].text)
      } catch {
        return result.content[0].text as T
      }
    }
    
    return result as T
  }

  /**
   * Get all skills
   */
  async getSkills(): Promise<N8nSkill[]> {
    return this.skillsLoader.getAllSkills()
  }

  /**
   * Get skills by category
   */
  async getSkillsByCategory(category: string): Promise<N8nSkill[]> {
    return this.skillsLoader.getSkillsByCategory(category)
  }

  /**
   * Find matching skills for a prompt
   */
  async findMatchingSkills(prompt: string): Promise<N8nSkillMatch[]> {
    return this.skillsLoader.findMatchingSkills(prompt)
  }

  /**
   * Get best matching skill
   */
  async getBestMatchingSkill(
    prompt: string
  ): Promise<N8nSkillMatch | null> {
    return this.skillsLoader.getBestMatchingSkill(prompt)
  }

  /**
   * Generate enhanced prompt with skill context
   */
  async generateEnhancedPrompt(prompt: string): Promise<string> {
    return this.skillsLoader.generateEnhancedPrompt(prompt)
  }

  /**
   * Get workflow template from skill
   */
  async getWorkflowTemplateFromSkill(
    skillId: string,
    customizations?: Record<string, any>
  ): Promise<{
    name: string
    nodes: any[]
    connections: any
  } | null> {
    return this.skillsLoader.getWorkflowTemplateFromSkill(
      skillId,
      customizations
    )
  }

  /**
   * Convert tool to n8n node format
   */
  toolToN8nNode(tool: MCPTool): {
    name: string
    displayName: string
    description: string
    properties: any[]
  } {
    return this.mcpClient.toolToN8nNode(tool)
  }

  /**
   * Get n8n workflows
   */
  async getWorkflows(): Promise<any[]> {
    return this.mcpClient.getWorkflows()
  }

  /**
   * Get a specific workflow
   */
  async getWorkflow(workflowId: string): Promise<any> {
    return this.mcpClient.getWorkflow(workflowId)
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(workflow: any): Promise<string> {
    return this.mcpClient.createWorkflow(workflow)
  }

  /**
   * Update an existing workflow
   */
  async updateWorkflow(workflowId: string, workflow: any): Promise<void> {
    await this.mcpClient.updateWorkflow(workflowId, workflow)
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    inputData?: Record<string, any>
  ): Promise<any> {
    return this.mcpClient.executeWorkflow(workflowId, inputData)
  }

  /**
   * Run a workflow by name
   */
  async runWorkflow(
    workflowName: string,
    inputData?: Record<string, any>
  ): Promise<any> {
    return this.mcpClient.runWorkflow(workflowName, inputData)
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    return this.mcpClient.testConnection()
  }

  /**
   * Refresh skills cache
   */
  async refreshSkills(): Promise<void> {
    await this.skillsLoader.refreshCache()
    this.state.skillsLoaded = true
    this.emit('skillsRefreshed')
  }

  /**
   * Refresh tools cache
   */
  async refreshTools(): Promise<void> {
    await this.mcpClient.refreshToolCache()
  }
}

// Singleton instance
let managerInstance: MCPManager | null = null

export function getMCPManager(config?: MCPManagerConfig): MCPManager {
  if (!managerInstance) {
    managerInstance = new MCPManager(config)
  }
  return managerInstance
}

export function resetMCPManager(): void {
  if (managerInstance) {
    managerInstance.disconnect()
    managerInstance = null
  }
}

export { MCPManager as default }
