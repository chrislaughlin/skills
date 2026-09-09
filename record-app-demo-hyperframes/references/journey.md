# Journey runner contract

`version: 1`, `title`, `url`, `allowedOrigins`, `viewport`, `ready`, `initialAssertions`, `introSeconds`, `outroSeconds`, `chapters`, optional `presentation`.

A chapter needs `label`, `title`, `instruction`, `minSeconds`, `actions`, `assertions`. `minSeconds` is a readability floor, not a fixed deadline; actual action duration and observed timestamps determine the video.

Actions: `type` (clear and type text visibly), `press` (key), `click`, `dblclick`, `hover`, `select` (value), `reload`. Actions other than reload need a `target`. A target supports `css`, `role` plus `name`, `placeholder`, `testId`, or `exactText`; optional `text` filter, `child` CSS scope and `nth` index. Action locators must match exactly one element. Frames, canvas coordinates, drag gestures and native dialogs need a dedicated extension or another recording adapter.

An assertion includes a target and exactly one of `count`, exact `text`, exact `value`, `checked`, `visible`. Assertions retry up to seven seconds and log expected versus observed values. Chapter completion is not inferred from a successful click.

`presentation`: optional `introTitle`, `introInstruction`, `outroTitle`, `outroInstruction`, `footer`. These are editorial copy, never expected application results. The current visual template accommodates up to six or seven concise instruction chapters; inspect layouts for longer text or more chapters.

Each capture directory is created exclusively and includes the resolved journey, original source spec, raw browser video, a synchronized H.264 recording, initial and chapter screenshots, and report.json. The report records real action times, pointer positions, assertions, errors and source offsets. Failed captures contain evidence but no deliverable-ready recording.

The raw recording begins before navigation. A brief magenta synchronization slate is added after the app is ready and removed before the demo. The exporter detects its last frame in the actual recording, trims the setup, and aligns editorial cues to that point. Timing is limited by browser-video cadence and scheduling; inspect click boundaries. App UI state is changed only through real actions. The custom pointer is an editorial overlay, not a claim that a pointer is baked into the source recording.
