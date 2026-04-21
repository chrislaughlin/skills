# Excalidraw Timeline Reference

Detailed specifications for generating timeline diagrams.

## Coordinate System

- Origin (0,0) is top-left of canvas
- X increases rightward
- Y increases downward
- Grid size: 20px (snap to grid recommended)

## Canvas Setup

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [],
  "appState": {
    "viewBackgroundColor": "#f9fafb",
    "gridSize": 20
  },
  "files": {}
}
```

## Element Properties

### Common Properties

```typescript
interface Element {
  id: string;
  type: "rectangle" | "ellipse" | "arrow" | "text";
  x: number;
  y: number;
  width?: number;
  height?: number;
  fill?: string;
  strokeColor?: string;
  strokeWidth?: number;
  fontFamily?: number;
  fontSize?: number;
  text?: string;
}
```

### fontFamily Values

| Value | Font |
|-------|------|
| 5 | Excalifont (required for text) |

## Element Types for Timelines

### 1. Text (Title/Labels)

```json
{
  "id": "unique-id",
  "type": "text",
  "x": 300,
  "y": 30,
  "text": "Project Timeline",
  "fontSize": 28,
  "fontFamily": 5,
  "strokeColor": "#1f2937"
}
```

- **Title**: fontSize 24-32, centered
- **Labels**: fontSize 12-16
- **Color**: Use grays (#6b7280) for secondary

### 2. Arrow (Timeline Axis)

```json
{
  "id": "axis",
  "type": "arrow",
  "x": 50,
  "y": 200,
  "points": [[0, 0], [700, 0]],
  "strokeColor": "#374151",
  "strokeWidth": 2,
  "startArrowhead": "none",
  "endArrowhead": "arrow"
}
```

- Horizontal line across timeline
- Add end arrow to show direction

### 3. Ellipse (Session Markers)

```json
{
  "id": "session-1",
  "type": "ellipse",
  "x": 80,
  "y": 190,
  "width": 20,
  "height": 20,
  "fill": "#dbeafe",
  "strokeColor": "#1d4ed8",
  "strokeWidth": 2
}
```

- Circle markers at session points
- Colors can indicate phases/themes

### 4. Rectangle (Alternative Markers)

```json
{
  "id": "session-1-box",
  "type": "rectangle",
  "x": 75,
  "y": 185,
  "width": 30,
  "height": 30,
  "fill": "#d1fae5",
  "strokeColor": "#059669",
  "strokeWidth": 2,
  "rx": 4
}
```

- Rounded corners with `rx`, `ry`

## Color Schemes

### Recommended Palette

| Purpose | Fill | Stroke |
|---------|------|--------|
| Title | - | #1f2937 |
| Axis | - | #374151 |
| Phase 1 (Start) | #dbeafe | #1d4ed8 |
| Phase 2 (Middle) | #d1fae5 | #059669 |
| Phase 3 (End) | #fef3c7 | #d97706 |
| Current | #fee2e2 | #dc2626 |
| Labels | - | #6b7280 |
| Dates | - | #9ca3af |

## Layout Calculations

### Session Spacing

```javascript
const canvasWidth = 800;
const padding = 50;
const usableWidth = canvasWidth - (padding * 2);
const spacing = usableWidth / (sessions.length - 1);

