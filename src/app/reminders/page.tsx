'use client'
export const dynamic = 'force-dynamic'


import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Reminder, Agent } from '@/types'
import { format } from 'date-fns'
import { Loader2, Plus, X, Clock, Check } from 'lucide-react'

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ agent_id: '', message: '', due_at: '' })

  const fetchData = async () => {
    const [remindersRes, agentsRes] = await Promise.all([
      supabase.from('reminders').select('*, agent:agents(*)').order('due_at'),
      supabase.from('agents').select('*').order('name'),
    ])
    setReminders(remindersRes.data || [])
    setAgents(agentsRes.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.agent_id || !form.message.trim() || !form.due_at) return
    await supabase.from('reminders').insert({
      agent_id: form.agent_id,
      message: form.message.trim(),
      due_at: form.due_at,
    })
    setForm({ agent_id: '', message: '', due_at: '' })
    setShowForm(false)
    fetchData()
  }

  const toggleComplete = async (id: string, completed: boolean) => {
    await supabase.from('reminders').update({ completed: !completed }).eq('id', id)
    setReminders(reminders.map(r => r.id === id ? { ...r, completed: !completed } : r))
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
  }

  const activeReminders = reminders.filter(r => !r.completed)
  const completedReminders = reminders.filter(r => r.completed)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Reminders</h1>
          <p className="text-gray-500">Schedule reminders for agents</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all">
          <Plus className="w-4 h-4" /> New Reminder
        </button>
      </div>

      {/* Active Reminders */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-gray-500 uppercase mb-4">Upcoming ({activeReminders.length})</h2>
        <div className="space-y-3">
          {activeReminders.map((reminder) => {
            const isPast = new Date(reminder.due_at) < new Date()
            return (
              <div key={reminder.id} className={`flex items-center gap-4 p-4 rounded-xl border animate-fade-in ${
                isPast ? 'bg-red-500/5 border-red-500/20' : 'bg-gray-900/80 border-gray-800'
              }`}>
                <button onClick={() => toggleComplete(reminder.id, reminder.completed)}
                  className="w-6 h-6 rounded-full border-2 border-gray-600 hover:border-blue-500 flex items-center justify-center transition-all">
                </button>
                <div className="flex-1">
                  <p className="text-white text-sm">{reminder.message}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500" style={{ color: reminder.agent?.avatar_color }}>
                      {reminder.agent?.name}
                    </span>
                    <span className={`text-xs ${isPast ? 'text-red-400' : 'text-gray-500'}`}>
                      <Clock className="w-3 h-3 inline mr-1" />
                      {format(new Date(reminder.due_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
          {activeReminders.length === 0 && (
            <p className="text-center text-gray-600 py-8">No active reminders</p>
          )}
        </div>
      </div>

      {/* Completed */}
      {completedReminders.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-500 uppercase mb-4">Completed ({completedReminders.length})</h2>
          <div className="space-y-2">
            {completedReminders.map((reminder) => (
              <div key={reminder.id} className="flex items-center gap-4 p-4 rounded-xl bg-gray-900/40 border border-gray-800/50 opacity-60">
                <button onClick={() => toggleComplete(reminder.id, reminder.completed)}
                  className="w-6 h-6 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center">
                  <Check className="w-3 h-3 text-green-400" />
                </button>
                <div className="flex-1">
                  <p className="text-gray-400 text-sm line-through">{reminder.message}</p>
                  <span className="text-xs text-gray-600">{reminder.agent?.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">New Reminder</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <select value={form.agent_id} onChange={(e) => setForm({ ...form, agent_id: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500">
                <option value="">Select agent...</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <textarea placeholder="Reminder message..." value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 h-20 resize-none" />
              <input type="datetime-local" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500" />
              <button type="submit" disabled={!form.agent_id || !form.message.trim() || !form.due_at}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-all">
                Create Reminder
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
