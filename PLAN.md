# BEYOND THE VEIL — DEVELOPMENT PLAN

Project: Beyond the Veil
Document: Product Design, Technical Architecture & Full-Game Delivery Plan
Status: Active — Full-game design and implementation
Design Reference: Game Design Document.md

## 1. Project Direction

Beyond the Veil is a single-player, offline-first dark fantasy roguelite built with:

- Phaser 3
- TypeScript
- Vite
- Capacitor (Android packaging, planned)

The project will use one shared codebase for Web and Android. The initial target is Web; Android packaging follows once the shared game is stable.

The target is the complete game defined by the GDD, not a small prototype or vertical slice. The game should be fully designed before implementation begins in earnest. Implementation should then deliver the complete set of planned systems, screens, and content as an integrated, playable product.

Development may be organized into internal modules and implementation batches for reliability, review, and testing. These are engineering boundaries, not reduced-scope demo releases. Do not stop at a one-character/one-region sample and treat it as the intended deliverable.

The GDD defines the intended game experience. This plan defines how that experience will be designed, structured, implemented, tested, and completed.

## 2. Product Design Before Full Implementation

Before full-game coding begins, complete the player-facing and system-level design. Existing decisions in the GDD remain authoritative; only unresolved or underspecified areas need new decisions.

The design package must cover:

- Information architecture and complete screen/navigation map.
- Main menu: layout, hierarchy, background treatment, primary actions, secondary navigation, and transitions.
- Hunter Hub / home area and all progression destinations.
- Character gallery, character details, unlock states, and selection flow.
- Region and difficulty selection, run preparation, and loadout flow.
- In-run HUD, mobile controls, pause screen, level-up choices, event notices, boss warnings, and interaction prompts.
- Victory, defeat, run summary, rewards, and return flow.
- Weapons, passives, elements, evolutions, upgrades, items, enemies, elites, bosses, and region content definitions.
- Permanent progression, economy, quests, mastery, achievements, collection, crafting, and unlock rules.
- Save slots or profile behavior, settings, accessibility, localization, and input customization.
- Responsive layout rules for landscape mobile and desktop/web.
- Audio behavior, feedback, motion, transitions, and visual hierarchy.
- Asset inventory: every required visual/audio asset, stable asset ID, intended dimensions or animation needs, format, and destination.

Do not invent unnecessary features to fill documents. Preserve all established GDD decisions and explicitly identify any remaining decisions that materially affect scope, UX, balance, or architecture.

Design completion means the screens, navigation, core rules, content data requirements, and asset requirements are specified well enough to implement without repeatedly redesigning foundational decisions during coding.

## 3. Proposed Project Structure

This is the target architecture, not a requirement to create empty directories in advance. Create files when their implementation is needed.

Beyond-the-Veil/
|
|-- public/
|   |-- assets/
|       |-- sprites/
|       |   |-- characters/
|       |   |-- enemies/
|       |   |-- bosses/
|       |   |-- environments/
|       |   |-- weapons/
|       |   |-- effects/
|       |   |-- ui/
|       |-- audio/
|       |   |-- music/
|       |   |-- sfx/
|       |-- fonts/
|
|-- src/
|   |-- main.ts
|   |-- game/
|   |   |-- config/
|   |   |-- scenes/
|   |   |-- camera/
|   |   |-- physics/
|   |-- core/
|   |   |-- events/
|   |   |-- types/
|   |   |-- constants/
|   |   |-- utilities/
|   |-- gameplay/
|   |   |-- player/
|   |   |-- characters/
|   |   |-- combat/
|   |   |-- weapons/
|   |   |-- passives/
|   |   |-- elements/
|   |   |-- enemies/
|   |   |-- bosses/
|   |   |-- spawning/
|   |   |-- waves/
|   |   |-- experience/
|   |   |-- level-up/
|   |   |-- loot/
|   |   |-- run/
|   |-- world/
|   |   |-- regions/
|   |   |-- maps/
|   |   |-- environment/
|   |   |-- exploration/
|   |-- progression/
|   |   |-- economy/
|   |   |-- relics/
|   |   |-- crafting/
|   |   |-- quests/
|   |   |-- mastery/
|   |   |-- achievements/
|   |   |-- collection/
|   |-- ui/
|   |   |-- screens/
|   |   |-- components/
|   |   |-- hud/
|   |   |-- menus/
|   |-- systems/
|   |   |-- save/
|   |   |-- audio/
|   |   |-- localization/
|   |   |-- input/
|   |   |-- platform/
|   |-- data/
|   |   |-- characters/
|   |   |-- weapons/
|   |   |-- passives/
|   |   |-- enemies/
|   |   |-- bosses/
|   |   |-- regions/
|   |   |-- items/
|   |   |-- upgrades/
|   |   |-- localization/
|   |-- dev/
|       |-- debug-tools/
|
|-- tests/
|   |-- unit/
|   |-- integration/
|   |-- gameplay/
|-- scripts/
|-- docs/
|-- Game Design Document.md
|-- PLAN.md
|-- AGENTS.md
|-- README.md
|-- package.json
|-- tsconfig.json
|-- vite.config.ts
|-- capacitor.config.ts

