'use client'
export const dynamic = 'force-dynamic'


import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Notification } from '@/types'
import { format } from 'date-fns'
import { Loader2, Bell, CheckCheck, Trash2, Settings } from 'lucide-react'
import Link from 'next/link'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    const res = await supabase.from('notifications').select('*').order('created_at', { ascending: false })
    setNotifications(res.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const markAllRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('read', false)
    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }

  const clearAll = async () => {
    await supabase.from('notifications').delete().neq('id', '')
    setNotifications([])
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Notifications</h1>
          <p className="text-gray-500">{unreadCount} unread</p>
        </div>
        <div className="flex gap-2">
          <Link href="/notifications/preferences"
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-all text-sm">
            <Settings className="w-4 h-4" /> Preferences
          </Link>
          <button onClick={markAllRead}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-all text-sm">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
          <button onClick={clearAll}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-red-500/20 text-gray-300 hover:text-red-400 rounded-lg transition-all text-sm">
            <Trash2 className="w-4 h-4" /> Clear all
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {notifications.map((n) => (
          <div key={n.id} className={`flex items-start gap-4 p-4 rounded-xl border transition-all animate-fade-in ${
            n.read ? 'bg-gray-900/40 border-gray-800/50 opacity-60' : 'bg-gray-900/80 border-gray-800'
          }`}>
            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
              n.type === 'error' ? 'bg-red-500' :
              n.type === 'warning' ? 'bg-yellow-500' :
              n.type === 'success' ? 'bg-green-500' :
              'bg-blue-500'
            }`} />
            <div className="flex-1">
              <p className={`text-sm ${n.read ? 'text-gray-500' : 'text-white'}`}>{n.message}</p>
              <p className="text-xs text-gray-600 mt-1">{format(new Date(n.created_at), 'MMM d, h:mm a')}</p>
            </div>
          </div>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="text-center py-16 text-gray-600">
          <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">All clear</p>
          <p className="text-sm mt-1">No notifications</p>
        </div>
      )}
    </div>
  )
}
