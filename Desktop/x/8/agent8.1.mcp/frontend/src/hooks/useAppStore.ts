import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Message, Workflow, ExecutionLog, AppState } from '../types'
import { v4 as uuidv4 } from 'uuid'

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      messages: [],
      currentSession: null,
      workflow: null,
      isGenerating: false,
      isRunning: false,
      executionLogs: [],
      showPreview: false,

      // Message actions
      addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => {
        const newMessage: Message = {
          ...message,
          id: uuidv4(),
          timestamp: new Date(),
        }
        set((state) => ({
          messages: [...state.messages, newMessage],
        }))
        return newMessage
      },

      clearMessages: () => {
        set({ messages: [], workflow: null, executionLogs: [] })
      },

      // Workflow actions
      setWorkflow: (workflow: Workflow | null) => {
        set({ workflow, showPreview: !!workflow })
      },

      updateWorkflowNodes: (nodes: any[]) => {
        const currentWorkflow = get().workflow
        if (currentWorkflow) {
          set({
            workflow: {
              ...currentWorkflow,
              nodes,
            },
          })
        }
      },

      // Status actions
      setGenerating: (isGenerating: boolean) => {
        set({ isGenerating })
      },

      setRunning: (isRunning: boolean) => {
        set({ isRunning })
      },

      // Execution log actions
      addExecutionLog: (log: Omit<ExecutionLog, 'id' | 'timestamp'>) => {
        const newLog: ExecutionLog = {
          ...log,
          id: uuidv4(),
          timestamp: new Date(),
        }
        set((state) => ({
          executionLogs: [...state.executionLogs, newLog],
        }))
      },

      clearExecutionLogs: () => {
        set({ executionLogs: [] })
      },

      // Preview actions
      togglePreview: () => {
        set((state) => ({ showPreview: !state.showPreview }))
      },

      closePreview: () => {
        set({ showPreview: false })
      },

      // Session actions
      createSession: () => {
        const session = {
          id: uuidv4(),
          messages: [],
          status: 'idle' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        set({
          currentSession: session,
          messages: [],
          workflow: null,
          executionLogs: [],
        })
        return session
      },

      updateSessionStatus: (status: AppState['status']) => {
        const currentSession = get().currentSession
        if (currentSession) {
          set({
            currentSession: {
              ...currentSession,
              status,
              updatedAt: new Date(),
            },
          })
        }
      },

      // Reset all state
      reset: () => {
        set({
          messages: [],
          currentSession: null,
          workflow: null,
          isGenerating: false,
          isRunning: false,
          executionLogs: [],
          showPreview: false,
        })
      },
    }),
    {
      name: 'agent8-storage',
      partialize: (state) => ({
        messages: state.messages.slice(-50), // Keep last 50 messages
      }),
    }
  )
)
