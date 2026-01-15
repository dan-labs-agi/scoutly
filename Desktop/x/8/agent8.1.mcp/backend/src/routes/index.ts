import { Router } from 'express'
import { chatController } from '../controllers/index.js'
import { mcpWrapper } from '../services/index.js'

const router = Router()

// ============ MCP Integration Endpoints ============

// Initialize MCP connection
router.post('/mcp/initialize', chatController.initializeMCP.bind(chatController))

// Get MCP connection status
router.get('/mcp/status', chatController.getMCPStatus.bind(chatController))

// Disconnect MCP
router.post('/mcp/disconnect', chatController.disconnectMCP.bind(chatController))

// Get all available MCP tools
router.get('/mcp/tools', chatController.getMCPTools.bind(chatController))

// Search MCP tools
router.get('/mcp/tools/search', chatController.searchMCPTools.bind(chatController))

// Call an MCP tool directly
router.post('/mcp/tools/call', chatController.callMCPTool.bind(chatController))

// Get n8n-skills
router.get('/mcp/skills', chatController.getSkills.bind(chatController))

// Match skills to a prompt
router.post('/mcp/skills/match', chatController.matchSkills.bind(chatController))

// ============ Chat and Workflow Endpoints ============

// Send message and get response
router.post('/chat', chatController.chat.bind(chatController))

// Generate workflow directly
router.post('/generate', chatController.generate.bind(chatController))

// Execute workflow
router.post('/execute', chatController.execute.bind(chatController))

// ============ Session Management ============

// Get session
router.get('/session/:sessionId', chatController.getSession.bind(chatController))

// ============ Execution Status ============

// Get execution status
router.get('/execution/:executionId', chatController.getExecutionStatus.bind(chatController))

// ============ n8n Nodes (Fallback/Mock) ============

// Get available nodes (uses mock wrapper as fallback)
router.get('/nodes', async (req, res) => {
  try {
    const nodes = await mcpWrapper.listNodes()
    res.json({ success: true, data: nodes, source: 'mock' })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
})

// Search nodes
router.get('/nodes/search', async (req, res) => {
  try {
    const { q } = req.query
    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      })
    }
    const nodes = await mcpWrapper.searchNodes(q)
    res.json({ success: true, data: nodes })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
})

// ============ Health Check ============

router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    mcp: {
      enabled: true,
      sdk: '@modelcontextprotocol/sdk',
    },
  })
})

export default router
