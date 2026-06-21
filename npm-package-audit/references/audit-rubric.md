# npm Package Audit Rubric

Use this rubric to convert evidence into a clear recommendation.

## Verdict levels

- **Low risk / OK to install**: Security-critical checks pass or have benign explanations; package is actively maintained; artifact and repository align; no known unpatched serious vulnerabilities; dependency footprint is reasonable for the package's purpose.
- **Moderate risk / install with mitigations**: No direct evidence of compromise, but one or more meaningful weaknesses exist, such as missing provenance, small maintainer bus factor, limited CI, old packaging style, or larger-than-expected dependency tree.
- **High risk / avoid unless necessary**: Multiple warnings or one serious unresolved concern, such as unexplained install scripts, dormant package with sudden recent release, unclear source-to-registry linkage, stale unresolved issues, or unpatched high vulnerability.
- **Do not install**: Confirmed malware/compromise, active typosquat/slopsquat concern, mismatched source and package identity, credential-seeking behavior, obfuscated malicious-looking code, or unpatched critical vulnerability affecting the intended use.

## Security-critical checks

### Need and blast radius

Green signals:
- Package solves a non-trivial problem that would be costly or error-prone to maintain internally.
- Use is isolated, non-critical, or dev-only.
- Replacement plan is easy if the package disappears.

Red signals:
- Tiny utility pulled into production for a few lines of code.
- Package will be used broadly across services or on a sensitive path.
- Hard lock-in or unclear migration path.

### Registry legitimacy and history

Check:
- `npm view <package> --json`
- npm package page, versions, maintainers, publish dates, dist-tags.

Green signals:
- Established package history, coherent version cadence, maintainers match repository/project identity.
- Dist-tags point to expected stable versions.
- Download count is plausible for package age and reputation.

Red signals:
- Very new package with a popular-looking or typo-like name.
- Empty or suspicious metadata, no repository, odd maintainers, or sudden ownership changes.
- Long dormancy followed by unexpected release burst.

### Provenance and trusted publishing

Check:
- npm package version page for provenance.
- npm attestations/signatures where available.
- Repository `.github/workflows/*` publish workflow.

Green signals:
- npm provenance is present and links the tarball to the expected repository, commit, and workflow run.
- Publish workflow uses OIDC/trusted publishing (`id-token: write`, `npm publish --provenance`) and avoids long-lived `NPM_TOKEN` secrets.
- Third-party GitHub Actions in release workflows are pinned to full commit SHAs.

Red signals:
- No provenance for a new/high-risk package with no other strong trust signals.
- Repository link does not match provenance or tarball contents.
- Publish workflow relies on long-lived tokens or mutable action refs such as `@main`, `@master`, `@latest`, or broad tags.

### Install scripts and executable behavior

Check package `scripts` and tarball contents.

Green signals:
- No `preinstall`, `install`, or `postinstall` scripts.
- Native addon build scripts are expected and documented.

Red signals:
- Install scripts in a package that should not need them.
- Scripts run shell downloads, curl/wget remote code, read environment variables, modify global state, or invoke opaque binaries.

### Known vulnerabilities and advisories

Check:
- OSV (`https://osv.dev/list?q=<package>`), GitHub Security Advisories, npm audit data, Snyk/Socket as supplemental sources.

Green signals:
- No known unpatched vulnerabilities for the audited version.
- Past advisories were fixed quickly and clearly documented.

Red signals:
- Unpatched critical/high vulnerability affecting the intended runtime.
- Maintainers ignore security reports or lack any disclosure path for a security-sensitive package.

### Published artifact sanity

Check:
- `npm pack <package>@<version>` in a temp directory and inspect package files.
- Compare `package.json` fields (`exports`, `main`, `types`, files) with actual contents.

Green signals:
- Tarball contains expected source/build files, license, README, declarations when advertised, and no surprising binaries.
- Bundle is not unnecessarily opaque for the package type.

Red signals:
- Registry tarball includes unexpected files, minified/obfuscated code without reason, binaries, hidden scripts, credential-related strings, or mismatch with repository.

## Operational maturity checks

### Maintenance activity

Green signals:
- Recent meaningful human commits, releases, and issue/PR responses.
- Oldest open issues have maintainer acknowledgement or reasonable triage.
- Changelog explains user-facing changes and migration notes.

Red signals:
- Last meaningful source change is years old.
- Important issues are ignored for many months.
- One person handles all code, releases, and support for a high-impact package with no backup.

### Dependency footprint

Green signals:
- Runtime dependency count is proportionate to package complexity.
- Dependencies are recognizable, maintained, and not doing surprising work.

Red signals:
- Large transitive tree for a trivial utility.
- Obscure or newly created dependencies in sensitive paths.
- Optional dependencies with install scripts or native binaries without clear need.

### CI and tests

Green signals:
- CI runs on pull requests, not only after merge.
- Test suite maps to source structure and has meaningful coverage/thresholds.
- Recent PRs show CI running before merge.

Red signals:
- Decorative badge with little/no meaningful testing.
- No tests for non-trivial behavior.
- PRs merged immediately without review or CI.

### Code and package quality

Green signals:
- Non-trivial linting, type checking, clear `exports`, TypeScript declarations when relevant, strict TypeScript for TS projects.
- `prepublishOnly` or equivalent build/test gate before publish.
- README documents API, examples, compatibility, and migration guidance.

Red signals:
- No `exports` for modern library where expected, broken package metadata, missing types despite claims.
- Many `any` / `@ts-ignore` usages in TypeScript without reason.
- Changelog is absent or only raw commit hashes for a frequently changing public API.

## Context calibration

Raise scrutiny when:
- The package runs in production, handles credentials, parses untrusted input, affects auth/payments/networking, or is installed across many repositories.
- The package is new, obscure, generated by an AI suggestion, or has a name similar to a popular package.
- The user is in a regulated/high-assurance environment.

Lower scrutiny when:
- The package is dev-only, isolated, replaceable, pinned, and its install scripts are disabled or reviewed.
- The package is from a well-known organization with a mature security process and strong provenance.
