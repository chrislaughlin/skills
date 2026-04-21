# Chris Laughlin Skills Toolset

Personal agent skillset.

## Available Skills

| Skill | Description | Trigger Keywords |
|-------|-------------|---------------|
| [project-timeline-generator](./project-timeline-generator/) | Generate project summaries and Excalidraw timelines from Claude, Codex, OpenCode, or Cursor sessions | project summary, generate timeline, session history, project overview, visualize project sessions |

## Usage

Skills are automatically loaded when triggered by matching keywords. Each skill includes:
- Main SKILL.md with workflow instructions
- Bundled references for detailed specs
- Templates for common outputs

## Quick Start

To generate a project timeline:
1. Ask: "Generate a project timeline" or similar trigger
2. The skill will scan for available sessions
3. Select which sessions to include
4. Receive: project-summary.md + project-timeline.excalidraw

## Project Structure

```
skills/
├── README.md
└── project-timeline-generator/
    ├── SKILL.md
    ├── references/
    │   ├── session-formats.md
    │   └── excalidraw-timeline.md
    └── templates/
        └── timeline-template.json
```