### Structure Rules

- `game/` manages Phaser configuration, scenes, camera, and physics integration.
- `core/` contains shared types, constants, utilities, and typed event definitions.
- `gameplay/` contains gameplay mechanics and rules.
- `world/` manages regions, maps, environmental interactions, and exploration.
- `progression/` handles permanent player progression and long-term systems.
- `ui/` contains menus, HUD, screens, and reusable interface components.
- `systems/` contains shared services such as saving, audio, input, and localization.
- `data/` stores content definitions separately from the code that executes their behavior.
- `public/assets/` stores artwork, animation, audio, and fonts.
- `tests/` contains automated tests.
- `dev/` contains development-only tools that must not be exposed in normal builds.

Do not create unnecessary abstractions or empty modules. Add real implementation files as part of the planned full-game architecture.

## 4. Technical Architecture

### Game Engine

Use Phaser 3.

- Use Phaser Scenes to separate major game states and screen flows.
- Use Arcade Physics for standard gameplay collisions unless a demonstrated requirement needs another approach.
- Keep gameplay rules and state separate from rendering wherever practical.
- Use object pooling for frequently created objects such as projectiles, enemies, and effects when profiling justifies it.
- Keep landscape orientation as the primary game layout.

### Code Architecture

- TypeScript with strict type checking.
- Modular systems with clear responsibilities and explicit boundaries.
- Data-driven content definitions.
- Typed events for communication between independent systems.
- Avoid oversized classes, hidden global state, and tightly coupled modules.
- Avoid unnecessary frameworks and dependencies.
- Keep the game single-player and playable offline without an account or backend.

### Data-Driven Content

Characters, weapons, enemies, bosses, regions, upgrades, items, quests, and progression rewards must be defined as structured content data, separate from behavior implementation.

- Give each content item a stable unique ID.
- Keep stats, descriptions, unlock conditions, behavior parameters, and asset references in explicit definitions.
- Validate required fields, IDs, references, and supported values.
- Prefer reusable behavior components over one-off duplicated implementations.
- Content should be expandable without rewriting core systems.

### Asset Abstraction and Placeholder Strategy

Gameplay code must not depend on hard-coded visual file paths or on a specific final sprite.

- Define stable asset IDs and a central asset registry/manifest.
- Reference assets through those IDs from content data and presentation components.
- Separate animation definitions, texture loading, visual effects, and gameplay state.
- Use temporary placeholder visuals where final art is not yet available.
- Placeholders must preserve the required anchor points, approximate dimensions, animation states, collision alignment, and UI layout needs.
- Replacing a placeholder with final artwork should normally require changing the asset mapping or asset files, not gameplay logic.
- Missing assets must produce clear development-time diagnostics and safe fallbacks.
- Record asset source, license, attribution requirements, and usage in the asset inventory.

The placeholder phase is a production strategy, not the final visual target. Final original/licensed art, animation, audio, and UI assets remain required for release quality.

### UI Architecture

- Use Phaser for game presentation and interface unless a specific feature has a clear reason to use a separate HTML interface.
- Implement screens and reusable UI components from the completed screen/navigation design.
- Maintain one coherent visual system across menus, HUD, upgrade cards, dialogs, and results.
- Support landscape mobile and desktop/web layouts.
- Keep UI state and navigation transitions explicit and testable.

