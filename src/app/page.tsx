'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Agent, Task, Notification } from '@/types'
import AgentCard from '@/components/AgentCard'
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  ListTodo,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

export default function Dashboard() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({})
  const [doneExpanded, setDoneExpanded] = useState(true)

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

      const counts: Record<string, number> = {}
      tasksData.forEach((t: Task) => {
        if (t.agent_id && t.status !== 'approved' && t.status !== 'complete') {
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

  // Done Today: tasks approved today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const doneTodayTasks = tasks.filter(t => {
    if (t.status !== 'approved') return false
    const updated = new Date(t.updated_at)
    return updated >= todayStart
  })

  // Group done tasks by agent
  const doneByAgent: Record<string, { agent: Agent | undefined; tasks: Task[] }> = {}
  doneTodayTasks.forEach(t => {
    const agentId = t.agent_id || 'unassigned'
    if (!doneByAgent[agentId]) {
      doneByAgent[agentId] = { agent: agents.find(a => a.id === t.agent_id), tasks: [] }
    }
    doneByAgent[agentId].tasks.push(t)
  })

  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'approved').length
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length
  const blockedAgents = agents.filter(a => a.status === 'blocked').length
  const highPriorityTasks = tasks.filter(t => t.priority === 'high' && t.status !== 'approved').length
  const inReviewTasks = tasks.filter(t => t.status === 'review').length

  const stats = [
    { label: 'Total Tasks', value: totalTasks, icon: ListTodo, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { label: 'In Progress', value: inProgressTasks, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
    { label: 'In Review', value: inReviewTasks, icon: CheckCircle, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    { label: 'Approved', value: completedTasks, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'High Priority', value: highPriorityTasks, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    { label: 'Blocked', value: blockedAgents, icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
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
            <div key={stat.label} className={`bg-gray-900/80 border ${stat.bg} rounded-xl p-4 animate-fade-in hover-lift`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-gray-500">{stat.label}</span>
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          )
        })}
      </div>

      {/* Done Today Widget */}
      <div className="mb-8">
        <div
          className="flex items-center justify-between mb-4 cursor-pointer select-none"
          onClick={() => setDoneExpanded(!doneExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Done Today</h2>
              <p className="text-xs text-gray-500">{doneTodayTasks.length} task{doneTodayTasks.length !== 1 ? 's' : ''} completed today</p>
            </div>
            {doneTodayTasks.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {doneTodayTasks.length}
              </span>
            )}
          </div>
          <button className="text-gray-500 hover:text-white transition-colors">
            {doneExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {doneExpanded && (
          <div>
            {doneTodayTasks.length === 0 ? (
              <div className="flex items-center gap-3 px-5 py-4 bg-gray-900/50 border border-gray-800 rounded-xl text-gray-500 text-sm">
                <CheckCircle2 className="w-4 h-4 text-gray-700" />
                No tasks approved yet today. Keep going!
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(doneByAgent).map(([agentId, { agent, tasks: agentDoneTasks }]) => (
                  <div key={agentId} className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-4 animate-fade-in">
                    {/* Agent header */}
                    <div className="flex items-center gap-2 mb-3">
                      {agent ? (
                        <>
                          <div className="w-6 h-6 rounded-md text-xs flex items-center justify-center text-white font-bold" style={{ backgroundColor: agent.avatar_color }}>
                            {agent.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-white">{agent.name}</span>
                          <span className="text-xs text-gray-500">{agent.role}</span>
                        </>
                      ) : (
                        <span className="text-sm font-medium text-gray-400">Unassigned</span>
                      )}
                      <span className="ml-auto text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                        {agentDoneTasks.length} done
                      </span>
                    </div>
                    {/* Task list */}
                    <div className="space-y-2">
                      {agentDoneTasks.map(t => (
                        <div key={t.id} className="flex items-center gap-3 py-2 px-3 bg-emerald-900/20 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span className="text-sm text-gray-200 flex-1 truncate">{t.title}</span>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {new Date(t.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Notifications</h2>
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`px-4 py-3 rounded-lg border text-sm transition-all ${
                  n.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                  n.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                  n.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
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
              onClick={() => router.push(`/tasks?agent=${agent.id}`)}
            />
          ))}
        </div>
        {agents.length === 0 && !loading && (
          <div className="text-center py-16 text-gray-600">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">No agents yet</p>
            <p className="text-sm mt-1">Add agents to your team to get started</p>
          </div>
        )}
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
                  <tr key={task.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
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
                        task.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                        task.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400' :
                        task.status === 'review' ? 'bg-yellow-500/10 text-yellow-400' :
                        task.status === 'needs_changes' ? 'bg-red-500/10 text-red-400' :
                        task.status === 'backlog' ? 'bg-gray-500/10 text-gray-500' :
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
