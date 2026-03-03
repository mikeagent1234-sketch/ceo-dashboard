export interface Agent {
  id: string
  name: string
  role: string
  status: 'idle' | 'working' | 'blocked'
  avatar_color: string
  created_at: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  agent_id: string | null
  status: 'todo' | 'in_progress' | 'review' | 'complete'
  priority: 'high' | 'medium' | 'low'
  deadline: string | null
  project_id: string | null
  created_at: string
  updated_at: string
  agent?: Agent
  project?: Project
}

export interface Project {
  id: string
  name: string
  description: string | null
  status: 'active' | 'paused' | 'complete'
  created_at: string
}

export interface Reminder {
  id: string
  agent_id: string | null
  message: string
  due_at: string
  completed: boolean
  created_at: string
  agent?: Agent
}

export interface Notification {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  created_at: string
}

export interface DailyReport {
  id: string
  date: string
  summary: string
  created_at: string
}
