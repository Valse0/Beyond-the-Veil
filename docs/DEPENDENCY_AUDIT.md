# Dependency Security Audit

Date: 2026-11-18

## Findings and remediation

The first catalog CI run reported two npm advisories (one moderate and one high) in the development/build toolchain. The affected direct toolchain was Vite 5.4.21, which pulled an affected esbuild release. The reported esbuild issue concerns requests to its development server; the Vite 5 line also lacked the current backported security fixes.

The project was moved to Vite 6.4.6, the maintained 6.4 line with the security fixes required by the current advisories. The existing Vite configuration uses only the standard defineConfig/server/build options and passed unchanged under Vite 6.4.6. The CI audit is now blocking rather than continue-on-error.

## Verification

- GitHub Actions run 44362101193
- npm run typecheck: PASS
- npm test: PASS (12 tests)
- npm run build: PASS
- npm audit --audit-level=moderate: PASS — 0 vulnerabilities

References: GHSA-67mh-4wv8-2f99 (esbuild development-server request exposure), GHSA-587h-7wmj-h5pm (Vite/launch-editor Windows path handling), and GHSA-8g5g-mxqh-grgj (Vite 6.4.4 server.fs.deny query bypass; fixed in 6.4.5). Vite 6.4.6 is used rather than forcing an unnecessary jump to Vite 8.

## Remaining note

No package-lock.json existed in the inspected branch, so CI currently resolves within the declared package ranges on each npm install. A committed lockfile should be added when the project has a reproducible local install workflow; this audit proves the dependency tree resolved in the cited CI run, not every future resolution.
