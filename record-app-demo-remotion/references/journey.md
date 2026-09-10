# Journey runner contract

`version: 1`, `title`, `url`, `allowedOrigins`, `viewport`, `ready`, `initialAssertions`, `introSeconds`, `outroSeconds`, `chapters`, optional `presentation`, `rehearsalSafe`, and `ignoredPageErrorPatterns`.

A chapter needs `label`, `title`, `instruction`, `minSeconds`, `actions`, `assertions`. `minSeconds` is a readability floor, not a fixed deadline; actual action duration and observed timestamps determine the video.

Actions: `type` (clear and type text visibly), `press` (key), `click`, `dblclick`, `hover`, `select` (value), `reload`. Actions other than reload need a `target`. A target supports `css`, `role` plus `name`, `placeholder`, `testId`, or `exactText`; optional `text` filter, `child` CSS scope and `nth` index. Action locators must match exactly one element.

Use `frameCss` on a target when its control is inside an iframe. The selector identifies the iframe in the current page; the remaining locator fields resolve inside it. Nested frames can use a CSS chain supported by the page's frame layout only when it resolves through one `frameLocator`; applications with unusual frame orchestration may still need an adapter.

Use target `safeArea` margins such as `{"top": 96, "bottom": 32}` when fixed UI can cover a control. The runner scrolls the target toward the usable viewport and fails if it cannot frame it there. Apply this to the actions whose visibility matters rather than globally.

An assertion includes a target and exactly one of `count`, exact `text`, exact `value`, `checked`, `visible`. Assertions retry up to seven seconds and log expected versus observed values. Chapter completion is not inferred from a successful click.

`rehearsalSafe: true` permits `--rehearse`. Rehearsal uses the same live page, actions and assertions but skips video recording, pointer animation, typing cadence and editorial holds. It is a fast authoring check, not a dry run: do not set it when replaying any action could create or change external state.

`ignoredPageErrorPatterns` is an optional list of specific substrings for known page errors already shown to be unrelated to the demonstrated workflow. Matching errors remain in `ignoredPageErrors`; all other page errors fail the journey. Do not use broad patterns to conceal application failures.

`presentation`: optional `introTitle`, `introInstruction`, `outroTitle`, `outroInstruction`, `footer`. These are editorial copy, never expected application results. The current visual template accommodates up to six or seven concise instruction chapters; inspect layouts for longer text or more chapters.

Each capture directory is created exclusively and includes the resolved journey, original source spec, raw browser video, a synchronized H.264 recording, initial and chapter screenshots, and report.json. The report records real action times, pointer positions, assertions, errors and source offsets. Failed captures contain evidence but no deliverable-ready recording.

The raw recording begins before navigation. A brief magenta synchronization slate is added after the app is ready and removed before the demo. The exporter detects its last frame in the actual recording, trims the setup, and aligns editorial cues to that point. Timing is limited by browser-video cadence and scheduling; inspect click boundaries. App UI state is changed only through real actions. The custom pointer is an editorial overlay, not a claim that a pointer is baked into the source recording.
