'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Agent, Task } from '@/types'
import { Activity, Circle, RefreshCw } from 'lucide-react'

const statusConfig: Record<string, { color: string; bg: string; dot: string }> = {
  working: { color: 'text-green-400', bg: 'bg-green-400/10', dot: 'bg-green-400' },
  review: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', dot: 'bg-yellow-400' },
  blocked: { color: 'text-red-400', bg: 'bg-red-400/10', dot: 'bg-red-400' },
  idle: { color: 'text-gray-500', bg: 'bg-gray-500/10', dot: 'bg-gray-500' },
}

export default function ActivityPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const fetchData = useCallback(async () => {
    const [a, t] = await Promise.all([
      supabase.from('agents').select('*').order('name'),
      supabase.from('tasks').select('*').neq('status', 'complete').order('updated_at', { ascending: false }),
    ])
    if (a.data) setAgents(a.data)
    if (t.data) setTasks(t.data)
    setLastRefresh(new Date())
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const workingAgents = agents.filter(a => a.status === 'working')
  const blockedAgents = agents.filter(a => a.status === 'blocked')
  const idleAgents = agents.filter(a => a.status === 'idle')

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Activity className="w-8 h-8 text-green-400" />
            Live Activity
          </h1>
          <p className="text-gray-500 mt-1">
            Real-time team status • Auto-refreshes every 30s
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600">
            Last refresh: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{workingAgents.length}</p>
          <p className="text-xs text-gray-500">Working</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{agents.filter(a => a.status === 'review').length}</p>
          <p className="text-xs text-gray-500">In Review</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{blockedAgents.length}</p>
          <p className="text-xs text-gray-500">Blocked</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-500">{idleAgents.length}</p>
          <p className="text-xs text-gray-500">Idle</p>
        </div>
      </div>

      {/* Live Pulse Indicator */}
      <div className="flex items-center gap-2 mb-6">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        <span className="text-sm text-green-400 font-medium">Live</span>
      </div>

      {/* Agent Activity Cards */}
      <div className="space-y-4">
        {agents.map((agent) => {
          const agentTasks = tasks.filter(t => t.agent_id === agent.id)
          const activeTasks = agentTasks.filter(t => t.status === 'in_progress')
          const config = statusConfig[agent.status] || statusConfig.idle

          return (
            <div
              key={agent.id}
              className={`bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all ${
                agent.status === 'blocked' ? 'border-red-500/30' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: agent.avatar_color }}
                  >
                    {agent.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-lg">{agent.name}</h3>
                    <p className="text-xs text-gray-500">{agent.role}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${config.bg} ${config.color}`}>
                  <Circle className="w-2 h-2 fill-current" />
                  {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                </span>
              </div>

              {/* Active Tasks with Progress */}
              {activeTasks.length > 0 ? (
                <div className="space-y-3 mt-3">
                  {activeTasks.map((task) => (
                    <div key={task.id} className="bg-gray-800/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white font-medium">{task.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          task.priority === 'high' ? 'bg-red-400/10 text-red-400' :
                          task.priority === 'medium' ? 'bg-yellow-400/10 text-yellow-400' :
                          'bg-green-400/10 text-green-400'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${task.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 font-mono w-10 text-right">
                          {task.progress || 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : agentTasks.length > 0 ? (
                <div className="mt-3">
                  <p className="text-sm text-gray-500">
                    {agentTasks.length} task{agentTasks.length > 1 ? 's' : ''} queued
                  </p>
                </div>
              ) : (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 italic">No active tasks</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
