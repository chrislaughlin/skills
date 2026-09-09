# TodoMVC validation

Tested 10 September 2026 against the public hosted [React](https://todomvc.com/examples/react/dist/) and [Vue](https://todomvc.com/examples/vue/dist/) examples.

Both captures passed 14 UI actions and 10 assertions: add three tasks, rename one, complete one, filter Active, filter Completed, return to All and clear completed. The same locators worked on both implementations because they share TodoMVC's DOM contract. The packaged source recording is the React take.

An exploratory reload/persistence step failed in both hosted builds. A separate check found one task before reload and zero afterward. The supported journey therefore excludes persistence. Do not infer that every TodoMVC implementation behaves this way.

The delivered examples for both renderers use the same captured MP4, static design, instructional times and embedded Inter 400/500 font bytes. Both fully decoded as 44-second, 1920×1080, 30 fps H.264/yuv420p video with 1,320 frames. The source UI recording is 880×660 at 25 fps, fitted into a 1120×840 window. A double-size recording probe added padding rather than source detail and was rejected.

| Renderer | Version | Final local render | Final file size |
|---|---|---:|---:|
| HyperFrames | 0.8.33 | 44.44 seconds | 1,457,166 bytes |
| Remotion | 4.0.523 | 34.98 seconds | 1,035,328 bytes |

Sequential renders on Apple M5 / 32 GB RAM, warm caches, H.264 CRF 18 and two workers. Timing includes CLI setup, compilation/bundling and encoding, excludes capture and dependency installation. Encoder/browser defaults differ; this is an observation, not a universal speed benchmark. System-font resolution initially differed; embedding the same font files corrected font choice, while minor rasterization/color differences can remain.

HyperFrames strict checks passed with zero warnings and 105 contrast checks. The original framework passed six regression tests. Each published skill adds an independent-directory composition test and ships its own dependencies. See `tests/contract.test.mjs` for the current package checks.

This package's original example output: [demo MP4](../examples/todomvc/results/demo.mp4) and [preview sheet](../examples/todomvc/results/preview.jpg). The source [capture report](../examples/todomvc/capture/report.json) retains assertion/action evidence; machine-local raw-file paths and incidental failed analytics requests were omitted for distribution. The generated template uses a generic introduction label, so regenerating is not promised to be byte-identical to the original example video.

Authoring uses the capture result as the publication boundary: a failed take is rejected before creating a tutorial. Authentication, unrelated apps, higher-resolution capture, narration, cloud jobs and unattended retries need further validation.
