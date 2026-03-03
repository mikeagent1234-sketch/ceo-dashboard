'use client'

import { Agent } from '@/types'

const statusConfig = {
  idle: {
    label: 'Idle',
    dot: 'bg-slate-400',
    badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  },
  working: {
    label: 'Working',
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  blocked: {
    label: 'Blocked',
    dot: 'bg-red-400',
    badge: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
}

interface AgentCardProps {
  agent: Agent
  taskCount?: number
  onClick?: () => void
}

export default function AgentCard({ agent, taskCount = 0, onClick }: AgentCardProps) {
  const status = statusConfig[agent.status] || statusConfig.idle

  return (
    <div
      onClick={onClick}
      className="glass-card glass-card-hover rounded-xl p-5 cursor-pointer group animate-fade-in"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-lg"
          style={{
            backgroundColor: agent.avatar_color,
            boxShadow: `0 4px 14px ${agent.avatar_color}40`,
          }}
        >
          {agent.name.charAt(0)}
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs ${status.badge}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${status.dot} animate-pulse-dot`} />
          {status.label}
        </div>
      </div>

      <h3 className="text-white font-semibold mb-1 group-hover:text-blue-400 transition-colors text-sm">
        {agent.name}
      </h3>
      <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">{agent.role}</p>

      <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
        <span className="text-xs text-slate-500">
          {taskCount} active task{taskCount !== 1 ? 's' : ''}
        </span>
        <span className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
          View tasks →
        </span>
      </div>
    </div>
  )
}
