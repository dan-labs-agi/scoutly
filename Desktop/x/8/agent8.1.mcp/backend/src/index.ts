import 'dotenv/config'
import express from 'express'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import cors from 'cors'
import routes from './routes/index.js'
import { errorHandler, notFoundHandler, requestLogger, corsHandler } from './middleware/index.js'

const app = express()
const PORT = process.env.PORT || 4000

// Middleware
app.use(corsHandler)
app.use(express.json({ limit: '10mb' }))
app.use(requestLogger)

// Routes
app.use('/api', routes)

// Error handling
app.use(notFoundHandler)
app.use(errorHandler)

// Create HTTP server
const server = createServer(app)

// WebSocket server for real-time execution logs
const wss = new WebSocketServer({ server, path: '/ws/execute' })

const clients: Map<string, Set<any>> = new Map()

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const sessionId = url.searchParams.get('sessionId')

  if (!sessionId) {
    ws.close()
    return
  }

  if (!clients.has(sessionId)) {
    clients.set(sessionId, new Set())
  }
  clients.get(sessionId)!.add(ws)

  console.log(`Client connected for session: ${sessionId}`)

  ws.on('close', () => {
    clients.get(sessionId)?.delete(ws)
    if (clients.get(sessionId)?.size === 0) {
      clients.delete(sessionId)
    }
    console.log(`Client disconnected for session: ${sessionId}`)
  })

  ws.on('error', (error) => {
    console.error(`WebSocket error for session ${sessionId}:`, error)
  })
})

// Helper to broadcast to session clients
export function broadcastToSession(sessionId: string, data: any) {
  const sessionClients = clients.get(sessionId)
  if (sessionClients) {
    const message = JSON.stringify(data)
    sessionClients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message)
      }
    })
  }
}

// Make broadcast available to routes
app.set('broadcastToSession', broadcastToSession)

// Start server
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   ⚡ Agent8 Backend Server ⚡                               ║
║                                                            ║
║   HTTP:  http://localhost:${PORT}                             ║
║   API:   http://localhost:${PORT}/api                        ║
║   WS:    ws://localhost:${PORT}/ws/execute                   ║
║                                                            ║
║   Environment: ${process.env.NODE_ENV || 'development'}                            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

export { app, server }