### Save Architecture

Use a storage abstraction so gameplay systems do not depend directly on a particular storage technology.

Prioritize reliable local saves, including:

- Automatic and safe save points.
- Multiple backup generations.
- Save schema version checks and migrations.
- Corrupted-save detection and recovery.
- Export and import where designed.
- Persistence tests for unlocks, currency, settings, collections, and progression.

Cloud synchronization is not required.

### Platform Architecture

- Web is the first target.
- Android packaging will use Capacitor after the shared game is stable.
- Preserve gameplay rules and progression across supported platforms.
- Input, viewport, storage, and platform-specific behavior must be accessed through clear platform abstractions where needed.

## 5. Full-Game Delivery Roadmap

Work follows these major stages. Each stage can contain multiple engineering tasks, but the target remains the complete game.

### Stage 1 — Complete Game Design

- Review the GDD and preserve established decisions.
- Resolve remaining material design questions.
- Design all menus, screens, navigation, and player flows.
- Specify HUD, controls, interaction states, and responsive landscape layouts.
- Complete system rules and content definitions for the full GDD scope.
- Define progression, unlocks, economy, save behavior, settings, accessibility, and localization.
- Create the complete asset inventory and stable asset-ID plan.

Completion criteria: The complete game experience and its implementation requirements are sufficiently specified. No foundational screen or core system is left as an unexplained placeholder in the design.

### Stage 2 — Full Technical Foundation and Architecture

- Initialize Phaser 3, TypeScript, and Vite.
- Configure landscape viewport behavior and responsive scaling.
- Establish scene flow and navigation foundations.
- Implement typed core models, event contracts, and data validation.
- Establish data-driven content loading.
- Establish the asset registry, manifest, placeholder policy, and diagnostics.
- Establish input, audio, local save, localization, and platform abstractions.
- Establish automated test, lint, type-check, and build workflows as appropriate.

Completion criteria: The architecture supports the complete designed game, content can be loaded and validated, asset mappings can be replaced independently, and the application runs reliably.

### Stage 3 — Complete Gameplay and Content Implementation

Implement the full designed gameplay scope as integrated systems, including:

- All playable characters and their unique abilities and starting identities.
- Player movement, dash, combat, damage, health, status effects, and targeting.
- All weapons, weapon levels, branches, and evolutions.
- All passive items, upgrades, synergies, and item slots.
- All seven elements, buildup rules, interactions, and resistance handling.
- All base enemies, elite variants, mutations, and distinct behavior patterns.
- All bosses, phases, telegraphs, arenas, and reward rules.
- All five regions, map content, environmental hazards, exploration points, and events.
- Spawning, waves, run timing, difficulty, modes, victory, defeat, and run rewards.
- XP, level-up choices, loot, chests, and run progression.
- Permanent progression, economy, Hunter Hub, relics, crafting, quests, mastery, achievements, collection, New Game+, and Endless Mode as defined in the GDD/design decisions.
- Complete local persistence and recovery behavior.

Use temporary placeholder visuals and audio references wherever final assets are unavailable. Do not omit a system merely because its final art has not yet been produced.

Completion criteria: The complete planned content and gameplay systems are implemented and integrated. The game can be played through its designed flows using placeholders where necessary; no vertical-slice-only scope is treated as completion.

### Stage 4 — Complete UI and Player Experience

- Implement the designed main menu and all navigation.
- Implement the Hunter Hub and progression destinations.
- Implement character and region selection, preparation, and loadout screens.
- Implement the complete in-run HUD and mobile/desktop controls.
- Implement pause, level-up, event, boss warning, victory, defeat, and result screens.
- Implement settings, accessibility, localization, and input customization.
- Connect every screen to real game state and actions; no decorative/inert controls.

UI work may be implemented alongside gameplay where integration requires it, but all designed player-facing flows must be complete before release evaluation.

Completion criteria: Every designed screen and interaction works, reflects actual game state, and follows the approved visual system.

### Stage 5 — Final Asset Production and Integration

