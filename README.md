# Chris Laughlin Skills Toolset

Personal agent skillset.

## Available Skills

| Skill | Description | Trigger Keywords |
|-------|-------------|---------------|
| [npm-package-audit](./npm-package-audit/) | Audit npm packages before installation with supply-chain, provenance, maintainer, dependency, CI, code-quality, and vulnerability checks | npm audit, package audit, evaluate package, vet package, inspect package, review package, install npm package |
| [project-timeline-generator](./project-timeline-generator/) | Generate project summaries and Excalidraw timelines from Claude, Codex, OpenCode, or Cursor sessions | project summary, generate timeline, session history, project overview, visualize project sessions |
| [prompt-starter-all-in](./prompt-starter-all-in/) | Comprehensive operating guide for coding and repository tasks | prompt starter, search, autonomy, implementation, planning, frontend, final reporting |
| [record-app-demo-hyperframes](./record-app-demo-hyperframes/) | Turn ordinary instructions for a running web app into a verified browser recording and HyperFrames tutorial MP4; includes scripts, pinned dependencies, examples and tests | HyperFrames app demo, record product walkthrough, verified UI tutorial |
| [record-app-demo-remotion](./record-app-demo-remotion/) | Turn ordinary instructions for a running web app into a verified Remotion tutorial MP4, with iframe targets, fast rehearsal, one-command delivery and review sheets | Remotion app demo, record product walkthrough, verified UI tutorial |
| [record-app-demo-agent-browser-remotion](./record-app-demo-agent-browser-remotion/) | Orchestrate and record a real app with agent-browser, render with Remotion, and pause/resume for human resolution; supports env-file auth and saved state | agent-browser Remotion demo, checkpoint walkthrough, product recording |

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
├── npm-package-audit/
│   ├── SKILL.md
│   └── references/
│       └── audit-rubric.md
├── project-timeline-generator/
│   ├── SKILL.md
│   ├── references/
│   │   ├── session-formats.md
│   │   └── excalidraw-timeline.md
│   └── templates/
│       └── timeline-template.json
├── record-app-demo-hyperframes/
│   ├── SKILL.md
│   ├── scripts/
│   ├── references/
│   ├── examples/
│   └── tests/
├── record-app-demo-remotion/
│   ├── SKILL.md
│   ├── scripts/
│   ├── references/
│   ├── examples/
│   └── tests/
├── record-app-demo-agent-browser-remotion/
│   ├── SKILL.md
│   ├── scripts/
│   ├── references/
│   ├── assets/
│   ├── examples/
│   ├── evals/
│   └── tests/
└── prompt-starter-all-in/
    ├── SKILL.md
    └── agents/
        └── openai.yaml
```

## Application demo skills

Choose the renderer and browser orchestration you want. These skills inspect real controls, record browser interactions, verify the requested results, and render a tutorial from the frozen recording. Each folder is complete and works independently of the other.

- [HyperFrames workflow and installation](./record-app-demo-hyperframes/SKILL.md) · [example video](./record-app-demo-hyperframes/examples/todomvc/results/demo.mp4) · [preview](./record-app-demo-hyperframes/examples/todomvc/results/preview.jpg)
- [Remotion workflow and installation](./record-app-demo-remotion/SKILL.md) · [example video](./record-app-demo-remotion/examples/todomvc/results/demo.mp4) · [preview](./record-app-demo-remotion/examples/todomvc/results/preview.jpg)
- [Agent-browser + Remotion workflow and installation](./record-app-demo-agent-browser-remotion/SKILL.md): native agent-browser capture, credential/env-file authentication, bounded rehearsals, and segmented checkpoint resume. The original Remotion skill remains unchanged.

Example request:

> Use $record-app-demo-hyperframes to make a short tutorial of https://todomvc.com/examples/react/dist/. Add three tasks, rename one, complete one, show Active and Completed, then clear completed tasks. Record the real UI and deliver an MP4 with clear on-screen instructions.

Use `$record-app-demo-remotion` for the equivalent Remotion workflow. Copy the entire selected skill folder into your agent's skills directory, then follow its SKILL.md setup. The original HyperFrames and Remotion variants require Node 22+, FFmpeg/ffprobe and a Playwright Chromium browser. Runtime dependencies and generated project dependencies are pinned in lockfiles or explicit CLI versions.

Use `$record-app-demo-agent-browser-remotion` to operate the application through agent-browser and retain the Remotion presentation. Supply the same URL and ordinary instructions, plus optional credentials or an env-file path. This separate skill requires Node 22.9+, FFmpeg/ffprobe and agent-browser-managed Chrome; its own package pins agent-browser 0.38.1. It prompts on ambiguous UI choices and resumes verified footage in the same session. See its [journey/resume contract](./record-app-demo-agent-browser-remotion/references/journey.md) and [authentication inputs](./record-app-demo-agent-browser-remotion/references/authentication.md).

The included validation covers six operations on the hosted TodoMVC React and Vue examples and a 44-second, 1080p output from each renderer. It also found and blocked an unsupported persistence claim. This is a working browser-demo foundation; authentication, unrelated applications, complex editors and unattended production services require further validation. See each skill's `references/todomvc-validation.md` for the measured comparison and limits.
