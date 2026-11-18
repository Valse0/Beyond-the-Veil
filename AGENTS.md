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
- Prefer small, maintainable, runnable changes. Do not replace working systems without a clear reason.
- Use original or properly licensed assets and document their provenance.
- Never claim a build, test, script, or feature was verified unless it was actually run and checked.

## Skill routing
- For game-development tasks, start with `.agents/skills/router/SKILL.md`, then load only the installed, relevant skills.
- For module boundaries and architecture, use `.agents/skills/codebase-design/SKILL.md`.
- For in-game HUD, menus, and game interface work, use `.agents/skills/game-ui-ux/SKILL.md`; use UI UX Pro Max as supporting guidance for visual quality, accessibility, typography, and color. Do not blindly apply web-framework advice to Phaser canvas UI.
- Treat `GEMINI.md` as Gemini CLI-specific companion guidance.
- Superpowers is a separate user-managed installation. Do not claim it is available unless its presence is verified.