- Produce or source final character, enemy, boss, environment, weapon, effect, UI, audio, and font assets.
- Follow the asset inventory, style guide, technical specifications, and stable asset IDs.
- Create required sprite sheets, animation states, atlases, and audio formats.
- Replace temporary placeholders through the asset registry/manifest.
- Verify sprite anchors, scale, frame timing, collision alignment, readability, and performance.
- Record provenance and licenses.

Completion criteria: Final assets replace temporary placeholders across the game, all references resolve, and the presentation meets the defined art direction.

### Stage 6 — Quality Assurance, Balancing, and Release

- Unit, integration, and gameplay regression tests.
- Full-flow tests for menus, runs, progression, unlocks, and saves.
- Save migration, backup, export/import, and recovery tests.
- Combat, difficulty, economy, and progression balancing.
- Long-session performance and memory testing.
- Web browser and landscape mobile testing.
- Android device testing and Capacitor packaging.
- Accessibility, localization, and input checks.
- Fix critical issues and document remaining known limitations.

Completion criteria: The complete game is stable, playable, balanced to the agreed target, works offline, and Web and Android builds are separately verified.

## 6. Quality and Testing Rules

A feature is not complete merely because its UI exists or its data has been added.

Every implemented feature must be checked for:

- Correct gameplay behavior.
- Integration with related systems.
- Correct UI interaction.
- Save behavior when applicable.
- Error handling and edge cases.
- Performance impact.
- Web compatibility.
- Android compatibility when applicable.

Use automated tests where practical and manual gameplay verification where necessary. Test continuously during implementation; continuous testing does not mean reducing the product to a prototype or vertical slice.

Never report an untested feature as verified. Document known limitations and unfinished work.

## 7. Scope and Change Management

- The GDD defines the intended game design.
- This plan defines the technical structure and full-game delivery approach.
- AGENTS.md defines the rules for AI coding agents and versioning.
- If a technical decision conflicts with the GDD, preserve the game’s identity and core gameplay.
- Significant architectural or product-scope changes must be documented and approved.
- Do not add backend services, accounts, mandatory online dependencies, or paid APIs without explicit approval.
- Do not replace the full-game target with a prototype or vertical slice.
- Do not represent placeholder visuals as final assets.
- Keep the project runnable and testable throughout development.
- Implement in coherent modules and integration batches; do not attempt one opaque, unreviewable code dump.

## 8. Versioning

The project version rule is defined in AGENTS.md and applies to all release metadata and release documentation:

- First release: `0.1.0`.
- Each subsequent game update increments only the final number by one: `0.1.1`, `0.1.2`, `0.1.3`, and so on.
- Keep version values consistent wherever they are recorded.
- Do not assign a release version to an unfinished or unrecorded update.

## 9. Documentation

Maintain these documents as their information becomes real:

| Document | Responsibility |
|---|---|
| README.md | Project overview, setup, and run instructions |
| Game Design Document.md | Game vision, mechanics, and content requirements |
| PLAN.md | Architecture, full-game delivery roadmap, and project structure |
| AGENTS.md | AI coding rules, approval gate, and versioning |
| docs/ARCHITECTURE.md | Implemented technical architecture |
| docs/ASSET_INVENTORY.md | Asset IDs, requirements, sources, and usage |
| docs/TEST_REPORT.md | Verified tests and results |
| docs/KNOWN_LIMITATIONS.md | Known issues and unfinished work |
| CHANGELOG.md | Important game updates and version history |

Only create detailed documentation when there is real information to record.

## 10. Definition of Done

The project is ready for release only when:

- The complete main gameplay loop works from beginning to end.
- All designed player characters and their abilities work.
- Movement, dash, active abilities, and automatic weapons behave correctly.
- Enemies, elites, and bosses have distinct functional behaviors.
- All planned regions and their mechanics are implemented.
- XP, level-up, build progression, and weapon evolutions work.
- Permanent progression, unlocks, and rewards are saved and restored.
- All designed menus, screens, and player flows work.
- Final assets replace placeholders and meet the art direction.
- The game works offline.
- Web and Android targets are verified.
- Critical bugs are resolved.
- Known limitations are documented.

Final principle: Deliver the complete designed game as an integrated product. Use modular implementation, replaceable assets, and continuous testing to protect quality without substituting a small demo for the full game.
