---
name: record-app-demo-agent-browser-remotion
description: Turn ordinary instructions for a running web application into a real product demo recorded with agent-browser and rendered with Remotion. Use for application walkthroughs, product recordings or tutorial MP4s when agent-browser should orchestrate the UI and Remotion should produce the video. Accept an app URL, human-readable steps and optional credentials or an env file. Ask the human when controls or routes are ambiguous; preserve the session and resume from a checkpoint.
compatibility: Node 22.9+, npm, FFmpeg/ffprobe and agent-browser-managed Chrome; all JavaScript dependencies are pinned in the bundled lockfiles.
---

# Record an application demo with agent-browser and Remotion

Translate the human's URL and ordinary instructions into a prepared journey. Operate the real application exclusively through agent-browser commands. Capture live footage with agent-browser's native cursor; use Remotion for the instruction cards, progress rail and final MP4. A screenshot sequence or recreated interface is not a product recording.

This is a separate, independently installable skill. The original `record-app-demo-remotion` remains available. Copy the whole folder when installing, including scripts, references and assets.

## Workflow

1. Preserve a redacted copy of the original instructions. Identify the requested workflow, starting state and observable results. Use the defaults below unless the human requests otherwise. Read [the journey contract](references/journey.md) before authoring a journey; the human never needs to provide selectors or JSON.
2. Use the bundled agent-browser binary in a dedicated named session. Inspect the real app in **one inspection pass**, revealing dependent controls in workflow order. A fresh snapshot after a UI change is part of that pass, not a reason to restart the workflow. Prefer exact role/name, labels and test IDs; scope CSS for repeated text. Do not guess a control, use an unexplained `nth`, or choose between plausible routes. Ask the human as soon as the choice is unclear, showing the observed candidates and screenshot. Do not use `agent-browser chat` or another browser driver as a fallback.
3. Authenticate before recording. Credentials may come from the human's instructions, a supplied env file, or a saved state file. Keep them out of the journey and output artifacts. Read [authentication](references/authentication.md) for stdin input, env mapping and MFA handling. Inspect authentication and the application in the same session; do not drive the human's own browser or attach to their profile by default.
4. Author concise chapters with real actions and expected outcomes. Add action-level assertions around submissions where an uncertain result could cause duplicated writes. Check every target in the state where it will be used, including iframe and sticky-overlay behavior. Limit the existing presentation to seven readable chapters; split a longer workflow into separate demos with the human's agreement.
5. When the complete workflow is safe to repeat **and** its starting state can be restored, set `rehearsalSafe: true`, restore that state, and run one rehearsal. A rehearsal executes real actions; a fresh profile does not undo server-side writes. Permit one corrective rehearsal only after a concrete fix and changed journey, with `--correction`. Reuse the same budget file for the whole request. Never reset it, change the workspace to evade it, or rehearse an unchanged journey again. Missing/ambiguous controls and uncertain actions require human input immediately, even on the first rehearsal. If replay is unsafe, skip rehearsal and record the inspected flow once.
6. Capture into a new take directory. The runner checks targets and outcomes, measures events, captures native footage, and preserves checkpoints. Exit **2** means `needs-human`: read `intervention.json`, explain the pending step, show the screenshot if present, and ask for a concrete resolution. Stop here until the actual human replies. Do not invent a human decision or automatically retry. Exit **1** means a technical failure: inspect the report and preserve evidence; fix capture/encoding problems offline where possible instead of repeating full takes.
7. After a human reply, write a resolution using [resume rules](references/journey.md#human-resolution-and-resume). Verify current state, then resume the same live tab. Recording stops during the wait and continues as another synchronized segment. Never replay an uncertain action without the human explicitly confirming it was not applied. Never claim that an action performed manually while recording was stopped appears in the footage. If the session or app state cannot be recovered, explain why a fresh take is required and establish a safe reset before replay.
8. Deliver only a passed capture. Use the delivery command to assemble a native Remotion project, render the MP4, decode it fully and create chapter/click review sheets. Inspect first/last frames, chapter states, text fit, native cursor timing and segment joins. Rendering success alone does not establish application success. Deliver the MP4, editable project, both sheets and verification report, with any material limitation.

## Setup and commands

Set `SKILL` to this skill folder and `WORK` to a writable directory for this request. Run installation from the skill folder once after dependencies change:

```sh
npm ci
./node_modules/.bin/agent-browser install
npm test
```

The pinned version is agent-browser **0.38.1**; Remotion is **4.0.523**. Remotion manages its own rendering browser. Node and FFmpeg are system prerequisites. Browsing still uses Chrome underneath agent-browser; the skill replaces direct Playwright orchestration, not the browser engine.

Use the bundled binary for inspection so its version and session match capture:

```sh
"$SKILL/node_modules/.bin/agent-browser" --config "$SKILL/assets/agent-browser.json" --session demo-launch open https://app.example.com
"$SKILL/node_modules/.bin/agent-browser" --config "$SKILL/assets/agent-browser.json" --session demo-launch snapshot -i
```

Rehearsal, only after restoring safe starting state:

```sh
node "$SKILL/scripts/capture.mjs" "$WORK/journey.json" "$WORK/rehearsal-01" \
  --session demo-rehearsal --rehearse --starting-state-restored \
  --budget-file "$WORK/rehearsal-budget.json"
```

If a correctable technical finding requires a second rehearsal, edit the journey, restore state, use a new rehearsal directory, and add `--correction "Describe the actual fix"`. Ask the human for unresolved UI choices. Do not run a third rehearsal.

Capture and resume:

```sh
node "$SKILL/scripts/capture.mjs" "$WORK/journey.json" "$WORK/take-01" \
  --session demo-launch --instructions "$WORK/instructions.md" \
  --env-file "$WORK/private.env"

node "$SKILL/scripts/capture.mjs" --resume "$WORK/take-01" \
  --resolution "$WORK/human-resolution.json"
```

Omit `--env-file` when no credentials are needed. Start inspection and capture with `--headed` when the human may need to interact with a login challenge; resume preserves that setting. The runner uses the bundled config and ignores inherited agent-browser profile/auto-connect variables so it operates its dedicated browser. For a session authenticated during inspection, omit auth inputs and start the journey at its authenticated app URL. The runner navigates to the journey URL before capture; do not depend on unsaved transient UI from inspection.

Render and verify:

```sh
node "$SKILL/scripts/deliver.mjs" "$WORK/take-01" "$WORK/tutorial"
```

Outputs include `renders/video.mp4`, `renders/contact-sheet.jpg`, `renders/click-boundaries.jpg`, and `renders/video.mp4.verification.json`. Re-render the frozen project without operating the app again:

```sh
npm run studio
npm run render
```

## Defaults and boundaries

- Silent 1920×1080 H.264 MP4 at 30 fps; browser viewport defaults to 880×660 in an authored journey. Existing split layout, embedded Inter, instruction cards and progress rail. The cursor is in the native footage; Remotion does not add another.
- One app tab, a single iframe context (same-origin scoped CSS; cross-origin CSS needs an extension), typing, key presses, clicking, double-clicking, hovering, dropdown selection and reload. Native dialogs, nested/shadow frames, drag gestures, uploads and multi-tab recordings need an extension or human resolution.
- Every segment uses a decoded synchronization slate. The footage, not an assumed command duration, establishes the media boundary. Human waiting time is absent from the final timeline. Application errors remain evidence and must be resolved or narrowly justified by an explicit ignored-error pattern.
- Resume requires the original live tab, explicit human resolution and passing current-state assertions. Do not bypass delivery checks or fabricate a `passed` report.
- Credentials/auth state belong outside the skill and deliverables. Use demo data without personal information visible in the app; the runner redacts textual evidence but cannot remove arbitrary sensitive information rendered by the application in video.

Read [validation](references/validation.md) for the runnable isolated tests and measured limitations. This skill does not add narration, new layouts, automated MFA, expanded gestures or unattended production-service guarantees.
