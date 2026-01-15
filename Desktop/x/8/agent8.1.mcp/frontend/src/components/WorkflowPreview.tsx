import React, { useCallback, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useAppStore } from '../hooks/useAppStore'
import { workflowToReactFlow, getNodeIcon, getNodeColor } from '../utils/workflow'

const nodeTypes = {
  default: (props: any) => (
    <div
      className="px-4 py-3 bg-dark-800 border-2 rounded-lg min-w-[150px] text-center"
      style={{ borderColor: getNodeColor(props.data.type) }}
    >
      <div className="text-lg mb-1">{getNodeIcon(props.data.type)}</div>
      <div className="text-sm font-medium text-white">{props.data.label}</div>
      <div className="text-xs text-dark-400 mt-1">{props.data.type.split('.').pop()}</div>
    </div>
  ),
  trigger: (props: any) => (
    <div
      className="px-4 py-3 bg-amber-500/10 border-2 rounded-lg min-w-[150px] text-center"
      style={{ borderColor: '#f59e0b' }}
    >
      <div className="text-lg mb-1">⚡</div>
      <div className="text-sm font-medium text-white">{props.data.label}</div>
      <div className="text-xs text-amber-400 mt-1">Trigger</div>
    </div>
  ),
}

const defaultEdgeOptions = {
  animated: true,
  style: { stroke: '#38bdf8', strokeWidth: 2 },
}

export default function WorkflowPreview() {
  const { workflow, executeWorkflow, isRunning, setRunning, addExecutionLog } = useAppStore()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    if (workflow) {
      const { nodes: flowNodes, edges: flowEdges } = workflowToReactFlow(workflow)
      setNodes(flowNodes)
      setEdges(flowEdges)
    }
  }, [workflow, setNodes, setEdges])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const handleRun = async () => {
    if (!workflow) return
    
    setRunning(true)
    addExecutionLog({
      level: 'info',
      nodeName: 'System',
      message: 'Starting workflow execution...',
    })

    try {
      // Create a session for this execution
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow, dryRun: true }),
      })

      const data = await response.json()
      
      if (data.success) {
        addExecutionLog({
          level: 'success',
          nodeName: 'System',
          message: 'Workflow executed successfully',
        })
      } else {
        addExecutionLog({
          level: 'error',
          nodeName: 'System',
          message: data.error || 'Execution failed',
        })
      }
    } catch (err) {
      addExecutionLog({
        level: 'error',
        nodeName: 'System',
        message: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setRunning(false)
    }
  }

  const handleViewJson = () => {
    if (workflow) {
      const json = JSON.stringify(workflow, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${workflow.name || 'workflow'}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  if (!workflow) {
    return (
      <div className="h-full flex items-center justify-center text-dark-400">
        <p>No workflow to preview</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-dark-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Workflow Preview</h2>
            <p className="text-sm text-dark-400">
              {workflow.nodes?.length || 0} nodes • {workflow.name || 'Untitled'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleViewJson}
              className="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-200 rounded-lg text-sm transition-colors"
            >
              Export JSON
            </button>
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-dark-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <span>▶</span>
                  Run Workflow
                </>
              )}
            </button>
          </div>
        </div>

        {/* Node Summary */}
        <div className="flex flex-wrap gap-2">
          {workflow.nodes?.map((node) => (
            <span
              key={node.id}
              className="px-2 py-1 bg-dark-700/50 rounded text-xs text-dark-300 flex items-center gap-1"
            >
              <span>{getNodeIcon(node.type)}</span>
              {node.name}
            </span>
          ))}
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#334155" gap={20} />
          <Controls className="bg-dark-800 border-dark-700" />
          <MiniMap
            className="bg-dark-800"
            nodeColor={(node) => getNodeColor(node.data?.type || 'default')}
          />
        </ReactFlow>
      </div>
    </div>
  )
}
