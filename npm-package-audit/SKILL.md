---
name: npm-package-audit
description: Audit an npm package before installation and assess whether it is safe enough to add. Use when asked to evaluate, vet, inspect, review, or decide whether to install an npm package such as react, lodash, @scope/name, or an LLM-suggested package; includes supply-chain, provenance, maintainer, dependency, CI, code-quality, and vulnerability checks.
---

# npm Package Audit

Perform a fast, evidence-based risk assessment before installing an npm dependency. Treat the result as a decision aid, not a guarantee of safety.

## Core workflow

1. **Normalize the request**
   - Identify the exact package name, intended version/range if provided, and usage context: production vs dev dependency, browser vs Node, critical path vs isolated tool.
   - If no usage context is provided, assume production use and state that this makes the assessment stricter.
   - For LLM-suggested or unfamiliar names, explicitly check that the package has a real registry history to avoid hallucinated-package/slopsquatting risk.

2. **Collect current evidence**
   - Use live sources; package state changes frequently.
   - Prefer primary sources first: npm registry/package page, package tarball/package.json, repository, GitHub Actions, security policy/advisories, OSV. Use Socket.dev or Snyk as supplemental behavioral/vulnerability signals.
   - Useful commands when available:
     ```bash
     npm view <package> --json
     npm view <package> versions --json
     npm view <package> dependencies peerDependencies optionalDependencies scripts repository maintainers time dist-tags --json
     npm pack <package>@<version> --dry-run
     npm pack <package>@<version>
     tar -tf <package>-<version>.tgz | sed -n '1,120p'
     ```
   - Do not run `npm install <package>` just to audit it. If inspecting contents, use `npm pack` and unpack the tarball in a temporary directory.

3. **Run the audit checks**
   - Use the scoring rubric in [references/audit-rubric.md](references/audit-rubric.md).
   - Prioritize security-critical checks over popularity metrics. Downloads and stars are context, not proof of safety.
   - Inspect the exact published package version when possible; do not rely only on repository source.

4. **Produce a recommendation**
   - Use one of: **Low risk / OK to install**, **Moderate risk / install with mitigations**, **High risk / avoid unless necessary**, or **Do not install**.
   - Include a short rationale, strongest positive signals, strongest concerns, and concrete mitigations.
   - If evidence is incomplete, say what could not be verified and lower confidence accordingly.

## Minimum checks for a quick audit

If time is limited, always check:

- **Need and blast radius**: whether the dependency is worth adding and where it will run.
- **Registry legitimacy and history**: package exists, has sane versions, maintainers, publish history, and no suspicious sudden takeover pattern.
- **Provenance / source-to-publish trust**: npm provenance badge or attestations, repository link matches the package, and publish workflow uses trusted publishing where visible.
- **Install scripts**: `preinstall`, `install`, and `postinstall` are absent or clearly justified.
- **Known vulnerabilities**: OSV/GitHub advisories/npm audit data for the package/version.
- **Maintenance health**: recent meaningful human activity and responsive issue handling.

## Red flags

Treat any of these as high severity unless clearly explained:

- Package name resembles a popular package, appears recently registered, or matches an LLM hallucination pattern.
- No repository, mismatched repository, or registry tarball contents do not match the claimed source.
- No provenance for a high-risk or newly created package, especially if the package claims active modern publishing.
- Unexplained install hooks, obfuscated/minified source in a small package, unexpected network/filesystem/credential access, or bundled binaries.
- Sudden new releases after a long dormant period, new maintainers without explanation, or package ownership transfer.
- Unpatched critical/high vulnerabilities or unresolved security reports.
- Large dependency tree for a tiny utility, especially with obscure transitive dependencies.

## Output format

Use this structure:

```markdown
## Verdict: <Low risk / Moderate risk / High risk / Do not install>

**Package:** `<name>`  
**Version audited:** `<version or dist-tag>`  
**Intended use assumed:** `<production/dev/browser/node/unknown>`  
**Confidence:** <High/Medium/Low>

### Key findings
- <positive or neutral finding with source>
- <concern with source>

### Security-critical checks
| Check | Result | Notes |
|---|---:|---|
| Registry legitimacy/history | Pass/Warn/Fail | ... |
| Provenance / trusted publishing | Pass/Warn/Fail | ... |
| Install scripts | Pass/Warn/Fail | ... |
| Known vulnerabilities | Pass/Warn/Fail | ... |
| Published artifact sanity | Pass/Warn/Fail | ... |

### Operational maturity
| Check | Result | Notes |
|---|---:|---|
| Maintenance activity | Pass/Warn/Fail | ... |
| Dependency footprint | Pass/Warn/Fail | ... |
| CI/tests | Pass/Warn/Fail | ... |
| Security policy/advisories | Pass/Warn/Fail | ... |
| Code/package quality | Pass/Warn/Fail | ... |

### Recommendation
<1-3 paragraphs explaining whether to install and under what conditions.>

### Mitigations if installing
- Pin the exact version or use a lockfile.
- Review updates before merging; consider Socket/GitHub dependency review.
- Use `npm install --ignore-scripts` unless scripts are required and reviewed.
- Prefer internal implementation if the package is a trivial utility.
```

## Notes

- The workflow is based on Gabor Koos's May 29, 2026 guide, "How to Evaluate an npm Package - 2026 Edition," adapted into an actionable Codex audit process.
- Do not claim a package is definitively safe. Say whether the observed risk is acceptable for the stated context.
