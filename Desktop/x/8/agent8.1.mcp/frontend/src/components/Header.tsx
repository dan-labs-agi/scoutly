import React from 'react'

export default function Header() {
  return (
    <header className="h-16 bg-dark-900/80 backdrop-blur-lg border-b border-dark-700 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
          <span className="text-xl">⚡</span>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white">Agent8</h1>
          <p className="text-xs text-dark-400">Prompt to Workflow Builder</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <a
          href="https://github.com/agent8"
          target="_blank"
          rel="noopener noreferrer"
          className="text-dark-400 hover:text-white transition-colors"
        >
          GitHub
        </a>
        <a
          href="https://docs.agent8.io"
          target="_blank"
          rel="noopener noreferrer"
          className="text-dark-400 hover:text-white transition-colors"
        >
          Docs
        </a>
        <button className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors">
          New Workflow
        </button>
      </div>
    </header>
  )
}
