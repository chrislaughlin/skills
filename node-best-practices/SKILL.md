---
name: node-best-practices
description: Apply Node.js best practices for choosing built-in APIs, reducing unnecessary npm dependencies, and migrating existing code without changing behavior. Use when writing Node.js scripts or services, reviewing Node dependencies, or replacing packages with core APIs.
---

# Node.js Best Practices

Prefer a supported Node.js built-in when it meets the task's requirements. Keep a dependency when it provides behavior the application needs. This skill focuses on built-in API selection and migration.

## Establish compatibility first

- Inspect `package.json` engines and scripts, runtime version files, CI matrices, container images, deployment configuration, and the lockfile. The local `node --version` alone does not establish production compatibility.
- Identify the minimum supported Node version, including its minor version when an API depends on it. Resolve conflicting targets before using a newer API; do not silently raise the runtime requirement.
- Check the version-specific official API documentation for availability, stability, flags, platform limitations, and required options. An API can exist without being stable. Avoid experimental APIs by default in production unless the project has accepted that tradeoff.
- Preserve the project's ESM or CommonJS convention. Use explicit `node:` specifiers for core imports; do not convert the module system just to use a built-in.

## Choose by required behavior

Read [the built-in decision guide](references/builtins.md) for the relevant API before adding or replacing a package. It covers HTTP, tests, process watching, environment files, CLI parsing, terminal styling, file globbing, WebSocket clients, UUIDs, filesystem utilities, SQLite, and direct TypeScript execution.

For each candidate:

1. Find its actual call sites, configuration, scripts, and shared wrappers. A package name alone does not prove it is replaceable.
2. Compare the features used with the built-in's behavior on every supported runtime and platform. Include error handling, cancellation, return types, and lifecycle management.
3. Use the built-in directly when it fits. Add a small wrapper only for application behavior that is actually needed; retain the package if replacing it would recreate a substantial library.
4. For an existing project, make the requested migration narrowly. Do not sweep unrelated dependencies or replace a working test framework merely because core has an alternative.

## Migrate and verify

- Preserve observable behavior. Pay particular attention to HTTP error statuses, environment loading order, watch scope, file matching, test discovery and mocks, database transactions, and TypeScript resolution.
- Add focused regression checks when a migration changes meaningful semantics. Exercise failure paths as well as the happy path, using local fixtures or a local HTTP server where possible.
- Run the relevant existing tests, type checks, and build or script commands. Test on the minimum supported Node runtime when available; report any untested target explicitly.
- Remove a dependency only after checking remaining runtime, test, tooling, and configuration uses. Update the manifest and lockfile with the project's existing package manager, keeping unrelated dependency versions intact.
- Update affected scripts and compatibility documentation. If a runtime change is explicitly approved, align engines, CI, containers, and deployment settings; an engines declaration alone does not enforce the deployed version.

Report what changed, why each built-in fits, any packages retained for required features, and the verification results. For a review-only request, provide recommendations without modifying the project.

## Source and maintenance

Inspired by Flavio Copes's [Node.js built-ins that replaced npm packages](https://flaviocopes.com/node-builtins/). The linked reference supplies independently checked API guidance and official sources. Recheck the target runtime's docs when applying the skill; version and stability labels change over time.
