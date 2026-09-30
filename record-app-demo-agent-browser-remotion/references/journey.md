# Journey, capture and resume contract

## Prepared journey

Use `version: 1`, `title`, `url`, exact `allowedOrigins`, `viewport`, `ready`, optional `initialAssertions`, `introSeconds`, `outroSeconds`, `presentation`, `rehearsalSafe`, `ignoredPageErrorPatterns`, and one to seven `chapters`.

Each chapter needs `label`, `title`, `instruction`, `minSeconds` (1–60), `actions` and at least one observable `assertion`. Minimum duration is a readability floor; actual measured operation times may extend it.

Actions: `type` (clear then type `text`), `press` (`key`), `click`, `dblclick`, `hover`, `select` (`value`), `reload`. Actions except reload require a target. Optional action `assertions` verify individual submissions before proceeding. A main-page `click` may use `clickOffset: {"x":20,"y":28}` relative to its visible target when inspection establishes the intended visual hotspot, such as TodoMVC’s circle drawn behind a transparent checkbox. The offset must stay inside the visible target. This uses real mouse commands and never makes hidden controls generally actionable.

A target has exactly one of `css`, `role` with exact `name`, `label`, `placeholder`, `testId`, or `exactText`. Add `text` to filter a CSS result and `child` to select its descendants. `nth` is a zero-based index only when the human's instruction or observed context establishes that ordinal. All action targets must resolve uniquely and be visible and enabled. Do not persist `@e1` references: the runner takes a fresh snapshot for semantic targets each time, including after scroll/pointer movement. CSS queries are read-only and yield a fresh native CSS path.

`frameCss` identifies one iframe in the main page. Scoped CSS/label/text queries are validated for same-origin frames; cross-origin frames need an exact role/name target or an adapter extension because the native eval/count APIs retain the main-document context. `safeArea` may specify nonnegative `top/right/bottom/left` margins on main-page controls. If ordinary scroll-into-view does not frame the control inside that area, stop for a framing adjustment. Iframe safe-area combinations, nested frames and shadow DOM are not advertised as supported.

Assertions specify `target` and exactly one of `count`, exact `text`, exact `value`, `checked`, `visible`. An absent target can satisfy count zero or visible false. Other expectations require a unique target. State waits are bounded to seven seconds and do not trigger alternative-route searches. Prefer structural checks for dynamic defaults and exact values for data the journey set.

`presentation` supplies optional `introTitle`, `introInstruction`, `outroTitle`, `outroInstruction`, `footer`. Copy is editorial, never evidence of application success. Copy must fit the existing template.

`auth` may contain `loginUrl`, `usernameTarget`, `passwordTarget`, `submitTarget` only. Supply actual credentials separately; see authentication.md.

## Persistent outputs

Capture creates a new directory exclusively. It contains redacted `source-spec.json` with original instructions, the prepared `journey.json`, screenshots, raw footage, synchronized segments, `segments.json`, `checkpoint.json`, `report.json` and a passed `recording.mp4`. Files are updated atomically; the run lock prevents simultaneous operations on the same take. Do not remove an interrupted lock until confirming its PID is no longer running and inspecting the checkpoint. An interrupted `running` take cannot be treated as resumable verified footage.

Report version 2 retains the composer-facing chapters, assertions, pointer/click events and viewport. It adds named `session`, `mode`, segment metadata and intervention history. Segment entries contain raw/file paths, index, timeline start, decoded source offset, duration, source FPS, synchronization and verification status. Raw footage contains the setup slate; synchronized assets remove it. Joining verified segments creates a continuous, muted 30 fps recording consumed by Remotion.

Checkpoint entries retain the original CDP tab identity, journey hash, chapter/action index, pending operation, authentication readiness and human-supplied target overrides. An action is marked uncertain on disk before it is issued. A process interruption cannot make that operation silently replayable.

The workspace-level `rehearsal-budget.json` persists at most two reservations. A second run requires a changed journey, recorded correction and a technical failure from the first; UI ambiguity and uncertain effects require human resolution. A running/interrupted reservation is not reusable automatically. Reuse this file for the entire request even when journey filenames or take names change.

## Human resolution and resume

Exit codes: `0` passed, `2` needs human, `1` technical failure. A paused run preserves its named browser session and stops capture. Read `intervention.json`; show its screenshot, current state, pending step and choices. Authentication pauses intentionally omit login screenshots/snapshots.

Write the resolution **only after the human answers**. This example resolves two matching buttons before either has been clicked:

```json
{
  "decision": "retry",
  "instruction": "Use the Team workspace button.",
  "target": {"css": "#team button"},
  "assertions": [
    {"target": {"css": "#result"}, "text": "No workspace selected"}
  ]
}
```

`instruction` records the actual human decision. `assertions` must describe the compatible current state, not just the presence of an unrelated heading. `target` may correct the pending action target; the persisted journey remains unchanged. Target overrides are stored in the checkpoint and intervention audit trail.

Decisions:

- `retry`: resolve a pre-action failure. For an issued/uncertain action, also require `outcome: "not-applied"` explicitly confirmed by the human, with assertions proving that state.
- `confirm-completed`: accept an uncertain action already issued in captured footage after the human confirms its outcome and corresponding assertions pass. This cannot certify a new manual action performed while capture was stopped.
- `continue`: resolve an authentication, readiness, chapter-assertion or final-check pause. It cannot skip a pending action.

Resume rejects a changed journey, replaced browser tab, incompatible asserted state, missing resolution or invalid decision. It continues from the pending action or verification boundary without replaying completed actions. Failed assertions remain in `resolvedAssertions` after explicit resolution; current verified outcomes alone govern delivery. Failed footage and intervention history are retained.

If the original session has closed, or a person completed an unrecorded action, establish whether a fresh reset/re-record is safe. Do not fabricate a successful resumed recording. Technical encoding/synchronization failures block delivery until repaired and reverified offline.
