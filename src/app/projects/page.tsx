'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Project, Task } from '@/types'
import { Loader2, Plus, X, FolderKanban, Database, RefreshCw } from 'lucide-react'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState<{ text: string; sql?: string; ok: boolean } | null>(null)

  const fetchData = async () => {
    const [projectsRes, tasksRes] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*, agent:agents(*)'),
    ])
    setProjects(projectsRes.data || [])
    setTasks(tasksRes.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    await supabase.from('projects').insert({ name: form.name.trim(), description: form.description.trim() || null })
    setForm({ name: '', description: '' })
    setShowForm(false)
    fetchData()
  }

  const handleSeed = async () => {
    setSeeding(true)
    setSeedMsg(null)
    try {
      const res = await fetch('/api/seed-projects', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setSeedMsg({ text: `Error: ${data.error}`, ok: false })
      } else if (data.noProgressColumn) {
        setSeedMsg({
          text: `${data.inserted} projects added. Run this SQL in Supabase to enable progress bars:`,
          sql: data.migrationSql,
          ok: false,
        })
      } else {
        setSeedMsg({ text: `Done — ${data.inserted} inserted, ${data.updated} updated.`, ok: true })
      }
      fetchData()
    } catch {
      setSeedMsg({ text: 'Network error — seed failed', ok: false })
    } finally {
      setSeeding(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Projects</h1>
          <p className="text-gray-500">Track tasks by business or project</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSeed} disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 hover:text-white rounded-lg transition-all border border-gray-700 text-sm">
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            {seeding ? 'Seeding...' : 'Seed Projects'}
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all">
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>
      </div>

      {/* Seed feedback */}
      {seedMsg && (
        <div className={`mb-6 p-4 rounded-xl border animate-fade-in ${
          seedMsg.ok
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
        }`}>
          <p className="text-sm font-medium mb-1">{seedMsg.text}</p>
          {seedMsg.sql && (
            <div className="mt-2">
              <p className="text-xs text-yellow-400/70 mb-1">Paste this into your Supabase SQL editor, then click Seed Projects again:</p>
              <code className="block text-xs bg-gray-900/80 border border-gray-700 rounded-lg px-3 py-2 text-blue-300 font-mono">
                {seedMsg.sql}
              </code>
            </div>
          )}
          <button onClick={() => setSeedMsg(null)} className="mt-2 text-xs opacity-60 hover:opacity-100">
            dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projects.map((project) => {
          const projectTasks = tasks.filter(t => t.project_id === project.id)
          const completed = projectTasks.filter(t => t.status === 'complete').length
          const total = projectTasks.length
          // Use manual progress if set, otherwise calculate from tasks
          const progress = project.progress !== null && project.progress !== undefined
            ? project.progress
            : total > 0 ? Math.round((completed / total) * 100) : 0
          const progressLabel = project.progress !== null && project.progress !== undefined
            ? `${progress}% complete`
            : `${completed}/${total} tasks done`

          const barColor = progress === 100
            ? 'bg-green-500'
            : progress >= 75
            ? 'bg-blue-500'
            : progress >= 45
            ? 'bg-indigo-500'
            : 'bg-purple-500'

          return (
            <div key={project.id} className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 animate-fade-in hover:border-gray-700 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FolderKanban className="w-8 h-8 text-blue-400" />
                  <div>
                    <h3 className="text-white font-semibold text-lg">{project.name}</h3>
                    {project.description && <p className="text-sm text-gray-500 mt-0.5">{project.description}</p>}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  project.status === 'active' ? 'bg-green-500/10 text-green-400' :
                  project.status === 'paused' ? 'bg-yellow-500/10 text-yellow-400' :
                  'bg-gray-500/10 text-gray-400'
                }`}>
                  {project.status}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500">{progressLabel}</span>
                  <span className={`text-xs font-medium ${progress === 100 ? 'text-green-400' : 'text-gray-400'}`}>{progress}%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Recent tasks */}
              {projectTasks.length > 0 && (
                <div className="space-y-2">
                  {projectTasks.slice(0, 4).map((task) => (
                    <div key={task.id} className="flex items-center justify-between px-3 py-2 bg-gray-800/30 rounded-lg">
                      <span className="text-sm text-gray-300 truncate flex-1 mr-2">{task.title}</span>
                      <span className="text-xs text-gray-500">{task.agent?.name || '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-16 text-gray-600">
          <FolderKanban className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No projects yet</p>
          <p className="text-sm mt-1 mb-4">Seed the 5 default projects or create your own</p>
          <button onClick={handleSeed} disabled={seeding}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-all">
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            Seed Projects
          </button>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">New Project</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <input type="text" placeholder="Project name..." value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" autoFocus />
              <textarea placeholder="Description (optional)..." value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 h-20 resize-none" />
              <button type="submit" disabled={!form.name.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-all">
                Create Project
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
