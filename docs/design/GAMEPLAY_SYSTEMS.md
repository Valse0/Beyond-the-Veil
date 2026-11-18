# Gameplay Systems

This specification preserves the GDD. Values not fixed by it are initial tuning defaults, not final balance.

## Run
A standard Survival run targets 15 minutes: 0–3 minutes onboarding; 3–7 new enemy patterns and density; 7–11 elites, events and hazards; 11–14 advanced pressure; 14–15 final boss. The current foundation has a timer and simple spawn escalation; boss and event content remain later work.

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

## Current implementation status
One hunter, one projectile weapon, three temporary enemy patterns, XP, four upgrades, dash, active pulse and a 15-minute timer are the initial foundation. Placeholder shapes are not final art. The ledger remains authoritative for all outstanding requirements.


## Full content catalog status

The complete first-release data catalog now defines all five hunters, five regions, 25 base enemies, five multi-phase bosses, twelve weapons, twelve passives and seven elements. Each definition has stable IDs and typed cross-references. This is designed data only: combat AI, attack execution, boss phase transitions, element buildup/reactions, upgrade application and region hazards still need runtime integration. See [CONTENT_CATALOG.md](CONTENT_CATALOG.md).
