'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Agent, Task, Notification } from '@/types'
import AgentCard from '@/components/AgentCard'
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  ListTodo,
  Loader2
} from 'lucide-react'

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    const fetchAll = async () => {
      const [agentsRes, tasksRes, notifsRes] = await Promise.all([
        supabase.from('agents').select('*').order('name'),
        supabase.from('tasks').select('*, agent:agents(*), project:projects(*)').order('created_at', { ascending: false }),
        supabase.from('notifications').select('*').eq('read', false).order('created_at', { ascending: false }).limit(5),
      ])

      const agentsData = agentsRes.data || []
      const tasksData = tasksRes.data || []

      setAgents(agentsData)
      setTasks(tasksData)
      setNotifications(notifsRes.data || [])

      // Count active tasks per agent
      const counts: Record<string, number> = {}
      tasksData.forEach((t: Task) => {
        if (t.agent_id && t.status !== 'complete') {
          counts[t.agent_id] = (counts[t.agent_id] || 0) + 1
        }
      })
      setTaskCounts(counts)
      setLoading(false)
    }
    fetchAll()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'complete').length
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length
  const blockedAgents = agents.filter(a => a.status === 'blocked').length
  const highPriorityTasks = tasks.filter(t => t.priority === 'high' && t.status !== 'complete').length

  const stats = [
    { label: 'Total Tasks', value: totalTasks, icon: ListTodo, color: 'text-blue-400' },
    { label: 'In Progress', value: inProgressTasks, icon: Clock, color: 'text-yellow-400' },
    { label: 'Completed', value: completedTasks, icon: CheckCircle, color: 'text-green-400' },
    { label: 'High Priority', value: highPriorityTasks, icon: AlertTriangle, color: 'text-red-400' },
    { label: 'Active Agents', value: agents.filter(a => a.status === 'working').length, icon: Users, color: 'text-purple-400' },
    { label: 'Blocked', value: blockedAgents, icon: AlertTriangle, color: 'text-orange-400' },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Command Center</h1>
        <p className="text-gray-500">Overview of all agents and operations</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-gray-500">{stat.label}</span>
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          )
        })}
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Notifications</h2>
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`px-4 py-3 rounded-lg border text-sm ${
                  n.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                  n.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                  n.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                  'bg-blue-500/10 border-blue-500/20 text-blue-400'
                }`}
              >
                {n.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Grid */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Agent Team</h2>
          <span className="text-sm text-gray-500">{agents.length} agents</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              taskCount={taskCounts[agent.id] || 0}
            />
          ))}
        </div>
      </div>

      {/* Recent Tasks */}
      {tasks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Recent Tasks</h2>
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Task</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Agent</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Priority</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.slice(0, 10).map((task) => (
                  <tr key={task.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-sm text-white">{task.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{task.agent?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${
                        task.priority === 'high' ? 'text-red-400' :
                        task.priority === 'medium' ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded ${
                        task.status === 'complete' ? 'bg-green-500/10 text-green-400' :
                        task.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400' :
                        task.status === 'review' ? 'bg-purple-500/10 text-purple-400' :
                        'bg-gray-500/10 text-gray-400'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
