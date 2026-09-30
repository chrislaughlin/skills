# Measured validation

Validated locally on macOS using Node 24.20.0, agent-browser 0.38.1, native Chrome capture, FFmpeg and Remotion 4.0.523. These are observations from isolated fixtures and the hosted React TodoMVC app, not an arbitrary-app reliability benchmark.

| Scenario | App checks | Footage segments | Intervention | Rendered duration |
| --- | ---: | ---: | --- | ---: |
| TodoMVC: add, rename, complete, Active, Completed, clear | 10 passed assertions | 1 | None | 23.966667 s |
| Local form authentication and project save | 1 passed workflow assertion; saved-state reuse verified | 1 | None | 5.200000 s |
| Ambiguous workspace button, explicit Team resolution, resume | 1 passed outcome assertion | 2 | One simulated human answer | 5.233333 s |

All three rendered MP4s fully decoded and passed H.264, 1920×1080, 30 fps, frame-count and duration checks. Chapter/click sheets were generated and inspected. The authenticated video starts in the app, with no login footage. The resumed video contains the verified segments and excludes an intentionally inserted three-second wait for resolution. The generated Remotion body has no second cursor/pulse overlay.

The native TodoMVC capture and delivered video are bundled under `examples/todomvc/`. This shortened validation uses one-second intro/outro and three-second chapter floors; the editable example journey retains longer default holds.

All 17 focused/live regression tests passed. The regression tests cover contract rejection, secret redaction, private state paths, disk-persisted rehearsal limits, explicit uncertain-action decisions, failed-delivery gating, slate detection, fresh snapshots, stdin credential transport, CLI parsing, portable composition and native pointer presentation. `DEMO_BROWSER_TESTS=1 npm test` additionally exercises typing/focus, dropdowns, hover, same-origin iframe actions/assertions and reload through the actual runner.

Two compatibility details were found and encoded in the new skill:

- TodoMVC draws a visible circle behind an opacity-zero checkbox. Native visibility checks reject that checkbox; the example targets the visible label with an inspected click offset and verifies the resulting completion state.
- agent-browser 0.38.1 accepts integer mouse coordinates, and its `eval`/`get count` commands do not honor selected-frame context consistently. Main-page geometry is rounded; same-origin frame CSS is inspected read-only through `contentDocument`. Cross-origin scoped CSS requires an extension or a semantic role/name target and is not part of the validated matrix.

The skill-creator static viewer contains all three videos, review sheets and grading records. The human-resolution file in the fixture is test input, not evidence of actual human approval. MFA, CAPTCHA, cross-origin CSS, nested frames, shadow DOM, gestures, uploads, multiple windows and new layouts remain outside the validated capabilities.
