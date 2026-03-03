import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const SEED_PROJECTS = [
  {
    name: 'CEO Dashboard v1',
    description: 'Live Next.js dashboard with agents, tasks, memory, and activity tracking.',
    status: 'complete',
    progress: 100,
  },
  {
    name: 'API Integrations Setup',
    description: 'GitHub, Supabase, Vercel, and Perplexity connected. Minor cleanup remaining.',
    status: 'active',
    progress: 90,
  },
  {
    name: 'AI Team Framework',
    description: 'Role definitions done, delegation system working, cost optimization completed.',
    status: 'active',
    progress: 75,
  },
  {
    name: 'Business Intelligence System',
    description: 'Data Gatherer operational. Needs automated reporting and market analysis workflows.',
    status: 'active',
    progress: 45,
  },
  {
    name: 'Agent Automation Pipeline',
    description: 'Task board exists. Needs 30s polling system, auto-status updates, workflow triggers.',
    status: 'active',
    progress: 30,
  },
]

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  let inserted = 0
  let updated = 0
  let noProgressColumn = false
  const errors: string[] = []

  for (const project of SEED_PROJECTS) {
    // Check if project already exists
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('name', project.name)
      .maybeSingle()

    if (existing) {
      // Try to update with progress field
      const { error } = await supabase
        .from('projects')
        .update({ progress: project.progress, description: project.description, status: project.status })
        .eq('id', existing.id)

      if (error?.message?.includes("'progress' column")) {
        noProgressColumn = true
        // Update without progress
        await supabase
          .from('projects')
          .update({ description: project.description, status: project.status })
          .eq('id', existing.id)
      } else if (error) {
        errors.push(`Update failed for "${project.name}": ${error.message}`)
      }
      updated++
      continue
    }

    // Try insert with progress
    const { error } = await supabase.from('projects').insert(project)

    if (error?.message?.includes("'progress' column")) {
      noProgressColumn = true
      // Fall back: insert without progress
      const { error: e2 } = await supabase.from('projects').insert({
        name: project.name,
        description: project.description,
        status: project.status,
      })
      if (e2) errors.push(`Insert failed for "${project.name}": ${e2.message}`)
      else inserted++
    } else if (error) {
      errors.push(`Insert failed for "${project.name}": ${error.message}`)
    } else {
      inserted++
    }
  }

  return NextResponse.json({
    inserted,
    updated,
    noProgressColumn,
    migrationSql: noProgressColumn
      ? 'ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress integer DEFAULT NULL;'
      : undefined,
    errors: errors.length ? errors : undefined,
  })
}