// For each session
const x = padding + (i * spacing);
```

### Vertical Positioning

```javascript
const axisY = 200;        // Timeline axis
const labelY = axisY - 30;  // Title above
const dateY = axisY + 30;   // Date below
```

## Generating Unique IDs

```javascript
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}
```

## Example: Complete Timeline (5 Sessions)

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [
    {
      "id": "title",
      "type": "text",
      "x": 250,
      "y": 30,
      "text": "Project Timeline",
      "fontSize": 28,
      "fontFamily": 5,
      "strokeColor": "#1f2937"
    },
    {
      "id": "axis",
      "type": "arrow",
      "x": 50,
      "y": 200,
      "points": [[0, 0], [700, 0]],
      "strokeColor": "#374151",
      "strokeWidth": 2,
      "startArrowhead": "none",
      "endArrowhead": "arrow"
    },
    {
      "id": "s1",
      "type": "ellipse",
      "x": 80,
      "y": 190,
      "width": 20,
      "height": 20,
      "fill": "#dbeafe",
      "strokeColor": "#1d4ed8",
      "strokeWidth": 2
    },
    {
      "id": "s1-label",
      "type": "text",
      "x": 50,
      "y": 160,
      "text": "Setup",
      "fontSize": 14,
      "fontFamily": 5
    },
    {
      "id": "s1-date",
      "type": "text",
      "x": 50,
      "y": 225,
      "text": "Jan 15",
      "fontSize": 12,
      "fontFamily": 5,
      "strokeColor": "#6b7280"
    },
    {
      "id": "s2",
      "type": "ellipse",
      "x": 230,
      "y": 190,
      "width": 20,
      "height": 20,
      "fill": "#d1fae5",
      "strokeColor": "#059669",
      "strokeWidth": 2
    },
    {
      "id": "s2-label",
      "type": "text",
      "x": 200,
      "y": 160,
      "text": "Auth",
      "fontSize": 14,
      "fontFamily": 5
    },
    {
      "id": "s2-date",
      "type": "text",
      "x": 200,
      "y": 225,
      "text": "Jan 16",
      "fontSize": 12,
      "fontFamily": 5,
      "strokeColor": "#6b7280"
    },
    {
      "id": "s3",
      "type": "ellipse",
      "x": 380,
      "y": 190,
      "width": 20,
      "height": 20,
      "fill": "#fef3c7",
      "strokeColor": "#d97706",
      "strokeWidth": 2
    },
    {
      "id": "s3-label",
      "type": "text",
      "x": 350,
      "y": 160,
      "text": "API",
      "fontSize": 14,
      "fontFamily": 5
    },
    {
      "id": "s3-date",
      "type": "text",
      "x": 350,
      "y": 225,
      "text": "Jan 18",
      "fontSize": 12,
      "fontFamily": 5,
      "strokeColor": "#6b7280"
    },
    {
      "id": "s4",
      "type": "ellipse",
      "x": 530,
      "y": 190,
      "width": 20,
      "height": 20,
      "fill": "#d1fae5",
      "strokeColor": "#059669",
      "strokeWidth": 2
    },
    {
      "id": "s4-label",
      "type": "text",
      "x": 500,
      "y": 160,
      "text": "UI",
      "fontSize": 14,
      "fontFamily": 5
    },
    {
      "id": "s4-date",
      "type": "text",
      "x": 500,
      "y": 225,
      "text": "Jan 20",
      "fontSize": 12,
      "fontFamily": 5,
      "strokeColor": "#6b7280"
    },
    {
      "id": "s5",
      "type": "ellipse",
      "x": 680,
      "y": 190,
      "width": 20,
      "height": 20,
      "fill": "#fee2e2",
      "strokeColor": "#dc2626",
      "strokeWidth": 2
    },
    {
      "id": "s5-label",
      "type": "text",
      "x": 650,
      "y": 160,
      "text": "Deploy",
      "fontSize": 14,
      "fontFamily": 5
    },
    {
      "id": "s5-date",
      "type": "text",
      "x": 650,
      "y": 225,
      "text": "Jan 22",
      "fontSize": 12,
      "fontFamily": 5,
      "strokeColor": "#6b7280"
    }
  ],
  "appState": { "viewBackgroundColor": "#f9fafb", "gridSize": 20 },
  "files": {}
}
```

## Validation Checklist

- [ ] All text elements use `fontFamily: 5`
- [ ] Coordinates don't overlap
- [ ] Valid JSON format
- [ ] File saves as `.excalidraw`