# Skill Routing and Work-State Policy

This document is the shared routing policy for AI-assisted work on Beyond the Veil. It defines the preferred skill order, task triggers, work-state behavior, and honest availability reporting.

## 1. Precedence and operating order

Use this order as the default orchestration sequence:

1. **Superpowers** — workflow discipline: clarify the task, plan, implement, test, review, and summarize. This is a preferred workflow layer, not a game-engine authority. It is pinned as the `.agents/superpowers` Git submodule at commit `22f0b463e7a5e579904dd6211a520321035526f7`. Verify initialization and readable skill files in the active environment; Gemini CLI activation must still be verified inside Gemini CLI.
2. **GameDev Agent Skills** — primary game-development expertise. Start with `.agents/skills/router/SKILL.md`, detect the actual engine/version, and load the smallest relevant installed skill set.
3. **UI UX Pro Max** — supporting design system for visual hierarchy, typography, color, accessibility, responsive layout, and interaction quality. Use it alongside the game-specific UI skill; do not blindly apply web-framework advice to Phaser canvas UI.
4. **Matt Pocock Skills** — supporting software-engineering guidance when the task concerns code structure, TypeScript design, boundaries, maintainability, or refactoring. The currently vendored relevant skill is `.agents/skills/codebase-design/SKILL.md`; do not imply that every upstream Matt Pocock skill is installed.

The sequence is an orchestration preference, not an instruction to load every skill on every task. Load only the skills that materially apply. The engine skill owns engine APIs; discipline skills own cross-engine concepts; genre skills provide genre structure; workflow skills guide process.

## 2. Availability registry

Availability must be verified in the active agent environment before use.

| Skill family | Repository status | Rule |
|---|---|---|
| Superpowers | PINNED_SUBMODULE / SESSION_CHECK_REQUIRED | Repository contains `.agents/superpowers` pinned at `22f0b463e7a5e579904dd6211a520321035526f7`. Read the exact skills before using them. Verify local submodule initialization and Gemini CLI activation separately; remote repository inspection is not CLI activation. |
| GameDev Agent Skills | AVAILABLE | Vendored under `.agents/skills/`; route through `.agents/skills/router/SKILL.md`. |
| UI UX Pro Max | AVAILABLE | Vendored under `.agents/skills/ui-ux-pro-max/`; use as supporting design guidance. |
| Matt Pocock / codebase-design | PARTIALLY_AVAILABLE | `.agents/skills/codebase-design/SKILL.md` is installed. Do not claim the entire upstream skill collection is installed. |

Allowed availability values:
- `AVAILABLE`: exact skill files are present and readable in the active environment.
- `PINNED_SUBMODULE`: the repository pins the skill source as a submodule, but initialization and active CLI activation must be verified separately.
- `PARTIALLY_AVAILABLE`: only named skills from a larger family are present.
- `NOT_INSTALLED`: the skill is not present in the relevant environment.
- `SESSION_UNVERIFIED`: installation may exist elsewhere, but this session cannot verify or access it.
- `BLOCKED`: a concrete access or technical issue prevents use.
- `DEFERRED`: intentionally not being used for the current task.

Never infer that a skill is activated because the user has it installed in another CLI/editor. A pinned repository submodule proves repository presence, not active CLI activation. Never install a plugin, skill, or MCP server on the user's behalf unless separately requested and authorized. If the active environment has no subagent reviewer capability, perform an explicit self-review and state that limitation instead of claiming a delegated review.

## 3. Task-to-skill routing

