'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { NotificationPreference } from '@/types'
import {
  Loader2,
  Bell,
  MessageSquare,
  Mail,
  Smartphone,
  Globe,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'

const CHANNEL_META: Record<string, { icon: typeof Bell; label: string; color: string; bg: string }> = {
  telegram: { icon: MessageSquare, label: 'Telegram', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  email: { icon: Mail, label: 'Email', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  sms: { icon: Smartphone, label: 'SMS', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  push: { icon: Globe, label: 'Push', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
}

const EVENT_OPTIONS = [
  { value: 'task_complete', label: 'Task Completed' },
  { value: 'task_assigned', label: 'Task Assigned' },
  { value: 'error', label: 'Critical Errors' },
  { value: 'blocker', label: 'Blockers' },
  { value: 'daily_briefing', label: 'Daily Briefing' },
  { value: 'milestone', label: 'Milestones' },
  { value: 'chat_mention', label: 'Chat Mentions' },
  { value: 'downtime', label: 'Downtime Alerts' },
]

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<NotificationPreference[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fetchPrefs = async () => {
    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .order('channel')
    setPrefs(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchPrefs() }, [])

  const toggleChannel = (id: string, enabled: boolean) => {
    setPrefs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled } : p))
    )
  }

  const toggleEvent = (id: string, event: string) => {
    setPrefs((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        const events = p.events.includes(event)
          ? p.events.filter((e) => e !== event)
          : [...p.events, event]
        return { ...p, events }
      })
    )
  }

  const updateConfig = (id: string, key: string, value: string) => {
    setPrefs((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        return { ...p, config: { ...(p.config || {}), [key]: value } }
      })
    )
  }

  const addChannel = async (channel: string) => {
    const { data, error } = await supabase
      .from('notification_preferences')
      .insert({ channel, enabled: false, events: [], config: {} })
      .select()
      .single()
    if (data) setPrefs((prev) => [...prev, data])
  }

  const removeChannel = async (id: string) => {
    await supabase.from('notification_preferences').delete().eq('id', id)
    setPrefs((prev) => prev.filter((p) => p.id !== id))
  }

  const saveAll = async () => {
    setSaving(true)
    for (const pref of prefs) {
      await supabase
        .from('notification_preferences')
        .update({
          enabled: pref.enabled,
          events: pref.events,
          config: pref.config,
        })
        .eq('id', pref.id)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
  }

  const existingChannels = prefs.map((p) => p.channel)
  const availableChannels = Object.keys(CHANNEL_META).filter((c) => !existingChannels.includes(c))

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/notifications" className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Notification Preferences</h1>
          <p className="text-gray-500 text-sm">Configure how and when you receive alerts</p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-lg transition-all text-sm font-medium"
        >
          {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> : saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save All</>}
        </button>
      </div>

      {/* Channel Cards */}
      <div className="space-y-4">
        {prefs.map((pref) => {
          const meta = CHANNEL_META[pref.channel] || { icon: Bell, label: pref.channel, color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20' }
          const Icon = meta.icon

          return (
            <div
              key={pref.id}
              className={`rounded-xl border p-5 transition-all ${
                pref.enabled
                  ? 'bg-gray-900/80 border-gray-700'
                  : 'bg-gray-900/40 border-gray-800/50 opacity-60'
              }`}
            >
              {/* Channel header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${meta.bg}`}>
                    <Icon className={`w-5 h-5 ${meta.color}`} />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{meta.label}</h3>
                    <p className="text-xs text-gray-500">{pref.events.length} events subscribed</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Toggle */}
                  <button
                    onClick={() => toggleChannel(pref.id, !pref.enabled)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      pref.enabled ? 'bg-blue-600' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        pref.enabled ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => removeChannel(pref.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Config fields */}
              {pref.enabled && (
                <>
                  {pref.channel === 'telegram' && (
                    <div className="mb-4">
                      <label className="text-xs text-gray-500 mb-1 block">Bot Token / Chat ID</label>
                      <input
                        type="text"
                        value={pref.config?.chat_id || ''}
                        onChange={(e) => updateConfig(pref.id, 'chat_id', e.target.value)}
                        placeholder="Enter Telegram chat ID..."
                        className="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                  )}
                  {pref.channel === 'email' && (
                    <div className="mb-4">
                      <label className="text-xs text-gray-500 mb-1 block">Email Address</label>
                      <input
                        type="email"
                        value={pref.config?.email || ''}
                        onChange={(e) => updateConfig(pref.id, 'email', e.target.value)}
                        placeholder="Enter email address..."
                        className="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                  )}
                  {pref.channel === 'sms' && (
                    <div className="mb-4">
                      <label className="text-xs text-gray-500 mb-1 block">Phone Number</label>
                      <input
                        type="tel"
                        value={pref.config?.phone || ''}
                        onChange={(e) => updateConfig(pref.id, 'phone', e.target.value)}
                        placeholder="+1234567890"
                        className="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                  )}

                  {/* Event subscriptions */}
                  <div>
                    <label className="text-xs text-gray-500 mb-2 block">Subscribed Events</label>
                    <div className="flex flex-wrap gap-2">
                      {EVENT_OPTIONS.map((ev) => {
                        const isActive = pref.events.includes(ev.value)
                        return (
                          <button
                            key={ev.value}
                            onClick={() => toggleEvent(pref.id, ev.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              isActive
                                ? 'bg-blue-600/20 border-blue-500/30 text-blue-300'
                                : 'bg-gray-800/50 border-gray-700/50 text-gray-500 hover:text-gray-300 hover:border-gray-600'
                            }`}
                          >
                            {ev.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Add channel */}
      {availableChannels.length > 0 && (
        <div className="mt-6">
          <p className="text-xs text-gray-600 mb-2">Add notification channel:</p>
          <div className="flex gap-2">
            {availableChannels.map((ch) => {
              const meta = CHANNEL_META[ch]
              const Icon = meta.icon
              return (
                <button
                  key={ch}
                  onClick={() => addChannel(ch)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-all hover:scale-[1.02] ${meta.bg}`}
                >
                  <Plus className="w-3.5 h-3.5 text-gray-500" />
                  <Icon className={`w-4 h-4 ${meta.color}`} />
                  <span className="text-gray-300">{meta.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Webhook info */}
      <div className="mt-8 p-5 bg-gray-900/60 border border-gray-800 rounded-xl">
        <h3 className="text-sm font-semibold text-white mb-3">📡 Webhook Endpoints</h3>
        <p className="text-xs text-gray-500 mb-3">Use these endpoints to send notifications from external services:</p>
        <div className="space-y-2 font-mono text-xs">
          <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-2 rounded-lg">
            <span className="text-emerald-400 font-bold">POST</span>
            <span className="text-gray-300">/api/webhooks/notify</span>
            <span className="text-gray-600 ml-auto">General notifications</span>
          </div>
          <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-2 rounded-lg">
            <span className="text-emerald-400 font-bold">POST</span>
            <span className="text-gray-300">/api/webhooks/task-complete</span>
            <span className="text-gray-600 ml-auto">Task completion</span>
          </div>
          <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-2 rounded-lg">
            <span className="text-emerald-400 font-bold">POST</span>
            <span className="text-gray-300">/api/webhooks/alert</span>
            <span className="text-gray-600 ml-auto">Critical alerts</span>
          </div>
          <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-2 rounded-lg">
            <span className="text-emerald-400 font-bold">GET/POST</span>
            <span className="text-gray-300">/api/chat/messages</span>
            <span className="text-gray-600 ml-auto">Chat API</span>
          </div>
        </div>
      </div>
    </div>
  )
}
