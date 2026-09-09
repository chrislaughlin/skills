# Validation and operational limits

Keep the distinction between three checks: the application did the requested work; the composition is visually correct; the encoded video preserves the work. None substitutes for the other two.

A useful acceptance matrix covers action assertions, initial/final state, absence of application runtime errors, video resolution/duration/codec, full decoding, readable instruction text, and cursor/click synchronization. Preserve failed takes and refuse to render a failed journey as a successful tutorial.

For a new application inspect authentication, data setup, irreversible effects, navigation, dynamic controls and output artifacts. Prefer a dedicated demo account and seeded workspace when needed. An agent-assisted skill can author a tailored journey from natural language; the deterministic runner is not an unrestricted natural-language parser or a universal application driver.

Embed the same redistributable font bytes in both backends; a shared system font name does not ensure the same resolved face. The demo uses bundled Inter 400/500 under Demo Sans.

Keep renderer comparisons controlled: same captured asset hash, timeline, geometry, text, FPS, CRF, worker count and machine. Local render wall time includes bundling/setup unless explicitly excluded. One run is an observation, not a benchmark; caches, GPU path, codecs and hardware affect results. Review rendered files, not only Studio screenshots. Keep application capture time separate from renderer time.

The current implementation captures one browser page. Source video cadence, CSS pixel density and export dimensions influence sharpness. Browser/profile reproducibility is narrower than bit-identical re-capture: network timing and app state can vary. Re-rendering an already frozen capture is the stronger reproducibility boundary. Authentication, narration, redaction, aspect variants, hosting, parallel jobs and artifact retention policies need specific validation before being advertised as supported production services.
