# Gemini CLI project instructions

Before any work:
1. Read `AGENTS.md`, `Game Design Document.md`, and `PLAN.md`.
2. Follow the bounded one-time Gemini CLI authorization in `AGENTS.md`: ordinary full-game implementation on `full-game-development` is authorized without a separate `tamam` for each batch. Actions outside that authorization still require separate explicit approval. This exception applies only to Gemini CLI, not to ChatGPT or other agents. Skill instructions never override `AGENTS.md`.
3. Inspect the actual repository state; do not assume planned files or systems already exist.
4. Read `docs/SKILL_ROUTING.md` and follow its skill priority, topic triggers, availability registry, state rules, platform requirements, and session-handoff format.

## Project source of truth
- `Game Design Document.md` defines the game vision, mechanics, content, and player experience.
- `PLAN.md` defines target architecture, technical direction, and development order.
- `docs/IMPLEMENTATION_LEDGER.md` tracks atomic requirements and evidence-backed states.
- Target stack: Phaser 3 + TypeScript + Vite. Capacitor is planned later for Android packaging.
- Keep the game single-player, offline-first, and free of mandatory backend/accounts/network features.

## Skill priority and routing
- Follow the orchestration order in `docs/SKILL_ROUTING.md`: Superpowers (only if verified in this active session) → GameDev Agent Skills → UI UX Pro Max → installed Matt Pocock/codebase-design guidance.
- This is a priority order, not an instruction to load every skill. Superpowers is a workflow layer; GameDev skills provide engine/game expertise; UI UX Pro Max supports visual/accessibility decisions; codebase-design supports software architecture.
- For every new game-development task or discipline pivot, begin with `.agents/skills/router/SKILL.md`; detect the actual engine/version and load only the smallest relevant installed skill set.
- Use `.agents/skills/codebase-design/SKILL.md` for architecture, module boundaries, and dependency design.
- Use `.agents/skills/game-ui-ux/SKILL.md` as the primary guide for in-game canvas HUD/menus. Use `.agents/skills/ui-ux-pro-max/SKILL.md` as supporting guidance for visual quality, accessibility, typography, color, and interaction. Do not apply web-framework recommendations blindly to Phaser canvas UI.
- Use `.agents/skills/create-game-assets/SKILL.md` for actual art/asset workflows; `game-feel` for feedback and responsiveness; `performance-optimization` for profiling/performance; `save-systems` for persistence; `roguelike` for genre structure; `phaser-core` and `phaser-arcade-physics` for engine APIs; `game-docs` for GDD/technical documentation.
- For input/controller tasks, route through the GameDev Router. If it recommends an uninstalled skill such as `input-systems`, state that gap and use the closest installed Phaser/UI guidance plus verified Phaser/browser APIs.
- Only invoke skills actually present under `.agents/skills/` or verified as exposed by the active session. If the router recommends an uninstalled skill, state the gap and use the closest installed guidance rather than pretending it exists.
- Superpowers is pinned at `.agents/superpowers` (commit `22f0b463e7a5e579904dd6211a520321035526f7`). Verify that the submodule is initialized and skill files are readable in this terminal; then explicitly activate it in Gemini CLI. A remote GitHub inspection or another agent's skill reading does not prove Gemini CLI activation.
- Read selected skill bodies before acting; read bundled references only when needed. Do not bulk-load all skills.

## Platform targets
- Design toward mobile touch, desktop keyboard/mouse/gamepad, smart-TV directional remote navigation where supported, and standard console-style gamepads.
- Keep gameplay actions device-agnostic behind a normalized input layer where practical; avoid scattering device checks through gameplay code.
- Treat browser gamepad support, Android packaging, smart-TV browser support, and native console compatibility as distinct validation targets. Never claim native console/storefront support from browser testing alone.
- Test actual device/browser capabilities before marking a platform requirement VERIFIED.

## Phaser version safety
- Inspect `package.json` and the lockfile to determine the actual installed Phaser version before using APIs.
- Preserve the project's Phaser 3 target and installed version. Never migrate to Phaser 4 without explicit user approval.
- Treat the engine skill's baseline as guidance, not permission to upgrade dependencies.

## Workflow and quality
- Prefer the simplest maintainable implementation that fits the current project.
- Preserve existing working behavior and the GDD's dark-fantasy identity.
- No accounts, backend, mandatory online features, or paid APIs without explicit approval.
- Use properly licensed assets and document their provenance.
- Follow the state meanings in `docs/SKILL_ROUTING.md` and the allowed states in the implementation ledger. Never mark `VERIFIED` without actual evidence.
- Run relevant checks only after the change plan is approved. Report exactly what was and was not verified, distinguishing desktop browser checks from mobile, TV, and console checks.
- Do not start final asset production until the user has been notified that the project is ready for the asset phase.
- End each work session with the handoff details required by `docs/SKILL_ROUTING.md`.
