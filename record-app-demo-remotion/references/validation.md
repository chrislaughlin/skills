# Validation and operational limits

Keep the distinction between three checks: the application did the requested work; the composition is visually correct; the encoded video preserves the work. None substitutes for the other two.

A useful acceptance matrix covers action assertions, initial/final state, absence of application runtime errors, video resolution/duration/codec, full decoding, readable instruction text, and cursor/click synchronization. Preserve failed takes and refuse to render a failed journey as a successful tutorial.

For a new application inspect authentication, data setup, irreversible effects, navigation, frames, sticky overlays, dynamic controls and output artifacts. Prefer a dedicated demo account and seeded workspace when needed. An agent-assisted skill can author a tailored journey from natural language; the deterministic runner is not an unrestricted natural-language parser or a universal application driver.

Rehearsal is an execution-speed tool, not an isolation boundary. Enable it only when repeating the whole journey is safe. It should catch ambiguous locators, failed assertions, unsafe target framing and unrelated runtime-error noise before the timed recording. A failed rehearsal is evidence; fix it instead of starting a full take. Do not iterate through repeated rehearsals: collect every finding from one failed rehearsal into a single journey edit, then re-run once.

Treat every run that drives the application as expensive: probes, rehearsals and takes all execute real actions, so a "quick check" that drives the app costs the same goodwill as a rehearsal. Batch checks into the single inspection pass instead of looping. When the browser belongs to the human (an attached session, their profile), announce before driving it, keep focus changes minimal, restore their active tab when done, close tabs you created, and never retry in a loop without asking. After two consecutive failed runs of any kind, stop and report.

Page errors remain failures unless a journey lists a narrow, verified substring in `ignoredPageErrorPatterns`. The report preserves ignored errors separately. A successful widget flow can coexist with an unrelated map or analytics error, but that conclusion needs direct evidence from the requested state assertions.

Embed the same redistributable font bytes in both backends; a shared system font name does not ensure the same resolved face. The demo uses bundled Inter 400/500 under Demo Sans.

Keep renderer comparisons controlled: same captured asset hash, timeline, geometry, text, FPS, CRF, worker count and machine. Local render wall time includes bundling/setup unless explicitly excluded. One run is an observation, not a benchmark; caches, GPU path, codecs and hardware affect results. Review rendered files, not only Studio screenshots. Keep application capture time separate from renderer time.

The current implementation captures one browser page. Source video cadence, CSS pixel density and export dimensions influence sharpness. Browser/profile reproducibility is narrower than bit-identical re-capture: network timing and app state can vary. Re-rendering an already frozen capture is the stronger reproducibility boundary. Authentication, narration, redaction, aspect variants, hosting, parallel jobs and artifact retention policies need specific validation before being advertised as supported production services.
