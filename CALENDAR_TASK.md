# Coder Task: Calendar Section

## Build Calendar Feature

### New Calendar Page (/calendar)
- Add to sidebar navigation with Calendar icon
- Month view with today highlighted
- Click on any date to:
  - View tasks due that day
  - Add new tasks with that due date
  - View scheduled meetings/events

### Calendar Integration:
- Pull tasks with deadlines from the tasks table
- Show color-coded dots for different priority levels
- Display agent avatars on dates with their tasks
- Mini calendar widget on main dashboard

### Visual Design:
- Dark theme consistent with rest of dashboard
- Hover states on calendar dates
- Current date highlighted
- Task count badges on dates with tasks
- Smooth transitions between months

### Database:
- Use existing tasks table (deadline column)
- No new tables needed for MVP

### Features:
1. Month navigation (prev/next month)
2. Today button to jump to current date
3. Task list sidebar when date is selected
4. Quick task creation with pre-filled date
5. Mini calendar overview widget

Build this as a new page with proper routing and navigation.