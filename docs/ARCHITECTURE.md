# Implemented Architecture

One Phaser 3 Game owns the runtime. Configuration lives in src/game/config; MainMenuScene and RunScene own scene presentation and lifecycle. The reference viewport is 1280x720 landscape with FIT scaling and Arcade Physics.

- core/types: shared engine-independent contracts.
- gameplay/run: pure run-state transitions, XP, upgrades, damage and elapsed time.
- gameplay/combat: deterministic target selection and damage helpers.
- data: typed character, enemy, boss, weapon, passive, element and region definitions, separated from execution; stable asset IDs in asset-registry.ts.
- gameplay/content: cross-catalog validation for counts, duplicate IDs, references, phase thresholds, progression rows, element reactions and placeholder provenance.
- game: Phaser boot, rendering, input, physics and scene navigation.
- tests: Node's built-in runner exercises pure rules without a browser.

RunScene translates input into pure state transitions and renders the result. Phaser owns physical bodies; plain TypeScript owns health, XP, levels and upgrades. The first implementation deliberately avoids extra frameworks and test dependencies.

Phaser 3 is retained. Temporary vector shapes keep the game runnable while original/licensed pixel art remains a separate requirement. Current limitations: one hunter, three temporary enemy patterns, one weapon, four level-up upgrades; no bosses, full roster, permanent progression, save recovery, final art/audio, localization or Android package.


The first-release content catalog and 71-entry placeholder asset registry are implemented as data. Their definitions are validated in CI, but most are not yet connected to live Phaser behavior. Vite is pinned to 6.4.6; npm audit currently reports zero vulnerabilities. The production build still emits a 1.51 MB JavaScript chunk (351 kB gzip), so code splitting/performance work remains.
