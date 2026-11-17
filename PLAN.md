BEYOND THE VEIL — DEVELOPMENT PLAN

Project: Beyond the Veil
Document: Development Roadmap & Project Structure
Status: Initial Plan
Design Reference: Game Design Document.md

1. Project Direction

Beyond the Veil is a single-player, offline-first dark fantasy roguelite built with:

* Phaser 3
* TypeScript
* Vite
* Capacitor (Android packaging, planned)

The project will use one shared codebase for Web and Android.

The main priority is a polished, genuinely playable game. Content quantity must never take priority over working mechanics, visual quality, performance, or stability.

The Game Design Document defines the intended game experience. This plan defines how that experience will be implemented.

2. Proposed Project Structure

The following structure is the target architecture. Directories should be created when their corresponding development phase begins, not all at once.

Beyond-the-Veil/
│
├── public/
│   └── assets/
│       ├── sprites/
│       │   ├── characters/
│       │   ├── enemies/
│       │   ├── bosses/
│       │   ├── environments/
│       │   ├── weapons/
│       │   ├── effects/
│       │   └── ui/
│       ├── audio/
│       │   ├── music/
│       │   └── sfx/
│       └── fonts/
│
├── src/
│   ├── main.ts
│   │
│   ├── game/
│   │   ├── config/
│   │   ├── scenes/
│   │   ├── camera/
│   │   └── physics/
│   │
│   ├── core/
│   │   ├── events/
│   │   ├── types/
│   │   ├── constants/
│   │   └── utilities/
│   │
│   ├── gameplay/
│   │   ├── player/
│   │   ├── characters/
│   │   ├── combat/
│   │   ├── weapons/
│   │   ├── passives/
│   │   ├── elements/
│   │   ├── enemies/
│   │   ├── bosses/
│   │   ├── spawning/
│   │   ├── waves/
│   │   ├── experience/
│   │   ├── level-up/
│   │   ├── loot/
│   │   └── run/
│   │
│   ├── world/
│   │   ├── regions/
│   │   ├── maps/
│   │   ├── environment/
│   │   └── exploration/
│   │
│   ├── progression/
│   │   ├── economy/
│   │   ├── relics/
│   │   ├── crafting/
│   │   ├── quests/
│   │   ├── mastery/
│   │   ├── achievements/
│   │   └── collection/
│   │
│   ├── ui/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── hud/
│   │   └── menus/
│   │
│   ├── systems/
│   │   ├── save/
│   │   ├── audio/
│   │   ├── localization/
│   │   ├── input/
│   │   └── platform/
│   │
│   ├── data/
│   │   ├── characters/
│   │   ├── weapons/
│   │   ├── passives/
│   │   ├── enemies/
│   │   ├── bosses/
│   │   ├── regions/
│   │   ├── items/
│   │   ├── upgrades/
│   │   └── localization/
│   │
│   └── dev/
│       └── debug-tools/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── gameplay/
│
├── scripts/
│
├── docs/
│
├── Game Design Document.md
├── PLAN.md
├── AGENTS.md
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
└── capacitor.config.ts

Structure Rules

* game/ manages Phaser configuration, scenes, camera, and physics integration.
* core/ contains shared types, constants, utilities, and controlled event definitions.
* gameplay/ contains actual gameplay mechanics and their rules.
* world/ manages regions, maps, environmental interactions, and exploration.
* progression/ handles permanent player progression and long-term systems.
* ui/ contains menus, HUD, screens, and reusable interface components.
* systems/ contains shared services such as saving, audio, input, and localization.
* data/ stores content definitions separately from gameplay implementation.
* public/assets/ stores game artwork, animations, audio, and fonts.
* tests/ contains automated tests.
* dev/ contains development-only tools that must not be exposed in normal builds.

Do not create unnecessary abstractions or empty modules. Add files when there is a real implementation need.

3. Technical Architecture

Game Engine

Use Phaser 3 as the game engine.

* Use Phaser Scenes to separate major game states.
* Use Arcade Physics for standard gameplay collisions unless a demonstrated requirement needs something else.
* Keep gameplay logic separate from rendering wherever practical.
* Use object pooling for frequently created objects such as projectiles, enemies, and effects when profiling justifies it.

Code Architecture

* TypeScript with strict type checking.
* Modular systems with clear responsibilities.
* Data-driven content definitions.
* Typed events for communication between independent systems.
* Avoid oversized classes and tightly coupled modules.
* Avoid unnecessary frameworks and dependencies.
* Keep the game playable without a backend or account.

Content Architecture

Characters, weapons, enemies, bosses, regions, upgrades, and items should use centralized data definitions.

Content definitions should be separated from the code that executes their behavior.

Validate important data references and required fields. A missing asset or invalid content definition should produce a useful development error rather than silently breaking gameplay.

UI Architecture

Use Phaser for the game presentation and interface unless a specific feature has a clear reason to use a separate HTML interface.

Maintain a consistent visual language across menus, HUD, upgrade cards, dialogs, and results screens.

Save Architecture

Use a storage abstraction so gameplay systems do not depend directly on a particular storage technology.

Initial implementation should prioritize reliable local saves.

The save system should eventually support:

* Automatic saving.
* Multiple backup generations.
* Save version checks and migrations.
* Corrupted save recovery.
* Export and import.

Cloud synchronization is not required.

Platform Architecture

The initial target is Web.

Android packaging will be introduced through Capacitor after the core game is stable.

The game must preserve the same gameplay rules and progression across supported platforms.

4. Development Roadmap

Development must follow this order. Each phase must meet its acceptance criteria before being considered complete.

