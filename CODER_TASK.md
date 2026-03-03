# Coder Task: Auto-Memories + Projects Section

## 1. Auto-Populate Memories
- Create API route `/api/sync-memories` that:
  - Reads from OpenClaw workspace memory files (`/Users/mikeaiagent/.openclaw/workspace/memory/*.md`)
  - Parses daily entries and syncs them to the memories table
  - Updates existing entries if they exist
- Add a "Sync Memories" button to the Memory page
- Auto-sync could run daily via cron or manual trigger for now

## 2. Projects Section Updates
Add 5 realistic projects to the projects table with progress percentages:

1. **CEO Dashboard v1** - 100% (completed - live dashboard)
2. **API Integrations Setup** - 90% (GitHub, Supabase, Vercel, Perplexity connected, minor cleanup needed)
3. **AI Team Framework** - 75% (role definitions done, delegation system working, cost optimization completed)
4. **Business Intelligence System** - 45% (Data Gatherer operational, need automated reporting, market analysis workflows)
5. **Agent Automation Pipeline** - 30% (task board exists, need 30s polling system, auto-status updates, workflow triggers)

## Implementation:
1. Create the sync API route
2. Update the Memory page with sync button
3. Seed the projects table with the 5 projects above
4. Test the sync functionality
5. Build and deploy

Keep the same dark theme, same card patterns. Make progress bars visually similar to the task progress bars.