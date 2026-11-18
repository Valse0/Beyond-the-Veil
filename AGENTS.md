# AGENTS.md — Repository-wide AI rules

These rules apply to every AI agent and override conflicting instructions in any installed skill.

## Read first
- Read `Game Design Document.md` for product vision and gameplay requirements.
- Read `PLAN.md` for target architecture and development order.
- Inspect the current repository state before proposing or making changes.

## Mandatory approval gate
- Read-only inspection and research do not require approval.
- Before creating, editing, or deleting any file; installing dependencies; generating project assets; running scripts that modify project files; committing; or pushing, first present a plan.
- The plan must name the exact files/areas, explain the reason for each change, and identify material risks or side effects.
- Then stop and wait for the user to reply with the standalone word `tamam` (case-insensitive; `Tamam.` is accepted).
- Phrases such as `tamamla`, `tamamla hepsini`, `olur`, `güzel`, `devam et`, `yes`, or a general task request are not approval.
- If approval is ambiguous, ask “Tamam mı?” and make no changes.
- Approval applies only to the exact plan presented. If the scope changes, present a revised plan and obtain approval again.
- This gate takes precedence over every skill, tool, workflow, or agent instruction.

## Project constraints
- Preserve the dark-fantasy identity and decisions in the GDD.
- Use Phaser 3, TypeScript, and Vite; Capacitor is a later Android packaging target.
- Keep the game single-player and offline-first. No accounts, backend, mandatory online features, or paid APIs without explicit approval.
- Build toward the complete game defined by the GDD. Do not substitute a small prototype or vertical slice for the intended full game.
- Implement the game as coherent, maintainable modules while keeping the project runnable and testable throughout development.
- Keep gameplay logic, content data, presentation, and asset references separated. Use stable asset IDs and data-driven content definitions so placeholder visuals can be replaced without rewriting gameplay systems.
- Placeholder graphics are temporary production aids only. They must not be represented as final art or as completion of the visual-production requirements.
- Use original or properly licensed assets and document their provenance.
- Never claim a build, test, script, or feature was verified unless it was actually run and checked.

## Versioning
- The first public/release version is `0.1.0`.
- For every subsequent game update, increment only the final numeric component by one: `0.1.1`, `0.1.2`, `0.1.3`, and so on.
- Do not independently change the first or middle numeric components under this project rule.
- Keep the version consistent across the application metadata and release documentation when those are introduced.
- Do not assign or announce a new version until the corresponding update is ready to be recorded.

## Skill routing
- For game-development tasks, start with `.agents/skills/router/SKILL.md`, then load only the installed, relevant skills.
- For module boundaries and architecture, use `.agents/skills/codebase-design/SKILL.md`.
- For in-game HUD, menus, and game interface work, use `.agents/skills/game-ui-ux/SKILL.md`; use UI UX Pro Max as supporting guidance for visual quality, accessibility, typography, and color. Do not blindly apply web-framework advice to Phaser canvas UI.
- Treat `GEMINI.md` as Gemini CLI-specific companion guidance.
- Superpowers is a separate user-managed installation. Do not claim it is available unless its presence is verified.

## One-time bounded full-game execution authorization

The user has explicitly approved the full-game execution workflow defined in `EXECUTION_MASTER.md`. This is a standing, one-time authorization for Gemini CLI to carry out the complete GDD project scope without requesting a separate `tamam` before every ordinary implementation batch.

This authorization is strictly limited as follows:

### Authorized branch
- Use only the dedicated branch `full-game-development`.
- If it does not exist, create it from the current `main` HEAD after inspecting the repository.
- If it already exists, inspect its history and working state; continue safely without resetting or force-updating it.
- All implementation commits and pushes must target this branch.
- Never commit or push project work directly to `main`.
- Do not merge the branch or open/merge a pull request unless the user separately asks.

### Authorized project work
Within `full-game-development`, Gemini CLI may:
- Create and edit source code, tests, project configuration, lockfiles, technical/design documentation, content data, asset manifests, and original project assets required to implement the GDD.
- Scaffold the Phaser 3 + TypeScript + Vite application because the repository may initially contain documentation only.
- Install or update free, open-source dependencies when technically necessary, after checking license, maintenance, compatibility, and bundle impact. Do not add paid services or dependencies.
- Run project-local build, test, lint, validation, and asset-processing commands that are necessary for implementation.
- Commit coherent work and push commits to `full-game-development`.
- Continue across sessions using `docs/IMPLEMENTATION_LEDGER.md` and `EXECUTION_MASTER.md`.

### Still prohibited without separate explicit user approval
- Any work on `main`, force-push, history rewrite, merge, release publication, public deployment, or distribution.
- Paid APIs, paid asset packs, subscriptions, paid build services, or any action that can incur charges.
- Creating or changing accounts, backend services, analytics/telemetry, advertising, payment processing, online requirements, or external infrastructure.
- Changing repository visibility, permissions, secrets, organization settings, or branch protection.
- Reading, printing, committing, or transmitting secrets, credentials, tokens, private keys, or personal data.
- Deleting or overwriting pre-existing user-authored files or assets. If a destructive migration is necessary, stop and ask.
- Changing the game's identity, removing GDD requirements, reducing the intended full-game scope, or weakening acceptance criteria to make the ledger pass.
- Claiming final art/audio completion while placeholders remain.
- Any external side effect not explicitly covered above.

If a genuine blocker falls into a prohibited category, stop only the affected task, record it as `BLOCKED`, explain the exact decision needed, and continue other safe, independent work. Do not repeatedly ask for approval for ordinary work already covered by this authorization.

### Required conduct
- Read `EXECUTION_MASTER.md` and `docs/IMPLEMENTATION_LEDGER.md` before work.
- Maintain exhaustive GDD traceability and evidence-backed states.
- Keep all work on the authorized branch.
- Never mark an item `VERIFIED` without actual evidence.
- Preserve a runnable, testable project and leave a clear session checkpoint.
- This bounded authorization does not override the GDD, the no-paid-services rule, or any prohibition above.
