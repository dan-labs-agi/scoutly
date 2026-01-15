import { useCallback, useEffect, useRef, useState } from 'react'
import type { ApiResponse, Workflow, ExecutionLog, ExecutionStatus } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/ws'

export interface UseChatOptions {
  onWorkflowGenerated?: (workflow: Workflow) => void
  onExecutionUpdate?: (status: ExecutionStatus) => void
  onLog?: (log: ExecutionLog) => void
}

export function useChat(options: UseChatOptions = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const connectWebSocket = useCallback((sessionId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    const ws = new WebSocket(`${WS_URL}/execute?sessionId=${sessionId}`)
    
    ws.onopen = () => {
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'log' && options.onLog) {
          options.onLog(data.payload)
        } else if (data.type === 'status' && options.onExecutionUpdate) {
          options.onExecutionUpdate(data.payload)
        } else if (data.type === 'error') {
          setError(data.message)
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err)
      }
    }

    ws.onerror = (err) => {
      console.error('WebSocket error:', err)
      setError('WebSocket connection error')
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
    }

    wsRef.current = ws
  }, [options])

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  const sendMessage = useCallback(async (
    content: string,
    sessionId?: string
  ): Promise<ApiResponse<{ sessionId: string; response: string; workflow?: Workflow }>> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          sessionId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      if (data.data.workflow && options.onWorkflowGenerated) {
        options.onWorkflowGenerated(data.data.workflow)
      }

      if (data.data.sessionId) {
        connectWebSocket(data.data.sessionId)
      }

      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [connectWebSocket, options])

  const executeWorkflow = useCallback(async (
    workflow: Workflow,
    sessionId: string,
    dryRun: boolean = false
  ): Promise<ApiResponse<ExecutionStatus>> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow,
          sessionId,
          dryRun,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute workflow')
      }

      connectWebSocket(sessionId)

      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [connectWebSocket])

  const generateWorkflow = useCallback(async (
    prompt: string,
    clarifications?: Record<string, string>
  ): Promise<ApiResponse<Workflow>> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          clarifications,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate workflow')
      }

      if (data.data?.workflow && options.onWorkflowGenerated) {
        options.onWorkflowGenerated(data.data.workflow)
      }

      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [options])

  useEffect(() => {
    return () => {
      disconnectWebSocket()
    }
  }, [disconnectWebSocket])

  return {
    sendMessage,
    executeWorkflow,
    generateWorkflow,
    isLoading,
    error,
    connectWebSocket,
    disconnectWebSocket,
  }
}
