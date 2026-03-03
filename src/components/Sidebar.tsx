'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  FolderKanban,
  Bell,
  Clock,
  FileText,
  Zap,
  Menu,
  X,
  Activity,
  Brain,
} from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const [taskCount, setTaskCount] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'complete')
      setTaskCount(count || 0)
    }
    fetchCount()
  }, [pathname])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { href: '/agents', label: 'Agents', icon: Users, badge: null },
    { href: '/tasks', label: 'Tasks', icon: CheckSquare, badge: taskCount > 0 ? taskCount : null },
    { href: '/activity', label: 'Live Activity', icon: Activity, badge: null },
    { href: '/projects', label: 'Projects', icon: FolderKanban, badge: null },
    { href: '/reminders', label: 'Reminders', icon: Clock, badge: null },
    { href: '/memory', label: 'Memory', icon: Brain, badge: null },
    { href: '/reports', label: 'Reports', icon: FileText, badge: null },
    { href: '/notifications', label: 'Notifications', icon: Bell, badge: null },
  ]

  const sidebarContent = (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-950 border-r border-gray-800 flex flex-col z-50 transition-transform duration-200 ease-in-out md:translate-x-0"
      style={{ transform: mobileOpen ? 'translateX(0)' : undefined }}
    >
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">CEO Dashboard</h1>
            <p className="text-xs text-gray-500">Agent Command Center</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium flex-1">{item.label}</span>
              {item.badge !== null && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-600/30 text-blue-400 font-medium">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="px-4 py-3 rounded-lg bg-gray-900/50">
          <p className="text-xs text-gray-500">Powered by</p>
          <p className="text-sm text-gray-300 font-medium">Mike • CEO Agent</p>
        </div>
      </div>
    </aside>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-[60] md:hidden w-9 h-9 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center text-gray-300 hover:text-white transition-colors"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile unless open */}
      <div className={`md:block ${mobileOpen ? 'block' : 'hidden'}`}>
        {sidebarContent}
      </div>
    </>
  )
}
