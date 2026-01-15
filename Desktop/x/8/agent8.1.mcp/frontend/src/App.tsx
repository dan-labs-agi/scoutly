import React from 'react'
import { useAppStore } from './hooks/useAppStore'
import ChatInterface from './components/ChatInterface'
import WorkflowPreview from './components/WorkflowPreview'
import ExecutionLogs from './components/ExecutionLogs'
import Header from './components/Header'

function App() {
  const { showPreview, workflow } = useAppStore()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Chat Section */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${
          showPreview && workflow ? 'w-1/2' : 'w-full max-w-4xl mx-auto'
        }`}>
          <ChatInterface />
        </div>

        {/* Preview Section */}
        {showPreview && workflow && (
          <div className="w-1/2 flex flex-col border-l border-dark-700 animate-slide-in">
            <WorkflowPreview />
          </div>
        )}
      </main>

      {/* Execution Logs Panel */}
      <ExecutionLogs />
    </div>
  )
}

export default App
