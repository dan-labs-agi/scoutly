import React, { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../hooks/useAppStore'
import { useChat } from '../hooks/useChat'
import type { Message, Workflow } from '../types'

export default function ChatInterface() {
  const { messages, addMessage, clearMessages, isGenerating, setGenerating } = useAppStore()
  const { sendMessage, isLoading, error } = useChat()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    addMessage({ role: 'user', content: userMessage })
    setGenerating(true)

    try {
      const response = await sendMessage(userMessage)
      
      if (response.success && response.data) {
        addMessage({
          role: 'assistant',
          content: response.data.response,
          type: 'text',
        })

        if (response.data.workflow) {
          addMessage({
            role: 'assistant',
            content: 'I\'ve generated a workflow based on your request.',
            type: 'workflow',
            data: { workflow: response.data.workflow },
          })
        }
      } else {
        addMessage({
          role: 'assistant',
          content: `Error: ${response.error || 'Failed to process your request'}`,
          type: 'text',
        })
      }
    } catch (err) {
      addMessage({
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Unknown error occurred'}`,
        type: 'text',
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const examplePrompts = [
    'When a new GitHub issue is opened, summarize it and send it to Slack',
    'Every morning at 9 AM, fetch weather and send me a summary via email',
    'When someone fills out my Typeform, add them to Airtable and send a welcome email',
    'Monitor a webpage for changes and notify me on Discord',
  ]

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-700/20 flex items-center justify-center mb-6">
              <span className="text-4xl">✨</span>
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">
              What would you like to automate?
            </h2>
            <p className="text-dark-400 mb-8 max-w-md">
              Describe your automation in natural language and I'll build an n8n workflow for you.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
              {examplePrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => setInput(prompt)}
                  className="p-4 bg-dark-800/50 hover:bg-dark-800 border border-dark-700 rounded-xl text-left transition-all group"
                >
                  <p className="text-sm text-dark-300 group-hover:text-white transition-colors line-clamp-2">
                    {prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        
        {isLoading && (
          <div className="flex items-center gap-2 text-dark-400">
            <div className="spinner" />
            <span>Thinking...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-dark-700">
        {error && (
          <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to automate..."
            className="w-full bg-dark-800 border border-dark-700 rounded-xl px-4 py-3 pr-14 text-white placeholder-dark-500 resize-none focus:outline-none focus:border-primary-500 transition-colors"
            rows={3}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute bottom-3 right-3 w-8 h-8 bg-primary-600 hover:bg-primary-500 disabled:bg-dark-700 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </form>
        
        <div className="mt-2 flex items-center justify-between text-xs text-dark-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>Powered by n8n + OpenRouter</span>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  if (isSystem) {
    return (
      <div className="message-enter flex justify-center">
        <div className="px-4 py-2 bg-dark-800/50 rounded-full text-xs text-dark-400">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className={`message-enter flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        {message.type === 'workflow' && message.data?.workflow ? (
          <div className="p-4 bg-gradient-to-br from-primary-500/10 to-primary-700/10 border border-primary-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🔧</span>
              <span className="font-medium text-white">Workflow Generated</span>
            </div>
            <p className="text-dark-300 text-sm mb-4">{message.content}</p>
            <WorkflowSummary workflow={message.data.workflow} />
          </div>
        ) : (
          <div
            className={`px-4 py-3 rounded-2xl ${
              isUser
                ? 'bg-primary-600 text-white rounded-br-md'
                : 'bg-dark-800 text-dark-200 rounded-bl-md'
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        )}
        
        <div className={`text-xs text-dark-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}

function WorkflowSummary({ workflow }: { workflow: Workflow }) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-dark-400 uppercase tracking-wider">Nodes</div>
      <div className="flex flex-wrap gap-2">
        {workflow.nodes?.slice(0, 6).map((node) => (
          <span
            key={node.id}
            className="px-2 py-1 bg-dark-700/50 rounded text-xs text-dark-300"
          >
            {node.name}
          </span>
        ))}
        {workflow.nodes?.length > 6 && (
          <span className="px-2 py-1 bg-dark-700/50 rounded text-xs text-dark-400">
            +{workflow.nodes.length - 6} more
          </span>
        )}
      </div>
    </div>
  )
}
