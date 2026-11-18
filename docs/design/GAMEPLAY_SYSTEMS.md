# Gameplay Systems

This specification preserves the GDD. Values not fixed by it are initial tuning defaults, not final balance.

## Run
A standard Survival run targets 15 minutes: 0–3 minutes onboarding; 3–7 new enemy patterns and density; 7–11 elites, events and hazards; 11–14 advanced pressure; 14–15 final boss. The current Phaser scene still uses its initial timer and spawn loop; full region rotation, event director and boss run flow remain integration work.

Temporary run state includes health, level, XP, weapon/passive upgrades, kills and elapsed time. Profile state includes Ruh Özü, unlocks, mastery and collections; death must not erase profile state.

## Player and combat
Movement is continuous top-down 3/4 control. Keyboard uses WASD/arrows; touch uses a left-side movement pad. Dash is a directional burst with cooldown and brief immunity. Character active ability is separate from automatic weapons; the starting hunter's Spirit Pulse damages nearby enemies and pushes them away. The starter weapon selects the nearest living enemy and fires a projectile. Contact damage has a brief invulnerability interval.

## XP and level-up
Enemies drop XP orbs, collected by proximity and magnet radius. XP thresholds rise by level and preserve overflow. Each level-up pauses the run and presents four choices. Initial choices: Power, Haste, Vitality and Magnet. The full pool must include GDD weapons, passives, evolutions and character synergies.

## Content rules
Enemy definitions use stable IDs, health, movement, contact damage, XP reward, collision radius and behavior key. A color/stat-only variant does not count as a distinct enemy. The final game requires 25 genuinely distinct base enemies and five bosses. Each boss needs its own arena, phases, attacks, telegraphs, adds, elemental interactions and rewards.

Seven canonical elements: Ateş, Buz, Zehir, Karanlık, Ruh, Yıldırım and Kan. Each requires buildup, thresholds, resistances and tested cross-element reactions. Twelve weapons and twelve passives need upgrade paths and meaningful synergies. Weapon evolution requires a max-level weapon, its required passive and a boss chest, and must change attack behavior.

## Fairness and progression
Spawn pressure must be capped and readable. Difficulty must add behaviors and patterns, not only health. Reroll, banish and skip protect level-up RNG. No resistance may invalidate an entire build. Permanent Ruh Özü and unlocks survive defeat; temporary run power does not. Hunter Hub, relics, crafting, quests, mastery, achievements, collections, New Game+ and Endless Mode remain full-game requirements.

## Runtime-system and Phaser scene integration

Engine-independent gameplay modules provide:
- 25 enemy archetype decision steps and attack intent: `src/gameplay/enemies/enemy-runtime.ts`
- Seven-element buildup, resistance, reactions and timed status ticks: `src/gameplay/elements/element-runtime.ts`
- Six-slot weapon/passive builds, five-level upgrades, evolution eligibility and derived stats: `src/gameplay/weapons/build-runtime.ts`
- Boss health thresholds, three-phase transitions and per-attack cooldowns: `src/gameplay/bosses/boss-runtime.ts`
- Region hazard telegraph/active cycles: `src/gameplay/regions/region-runtime.ts`

The Phaser run scene now consumes these modules for its selected character and region: region-specific enemy spawning, AI movement and shaped attack telegraphs, elemental weapon hits/reactions/status ticks (burn, poison, ice slow, dark vulnerability, spirit healing, timed lightning stun pulses and blood sustain), six-slot weapon/passive acquisition and upgrades, weapon-specific attacks, boss phase transitions/adds/health display, region hazard warnings, and pause-safe overlay timing. The scene accepts `characterId` and `regionId` in its scene start data; the current main menu still launches the default hunter and first region.

This is an integrated gameplay foundation, not completion of all GDD requirements. Region-specific maps and bespoke hazard mechanics, full character selection UI, all-region/boss playthroughs, weapon branches and special passive upgrades, final boss-chest interaction, persistent profile rewards, balance tuning, and browser/device playtesting remain outstanding. All in-scene visuals are temporary procedural shapes; no final art is claimed.

## Full content catalog status
The first-release data catalog defines all five hunters, five regions, 25 base enemies, five multi-phase bosses, twelve weapons, twelve passives and seven elements. The current run scene can be started with a chosen character and region, but the shipped menu currently selects only the defaults. Only the first region/boss is reachable through the current menu flow. See [CONTENT_CATALOG.md](CONTENT_CATALOG.md).
