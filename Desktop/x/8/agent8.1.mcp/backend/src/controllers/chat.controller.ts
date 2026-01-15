import { v4 as uuidv4 } from 'uuid'
import type { Request, Response, NextFunction } from 'express'
import { llmService, workflowGenerator, n8nWrapper, getMCPManager, getMCPClient } from '../services/index.js'
import type { Session, Workflow, ApiResponse, Message } from '../types/index.js'

// In-memory session storage (use Redis/DB in production)
const sessions: Map<string, Session> = new Map()

// MCP Manager singleton
let mcpManager: ReturnType<typeof getMCPManager> | null = null

function getMCPManagerInstance() {
  if (!mcpManager) {
    mcpManager = getMCPManager({
      autoConnect: true,
    })
  }
  return mcpManager
}

export class ChatController {
  // Initialize MCP connection
  async initializeMCP(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const manager = getMCPManagerInstance()
      
      if (!manager.isReady()) {
        await manager.initialize()
      }

      const state = manager.getState()
      const testResult = await manager.testConnection()

      return res.json({
        success: true,
        data: {
          initialized: state.initialized,
          connected: state.connected,
          toolsLoaded: state.toolsLoaded,
          skillsLoaded: state.skillsLoaded,
          connectionTest: testResult,
        },
      })
    } catch (error) {
      console.error('MCP initialization error:', error)
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'MCP initialization failed',
      })
    }
  }

  // Get MCP connection status
  async getMCPStatus(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const manager = getMCPManagerInstance()
      const state = manager.getState()
      const tools = manager.getTools()

      return res.json({
        success: true,
        data: {
          state,
          toolCount: tools.length,
          tools: tools.slice(0, 10), // Return first 10 tools
        },
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get MCP status',
      })
    }
  }

  // Get all available MCP tools
  async getMCPTools(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const manager = getMCPManagerInstance()
      const tools = manager.getTools()

      return res.json({
        success: true,
        data: {
          tools,
          totalCount: tools.length,
        },
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get tools',
      })
    }
  }

  // Search MCP tools
  async searchMCPTools(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const { q } = req.query

      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Search query is required',
        })
      }

      const manager = getMCPManagerInstance()
      const tools = manager.searchTools(q)

      return res.json({
        success: true,
        data: {
          tools,
          query: q,
          resultCount: tools.length,
        },
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Tool search failed',
      })
    }
  }

  // Get n8n-skills
  async getSkills(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const manager = getMCPManagerInstance()
      const skills = await manager.getSkills()
      const categories = await manager.getCategories()

      return res.json({
        success: true,
        data: {
          skills,
          categories,
          totalCount: skills.length,
        },
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get skills',
      })
    }
  }

  // Find matching skills for a prompt
  async matchSkills(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const { prompt } = req.body

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Prompt is required',
        })
      }

      const manager = getMCPManagerInstance()
      const matches = await manager.findMatchingSkills(prompt)

      return res.json({
        success: true,
        data: {
          matches: matches.slice(0, 5),
          totalMatches: matches.length,
        },
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Skill matching failed',
      })
    }
  }

  // Call an MCP tool directly
  async callMCPTool(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const { toolName, args } = req.body

      if (!toolName || typeof toolName !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Tool name is required',
        })
      }

      const manager = getMCPManagerInstance()
      const result = await manager.callTool(toolName, args || {})

      return res.json({
        success: true,
        data: {
          tool: toolName,
          result,
        },
      })
    } catch (error) {
      console.error('MCP tool call error:', error)
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Tool call failed',
      })
    }
  }

  // Send message and get response
  async chat(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const { message, sessionId, clarifications } = req.body

      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Message is required',
        })
      }

      // Get or create session
      let session: Session
      if (sessionId && sessions.has(sessionId)) {
        session = sessions.get(sessionId)!
      } else {
        session = {
          id: uuidv4(),
          messages: [],
          status: 'idle',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        sessions.set(session.id, session)
      }

      // Add user message
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: message,
        timestamp: new Date(),
      }
      session.messages.push(userMessage)
      session.status = 'understanding'
      session.updatedAt = new Date()

      // Analyze intent
      const intent = await llmService.analyzeIntent(message)

      // Check if we need clarifications
      if (intent.clarifications.length > 0 && !clarifications) {
        const clarification = await llmService.askClarification(
          message,
          intent.clarifications
        )

        const assistantMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          type: 'clarification',
          data: {
            questions: clarification.questions,
            suggestions: clarification.suggestions,
          },
        }
        session.messages.push(assistantMessage)
        session.status = 'clarifying'

        return res.json({
          success: true,
          data: {
            sessionId: session.id,
            response: assistantMessage,
            requiresClarification: true,
          },
        })
      }

      // Generate workflow using MCP and skills
      session.status = 'generating'
      const workflow = await workflowGenerator.generateFromPrompt(message, clarifications)

      // Get MCP status for response
      const mcpManager = getMCPManagerInstance()
      const mcpState = mcpManager.getState()

      // Validate workflow
      const validation = await n8nWrapper.validateWorkflow(workflow)
      if (!validation.valid) {
        return res.json({
          success: false,
          error: `Workflow validation failed: ${validation.errors.join(', ')}`,
        })
      }

      // Store workflow in session
      session.workflow = workflow
      session.status = 'ready'

      // Generate response with skill info
      const skillInfo = mcpState.toolsLoaded ? 
        ` using ${mcpManager.getTools().length} available MCP tools` : ''

      const responseText = `I've created a workflow "${workflow.name}" with ${workflow.nodes.length} nodes to automate your request${skillInfo}.

The workflow includes:
${workflow.nodes.map(n => `- **${n.name}** (${n.type.split('.').pop()})`).join('\n')}

Click "Run Workflow" to test it, or "Export JSON" to use it in n8n directly.`

      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
        type: 'workflow',
        data: { workflow },
      }
      session.messages.push(assistantMessage)

      return res.json({
        success: true,
        data: {
          sessionId: session.id,
          response: responseText,
          workflow,
          mcpStatus: mcpState,
        },
      })
    } catch (error) {
      console.error('Chat error:', error)
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      })
    }
  }

  // Generate workflow directly
  async generate(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const { prompt, clarifications } = req.body

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Prompt is required',
        })
      }

      const workflow = await workflowGenerator.generateFromPrompt(prompt, clarifications)

      // Validate workflow
      const validation = await n8nWrapper.validateWorkflow(workflow)
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: `Workflow validation failed: ${validation.errors.join(', ')}`,
        })
      }

      return res.json({
        success: true,
        data: { workflow },
      })
    } catch (error) {
      console.error('Generate error:', error)
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      })
    }
  }

  // Execute workflow
  async execute(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const { workflow, sessionId, dryRun, inputData } = req.body

      if (!workflow) {
        return res.status(400).json({
          success: false,
          error: 'Workflow is required',
        })
      }

      // Try MCP execution first if connected
      if (!dryRun) {
        try {
          const mcpManager = getMCPManagerInstance()
          if (mcpManager.isReady()) {
            // Create workflow in n8n and execute via MCP
            const workflowId = await mcpManager.createWorkflow(workflow)
            const result = await mcpManager.executeWorkflow(workflowId, inputData)
            
            return res.json({
              success: true,
              data: {
                executionMethod: 'mcp',
                workflowId,
                result,
              },
            })
          }
        } catch (mcpError) {
          console.warn('MCP execution failed, falling back to n8n wrapper:', mcpError)
        }
      }

      // Fallback to n8n wrapper
      if (dryRun) {
        const result = await n8nWrapper.dryRun(workflow, inputData)
        return res.json({
          success: result.success,
          data: {
            executionMethod: 'simulation',
            logs: result.logs,
            error: result.error,
          },
        })
      }

      // Real execution via n8n wrapper
      const workflowId = await n8nWrapper.importWorkflow(workflow)
      const executionStatus = await n8nWrapper.executeWorkflow(workflowId, inputData)

      return res.json({
        success: true,
        data: {
          executionMethod: 'n8n-api',
          executionId: executionStatus.executionId,
          status: executionStatus.status,
        },
      })
    } catch (error) {
      console.error('Execute error:', error)
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      })
    }
  }

  // Get session
  async getSession(req: Request, res: Response<ApiResponse<Session>>) {
    const { sessionId } = req.params

    if (!sessionId || !sessions.has(sessionId)) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      })
    }

    return res.json({
      success: true,
      data: sessions.get(sessionId)!,
    })
  }

  // Get workflow status
  async getExecutionStatus(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const { executionId } = req.params

      const status = await n8nWrapper.getExecutionStatus(executionId)
      const logs = await n8nWrapper.getExecutionLogs(executionId)

      return res.json({
        success: true,
        data: {
          status,
          logs,
        },
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      })
    }
  }

  // Disconnect MCP
  async disconnectMCP(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const manager = getMCPManagerInstance()
      await manager.disconnect()

      return res.json({
        success: true,
        message: 'MCP disconnected successfully',
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Disconnect failed',
      })
    }
  }
}

export const chatController = new ChatController()