Phase 1 — Foundation

* Initialize Phaser, TypeScript, and Vite.
* Configure the game viewport and landscape orientation.
* Create the initial scene structure.
* Establish asset loading and configuration.
* Implement basic input handling.
* Establish the initial project architecture.
* Add a minimal development and testing workflow.

Completion criteria: The game starts reliably, loads its assets, and transitions between basic scenes without errors.

Phase 2 — Playable Combat Foundation

* Player movement and directional animation.
* Dash and cooldown.
* Automatic weapon attacks.
* Basic enemy movement and AI.
* Damage, health, and collision handling.
* Enemy spawning and wave progression.
* XP drops and collection.
* Level-up with four upgrade choices.
* Basic combat HUD.
* Run start, pause, victory, and defeat states.

Completion criteria: A complete basic run can be played from start to finish using real gameplay systems.

Phase 3 — Combat Depth

* Weapon levels and upgrade branches.
* Passive items.
* Elemental effects and interactions.
* Weapon evolution.
* Elite enemies.
* Boss encounters and phase transitions.
* Chests and rewards.
* Combat balancing.

Completion criteria: Different builds create meaningful gameplay differences, and at least one complete boss encounter works correctly.

Phase 4 — Core Content Production

* Five playable characters.
* Five regions.
* Twenty-five distinct basic enemies.
* Five main bosses.
* Twelve weapons.
* Twelve passive items.
* Seven elements.
* Region-specific environmental hazards.
* Character and weapon progression.

Completion criteria: Content is mechanically and visually distinguishable, playable, and connected to the appropriate systems. Recolored copies do not count as unique content.

Phase 5 — Permanent Progression and Exploration

* Soul Essence economy.
* Permanent upgrades and unlocks.
* Hunter Hub.
* Relics and crafting.
* Quests and challenges.
* Character and weapon mastery.
* Achievements and collections.
* Exploration rewards.
* Build profiles.
* New Game+ and Endless Mode.

Completion criteria: Progress survives closing and reopening the game, and permanent unlocks work correctly.

Phase 6 — Presentation and User Experience

* Main menu and navigation.
* Character gallery.
* Region selection.
* Complete HUD and upgrade screens.
* Run result reports.
* Original animations and combat effects.
* Music and sound effects.
* Localization: English, Turkish, and Spanish.
* Accessibility options.
* Mobile control customization.

Completion criteria: The game has a consistent visual identity, understandable interface, and complete player-facing experience.

Phase 7 — Quality Assurance and Release

* Unit and integration tests.
* Gameplay regression tests.
* Save and recovery tests.
* Long-session performance testing.
* Enemy and projectile performance optimization.
* Web browser testing.
* Android device testing.
* Capacitor packaging.
* Final bug fixing and release preparation.

Completion criteria: No known critical gameplay, save, or stability issues remain. Web and Android builds are verified separately.

5. Vertical Slice Strategy

Before producing the full content list, build one representative playable section.

The first vertical slice should contain:

* One playable character.
* One test region.
* A small but varied enemy group.
* One functional weapon.
* A few meaningful upgrades.
* XP and level-up.
* One elite encounter.
* One complete boss fight.
* A basic results screen.
* A working local save.

The vertical slice must demonstrate the intended visual quality, combat feel, progression loop, and technical foundation.

It is a quality checkpoint, not a replacement for the full game.

6. Quality and Testing Rules

A feature is not complete merely because its UI exists or its data has been added.

Every implemented feature must be checked for:

* Correct gameplay behavior.
* Integration with related systems.
* Correct UI interaction.
* Save behavior when applicable.
* Error handling.
* Performance impact.
* Web compatibility.
* Android compatibility when applicable.

Use automated tests where practical and manual gameplay verification where necessary.

Never report an untested feature as verified.

Document known limitations and unfinished work.

7. Scope and Change Management

* The GDD defines the intended game design.
* This plan defines the technical structure and implementation order.
* AGENTS.md defines the rules for AI coding agents.
* If a technical decision conflicts with the GDD, preserve the game’s identity and core gameplay.
* Significant architectural changes must be documented.
* Do not add backend services, accounts, or mandatory online dependencies without an explicit project requirement.
* Do not implement all planned systems at once.
* Do not replace real gameplay with placeholder UI and claim completion.
* Keep the project runnable throughout development.

8. Documentation

As the project grows, maintain these documents:

Document	Responsibility
README.md	Project overview, setup, and run instructions
Game Design Document.md	Game vision, mechanics, and content requirements
PLAN.md	Architecture, folder structure, and development roadmap
AGENTS.md	AI coding rules
docs/ARCHITECTURE.md	Implemented technical architecture
docs/ASSET_INVENTORY.md	Asset list, sources, and usage
docs/TEST_REPORT.md	Verified tests and results
docs/KNOWN_LIMITATIONS.md	Known issues and unfinished systems
CHANGELOG.md	Important project changes

Only create detailed documentation when there is real information to record.

9. Definition of Done

The project is ready for release only when:

* The main gameplay loop works from beginning to end.
* Player movement, dash, and active abilities work.
* Automatic weapons behave correctly.
* Enemies have distinct gameplay behaviors.
* XP, level-up, and build progression work.
* Boss encounters can be completed.
* Run rewards are calculated correctly.
* Permanent progression is saved and restored.
* The game works offline.
* Web and Android targets are verified.
* Critical bugs are resolved.
* Known limitations are documented.

Final principle: A smaller amount of polished, fully functional content is better than a large amount of unfinished or superficial content.
