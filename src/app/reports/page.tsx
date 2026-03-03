'use client'
export const dynamic = 'force-dynamic'


import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Task, Agent } from '@/types'
import { format } from 'date-fns'
import { Loader2, FileText } from 'lucide-react'

export default function ReportsPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [tasksRes, agentsRes] = await Promise.all([
        supabase.from('tasks').select('*, agent:agents(*), project:projects(*)').order('updated_at', { ascending: false }),
        supabase.from('agents').select('*'),
      ])
      setTasks(tasksRes.data || [])
      setAgents(agentsRes.data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
  }

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  const completedToday = tasks.filter(t => t.status === 'complete' && t.updated_at && format(new Date(t.updated_at), 'yyyy-MM-dd') === todayStr)
  const inProgress = tasks.filter(t => t.status === 'in_progress')
  const inReview = tasks.filter(t => t.status === 'review')
  const blocked = agents.filter(a => a.status === 'blocked')
  const highPriority = tasks.filter(t => t.priority === 'high' && t.status !== 'complete')

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Daily Report</h1>
        <p className="text-gray-500">{format(today, 'EEEE, MMMM d, yyyy')}</p>
      </div>

      <div className="space-y-6">
        {/* Completed */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <h2 className="text-white font-semibold">Completed Today ({completedToday.length})</h2>
          </div>
          {completedToday.length > 0 ? (
            <div className="space-y-2">
              {completedToday.map(t => (
                <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-gray-800/30 rounded-lg">
                  <span className="text-sm text-gray-300">{t.title}</span>
                  <span className="text-xs text-gray-500">{t.agent?.name}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-600">Nothing completed yet today</p>}
        </div>

        {/* In Progress */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <h2 className="text-white font-semibold">In Progress ({inProgress.length})</h2>
          </div>
          {inProgress.length > 0 ? (
            <div className="space-y-2">
              {inProgress.map(t => (
                <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-gray-800/30 rounded-lg">
                  <span className="text-sm text-gray-300">{t.title}</span>
                  <span className="text-xs text-gray-500">{t.agent?.name}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-600">No tasks in progress</p>}
        </div>

        {/* In Review */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <h2 className="text-white font-semibold">In Review ({inReview.length})</h2>
          </div>
          {inReview.length > 0 ? (
            <div className="space-y-2">
              {inReview.map(t => (
                <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-gray-800/30 rounded-lg">
                  <span className="text-sm text-gray-300">{t.title}</span>
                  <span className="text-xs text-gray-500">{t.agent?.name}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-600">Nothing in review</p>}
        </div>

        {/* Blockers */}
        {blocked.length > 0 && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <h2 className="text-red-400 font-semibold">Blocked Agents ({blocked.length})</h2>
            </div>
            <div className="space-y-2">
              {blocked.map(a => (
                <div key={a.id} className="px-3 py-2 bg-red-500/5 rounded-lg">
                  <span className="text-sm text-red-300">{a.name}</span>
                  <span className="text-xs text-red-400/60 ml-2">— {a.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* High Priority */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-white font-semibold">High Priority Remaining ({highPriority.length})</h2>
          </div>
          {highPriority.length > 0 ? (
            <div className="space-y-2">
              {highPriority.map(t => (
                <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-gray-800/30 rounded-lg">
                  <span className="text-sm text-gray-300">{t.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{t.agent?.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      t.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400' :
                      t.status === 'review' ? 'bg-purple-500/10 text-purple-400' :
                      'bg-gray-500/10 text-gray-400'
                    }`}>{t.status.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-600">No high priority tasks remaining 🎉</p>}
        </div>
      </div>
    </div>
  )
}
