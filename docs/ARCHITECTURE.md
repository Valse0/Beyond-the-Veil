# Implemented Architecture

Beyond the Veil is a Phaser 3 + TypeScript + Vite single-player game. The active implementation branch is `full-game-development`; `main` remains the protected baseline. The reference viewport is 1280×720 landscape with Phaser Arcade Physics.

## Runtime structure

- `src/core/types`: shared engine-independent content and runtime contracts.
- `src/data`: typed hunters, enemies, bosses, weapons, passives, elements, regions and stable asset IDs.
- `src/game/config`: Phaser configuration and plugin setup.
- `src/game/scenes`: Main Menu, Hunter Selection, Region/Difficulty Selection, Hunter Hub and Run scenes.
- `src/game/input`: normalized keyboard/gamepad helpers; gameplay retains keyboard and touch controls.
- `src/gameplay`: engine-independent run, combat, spawning, events, progression, level-up, weapon, passive and synergy rules.
- `src/systems/save`: local profile storage, validation, backup/recovery and schema migration.
- `tests`: Node unit tests and Playwright Chromium browser scenarios.

## Current gameplay and progression

The live run includes catalog-driven hunters and region selection, wave/elite scheduling, enemy and boss combat, XP level-ups, weapon branches/evolutions, passive specials, timed run events, boss chests and persistent Ruh Özü rewards. The 12×12 weapon/passive pairing matrix is tested as catalog data; the 14 authored combat synergies have effect-specific Chromium assertions; the current branch-head workflow passed all 14 browser scenarios.

The Hunter Hub is reachable from the Main Menu and currently offers six capped permanent upgrades. These upgrades are stored in the profile and applied to run health, attack damage, movement speed, armor, XP gain and level-up rerolls. CI #247 verifies their live run effects. Save schema version 2 migrates prior version-1 profiles while preserving progression and collections.

## Platform and quality boundaries

The project remains Phaser 3; no engine migration is approved. Desktop Chromium automation is not equivalent to physical Android, gamepad, smart-TV browser/remote or native console validation. Native console distribution is not established. The Hub itself supports keyboard/gamepad navigation, but the Main Menu has no keyboard focus path to the Hub. Keyboard-only and TV-remote access from the title screen therefore remains incomplete.

## Known incomplete requirements

- Hunter Hub NPC services (Blacksmith, Alchemist, Relic Master and progression-gated special merchants) are not implemented.
- Permanent-upgrade respec/reallocation required by GDD §15.2 is not implemented.
- Final pixel art, animation, VFX and audio production remain outstanding; current visuals are placeholders.
- Full 15-minute natural runs, broad balance, accessibility, physical mobile/controller/TV testing and Android packaging remain open.
- Production chunk size and runtime performance require continued profiling as content density grows.

Use `docs/IMPLEMENTATION_LEDGER.md` as the evidence-backed requirement status source; this architecture summary is not a release-readiness declaration.
