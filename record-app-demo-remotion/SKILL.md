---
name: record-app-demo-remotion
description: Turn instructions for a running browser application into a verified UI recording and tutorial MP4 using Remotion. Use when Remotion is the requested renderer for an application walkthrough.
---

# Record an application demo with Remotion

The human supplies an application URL and workflow instructions in ordinary language. Inspect the real app, translate the request into actions and expected outcomes, record the interaction, verify it, and deliver a guided MP4. The human does not need to write selectors or JSON.

Browser automation operates the app; Remotion presents the frozen recording. Never substitute a recreated interface or pretend that a screenshot sequence is a live recording.

## Execute the request

1. Preserve the human's instructions alongside the journey. Infer reasonable video defaults; ask only about missing information that changes the task. Inspect the running application's actual controls before choosing locators. Discover dependent controls by revealing them. Prefer roles, labels and test IDs; scope CSS when needed.
2. Write the journey using [the runner contract](references/journey.md). Every chapter needs real actions, concise tutorial copy and an observable expected result. Use fresh local state or authorized demo data. A fresh browser profile does not isolate server-side writes.
3. Run the capture into a **new** take directory. Inspect any failed report and screenshot before retrying. Do not replay an externally visible or destructive action blindly after an uncertain result. Report unsupported application behavior instead of fabricating success. Keep failed takes as evidence.
4. Compose only a passed take. The template uses a persistent UI window, instructional cards, measured pointer events and a progress rail. Browser aspects are fitted without stretching; full portrait/square delivery needs a template adaptation. Supply product-specific `presentation` copy; the default red/white template is a starting point, not automatic branding inference.
5. Preview and inspect real video frames, text fit, pointer timing and expected app states. Render locally and verify the encoded video. A request to generate and deliver a video authorizes its necessary local render; account mutations and external publishing remain within the user's specific scope.
6. Deliver the MP4, contact sheet, and verification report. Name what succeeded and any material limitation. Do not infer application success from the renderer finishing.

## Complete package

This directory is independently installable. It contains pinned dependencies, capture/composition/verification scripts, a real TodoMVC capture, the example journey, a delivered sample video and regression tests. Copy the **whole directory**, not just SKILL.md. Node 22+ and FFmpeg/ffprobe are required.

Set `SKILL` to this directory's absolute path and `WORK` to a writable project directory. From the skill directory install and verify the package:

```sh
npm ci
PLAYWRIGHT_SKIP_BROWSER_GC=1 npx playwright install chromium
npm test
```

For a fresh live capture (choose a new take path each time):

```sh
node "$SKILL/scripts/capture.mjs" "$SKILL/examples/todomvc/journey.json" "$WORK/take"
node "$SKILL/scripts/compose.mjs" "$WORK/take" "$WORK/tutorial"
```

To reproduce the packaged example without interacting with the site again:

```sh
node "$SKILL/scripts/compose.mjs" "$SKILL/examples/todomvc/capture" "$WORK/tutorial"
```

The composer creates a complete native Remotion project with its own package manifest and lockfile. It internally prepares the shared static design, then emits React frame logic and `OffthreadVideo`; no HyperFrames engine or installed HyperFrames skill is needed.

From the generated project:

```sh
npm ci
npx remotion still src/index.tsx TodoDemo renders/proof.png --frame 540
npm run studio
npm run render
```

The proof frame above matches the bundled take. For new recordings sample the actual chapter midpoints, first/last frames and click boundaries from `delivery.json` and `capture-report.json`. Studio is an optional interactive preview; stop it or use a separate terminal before rendering. Remotion is pinned to 4.0.523 in the project template.

After rendering, read `duration` from the generated `delivery.json` and verify the export; the bundled take is 44 seconds:

```sh
node "$SKILL/scripts/verify.mjs" "$WORK/tutorial/renders/video.mp4" 44
```

The verifier fully decodes the video, checks duration/frame count/codec/dimensions, hashes the file, and writes a JSON result and `contact-sheet.jpg`. It does not replace visual review. New aspect/FPS profiles require corresponding verifier changes.

## New applications and limits

For another app, inspect and author new locators, assertions and copy; replacing only the URL is insufficient. Read [validation and operational limits](references/validation.md) and [the measured TodoMVC results](references/todomvc-validation.md) when assessing suitability.

Optional authentication state loads from `DEMO_STORAGE_STATE`, a local Playwright storage-state file. Keep it outside the skill, journey and deliverables; log in before recording. Authentication support was not exercised in the original validation.

The current runner captures one browser page and supports typing, key presses, clicking, double-clicking, hover, selection and reload. Frames, canvas editors, drag gestures, native dialogs and multi-window flows need an adapter extension. Source footage is 25 fps; a 30 fps export does not add source detail. The supplied example proves six operations on two TodoMVC implementations, not arbitrary-app reliability or an unattended production service.
