# Implemented Architecture

One Phaser 3 Game owns the runtime. Configuration lives in src/game/config; MainMenuScene and RunScene own scene presentation and lifecycle. The reference viewport is 1280x720 landscape with FIT scaling and Arcade Physics.

- core/types: shared engine-independent contracts.
- gameplay/run: pure run-state transitions, XP, upgrades, damage and elapsed time.
- gameplay/combat: deterministic target selection and damage helpers.
- data: typed character, enemy and weapon definitions, separated from execution.
- game: Phaser boot, rendering, input, physics and scene navigation.
- tests: Node's built-in runner exercises pure rules without a browser.

RunScene translates input into pure state transitions and renders the result. Phaser owns physical bodies; plain TypeScript owns health, XP, levels and upgrades. The first implementation deliberately avoids extra frameworks and test dependencies.

Phaser 3 is retained. Temporary vector shapes keep the game runnable while original/licensed pixel art remains a separate requirement. Current limitations: one hunter, three temporary enemy patterns, one weapon, four level-up upgrades; no bosses, full roster, permanent progression, save recovery, final art/audio, localization or Android package.
