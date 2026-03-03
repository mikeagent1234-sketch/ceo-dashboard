'use client'
export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Agent, Task, Project } from '@/types'
import { Loader2, Plus, X, CheckSquare, Trash2, RefreshCw, ListPlus } from 'lucide-react'

interface BatchTask {
  title: string
  agent_id: string
  priority: string
}

export default function TasksPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>}>
      <TasksPage />
    </Suspense>
  )
}

function TasksPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const agentFilter = searchParams.get('agent')

  const [tasks, setTasks] = useState<Task[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [showBatch, setShowBatch] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', agent_id: '', priority: 'medium', project_id: '', deadline: '' })
  const [batchTasks, setBatchTasks] = useState<BatchTask[]>([{ title: '', agent_id: '', priority: 'medium' }])
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const fetchData = useCallback(async () => {
    const [tasksRes, agentsRes, projectsRes] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('agents').select('*').order('name'),
      supabase.from('projects').select('*').order('name'),
    ])
    setTasks(tasksRes.data || [])
    setAgents(agentsRes.data || [])
    setProjects(projectsRes.data || [])
    setLoading(false)
    setLastRefresh(new Date())
  }, [])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    await supabase.from('tasks').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', taskId)
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t))
  }

  const handleProgressChange = async (taskId: string, progress: number) => {
    await supabase.from('tasks').update({ progress, updated_at: new Date().toISOString() }).eq('id', taskId)
    setTasks(tasks.map(t => t.id === taskId ? { ...t, progress } : t))
  }

  const handleDelete = async (taskId: string) => {
    await supabase.from('tasks').delete().eq('id', taskId)
    setTasks(tasks.filter(t => t.id !== taskId))
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
      progress: 0,
    })
    setForm({ title: '', description: '', agent_id: '', priority: 'medium', project_id: '', deadline: '' })
    setShowForm(false)
    fetchData()
  }

  // Batch task creation
  const addBatchRow = () => {
    setBatchTasks([...batchTasks, { title: '', agent_id: '', priority: 'medium' }])
  }

  const updateBatchRow = (index: number, field: string, value: string) => {
    const updated = [...batchTasks]
    updated[index] = { ...updated[index], [field]: value }
    setBatchTasks(updated)
  }

  const removeBatchRow = (index: number) => {
    if (batchTasks.length > 1) {
      setBatchTasks(batchTasks.filter((_, i) => i !== index))
    }
  }

  const handleBatchCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const validTasks = batchTasks.filter(t => t.title.trim() && t.agent_id)
    if (validTasks.length === 0) return

    await supabase.from('tasks').insert(
      validTasks.map(t => ({
        title: t.title.trim(),
        agent_id: t.agent_id,
        priority: t.priority,
        status: 'todo',
        progress: 0,
      }))
    )
    setBatchTasks([{ title: '', agent_id: '', priority: 'medium' }])
    setShowBatch(false)
    fetchData()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
  }

  const activeAgent = agentFilter ? agents.find(a => a.id === agentFilter) : null
  const statusFilteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)
  const filteredTasks = agentFilter ? statusFilteredTasks.filter(t => t.agent_id === agentFilter) : statusFilteredTasks
  const agentTasks = agentFilter ? tasks.filter(t => t.agent_id === agentFilter) : tasks

  const statusTabs = [
    { key: 'all', label: 'All', count: agentTasks.length },
    { key: 'todo', label: 'To Do', count: agentTasks.filter(t => t.status === 'todo').length },
    { key: 'in_progress', label: 'In Progress', count: agentTasks.filter(t => t.status === 'in_progress').length },
    { key: 'review', label: 'Review', count: agentTasks.filter(t => t.status === 'review').length },
    { key: 'complete', label: 'Complete', count: agentTasks.filter(t => t.status === 'complete').length },
  ]

  const statusOptions = [
    { value: 'todo', label: 'To Do', color: 'bg-blue-400' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-400' },
    { value: 'review', label: 'Review', color: 'bg-purple-400' },
    { value: 'complete', label: 'Complete', color: 'bg-green-400' },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Tasks</h1>
          <p className="text-gray-500 text-sm">
            Auto-refreshes every 30s • Last: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowBatch(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm">
            <ListPlus className="w-4 h-4" /> Batch Add
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>
      </div>

      {/* Agent filter */}
      {activeAgent && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-500">Filtered:</span>
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border" style={{ backgroundColor: activeAgent.avatar_color + '20', borderColor: activeAgent.avatar_color + '40', color: activeAgent.avatar_color }}>
            {activeAgent.name}
            <button onClick={() => router.push('/tasks')}><X className="w-3.5 h-3.5" /></button>
          </span>
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {statusTabs.map((tab) => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${filter === tab.key ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-400 hover:text-white bg-gray-900/50 border border-gray-800'}`}>
            {tab.label} <span className="ml-1 text-xs opacity-60">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Task Cards */}
      {filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => {
            const agent = agents.find(a => a.id === task.agent_id)
            return (
              <div key={task.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'}`} />
                    <h3 className="font-semibold text-white text-sm">{task.title}</h3>
                  </div>
                  <button onClick={() => handleDelete(task.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {task.description && <p className="text-xs text-gray-500 mb-3">{task.description}</p>}

                {/* Agent */}
                {agent && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded text-xs flex items-center justify-center text-white" style={{ backgroundColor: agent.avatar_color }}>
                      {agent.name.charAt(0)}
                    </div>
                    <span className="text-xs text-gray-500">{agent.name}</span>
                  </div>
                )}

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Progress</span>
                    <span className="text-xs font-mono text-gray-400">{task.progress || 0}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-800 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all duration-300 ${
                        (task.progress || 0) === 100 ? 'bg-green-500' : (task.progress || 0) > 50 ? 'bg-blue-500' : 'bg-indigo-500'
                      }`} style={{ width: `${task.progress || 0}%` }} />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={task.progress || 0}
                    onChange={(e) => handleProgressChange(task.id, parseInt(e.target.value))}
                    className="w-full mt-1 h-1 accent-blue-500 cursor-pointer"
                  />
                </div>

                {/* Status selector */}
                <div className="flex gap-1">
                  {statusOptions.map((opt) => (
                    <button key={opt.value} onClick={() => handleStatusChange(task.id, opt.value)}
                      className={`text-xs px-2 py-1 rounded transition-all ${task.status === opt.value ? `${opt.color}/20 text-white font-medium` : 'text-gray-600 hover:text-gray-400 bg-gray-800/50'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>

                {task.deadline && (
                  <p className="text-xs text-gray-600 mt-2">Due: {new Date(task.deadline).toLocaleDateString()}</p>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-20">
          <CheckSquare className="w-12 h-12 mx-auto mb-4 text-gray-700" />
          <p className="text-lg text-gray-500 mb-4">No tasks found</p>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">
            <Plus className="w-4 h-4" /> Create Task
          </button>
        </div>
      )}

      {/* Single Task Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">New Task</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <input type="text" placeholder="Task title..." value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" autoFocus />
              <textarea placeholder="Description (optional)..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 h-24 resize-none" />
              <select value={form.agent_id} onChange={(e) => setForm({ ...form, agent_id: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white">
                <option value="">Assign to agent...</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white">
                  <option value="high">🔴 High</option><option value="medium">🟡 Medium</option><option value="low">🟢 Low</option>
                </select>
                <input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white" />
              </div>
              <button type="submit" disabled={!form.title.trim() || !form.agent_id}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg">Create Task</button>
            </form>
          </div>
        </div>
      )}

      {/* Batch Task Modal */}
      {showBatch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-3xl animate-fade-in max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ListPlus className="w-5 h-5 text-purple-400" /> Batch Add Tasks
              </h2>
              <button onClick={() => setShowBatch(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleBatchCreate}>
              <div className="space-y-3 mb-4">
                {batchTasks.map((bt, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3">
                    <span className="text-xs text-gray-600 w-6">{i + 1}.</span>
                    <input type="text" placeholder="Task title..." value={bt.title}
                      onChange={(e) => updateBatchRow(i, 'title', e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
                    <select value={bt.agent_id} onChange={(e) => updateBatchRow(i, 'agent_id', e.target.value)}
                      className="w-40 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">
                      <option value="">Agent...</option>
                      {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <select value={bt.priority} onChange={(e) => updateBatchRow(i, 'priority', e.target.value)}
                      className="w-28 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">
                      <option value="high">🔴 High</option><option value="medium">🟡 Med</option><option value="low">🟢 Low</option>
                    </select>
                    <button type="button" onClick={() => removeBatchRow(i)} className="text-gray-600 hover:text-red-400">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addBatchRow}
                className="w-full py-2 border border-dashed border-gray-700 rounded-lg text-sm text-gray-500 hover:text-white hover:border-gray-500 mb-4">
                + Add another task
              </button>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowBatch(false)} className="px-4 py-2 text-sm text-gray-400">Cancel</button>
                <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg text-sm font-medium">
                  Create {batchTasks.filter(t => t.title.trim() && t.agent_id).length} Tasks
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
