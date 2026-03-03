# Dashboard Update Task

Read the full codebase first. Supabase URL: https://iiiussdzuivoettlgrni.supabase.co Anon Key: sb_publishable_UQVkPsA85l8ZnCm1ZxfaUg_Zrd8SyHJ

## 1. Update Tasks Page
- Batch task creation: form to add MULTIPLE tasks at once, each assigned to different agents, submit all together
- Add progress percentage (0-100) to each task card with visual progress bar
- Add progress slider on each task card to update progress
- Auto-refresh every 30 seconds (polling with setInterval)

## 2. New Page: Live Activity (/activity)
- Add to sidebar nav with Activity icon
- Shows what each agent is working on RIGHT NOW
- Shows progress % of each active task per agent
- Auto-refreshes every 30 seconds
- Color indicators: green=working, yellow=review, red=blocked, gray=idle

## 3. New Page: Memory (/memory)
- Add to sidebar nav with Brain icon
- Two tabs: "Recent (7 Days)" and "Long-Term Memory"
- Recent: conversation logs from past 7 days, organized by date
- Long-term: ALL conversation history since day one
- Each entry: date, summary, key decisions, thought process
- Uses a "memories" table in Supabase (assume it exists)

## Types to add in src/types/index.ts:
- Add `progress: number` (default 0) to Task interface
- Add Memory interface: { id, date, title, summary, details, type: 'daily'|'longterm', created_at }

## Design: Same dark theme (gray-900/950), same card style, same sidebar.

## When done:
1. npm run build (must pass with zero errors)
2. git add -A && git commit -m "Add live activity, memory, batch tasks, progress" && git push origin main
3. Run: openclaw system event --text "Done: Dashboard v2 shipped" --mode now
