'use client'
export const dynamic = 'force-dynamic'


import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Agent, Task, Project } from '@/types'
import TaskCard from '@/components/TaskCard'
import { Loader2, Plus, X } from 'lucide-react'

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', agent_id: '', priority: 'medium', project_id: '', deadline: '' })

  const fetchData = async () => {
    const [tasksRes, agentsRes, projectsRes] = await Promise.all([
      supabase.from('tasks').select('*, agent:agents(*), project:projects(*)').order('created_at', { ascending: false }),
      supabase.from('agents').select('*').order('name'),
      supabase.from('projects').select('*').order('name'),
    ])
    setTasks(tasksRes.data || [])
    setAgents(agentsRes.data || [])
    setProjects(projectsRes.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    await supabase.from('tasks').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', taskId)
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.agent_id) return

    await supabase.from('tasks').insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      agent_id: form.agent_id,
      priority: form.priority,
      project_id: form.project_id || null,
      deadline: form.deadline || null,
      status: 'todo',
    })

    setForm({ title: '', description: '', agent_id: '', priority: 'medium', project_id: '', deadline: '' })
    setShowForm(false)
    fetchData()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
  }

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)
  const statusTabs = [
    { key: 'all', label: 'All', count: tasks.length },
    { key: 'todo', label: 'To Do', count: tasks.filter(t => t.status === 'todo').length },
    { key: 'in_progress', label: 'In Progress', count: tasks.filter(t => t.status === 'in_progress').length },
    { key: 'review', label: 'Review', count: tasks.filter(t => t.status === 'review').length },
    { key: 'complete', label: 'Complete', count: tasks.filter(t => t.status === 'complete').length },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Tasks</h1>
          <p className="text-gray-500">Manage all agent tasks</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all"
        >
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              filter === tab.key
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-gray-400 hover:text-white bg-gray-900/50 border border-gray-800'
            }`}
          >
            {tab.label} <span className="ml-1 text-xs opacity-60">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Task Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTasks.map((task) => (
          <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} />
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-16 text-gray-600">
          <p className="text-lg">No tasks found</p>
          <p className="text-sm mt-1">Create a task to get started</p>
        </div>
      )}

      {/* Create Task Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">New Task</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text" placeholder="Task title..."
                value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <textarea
                placeholder="Description (optional)..."
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 h-24 resize-none"
              />
              <select value={form.agent_id} onChange={(e) => setForm({ ...form, agent_id: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500">
                <option value="">Assign to agent...</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500">
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
                <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                  className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500">
                  <option value="">No project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
              <button type="submit" disabled={!form.title.trim() || !form.agent_id}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-all">
                Create Task
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
