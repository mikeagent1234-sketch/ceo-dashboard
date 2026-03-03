# Coder Task: Review Board Workflow

## Update Task Board with Review Workflow

### New Kanban Columns (in order):
1. **Backlog** - Tasks queued for future work
2. **To Do** - Ready to start (existing)
3. **In Progress** - Currently being worked on (existing, but highlight active)
4. **Review** - Completed work waiting for Sebastian's approval (existing)
5. **Approved** - Sebastian approved (rename from "Complete")
6. **Needs Changes** - Sebastian rejected, needs rework

### Review Actions:
- In Review column, add **YES** (green) and **NO** (red) buttons
- YES → moves to Approved column
- NO → moves to Needs Changes column + adds timestamp
- Tasks in Needs Changes can be moved back to To Do when fixed

### Visual Updates:
- **Backlog**: Gray theme, lower opacity
- **In Progress**: Blue glow, "working" indicator
- **Review**: Yellow border, "awaiting approval" badge  
- **Approved**: Green theme
- **Needs Changes**: Red theme with rejection reason

### Auto-Status for Team Tasks:
- When I (Coder) complete something → auto-move to Review
- Add "Working on" status indicator when task moves to In Progress
- Show estimated completion time on In Progress tasks

Keep existing progress bars, batch creation, auto-refresh (30s).

Build this after the memory sync completes.