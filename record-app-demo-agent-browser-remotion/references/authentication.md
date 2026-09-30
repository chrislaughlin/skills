# Authentication inputs

Log in before native recording starts. Supply credentials in the request or an env file; the assistant translates inline credentials into a private JSON stdin stream, not a journey or shell argument. The human still supplies ordinary instructions, not login selectors. Inspect the real login page once and author its targets.

## Env file and existing names

```dotenv
DEMO_LOGIN_URL=https://app.example.com/login
DEMO_USERNAME=demo@example.com
DEMO_PASSWORD=your-local-password
```

Pass `--env-file /absolute/private.env`. Parse the file with Node's dotenv parser; never source it as shell code. The supplied file overrides process env, and inline stdin overrides both. `--state-file` overrides any env/inline saved-state path. Saved state is used before credentials when both are supplied.

Map existing variable names with `--env-map /absolute/auth-map.json`:

```json
{"DEMO_USERNAME":"APP_EMAIL","DEMO_PASSWORD":"APP_PASSWORD"}
```

The prepared journey contains only form targets:

```json
{
  "auth": {
    "loginUrl": "https://app.example.com/login",
    "usernameTarget": {"label":"Email"},
    "passwordTarget": {"label":"Password"},
    "submitTarget": {"role":"button","name":"Sign in"}
  }
}
```

Add login/app origins explicitly to `allowedOrigins`. The runner checks navigation before/after operations; this is a navigation policy, not network sandboxing. MFA, CAPTCHA, consent or alternative login routes require human resolution. Do not repeatedly submit a login form.

## Inline credentials and saved state

With `--auth-stdin`, stdin accepts JSON containing `username`, `password`, optional `loginUrl`, optional `storageState`. Read this from a private file or send it through the execution tool's stdin interface. Do not embed credential literals in recorded shell command strings. Credential fills travel to agent-browser through its batch stdin protocol; values never enter process arguments.

`DEMO_STORAGE_STATE=/absolute/private/auth.json` or `--state-file /absolute/private/auth.json` loads existing agent-browser state before navigation. `--save-state /absolute/private/auth.json` writes state only after the app's ready condition confirms login; the file mode is set to 0600. Auth state must live outside the skill and take/delivery directories. Treat state files as credentials and never include them in the final package or review viewer.

Credentials are not needed when inspection already authenticated the dedicated named session; omit auth inputs and use the authenticated app URL in the journey. An expired state redirects to login and pauses before recording.

For workflows needing visual human interaction, start both inspection and capture with `--headed` before logging in. For an authentication pause, keep the same session. Ask the human to complete the challenge (use the already headed session if visual interaction is required), then provide a `continue` resolution asserting authenticated app readiness. No login footage or login screenshots are delivered. The skill does not automate OTP/TOTP or bypass challenges.

Text reports and original instructions redact known credentials and sensitive key/value patterns. Use demo data: footage and screenshots cannot automatically redact arbitrary personal information in the authenticated application. Retain env paths privately; never copy env contents or saved cookies into artifacts.
