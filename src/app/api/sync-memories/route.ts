import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const MEMORY_DIR = '/Users/mikeaiagent/.openclaw/workspace/memory'

interface ParsedEntry {
  date: string
  title: string
  summary: string
  details: string
  type: 'daily'
}

function parseMemoryFile(filePath: string, filename: string): ParsedEntry[] {
  const date = filename.replace('.md', '') // e.g. "2026-03-02"
  const raw = fs.readFileSync(filePath, 'utf-8')

  // Split into sections by ## headings
  const sections = raw.split(/\n(?=## )/)

  const entries: ParsedEntry[] = []

  for (const section of sections) {
    const lines = section.split('\n').filter(l => l.trim() !== '')
    if (!lines.length) continue

    // First line should be "## Title" (or skip date header "# 2026-...")
    const firstLine = lines[0].trim()
    if (!firstLine.startsWith('## ')) continue

    const title = firstLine.replace(/^##\s+/, '').trim()
    const bodyLines = lines.slice(1)

    // Bullet points → summary
    const bullets = bodyLines
      .filter(l => l.trim().startsWith('- '))
      .map(l => l.trim().replace(/^-\s+/, ''))
    const summary = bullets.join(' · ') || bodyLines.slice(0, 2).join(' ')

    // Full section body → details
    const details = bodyLines.join('\n').trim()

    if (!title || !summary) continue

    entries.push({ date, title, summary, details, type: 'daily' })
  }

  return entries
}

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 })
  }

  if (!fs.existsSync(MEMORY_DIR)) {
    return NextResponse.json({ error: `Memory directory not found: ${MEMORY_DIR}` }, { status: 404 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const files = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.md'))
  if (!files.length) {
    return NextResponse.json({ synced: 0, message: 'No memory files found' })
  }

  let inserted = 0
  let updated = 0
  const errors: string[] = []

  for (const filename of files) {
    const filePath = path.join(MEMORY_DIR, filename)
    let entries: ParsedEntry[] = []

    try {
      entries = parseMemoryFile(filePath, filename)
    } catch (err) {
      errors.push(`Failed to parse ${filename}: ${err}`)
      continue
    }

    for (const entry of entries) {
      // Check if a memory with this date + title already exists
      const { data: existing } = await supabase
        .from('memories')
        .select('id')
        .eq('date', entry.date)
        .eq('title', entry.title)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('memories')
          .update({ summary: entry.summary, details: entry.details })
          .eq('id', existing.id)
        if (error) errors.push(`Update failed for "${entry.title}": ${error.message}`)
        else updated++
      } else {
        const { error } = await supabase.from('memories').insert({
          date: entry.date,
          title: entry.title,
          summary: entry.summary,
          details: entry.details || null,
          type: entry.type,
        })
        if (error) errors.push(`Insert failed for "${entry.title}": ${error.message}`)
        else inserted++
      }
    }
  }

  return NextResponse.json({
    synced: inserted + updated,
    inserted,
    updated,
    files: files.length,
    errors: errors.length ? errors : undefined,
  })
}
