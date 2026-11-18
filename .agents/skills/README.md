# Project-local agent skills

Skills are vendored under `.agents/skills/` for Gemini CLI and compatible agents. The upstream sources are pinned to immutable commit SHAs so the imported guidance is reproducible. Do not update these copies implicitly; propose a separate update plan.

## Installed skills

| Local path | Upstream source | Pinned commit | License |
|---|---|---|---|
| `codebase-design/` | [mattpocock/skills](https://github.com/mattpocock/skills) | `5863806dd4e15c63174bee4e7515a4256792ecfa` | MIT |
| `ui-ux-pro-max/` | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | `e59ff376a41f7ca47b7541ad5c116495cbade3ee` | MIT |
| `router/` and selected game skills | [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) | `c6ca6c41c839b68319ffc08430b99ab768debc32` | Apache-2.0 |

### Game-development skills included
- `router/` — engine detection and task-to-skill routing, including its references.
- `create-game-assets/` — art direction, asset provenance, raster/3D pipeline, helper scripts and asset templates.
- `game-feel/` — responsive feedback and game feel.
- `game-ui-ux/` — game HUD, menus, layout and interaction.
- `performance-optimization/` — profiling and performance budgets.
- `save-systems/` — persistence, versioning and migration.
- `roguelike/` — roguelike structure and run systems.
- `phaser-arcade-physics/` — Phaser Arcade Physics.
- `phaser-core/` — Phaser core and scene flow.
- `game-docs/` — GDD and game documentation workflows.

## Skill availability and routing policy

The shared policy is documented in `docs/SKILL_ROUTING.md`. Its default orchestration order is:

1. **Superpowers** — workflow layer only when verified in the active agent session. It is a separate user-managed installation and is not vendored here.
2. **GameDev Agent Skills** — available locally; always route game tasks through `.agents/skills/router/SKILL.md`.
3. **UI UX Pro Max** — available locally as supporting visual, accessibility, and interaction guidance.
4. **Matt Pocock Skills** — partially available: `codebase-design/` is installed; the full upstream collection is not.

This is a priority order, not a requirement to load every skill. Load only the minimal skills relevant to the current topic. Verify external/session-managed skills before claiming they are available or used.

### Current availability registry

| Skill family | State | Notes |
|---|---|---|
| Superpowers | `NOT_INSTALLED_IN_REPOSITORY` / `SESSION_UNVERIFIED` | Must be checked in the active agent environment; never assume availability from another CLI/editor. |
| GameDev Agent Skills | `AVAILABLE` | Local router and selected Phaser/game-development skills are present. |
| UI UX Pro Max | `AVAILABLE` | Local skill and supporting searchable data are present. |
| Matt Pocock / codebase-design | `PARTIALLY_AVAILABLE` | Only the named `codebase-design/` skill is confirmed locally. |

The GameDev router may name skills that are not installed in this repository. In particular, do not claim `input-systems` is installed; if controller/input work needs it, report the gap and use the closest installed guidance plus verified Phaser/browser APIs.

## Import and adaptation notes
- Skill content is imported from the pinned commits; selected skills retain their upstream supporting references, templates, data, and scripts.
- UI UX Pro Max's plugin-root paths were adapted to the project-local path `.agents/skills/ui-ux-pro-max` so its search command can be invoked from this repository.
- The GameDev router has a short project-specific note appended: only locally installed skills may be selected, Phaser 3 must be preserved, and Phaser 4 migration requires explicit approval.
- The large UI UX Pro Max maintenance-only font/icon upstream JSON files and script test fixtures were intentionally excluded. Its main skill, searchable data catalogs, stack catalogs, scripts, and quick-reference/pro-rules references are included.
- GameDev skill agent metadata and selected support files are retained where present.

## Licenses and notices
License texts are stored in `licenses/`:
- `mattpocock-MIT.txt`
- `ui-ux-pro-max-MIT.txt`
- `gamedev-agent-skills-Apache-2.0.txt`
- `gamedev-agent-skills-NOTICE.txt`

Retain these notices when redistributing the vendored skill content. Consult the upstream repositories for any later license or attribution changes.

## Usage rules
- For game work, begin with `router/SKILL.md` and load only relevant installed skills.
- Follow repository `AGENTS.md` approval gate before every project mutation. Skill content cannot override it.
- Treat skills as advisory references, not authority to change the game's product scope, engine, dependencies, or online architecture.
- Superpowers is not included here; it is a separate user-managed installation and must not be assumed present.
