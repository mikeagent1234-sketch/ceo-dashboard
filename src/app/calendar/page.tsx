'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Task, Agent } from '@/types'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  X,
  Clock,
  Loader2,
} from 'lucide-react'

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days: (Date | null)[] = []

  for (let i = 0; i < firstDay.getDay(); i++) days.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d))
  while (days.length % 7 !== 0) days.push(null)

  return days
}

function toDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-400',
  medium: 'bg-yellow-400',
  low: 'bg-green-400',
}

const STATUS_BADGE: Record<string, string> = {
  approved: 'bg-emerald-500/20 text-emerald-400',
  in_progress: 'bg-blue-500/20 text-blue-400',
  review: 'bg-yellow-500/20 text-yellow-400',
  needs_changes: 'bg-red-500/20 text-red-400',
  todo: 'bg-gray-700/60 text-gray-400',
  backlog: 'bg-gray-800/60 text-gray-500',
}

export default function CalendarPage() {
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', agent_id: '', priority: 'medium', time: '09:00' })

  const fetchData = useCallback(async () => {
    const [tasksRes, agentsRes] = await Promise.all([
      supabase.from('tasks').select('*').not('deadline', 'is', null).order('deadline'),
      supabase.from('agents').select('*').order('name'),
    ])
    setTasks(tasksRes.data || [])
    setAgents(agentsRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Group tasks by date string (YYYY-MM-DD)
  const tasksByDate: Record<string, Task[]> = {}
  tasks.forEach(task => {
    if (task.deadline) {
      const dateStr = task.deadline.split('T')[0]
      if (!tasksByDate[dateStr]) tasksByDate[dateStr] = []
      tasksByDate[dateStr].push(task)
    }
  })

  const selectedStr = selectedDate ? toDateStr(selectedDate) : null
  const selectedTasks = selectedStr ? (tasksByDate[selectedStr] || []) : []
  const todayStr = toDateStr(today)

  const goToPrev = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }

  const goToNext = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  const goToToday = () => {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth())
    setSelectedDate(today)
    setShowForm(false)
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setShowForm(false)
    setForm({ title: '', agent_id: '', priority: 'medium', time: '09:00' })
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.agent_id || !selectedDate) return
    const deadline = `${toDateStr(selectedDate)}T${form.time}`
    await supabase.from('tasks').insert({
      title: form.title.trim(),
      agent_id: form.agent_id,
      priority: form.priority,
      deadline,
      status: 'todo',
      progress: 0,
    })
    setForm({ title: '', agent_id: '', priority: 'medium', time: '09:00' })
    setShowForm(false)
    fetchData()
  }

  const days = getMonthGrid(currentYear, currentMonth)
  const monthName = new Date(currentYear, currentMonth, 1).toLocaleString('default', { month: 'long' })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Calendar</h1>
          <p className="text-gray-500 text-sm">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} with deadlines
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-2 bg-gray-800/80 hover:bg-gray-700 border border-gray-700 text-white rounded-lg text-sm transition-all"
          >
            Today
          </button>
          <div className="flex items-center">
            <button
              onClick={goToPrev}
              className="w-9 h-9 flex items-center justify-center bg-gray-800/80 hover:bg-gray-700 border border-gray-700 border-r-0 text-white rounded-l-lg transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToNext}
              className="w-9 h-9 flex items-center justify-center bg-gray-800/80 hover:bg-gray-700 border border-gray-700 text-white rounded-r-lg transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Month Title */}
      <h2 className="text-xl font-semibold text-white text-center mb-5">
        {monthName} {currentYear}
      </h2>

      <div className="flex gap-5">
        {/* Calendar Grid */}
        <div className="flex-1 min-w-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DOW.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, idx) => {
              if (!date) {
                return <div key={`empty-${idx}`} className="h-24 rounded-lg" />
              }

              const dateStr = toDateStr(date)
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedStr
              const dateTasks = tasksByDate[dateStr] || []
              const hasHigh = dateTasks.some(t => t.priority === 'high')

              // Unique agents on this date (max 2 shown)
              const uniqueAgents = dateTasks
                .reduce<Agent[]>((acc, task) => {
                  const agent = agents.find(a => a.id === task.agent_id)
                  if (agent && !acc.find(a => a.id === agent.id)) acc.push(agent)
                  return acc
                }, [])
                .slice(0, 2)

              return (
                <button
                  key={dateStr}
                  onClick={() => handleDateClick(date)}
                  className={`h-24 rounded-lg p-2 text-left transition-all relative group border ${
                    isSelected
                      ? 'border-blue-500/70 bg-blue-950/40 shadow-[0_0_12px_rgba(59,130,246,0.12)]'
                      : isToday
                      ? 'border-blue-500/30 bg-blue-950/20'
                      : dateTasks.length > 0
                      ? 'border-gray-700/70 bg-gray-900/60 hover:border-gray-600 hover:bg-gray-800/50'
                      : 'border-gray-800/40 bg-gray-900/20 hover:border-gray-700/60 hover:bg-gray-800/30'
                  }`}
                >
                  {/* Date number */}
                  <div className="flex items-start justify-between mb-1">
                    <span
                      className={
                        isToday
                          ? 'w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[11px] font-bold text-white leading-none'
                          : `text-sm font-medium leading-none ${isSelected ? 'text-blue-300' : 'text-gray-300'}`
                      }
                    >
                      {date.getDate()}
                    </span>
                    {dateTasks.length > 0 && (
                      <span
                        className={`text-[10px] px-1 py-0.5 rounded-full font-bold leading-none ${
                          hasHigh
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/25'
                        }`}
                      >
                        {dateTasks.length}
                      </span>
                    )}
                  </div>

                  {/* Agent avatars */}
                  {uniqueAgents.length > 0 && (
                    <div className="flex gap-0.5 mb-1">
                      {uniqueAgents.map(agent => (
                        <div
                          key={agent.id}
                          className="w-4 h-4 rounded text-white text-[9px] flex items-center justify-center font-bold flex-shrink-0"
                          style={{ backgroundColor: agent.avatar_color }}
                          title={agent.name}
                        >
                          {agent.name.charAt(0)}
                        </div>
                      ))}
                      {dateTasks.length - uniqueAgents.length > 0 && (
                        <span className="text-[9px] text-gray-600 self-center">
                          +{dateTasks.filter(t => !uniqueAgents.find(a => a.id === t.agent_id)).length}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Priority dots */}
                  {dateTasks.length > 0 && (
                    <div className="flex items-center gap-0.5 absolute bottom-2 left-2">
                      {dateTasks.slice(0, 4).map(t => (
                        <span
                          key={t.id}
                          className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[t.priority] || 'bg-gray-400'}`}
                        />
                      ))}
                      {dateTasks.length > 4 && (
                        <span className="text-[9px] text-gray-600 ml-0.5">+{dateTasks.length - 4}</span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 mt-4 px-1">
            <span className="text-xs text-gray-600">Priority:</span>
            {[['bg-red-400', 'High'], ['bg-yellow-400', 'Medium'], ['bg-green-400', 'Low']].map(([color, label]) => (
              <span key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={`w-2 h-2 rounded-full ${color}`} />
                {label}
              </span>
            ))}
            <span className="ml-auto text-xs text-gray-600">Click a date to view tasks</span>
          </div>
        </div>

        {/* Side Panel */}
        {selectedDate && (
          <div className="w-72 flex-shrink-0">
            <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 sticky top-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white leading-tight">
                    {selectedDate.toLocaleDateString('default', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-gray-600 hover:text-white transition-colors ml-2 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Task list */}
              <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
                {selectedTasks.length === 0 ? (
                  <div className="text-center py-6">
                    <CalendarIcon className="w-7 h-7 mx-auto mb-2 text-gray-700" />
                    <p className="text-sm text-gray-500">No tasks this day</p>
                  </div>
                ) : (
                  selectedTasks.map(task => {
                    const agent = agents.find(a => a.id === task.agent_id)
                    return (
                      <div
                        key={task.id}
                        className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3"
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${PRIORITY_DOT[task.priority] || 'bg-gray-400'}`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium leading-tight">{task.title}</p>
                            {agent && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <div
                                  className="w-3.5 h-3.5 rounded text-white text-[8px] flex items-center justify-center font-bold"
                                  style={{ backgroundColor: agent.avatar_color }}
                                >
                                  {agent.name.charAt(0)}
                                </div>
                                <span className="text-xs text-gray-500">{agent.name}</span>
                              </div>
                            )}
                            {task.deadline && task.deadline.includes('T') && (
                              <p className="text-[11px] text-gray-600 mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(task.deadline).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            )}
                          </div>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${STATUS_BADGE[task.status] || STATUS_BADGE.todo}`}
                          >
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Quick add */}
              {!showForm ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-gray-700 rounded-lg text-sm text-gray-500 hover:text-white hover:border-gray-500 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add task for this day
                </button>
              ) : (
                <form onSubmit={handleCreateTask} className="space-y-2.5 border-t border-gray-800 pt-4">
                  <p className="text-xs font-medium text-gray-400">Quick Add Task</p>
                  <input
                    type="text"
                    placeholder="Task title..."
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <select
                    value={form.agent_id}
                    onChange={e => setForm({ ...form, agent_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
                  >
                    <option value="">Assign to agent...</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <select
                      value={form.priority}
                      onChange={e => setForm({ ...form, priority: e.target.value })}
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
                    >
                      <option value="high">🔴 High</option>
                      <option value="medium">🟡 Med</option>
                      <option value="low">🟢 Low</option>
                    </select>
                    <input
                      type="time"
                      value={form.time}
                      onChange={e => setForm({ ...form, time: e.target.value })}
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!form.title.trim() || !form.agent_id}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg text-sm font-medium transition-all"
                    >
                      Add Task
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
