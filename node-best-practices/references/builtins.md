# Built-in decision guide

Use the sections relevant to the task. The baseline below was checked against Node **24.20.0** documentation on **2026-10-14**; it is a reference snapshot, not a required runtime. Follow the API history for the actual target version, including maintenance branches.

## HTTP requests

Use global `fetch` for ordinary HTTP calls. Treat non-success statuses explicitly with `response.ok` or the application's accepted status range. Supply cancellation or a suitable timeout, such as `AbortSignal.timeout`, and consume or cancel response bodies. Preserve required authentication, redirects, proxy configuration, retries, and response parsing when moving from Axios or node-fetch. Retry only when the operation permits it. Keep a client library when its needed features justify it.

[Official globals documentation](https://github.com/nodejs/node/blob/v24.20.0/doc/api/globals.md#fetch)

## Tests and assertions

For new, straightforward Node tests, consider `node:test`, `node:assert/strict`, and `node --test`. Preserve an established runner when the suite depends on its environment, transforms, snapshots, or mocking behavior. Check coverage, watch mode, and module mocking separately: a stable runner does not make every related feature stable. Verify discovery and asynchronous cleanup before changing the test command.

[Official test runner documentation](https://github.com/nodejs/node/blob/v24.20.0/doc/api/test.md)

## Development watching

Consider `node --watch app.js` for restarting an entry point and its imported modules. Files read at runtime do not automatically join that watch graph. `--watch-path` supports macOS and Windows and replaces automatic module watching with the specified paths. Account for both scopes when configuring it. Retain nodemon for required Linux custom paths or richer filtering and restart behavior. `--watch` does not compose with `--run`.

[Official watch options](https://github.com/nodejs/node/blob/v24.20.0/doc/api/cli.md#--watch)

## Environment files

Prefer startup loading through `node --env-file=.env app.js` when imports need the values during initialization. A later `process.loadEnvFile()` cannot retroactively configure imported modules. Existing environment variables take precedence; later CLI files override earlier files. Use `--env-file-if-exists` only for optional files supported by the target runtime. Native loading does not expand variable references. Preserve expansion or override behavior if the application relies on it. CLI loading can apply `NODE_OPTIONS`; programmatic loading cannot.

[Official CLI environment options](https://github.com/nodejs/node/blob/v24.20.0/doc/api/cli.md#--env-filefile), [process.loadEnvFile](https://github.com/nodejs/node/blob/v24.20.0/doc/api/process.md#processloadenvfilepath)

## CLI parsing and terminal styling

- Use `parseArgs` from `node:util` for small CLIs with declared string and boolean options. Convert and validate numeric values explicitly. Keep Commander or yargs when subcommands, generated help, or richer validation are required.
- Use `styleText` from `node:util` for simple terminal formatting. Preserve output-stream detection and color environment settings. Avoid forcing escape sequences into redirected output; make CLI tests account for terminal versus pipe behavior. Keep Chalk for formatting features that remain necessary.

[Official parseArgs documentation](https://github.com/nodejs/node/blob/v24.20.0/doc/api/util.md#utilparseargsconfig), [styleText documentation](https://github.com/nodejs/node/blob/v24.20.0/doc/api/util.md#utilstyletextformat-text-options)

## File matching and directory operations

- Consider `glob` from `node:fs/promises` for supported patterns. It yields an async iterator; use `for await` or collect deliberately. Its exclusion option is `exclude`. Verify hidden files, symlinks, path shapes, and matching options against real fixtures before replacing glob or fast-glob.
- Use `mkdir(path, { recursive: true })` for parent creation and `rm(path, { recursive: true, force: true })` for intended directory cleanup. Prefer promise APIs in request paths. `rm` takes a path, not a glob; `force` suppresses missing-path errors, not all errors. Resolve and constrain cleanup targets before recursive deletion, especially with caller-supplied paths. Keep specialized tools for required behavior beyond these APIs.

[Official glob documentation](https://github.com/nodejs/node/blob/v24.20.0/doc/api/fs.md#fspromisesglobpattern-options), [mkdir](https://github.com/nodejs/node/blob/v24.20.0/doc/api/fs.md#fspromisesmkdirpath-options), [rm](https://github.com/nodejs/node/blob/v24.20.0/doc/api/fs.md#fspromisesrmpath-options)

## WebSocket connections

Use the global `WebSocket` for compatible client connections, adapting event handling and message types. It provides no server listener. Keep `ws` or the existing framework for accepting connections or required client extensions and options. Preserve error handling, shutdown, and reconnection behavior.

[Official WebSocket documentation](https://github.com/nodejs/node/blob/v24.20.0/doc/api/globals.md#class-websocket)

## Random identifiers

Use `randomUUID` from `node:crypto` for random UUID v4 identifiers. Retain a library for other UUID versions, name-based identifiers, parsing, or validation. Preserve the existing persisted identifier format and ordering requirements.

[Official randomUUID documentation](https://github.com/nodejs/node/blob/v24.20.0/doc/api/crypto.md#cryptorandomuuidoptions)

## SQLite

Evaluate `node:sqlite` against the exact driver's features and workload. In Node 24.20.0 it is **Stability 1.2 (release candidate)**; this is not stable. `DatabaseSync` executes synchronously, so assess event-loop impact. Use parameter binding for values, close connections reliably, and preserve transaction boundaries with explicit commit and rollback handling where needed. Keep better-sqlite3 when its API, runtime support, or production requirements make it a better fit.

[Official versioned SQLite source documentation](https://github.com/nodejs/node/blob/v24.20.0/doc/api/sqlite.md)

## Direct TypeScript execution

Consider native type stripping for scripts containing erasable syntax on a supported runtime. It does not type-check, read tsconfig settings, resolve tsconfig path aliases, or execute `.tsx`. Use explicit extensions and `import type`; keep a separate type-check command. Enums, parameter properties, and other syntax requiring JavaScript generation need an appropriate runner or build. Retain tsx, ts-node, or the established build when those features are required. Do not rely on experimental transformation flags as a cross-version solution. Node also declines to strip TypeScript inside `node_modules`.

[Official TypeScript documentation](https://github.com/nodejs/node/blob/v24.20.0/doc/api/typescript.md)
