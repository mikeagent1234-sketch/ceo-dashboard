'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Agent, Task } from '@/types'
import { Loader2 } from 'lucide-react'

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const [agentsRes, tasksRes] = await Promise.all([
        supabase.from('agents').select('*').order('name'),
        supabase.from('tasks').select('*, agent:agents(*), project:projects(*)').order('created_at', { ascending: false }),
      ])
      setAgents(agentsRes.data || [])
      setTasks(tasksRes.data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const updateStatus = async (agentId: string, status: string) => {
    await supabase.from('agents').update({ status }).eq('id', agentId)
    setAgents(agents.map(a => a.id === agentId ? { ...a, status: status as Agent['status'] } : a))
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
  }

  const getAgentTasks = (agentId: string) => tasks.filter(t => t.agent_id === agentId)

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Agents</h1>
        <p className="text-gray-500">Manage and monitor your AI team</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {agents.map((agent) => {
          const agentTasks = getAgentTasks(agent.id)
          const activeTasks = agentTasks.filter(t => t.status !== 'complete')
          const completedTasks = agentTasks.filter(t => t.status === 'complete')

          return (
            <div key={agent.id} className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 animate-fade-in">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl"
                    style={{ backgroundColor: agent.avatar_color }}
                  >
                    {agent.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">{agent.name}</h3>
                    <p className="text-sm text-gray-500">{agent.role}</p>
                  </div>
                </div>

                <select
                  value={agent.status}
                  onChange={(e) => updateStatus(agent.id, e.target.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border focus:outline-none ${
                    agent.status === 'working' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                    agent.status === 'blocked' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                    'bg-gray-800 border-gray-700 text-gray-400'
                  }`}
                >
                  <option value="idle">Idle</option>
                  <option value="working">Working</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>

              <div className="flex gap-4 mb-4">
                <div className="flex-1 bg-gray-800/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-white">{activeTasks.length}</p>
                  <p className="text-xs text-gray-500">Active</p>
                </div>
                <div className="flex-1 bg-gray-800/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-green-400">{completedTasks.length}</p>
                  <p className="text-xs text-gray-500">Done</p>
                </div>
                <div className="flex-1 bg-gray-800/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-yellow-400">{agentTasks.filter(t => t.priority === 'high' && t.status !== 'complete').length}</p>
                  <p className="text-xs text-gray-500">Urgent</p>
                </div>
              </div>

              {activeTasks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-medium uppercase">Active Tasks</p>
                  {activeTasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="flex items-center justify-between px-3 py-2 bg-gray-800/30 rounded-lg">
                      <span className="text-sm text-gray-300 truncate flex-1 mr-2">{task.title}</span>
                      <span className={`text-xs ${
                        task.status === 'in_progress' ? 'text-blue-400' :
                        task.status === 'review' ? 'text-purple-400' : 'text-gray-500'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                  {activeTasks.length > 3 && (
                    <p className="text-xs text-gray-600 text-center">+{activeTasks.length - 3} more</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
