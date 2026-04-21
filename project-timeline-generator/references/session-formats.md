# Session Formats Reference

Guide to detecting and parsing session files from different agent tools.

## Claude Code Sessions

### Location Pattern
```
~/.claude/projects/<project-id>/sessions/*.json
```

### Typical File Structure
```json
{
  "sessionId": "abc123",
  "timestamp": "2024-01-15T10:30:00Z",
  "transcript": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "summary": "..."
}
```

### Key Fields
- `timestamp` - ISO date string
- `transcript` - Array of messages
- Each message has `role` (user/assistant) and `content`

### Filtering Tips
- Check `transcript` array for non-empty user messages
- Skip sessions with only system messages

---

## OpenCode Sessions

### Location Pattern
```
~/.opencode/sessions/
./.opencode/sessions/
```

### Typical File Structure
```markdown
---
session_id: abc123
created: 2024-01-15T10:30:00Z
---

# Transcript

User: [prompt]
Assistant: [response]

User: [prompt]
Assistant: [response]
```

### Key Fields
- Frontmatter `created` - Date string
- Markdown transcript with User/Assistant markers

### Filtering Tips
- Parse markdown for "User:" entries
- Skip empty or trivial prompts ("y", "yes", etc.)

---

## Cursor Sessions

### Location Pattern
```
.cursor/rules/
.cursor/history/
CursorHistory/
```

### Typical File Structure (mcp.json)
```json
{
  "history": [
    {
      "id": "abc123",
      "timestamp": 1705312200,
      "messages": [...]
    }
  ]
}
```

### Typical File Structure (rule files)
```markdown
# Rule Name

Content of the rule...
---
Created: 2024-01-15
```

### Key Fields
- `timestamp` - Unix timestamp
- `messages` - Array of exchanges

### Filtering Tips
- Check `messages` array for content
- Rule files may not have timestamps - use file modified date

---

## Quick Detection Commands

```bash
# Find Claude sessions
glob(path="~/.claude/projects", pattern="**/*session*.json")

# Find OpenCode sessions
glob(path="~/.opencode/sessions", pattern="**/*.md")
glob(path=".opencode/sessions", pattern="**/*.md")

# Find Cursor sessions
glob(path=".cursor", pattern="**/*.md")
glob(path="CursorHistory", pattern="**/*.json")
```

---

## Date Extraction

| Source | Field | Parsing |
|--------|-------|--------|
| Claude | `timestamp` | ISO 8601 - use as-is |
| OpenCode | `created` | Parse from frontmatter |
| Cursor | `timestamp` | Unix epoch - convert to date |

---

## Common Issues

1. **No sessions found** - Check case sensitivity in paths
2. **Missing timestamps** - Fall back to file modification date
3. **Empty transcripts** - Verify file isn't cached/template