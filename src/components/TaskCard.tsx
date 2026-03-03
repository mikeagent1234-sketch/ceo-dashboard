'use client'

import { Task } from '@/types'
import { format } from 'date-fns'
import { Trash2 } from 'lucide-react'

const priorityConfig = {
  high: { label: 'High', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  medium: { label: 'Med', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  low: { label: 'Low', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
}

const statusConfig = {
  todo: { label: 'To Do', color: 'bg-gray-500' },
  in_progress: { label: 'In Progress', color: 'bg-blue-500' },
  review: { label: 'Review', color: 'bg-purple-500' },
  complete: { label: 'Complete', color: 'bg-green-500' },
}

interface TaskCardProps {
  task: Task
  onStatusChange?: (taskId: string, newStatus: string) => void
  onDelete?: (taskId: string) => void
}

export default function TaskCard({ task, onStatusChange, onDelete }: TaskCardProps) {
  const priority = priorityConfig[task.priority] || priorityConfig.medium
  const statuses = ['todo', 'in_progress', 'review', 'complete']

  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-all animate-fade-in group">
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-white font-medium text-sm flex-1 mr-3 leading-snug">{task.title}</h4>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`px-2 py-0.5 rounded text-xs border ${priority.bg} ${priority.color}`}>
            {priority.label}
          </span>
          {onDelete && (
            <button
              onClick={() => onDelete(task.id)}
              className="text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              aria-label="Delete task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center gap-2 mb-3">
        {task.agent && (
          <span
            className="px-2 py-1 rounded text-xs text-white"
            style={{ backgroundColor: task.agent.avatar_color + '40' }}
          >
            {task.agent.name}
          </span>
        )}
        {task.project && (
          <span className="px-2 py-1 rounded text-xs text-gray-400 bg-gray-800">
            {task.project.name}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <select
          value={task.status}
          onChange={(e) => onStatusChange?.(task.id, e.target.value)}
          className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 focus:outline-none focus:border-blue-500"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {statusConfig[s as keyof typeof statusConfig].label}
            </option>
          ))}
        </select>

        {task.deadline && (
          <span className="text-xs text-gray-500">
            Due {format(new Date(task.deadline), 'MMM d')}
          </span>
        )}
      </div>
    </div>
  )
}
