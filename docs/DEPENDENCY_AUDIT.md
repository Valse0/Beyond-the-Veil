# Dependency Security Audit

Date: 2026-11-19

## Findings and remediation

The initial catalog CI run reported npm advisories in the development/build toolchain. The affected direct toolchain was Vite 5.4.21, which pulled an affected esbuild release. The project moved to Vite 6.4.6, and the existing Vite configuration passed under that version.

A committed `package-lock.json` is now present. CI installs from the committed dependency manifest/lockfile rather than relying solely on floating package ranges.

## Verification

- Last confirmed full dependency audit: GitHub Actions run #211 (`44431152624`) — `npm audit --audit-level=moderate` PASS, 0 vulnerabilities.
- Current stabilization work has passed TypeScript, unit tests and production build in recent runs, but the latest full workflow is still being re-run after browser-test corrections. The workflow's audit step is skipped when the browser suite fails, so no newer audit result is claimed here.

References: GHSA-67mh-4wv8-2f99 (esbuild development-server request exposure), GHSA-587h-7wmj-h5pm (Vite/launch-editor Windows path handling), and GHSA-8g5g-mxqh-grgj (Vite 6.4.4 server.fs.deny query bypass; fixed in 6.4.5). Vite 6.4.6 is used rather than forcing an unnecessary jump to Vite 8.

## Remaining note

A successful audit is evidence for the exact lockfile and CI run checked. Re-run the audit after dependency changes and keep the lockfile synchronized.
