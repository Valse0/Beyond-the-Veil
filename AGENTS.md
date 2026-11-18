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
