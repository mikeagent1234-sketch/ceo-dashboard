'use client'

import { Agent } from '@/types'

const statusConfig = {
  idle: { label: 'Idle', color: 'bg-gray-500', dot: 'bg-gray-400' },
  working: { label: 'Working', color: 'bg-green-500', dot: 'bg-green-400' },
  blocked: { label: 'Blocked', color: 'bg-red-500', dot: 'bg-red-400' },
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
      className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: agent.avatar_color }}
        >
          {agent.name.charAt(0)}
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status.dot} animate-pulse-dot`} />
          <span className="text-xs text-gray-400">{status.label}</span>
        </div>
      </div>

      <h3 className="text-white font-semibold mb-1 group-hover:text-blue-400 transition-colors">
        {agent.name}
      </h3>
      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{agent.role}</p>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {taskCount} active task{taskCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}
