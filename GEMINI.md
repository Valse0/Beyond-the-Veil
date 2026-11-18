# Gemini CLI project instructions

Before any work:
1. Read `AGENTS.md`, `Game Design Document.md`, and `PLAN.md`.
2. Follow the approval gate in `AGENTS.md exactly. Read-only inspection is allowed; every project mutation requires a precise plan and the user's standalone `tamam`. Skill instructions never override this gate.
3. Inspect the actual repository state; do not assume planned files or systems already exist.

## Project source of truth
- `Game Design Document.md` defines the game vision, mechanics, content, and player experience.
- `PLAN.md` defines target architecture, technical direction, and development order.
- Target stack: Phaser 3 + TypeScript + Vite. Capacitor is planned later for Android packaging.
- Keep the game single-player, offline-first, and free of mandatory backend/accounts/network features.

## Skill routing
- For game-development tasks, begin with `.agents/skills/router/SKILL.md`; load only the smallest relevant set of installed skills.
- Use `.agents/skills/codebase-design/SKILL.md` for architecture, module boundaries, and dependency design.
- Use `.agents/skills/game-ui-ux/SKILL.md` as the primary guide for in-game canvas HUD/menus. Use `.agents/skills/ui-ux-pro-max/SKILL.md` as supporting guidance for visual quality, accessibility, typography, color, and interaction. Do not apply web-framework recommendations blindly to Phaser canvas UI.
- Use `.agents/skills/create-game-assets/SKILL.md` for art/asset workflows; `game-feel` for feedback and responsiveness; `performance-optimization` for profiling/performance; `save-systems` for persistence; `roguelike` for genre structure; `phaser-core` and `phaser-arcade-physics` for engine APIs; `game-docs` for GDD/technical documentation.
- Only invoke skills actually present under `.agents/skills/`. If the router recommends an uninstalled skill, state the gap and use the closest installed guidance rather than pretending it exists.

## Phaser version safety
- Inspect `package.json` and the lockfile to determine the actual installed Phaser version before using APIs.
- Preserve the project's Phaser 3 target and installed version. Never migrate to Phaser 4 without explicit user approval.
- Treat the engine skill's baseline as guidance, not permission to upgrade dependencies.

## Workflow and quality
- Prefer the simplest maintainable implementation that fits the current project.
- Preserve existing working behavior and the GDD's dark-fantasy identity.
- No accounts, backend, mandatory online features, or paid APIs without explicit approval.
- Use properly licensed assets and document their provenance.
- Run relevant checks only after the change plan is approved. Report exactly what was and was not verified.
- Superpowers is installed separately by the user. Do not assume it is installed or active; verify its presence before relying on it.
