'use client'
export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Agent, Task, Project } from '@/types'
import { Loader2, Plus, X, CheckSquare, Trash2, RefreshCw, ListPlus, ThumbsUp, ThumbsDown, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'

interface BatchTask {
  title: string
  agent_id: string
  priority: string
}

const STATUS_CONFIG = {
  backlog: {
    label: 'Backlog',
    color: 'text-gray-400',
    bg: 'bg-gray-800/40',
    border: 'border-gray-700/50',
    headerBg: 'bg-gray-800/60',
    headerText: 'text-gray-300',
    dot: 'bg-gray-500',
    badge: null,
    glow: '',
    opacity: 'opacity-75',
  },
  todo: {
    label: 'To Do',
    color: 'text-blue-400',
    bg: 'bg-gray-900/80',
    border: 'border-gray-700',
    headerBg: 'bg-blue-950/40',
    headerText: 'text-blue-300',
    dot: 'bg-blue-500',
    badge: null,
    glow: '',
    opacity: '',
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-yellow-400',
    bg: 'bg-gray-900/90',
    border: 'border-blue-500/40',
    headerBg: 'bg-blue-900/30',
    headerText: 'text-yellow-300',
    dot: 'bg-yellow-400',
    badge: 'working',
    glow: 'shadow-[0_0_12px_rgba(59,130,246,0.15)]',
    opacity: '',
  },
  review: {
    label: 'Review',
    color: 'text-yellow-400',
    bg: 'bg-gray-900/90',
    border: 'border-yellow-500/50',
    headerBg: 'bg-yellow-900/20',
    headerText: 'text-yellow-300',
    dot: 'bg-yellow-400',
    badge: 'awaiting approval',
    glow: 'shadow-[0_0_12px_rgba(234,179,8,0.12)]',
    opacity: '',
  },
  approved: {
    label: 'Approved',
    color: 'text-emerald-400',
    bg: 'bg-gray-900/80',
    border: 'border-emerald-500/40',
    headerBg: 'bg-emerald-900/20',
    headerText: 'text-emerald-300',
    dot: 'bg-emerald-400',
    badge: null,
    glow: '',
    opacity: '',
  },
  needs_changes: {
    label: 'Needs Changes',
    color: 'text-red-400',
    bg: 'bg-gray-900/80',
    border: 'border-red-500/40',
    headerBg: 'bg-red-900/20',
    headerText: 'text-red-300',
    dot: 'bg-red-400',
    badge: 'rejected',
    glow: '',
    opacity: '',
  },
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
  const [form, setForm] = useState({ title: '', description: '', agent_id: '', priority: 'medium', project_id: '', deadline: '', status: 'todo' })
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

  const handleReviewApprove = async (taskId: string) => {
    await handleStatusChange(taskId, 'approved')
  }

  const handleReviewReject = async (taskId: string) => {
    await handleStatusChange(taskId, 'needs_changes')
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
      status: form.status,
      progress: 0,
    })
    setForm({ title: '', description: '', agent_id: '', priority: 'medium', project_id: '', deadline: '', status: 'todo' })
    setShowForm(false)
    fetchData()
  }

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
  const agentTasks = agentFilter ? tasks.filter(t => t.agent_id === agentFilter) : tasks
  const statusFilteredTasks = filter === 'all' ? agentTasks : agentTasks.filter(t => t.status === filter)

  const statusOrder: Task['status'][] = ['backlog', 'todo', 'in_progress', 'review', 'approved', 'needs_changes']

  const statusTabs = [
    { key: 'all', label: 'All', count: agentTasks.length },
    ...statusOrder.map(s => ({
      key: s,
      label: STATUS_CONFIG[s].label,
      count: agentTasks.filter(t => t.status === s).length,
    })),
  ]

  const statusOptions: { value: Task['status']; label: string }[] = [
    { value: 'backlog', label: 'Backlog' },
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'needs_changes', label: 'Needs Changes' },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Tasks</h1>
          <p className="text-gray-500 text-sm">
            Auto-refreshes every 30s • Last: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 bg-gray-800/80 hover:bg-gray-700 border border-gray-700 text-white rounded-lg text-sm transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowBatch(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm transition-all">
            <ListPlus className="w-4 h-4" /> Batch Add
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-all">
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>
      </div>

      {/* Agent filter chip */}
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
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${filter === tab.key ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-400 hover:text-white bg-gray-900/50 border border-gray-800'}`}>
            {tab.label} <span className="ml-1 text-xs opacity-60">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Task Cards */}
      {statusFilteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {statusFilteredTasks.map((task) => {
            const agent = agents.find(a => a.id === task.agent_id)
            const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo

            return (
              <div key={task.id}
                className={`${cfg.bg} border ${cfg.border} rounded-xl p-5 transition-all group hover:border-opacity-80 ${cfg.glow} ${cfg.opacity} animate-fade-in`}>
                {/* Card header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'}`} />
                    <h3 className="font-semibold text-white text-sm truncate">{task.title}</h3>
                  </div>
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    {/* Status badge */}
                    {cfg.badge && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        task.status === 'in_progress' ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' :
                        task.status === 'review' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300 animate-pulse-dot' :
                        'bg-red-500/10 border-red-500/30 text-red-300'
                      }`}>
                        {cfg.badge}
                      </span>
                    )}
                    <button onClick={() => handleDelete(task.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all ml-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {task.description && <p className="text-xs text-gray-500 mb-3">{task.description}</p>}

                {/* Agent */}
                {agent && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded text-xs flex items-center justify-center text-white font-bold" style={{ backgroundColor: agent.avatar_color }}>
                      {agent.name.charAt(0)}
                    </div>
                    <span className="text-xs text-gray-400">{agent.name}</span>
                    {task.status === 'in_progress' && (
                      <span className="flex items-center gap-1 text-xs text-blue-400 ml-auto">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse-dot" />
                        working
                      </span>
                    )}
                  </div>
                )}

                {/* Progress Bar */}
                {task.status !== 'backlog' && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Progress</span>
                      <span className="text-xs font-mono text-gray-400">{task.progress || 0}%</span>
                    </div>
                    <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div className={`h-2 rounded-full transition-all duration-500 ${
                        (task.progress || 0) === 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                        (task.progress || 0) > 50 ? 'bg-gradient-to-r from-blue-600 to-blue-400' :
                        'bg-gradient-to-r from-indigo-600 to-indigo-400'
                      }`} style={{ width: `${task.progress || 0}%` }} />
                    </div>
                    <input type="range" min="0" max="100" step="5" value={task.progress || 0}
                      onChange={(e) => handleProgressChange(task.id, parseInt(e.target.value))}
                      className="w-full mt-1 h-1 accent-blue-500 cursor-pointer" />
                  </div>
                )}

                {/* Review YES/NO buttons */}
                {task.status === 'review' && (
                  <div className="flex gap-2 mb-3">
                    <button onClick={() => handleReviewApprove(task.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-400 rounded-lg text-xs font-semibold transition-all">
                      <ThumbsUp className="w-3.5 h-3.5" /> YES
                    </button>
                    <button onClick={() => handleReviewReject(task.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/40 text-red-400 rounded-lg text-xs font-semibold transition-all">
                      <ThumbsDown className="w-3.5 h-3.5" /> NO
                    </button>
                  </div>
                )}

                {/* Needs Changes → back to To Do */}
                {task.status === 'needs_changes' && (
                  <div className="mb-3">
                    <button onClick={() => handleStatusChange(task.id, 'todo')}
                      className="w-full flex items-center justify-center gap-1.5 py-2 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600 text-gray-300 rounded-lg text-xs font-medium transition-all">
                      <RefreshCw className="w-3.5 h-3.5" /> Move back to To Do
                    </button>
                  </div>
                )}

                {/* Status selector */}
                <div className="flex flex-wrap gap-1">
                  {statusOptions.map((opt) => (
                    <button key={opt.value} onClick={() => handleStatusChange(task.id, opt.value)}
                      className={`text-xs px-2 py-0.5 rounded transition-all ${
                        task.status === opt.value
                          ? 'bg-white/10 text-white font-medium border border-white/20'
                          : 'text-gray-600 hover:text-gray-300 bg-gray-800/40'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>

                {task.deadline && (
                  <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(task.deadline).toLocaleDateString()}
                  </p>
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white">
                  <option value="backlog">Backlog</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                </select>
              </div>
              <input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white" />
              <button type="submit" disabled={!form.title.trim() || !form.agent_id}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-all">
                Create Task
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Batch Task Modal */}
      {showBatch && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
                className="w-full py-2 border border-dashed border-gray-700 rounded-lg text-sm text-gray-500 hover:text-white hover:border-gray-500 mb-4 transition-all">
                + Add another task
              </button>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowBatch(false)} className="px-4 py-2 text-sm text-gray-400">Cancel</button>
                <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all">
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
