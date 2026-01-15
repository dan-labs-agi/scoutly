import React, { useEffect, useRef } from 'react'
import { useAppStore } from '../hooks/useAppStore'

export default function ExecutionLogs() {
  const { executionLogs, clearExecutionLogs, isRunning } = useAppStore()
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [executionLogs])

  if (executionLogs.length === 0) {
    return null
  }

  return (
    <div className="h-48 bg-dark-900/90 border-t border-dark-700 flex flex-col">
      {/* Header */}
      <div className="px-4 py-2 border-b border-dark-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">Execution Logs</span>
          <span className="px-2 py-0.5 bg-dark-700 rounded text-xs text-dark-400">
            {executionLogs.length}
          </span>
          {isRunning && (
            <span className="flex items-center gap-1 text-green-400 text-xs">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Running
            </span>
          )}
        </div>
        <button
          onClick={clearExecutionLogs}
          className="text-xs text-dark-400 hover:text-white transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Log Content */}
      <div className="flex-1 overflow-y-auto p-4 log-console">
        {executionLogs.map((log) => (
          <LogEntry key={log.id} log={log} />
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  )
}

function LogEntry({ log }: { log: typeof import('../types').ExecutionLog }) {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }

  return (
    <div className={`log-entry ${log.level}`}>
      <span className="text-dark-500">[{formatTime(log.timestamp)}]</span>{' '}
      <span className="font-medium text-white">{log.nodeName}:</span>{' '}
      <span className="text-dark-200">{log.message}</span>
      {log.data && (
        <pre className="mt-1 text-xs text-dark-400 overflow-x-auto">
          {JSON.stringify(log.data, null, 2)}
        </pre>
      )}
    </div>
  )
}
