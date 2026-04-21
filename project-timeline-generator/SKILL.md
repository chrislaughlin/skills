---
name: project-timeline-generator
description: Generate project summaries and Excalidraw timelines from Claude, OpenCode, or Cursor sessions. Use when asked to "create project summary", "generate timeline", "session history", "project overview", or "visualize project sessions". Walks through session discovery, filtering, summarization, and timeline visualization.
---

# Project Timeline Generator

Generates project summaries and Excalidraw timeline diagrams from agent sessions (Claude Code, OpenCode, Cursor).

## When to Use

Triggered by requests like:
- "Create a project summary"
- "Generate a timeline"
- "Show session history"
- "Project overview"
- "Visualize project sessions"

## Step 1: Discover Sessions

Scan these common locations for session files:

| Agent | Typical Locations |
|-------|------------------|
| Claude Code | `~/.claude/projects/<project-id>/sessions/*.json` |
| OpenCode | `~/.opencode/sessions/`, `./.opencode/sessions/` |
| Cursor | `.cursor/rules/`, `.cursor/history/` |

Use glob to find session files:
```bash
# Claude sessions
glob(pattern="**/*session*.json", path="~/.claude/projects")

# OpenCode sessions
glob(pattern="**/*.md", path="~/.opencode/sessions")

# Cursor sessions
glob(pattern="**/*.md", path=".cursor")
```

## Step 2: Filter Empty Sessions

Read each session file and filter out sessions with no meaningful prompts:
- Exclude sessions where user prompts are empty or trivial ("y", "yes", empty)
- Keep sessions with actual code changes, file edits, or substantive prompts

## Step 3: Present Selection to User

Present filtered sessions to user with:
- Session filename/path
- Approximate date/timestamp (if available)
- Brief preview of activity

Ask: "Which sessions would you like to include? (select numbers, or 'all')"

Allow options:
- `all` - Include all valid sessions
- `1,3,5` - Specific session numbers
- `1-5` - Range of sessions

## Step 4: Generate Session Summaries

For each selected session:

1. **Extract timestamp** - Parse date from filename or content
2. **Create title** - 3-5 word summary of what was done
3. **Write summary** - 1-2 sentences describing key activities

Store as:
```
Session 1: "Setup project structure"
  Date: 2024-01-15
  Summary: Created initial project structure, configured dependencies.

Session 2: "Implement authentication"
  Date: 2024-01-16
  Summary: Built login/logout flow with JWT tokens.
```

## Step 5: Build Project Summary

Combine all session summaries into cohesive narrative:
-Opening paragraph: Project context and initial work
-Body paragraphs (2-3): Key phases/achievements
-Closing paragraph: Current state or next steps

Target: 3-5 paragraphs total.

## Step 6: Generate Excalidraw Timeline

Create timeline.excalidraw with horizontal timeline layout:

### Element Structure

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [
    { /* title text */ },
    { /* timeline axis */ },
    { /* markers + labels for each session */ }
  ],
  "appState": { "viewBackgroundColor": "#f9fafb", "gridSize": 20 },
  "files": {}
}
```

### Timeline Layout

```javascript
// Title: y = 50
// Timeline axis: y = 200, x = 100 to 900
// Sessions: spaced every 150px horizontally
// Each session: marker (circle/rect) + label + date
```

### Key Elements

| Element | Type | Properties |
|--------|------|-----------|
| Title | text | fontFamily: 5, fontSize: 28, bold |
| Timeline axis | arrow | horizontal, strokeColor: #374151 |
| Session marker | ellipse | fill: #e5e7eb, stroke: #374151 |
| Session title | text | fontFamily: 5, fontSize: 14 |
| Date label | text | fontFamily: 5, fontSize: 12, strokeColor: #6b7280 |

### Session Marker Positioning

```javascript
const startX = 100;
const spacing = 150;
const markerY = 200;

sessions.forEach((session, i) => {
  const x = startX + (i * spacing);
  // marker at (x, markerY)
  // title above at (x, markerY - 40)
  // date below at (x, markerY + 40)
});
```

### Complete Timeline Example (3 sessions)

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [
    {
      "id": "title",
      "type": "text",
      "x": 300,
      "y": 30,
      "text": "Project Timeline",
      "fontSize": 28,
      "fontFamily": 5
    },
    {
      "id": "axis",
      "type": "arrow",
      "x": 50,
      "y": 200,
      "points": [[0, 0], [750, 0]],
      "strokeColor": "#374151"
    },
    {
      "id": "session1",
      "type": "ellipse",
      "x": 100,
      "y": 190,
      "width": 20,
      "height": 20,
      "fill": "#dbeafe",
      "strokeColor": "#1d4ed8"
    },
    {
      "id": "session1-label",
      "type": "text",
      "x": 75,
      "y": 160,
      "text": "Setup",
      "fontSize": 14,
      "fontFamily": 5
    },
    {
      "id": "session1-date",
      "type": "text",
      "x": 75,
      "y": 225,
      "text": "Jan 15",
      "fontSize": 12,
      "fontFamily": 5,
      "strokeColor": "#6b7280"
    }
  ],
  "appState": { "viewBackgroundColor": "#f9fafb", "gridSize": 20 },
  "files": {}
}
```

## Output Files

Generate:
1. **project-summary.md** - Combined project summary (3-5 paragraphs)
2. **project-timeline.excalidraw** - Visual timeline

## Delivery

Show user:
- Project summary text
- Timeline file location
- Instructions to open: "Drag project-timeline.excalidraw to https://excalidraw.com"

## References

- `references/session-formats.md` - Session path patterns per agent
- `references/excalidraw-timeline.md` - Detailed timeline element specs
- `templates/timeline-template.json` - Starter template

## Limitations

- Relies on session files being accessible on filesystem
- Timestamps may be approximate if not in metadata
- Maximum ~15 sessions recommended for readability