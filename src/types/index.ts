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
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'approved' | 'needs_changes'
  priority: 'high' | 'medium' | 'low'
  progress: number
  deadline: string | null
  project_id: string | null
  created_at: string
  updated_at: string
  agent?: Agent
  project?: Project
}

export interface Memory {
  id: string
  date: string
  title: string
  summary: string
  details: string | null
  type: 'daily' | 'longterm'
  created_at: string
}

export interface LiveActivity {
  id: string
  agent_id: string
  task_id: string | null
  status: 'idle' | 'working' | 'review' | 'blocked'
  started_at: string | null
  updated_at: string
  agent?: Agent
  task?: Task
}

export interface Project {
  id: string
  name: string
  description: string | null
  status: 'active' | 'paused' | 'complete'
  progress: number | null
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

export interface WorkStatusEvent {
  id: string
  agent_id: string
  task_id: string | null
  event_type: 'start' | 'progress' | 'log' | 'error' | 'complete' | 'idle'
  message: string
  progress: number | null
  metadata: Record<string, any> | null
  created_at: string
}

export interface ChatMessage {
  id: string
  content: string
  sender: string
  sender_type: 'user' | 'agent' | 'system'
  command: string | null
  created_at: string
}

export interface DelegationRule {
  id: string
  name: string
  category: 'budget' | 'design' | 'tech' | 'custom'
  threshold: number | null
  auto_proceed: boolean
  escalation_condition: string | null
  created_at: string
}

export interface DecisionLog {
  id: string
  rule_id: string | null
  decision: string
  context: string | null
  outcome: 'auto_approved' | 'escalated' | 'manual'
  created_at: string
  rule?: DelegationRule
}

export interface NotificationPreference {
  id: string
  channel: 'telegram' | 'email' | 'sms' | 'push'
  enabled: boolean
  config: Record<string, string> | null
  events: string[]
  created_at: string
}