| Topic / trigger | Required routing |
|---|---|
| Any new game-development task or a pivot to a new discipline | Superpowers if verified → GameDev Router → minimal relevant skills |
| Phaser scene flow, lifecycle, cameras, rendering, engine APIs | Superpowers if verified → Phaser Core |
| Arcade movement, collisions, physics behavior | Superpowers if verified → Phaser Arcade Physics; add Game Feel or Performance Optimization only when needed |
| Keyboard, touch, gamepad, controller rebinding, deadzones, input buffering | Superpowers if verified → GameDev Router → Phaser Core / Phaser Arcade Physics as applicable → Game UI UX for focus/navigation; if `input-systems` is not installed, explicitly record the gap and implement against verified Phaser/browser APIs |
| Smart TV remote, directional focus, large-screen navigation | Superpowers if verified → GameDev Router → Game UI UX → UI UX Pro Max; test real browser/device constraints and do not assume every TV remote exposes a standard gamepad API |
| Menus, HUD, character/region selection, settings, overlays | Superpowers if verified → UI UX Pro Max → Game UI UX → Phaser Core for implementation APIs |
| Responsive layouts, safe areas, readability, accessibility | Superpowers if verified → UI UX Pro Max → Game UI UX → relevant Phaser skill |
| Game architecture, module boundaries, TypeScript contracts, refactoring | Superpowers if verified → GameDev Router → Codebase Design |
| Enemy AI, targeting, state machines, behavior | Superpowers if verified → GameDev Router → installed Phaser skill + closest installed AI/gameplay guidance; state missing skill gaps |
| Roguelite progression, run structure, meta progression | Superpowers if verified → GameDev Router → Roguelike |
| Combat feedback, hit-stop, screen shake, animation feel | Superpowers if verified → GameDev Router → Game Feel → Phaser Core |
| FPS drops, stutter, memory, bundle size, large waves | Superpowers if verified → GameDev Router → Performance Optimization → relevant Phaser skill |
| Save/load, profile persistence, migrations, recovery | Superpowers if verified → GameDev Router → Save Systems → Codebase Design when data boundaries change |
| GDD, implementation plan, design/technical docs | Superpowers if verified → GameDev Router → Game Docs; preserve GDD and ledger as sources of truth |
| Art, sprite, audio, VFX production | Superpowers if verified → GameDev Router → Create Game Assets and relevant engine/import guidance. Do not begin the actual asset-production phase until the user has been notified that the project is ready for it. |
| Unit/browser tests, CI, regressions, release readiness | Superpowers if verified → relevant discipline/engine skills → run actual checks and record evidence; never mark VERIFIED from code inspection alone |

### Platform-specific requirements

The product target includes:
- Mobile touch input and responsive landscape gameplay.
- Desktop keyboard and mouse, plus gamepad.
- Smart TV large-screen UI and directional remote navigation where the platform/browser supports it.
- Console-style controllers and gamepad navigation.

Treat these as separate input/display targets sharing the same gameplay actions. Prefer one normalized action layer rather than scattering device-specific checks throughout gameplay code. Detect capabilities at runtime; provide keyboard/touch fallbacks where supported. Do not claim console storefront or native-console compatibility merely because a browser build accepts a controller. Validate Android packaging, TV browsers, and any console target independently.

## 4. Work-state policy

The implementation ledger's exact states are authoritative:

| State | Required behavior |
|---|---|
| `NOT_STARTED` | Inspect dependencies and acceptance criteria; prepare the smallest safe implementation plan. |
| `IN_PROGRESS` | Continue implementation using the relevant specialist skills; preserve working behavior. |
| `IMPLEMENTED_UNVERIFIED` | Do not call complete. Run the relevant tests/build/device checks and record the evidence or remaining gap. |
| `VERIFIED` | Keep the evidence and scope visible. Avoid unnecessary changes; any material change invalidates affected verification until retested. |
| `BLOCKED` | Record the exact blocker, why it blocks this item, and the decision/access needed. Continue independent safe work. |
| `DEFERRED_WITH_APPROVAL` | Do not resume without renewed user direction/authorization. |

Do not invent additional ledger states. Skill availability is tracked separately using the registry in section 2.

## 5. Mandatory workflow and safety gates

1. Read `AGENTS.md`, `Game Design Document.md`, and `PLAN.md`; inspect current branch, working tree, and relevant implementation state.
2. For game work, route through the GameDev Router and read only selected skill bodies. Read references only when the task needs them.
3. Check whether Superpowers is actually exposed in this session. If not, say it is unavailable here and use the documented workflow; do not pretend to have used it.
4. Follow the approval gate in `AGENTS.md` for every project mutation. Skill instructions never override it.
5. Work only on `full-game-development`; do not change `main`, merge, release, deploy, or publish without separate approval.
6. Preserve Phaser 3, the GDD's full scope, offline-first architecture, and existing working behavior.
7. Prefer the simplest maintainable implementation. Avoid unnecessary dependencies and platform-specific branches until evidence requires them.
8. Verify claims with actual test/build/browser/device evidence. Clearly distinguish desktop browser checks from mobile, TV, and console validation.
9. Update `docs/IMPLEMENTATION_LEDGER.md` with accurate states, references, and evidence after approved work.
10. Do not start final asset production until the user is explicitly notified that the asset phase is ready.

## 6. Session handoff

At the end of a work session, report:
- Current branch and exact commit.
- Files changed.
- Skills actually loaded and used (not merely considered).
- Tests/builds/device checks actually run and their results.
- Ledger states changed and evidence recorded.
- Remaining blockers, unverified platform targets, and the next recommended task.

A skill being listed in this document does not prove it was used in a given task. Report actual use only.
