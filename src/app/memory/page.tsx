'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Memory } from '@/types'
import { Brain, Calendar, Clock, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [tab, setTab] = useState<'recent' | 'longterm'>('recent')
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', summary: '', details: '', date: new Date().toISOString().split('T')[0], type: 'daily' as 'daily' | 'longterm' })

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from('memories')
      .select('*')
      .order('date', { ascending: false })
    if (data) setMemories(data)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await supabase.from('memories').insert({
      title: form.title,
      summary: form.summary,
      details: form.details || null,
      date: form.date,
      type: form.type,
    })
    setForm({ title: '', summary: '', details: '', date: new Date().toISOString().split('T')[0], type: 'daily' })
    setShowCreate(false)
    fetchData()
  }

  const deleteMemory = async (id: string) => {
    await supabase.from('memories').delete().eq('id', id)
    fetchData()
  }

  // Filter by tab
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysStr = sevenDaysAgo.toISOString().split('T')[0]

  const filtered = tab === 'recent'
    ? memories.filter(m => m.date >= sevenDaysStr)
    : memories

  // Group by date
  const grouped: Record<string, Memory[]> = {}
  filtered.forEach(m => {
    if (!grouped[m.date]) grouped[m.date] = []
    grouped[m.date].push(m)
  })
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-400" />
            Memory
          </h1>
          <p className="text-gray-500 mt-1">Conversation history, decisions, and thought process</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add Memory
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('recent')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'recent' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-gray-400 hover:text-white bg-gray-800/50'
          }`}
        >
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recent (7 Days)
          </span>
        </button>
        <button
          onClick={() => setTab('longterm')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'longterm' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-gray-400 hover:text-white bg-gray-800/50'
          }`}
        >
          <span className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Long-Term Memory
          </span>
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8 animate-fade-in">
          <h3 className="text-lg font-semibold text-white mb-4">New Memory Entry</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Title *"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                required
              />
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white"
                required
              />
            </div>
            <textarea
              placeholder="Summary — key points, decisions made *"
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 h-24 resize-none"
              required
            />
            <textarea
              placeholder="Details — full thought process, context, reasoning (optional)"
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 h-32 resize-none"
            />
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as 'daily' | 'longterm' })}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white"
            >
              <option value="daily">📅 Daily Log</option>
              <option value="longterm">🧠 Long-Term Memory</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-400">Cancel</button>
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg text-sm font-medium">Save Memory</button>
          </div>
        </form>
      )}

      {/* Memory Timeline */}
      <div className="space-y-6">
        {sortedDates.map((date) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-purple-400">
                {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h2>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            <div className="space-y-3 ml-7">
              {grouped[date].map((memory) => (
                <div
                  key={memory.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="flex items-start gap-3 cursor-pointer flex-1"
                      onClick={() => setExpandedId(expandedId === memory.id ? null : memory.id)}
                    >
                      {expandedId === memory.id ? (
                        <ChevronDown className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">{memory.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            memory.type === 'longterm' ? 'bg-purple-400/10 text-purple-400' : 'bg-blue-400/10 text-blue-400'
                          }`}>
                            {memory.type === 'longterm' ? '🧠 Long-term' : '📅 Daily'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">{memory.summary}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMemory(memory.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 ml-3"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {expandedId === memory.id && memory.details && (
                    <div className="mt-4 ml-7 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 animate-fade-in">
                      <p className="text-xs text-gray-500 mb-2 font-medium">THOUGHT PROCESS & DETAILS</p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{memory.details}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {sortedDates.length === 0 && (
          <div className="text-center py-20 text-gray-600">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2">{tab === 'recent' ? 'No memories from the past 7 days' : 'No long-term memories yet'}</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-indigo-400 hover:text-indigo-300 text-sm"
            >
              Add your first memory →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
