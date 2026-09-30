# Validation and limitations

Application outcomes, visual composition and encoded media are separate checks. Passed assertions establish requested state; decoded video establishes encoding; a person reviewing chapter/click sheets establishes readable copy and sensible pointer timing. Do not substitute one for another.

Run `npm test` for focused regression tests. Use `DEMO_BROWSER_TESTS=1 npm test` to include the live control/iframe smoke test. Run `npm run test:integration -- /absolute/new-validation-directory` for three live scenarios: TodoMVC, a local authenticated fixture, and an ambiguous workspace control resolved through a simulated human reply. The integration runner creates MP4s, editable projects and review sheets. It exercises native browser commands; it does not benchmark natural-language triggering or claim that a simulated answer is real user authorization.

The hosted TodoMVC scenario requires internet access. Fixtures use an ephemeral localhost port, test-only credentials and isolated named sessions. Env files/state remain outside review outputs. New validation directories preserve prior failures and respect per-request rehearsal budgets. The skill's own runnable example uses the hosted React TodoMVC app and six operations.

Use skill-creator's `eval-viewer/generate_review.py` on the resulting workspace to present the outputs for human feedback. Baseline benchmarking and description optimization are outside this version's scope. Record the actual results before advertising successful validation; see measured-validation.md when provided.

Native recording is 30 fps and captures one active tab with an in-page cursor overlay. Remotion consumes synchronized frozen media and adds no second pointer. Source slate alignment tolerates up to 0.2 seconds of capture scheduling discrepancy; inspect click boundaries and resumed joins. Re-rendering frozen assets is more reproducible than running the app again.

Authentication tests cover simple form login, an env file and saved state. MFA/CAPTCHA require human action. Iframe targets are supported through a single frame context; safe-area framing inside an iframe, nested frames, shadow DOM, dialogs, canvas editors, drag-and-drop, uploads and multi-window recording are not validated capabilities.

Rehearsals perform real app operations and are safe only with restorable demo state. Capturing an app's successful UI does not guarantee a server-side transaction beyond the asserted outcomes. If a command becomes uncertain, preserve its original footage and ask the human; do not rerun the action on a guess.
