'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  const [reviewCount, setReviewCount] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const fetchCounts = async () => {
      const [activeRes, reviewRes] = await Promise.all([
        supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'approved').neq('status', 'backlog'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'review'),
      ])
      setTaskCount(activeRes.count || 0)
      setReviewCount(reviewRes.count || 0)
    }
    fetchCounts()
  }, [pathname])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { href: '/agents', label: 'Agents', icon: Users, badge: null },
    { href: '/tasks', label: 'Tasks', icon: CheckSquare, badge: taskCount > 0 ? taskCount : null, reviewBadge: reviewCount > 0 ? reviewCount : null },
    { href: '/activity', label: 'Live Activity', icon: Activity, badge: null },
    { href: '/projects', label: 'Projects', icon: FolderKanban, badge: null },
    { href: '/reminders', label: 'Reminders', icon: Clock, badge: null },
    { href: '/memory', label: 'Memory', icon: Brain, badge: null },
    { href: '/reports', label: 'Reports', icon: FileText, badge: null },
    { href: '/notifications', label: 'Notifications', icon: Bell, badge: null },
  ]

  const sidebarContent = (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col z-50"
      style={{
        background: 'rgba(8, 12, 30, 0.97)',
        borderRight: '1px solid rgba(51, 65, 85, 0.4)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Logo */}
      <div className="p-5 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">CEO Dashboard</h1>
            <p className="text-xs text-slate-500">Agent Command Center</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative group ${
                isActive
                  ? 'text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
              style={isActive ? {
                background: 'rgba(37, 99, 235, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
              } : { border: '1px solid transparent' }}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full" />
              )}
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-400' : ''}`} />
              <span className="text-sm font-medium flex-1">{item.label}</span>
              <div className="flex items-center gap-1">
                {/* Review badge (yellow) */}
                {'reviewBadge' in item && item.reviewBadge && (
                  <span className="px-1.5 py-0.5 text-xs rounded-full font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 animate-pulse-dot">
                    {item.reviewBadge}
                  </span>
                )}
                {/* Task count badge */}
                {item.badge !== null && (
                  <span className="px-1.5 py-0.5 text-xs rounded-full bg-blue-600/25 text-blue-400 font-medium border border-blue-500/20">
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800/60">
        <div className="px-3 py-2.5 rounded-lg bg-slate-900/50 border border-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white">
              M
            </div>
            <div>
              <p className="text-xs font-medium text-slate-200">Mike • CEO</p>
              <p className="text-xs text-slate-500">Command active</p>
            </div>
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
          </div>
        </div>
      </div>
    </aside>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-[60] md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-slate-300 hover:text-white transition-colors"
        style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(51, 65, 85, 0.5)' }}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          style={{ backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`md:block ${mobileOpen ? 'block' : 'hidden'}`}>
        {sidebarContent}
      </div>
    </>
  )
}
