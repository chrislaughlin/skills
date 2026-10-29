---
name: release-notes-video
description: Generate animated showcase videos for software release notes from a description. Creates HyperFrames HTML compositions that mock relevant UIs (terminal, Slack, GitHub CI, dashboards, etc.) from scratch based on the feature description, then renders a local MP4. Use for changelog items, feature announcements, or release note videos without pre-canned scenes or paid video services.
---

# Release Notes Video Generator

Turn a release note item (title + description) into a short, polished animated video that showcases the feature by generating UI mocks and motion from scratch.

This skill uses **HyperFrames** (HTML → deterministic MP4) so agents can write ordinary web code. It works with Claude Code, Codex, Cursor, and other agents that support skills. Everything renders locally (Node 22+ + FFmpeg). No third-party paid video APIs.

## When to use

- User provides one or more release note items and asks for a video / animated showcase / changelog animation.
- Need to demonstrate a feature described in text without recording a real app.
- Want cross-harness compatibility and full ownership of the generated composition.

## Workflow

1. **Parse the request**
   - Extract title, description, optional brand colors, duration preference, aspect ratio (default 16:9, 1080p, 15–30s).
   - Infer the best UI metaphor from the description (CLI/terminal, Slack message, GitHub PR/CI, dashboard card, settings panel, etc.).

2. **Plan the storyboard**
   - Short beats: title card → feature in action (mocked UI) → key benefit highlight → optional CTA.
   - Keep total length 12–45 seconds unless requested otherwise.

3. **Generate the composition from scratch**
   - Create a HyperFrames project (or single `index.html` composition).
   - Write HTML + CSS + seekable animation (prefer CSS keyframes or GSAP) that simulates the relevant interface.
   - Examples of mocks:
     - Terminal: dark window, typed commands, output that appears.
     - Slack: message thread with avatar, reaction, or new feature indicator.
     - GitHub: PR title, checks status, or CI pipeline animation.
     - Dashboard: metric card that updates or a new panel that slides in.
   - Use realistic but fictional data. Do not claim the video is a real recording.

4. **Render locally**
   - Ensure Node 22+ and FFmpeg are available.
   - `npx hyperframes init` (or use an existing project) then `npx hyperframes render --output release-notes.mp4`.
   - Prefer a pinned HyperFrames version when possible for reproducibility.

5. **Deliver**
   - Return the MP4 path and the source HTML/project so the user can iterate.
   - Mention any assumptions (aspect, length, visual style).

## Requirements

- Node.js 22+
- FFmpeg on PATH
- HyperFrames CLI (`npx hyperframes ...`)

## Design guidelines

- Dark, modern developer aesthetic by default (easy to override with brand colors).
- High contrast text, clear hierarchy.
- Smooth, purposeful motion (ease-out entrances, short holds).
- One clear idea per video; avoid clutter.

## Examples

See the `examples/` directory for complete HyperFrames compositions generated from fake release notes:

- **CLI feature** — `examples/cli-feature/` — terminal mock showing a new command.
- **Slack integration** — `examples/slack-integration/` — Slack message mock for a new notification.
- **CI improvement** — `examples/ci-improvement/` — GitHub checks / pipeline status mock.

Each example contains an `index.html` that can be previewed or rendered with HyperFrames.

## Notes

- This skill generates animations from the description; it does not record a live application. For live app walkthroughs use the existing `record-app-demo-hyperframes` skill.
- If HyperFrames skills are already installed, lean on them for composition rules and the render loop.
- Keep compositions self-contained (no external network assets) for reliable local renders.
