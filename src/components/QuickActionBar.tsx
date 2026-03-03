'use client'

import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Agent, Project } from '@/types'

export default function QuickActionBar() {
  const [open, setOpen] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [title, setTitle] = useState('')
  const [agentId, setAgentId] = useState('')
  const [priority, setPriority] = useState('medium')
  const [projectId, setProjectId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const [agentsRes, projectsRes] = await Promise.all([
        supabase.from('agents').select('*').order('name'),
        supabase.from('projects').select('*').eq('status', 'active').order('name'),
      ])
      if (agentsRes.data) setAgents(agentsRes.data)
      if (projectsRes.data) setProjects(projectsRes.data)
    }
    if (open) fetchData()
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !agentId) return
    setLoading(true)

    await supabase.from('tasks').insert({
      title: title.trim(),
      agent_id: agentId,
      priority,
      project_id: projectId || null,
      status: 'todo',
    })

    await supabase.from('notifications').insert({
      message: `New task assigned: "${title.trim()}"`,
      type: 'info',
    })

    setTitle('')
    setAgentId('')
    setPriority('medium')
    setProjectId('')
    setOpen(false)
    setLoading(false)
    window.location.reload()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-600/30 transition-all hover:scale-105 z-50"
      >
        <Plus className="w-6 h-6 text-white" />
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Quick Task</h2>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Task title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                autoFocus
              />

              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Assign to agent...</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>

              <div className="flex gap-3">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>

                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading || !title.trim() || !agentId}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-all"
              >
                {loading ? 'Creating...' : 'Create Task'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
