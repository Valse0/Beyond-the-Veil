# Gameplay Systems

This specification preserves the GDD. Values not fixed by it are initial tuning defaults, not final balance.

## Run
A standard Survival run targets 15 minutes: 0–3 minutes onboarding; 3–7 new enemy patterns and density; 7–11 elites, events and hazards; 11–14 advanced pressure; 14–15 final boss arrival. The Phaser scene now runs the selected region's spawn pool and starts its boss at 14:00; the timer can continue beyond 15:00 until the boss is defeated so the encounter is not cut short. Region selection UI, elite/event director and pacing playtests remain outstanding.

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


### Enemy behavior implementation pass

The run scene now applies authored enemy-specific combat rules rather than relying only on movement archetypes:

| Enemy | Live behavior added |
|---|---|
| Kök Tutsağı | Frontal physical resistance and readable forward cone attack |
| Diken Sıçrayıcısı | Timed pounce with a locked line telegraph |
| Spor Tüküren | Telegraph then persistent damaging spore field |
| Mezar Çiçeği Yuvası | Summons up to four linked root minions |
| Diken Sırtlı Koç | Direction-locked surge; a boundary crash briefly exposes it |
| Mezar Muhafızı | 65% frontal damage reduction |
| Feryat Eden Ruh | Aimed shot followed by a short untargetable fade |
| Kemik Kaydıran | Gains movement speed when grouped with other skitterers |
| Yas Akoliti | Periodically heals nearby enemies |
| Mahzen Sıçrayıcısı | Charge/leap movement with a landing telegraph |
| Pirinç Nöbetçi | Frontal armor can be broken by lightning or a rear attack |
| Kor Havanı | Mortar warning predicts the player's near-future position |
| Zincir Düellocusu | Timed parry stance; lightning interrupts it |
| Tünel Kazıcısı | Untargetable while burrowed, exposed after emerging |
| Rün Sabotajcısı | Delayed rune trap with an active damage window |
| Bataklık Pusu Avcısı | First ambush strike deals increased damage |
| Bataklık Sülüğü | Recovers health when its drain attack connects |
| Çürük Gaz Kesesi | Death explosion; radius/damage depend on whether it was primed |
| Çamur Cadısı | Hex field buffs nearby enemy attack damage |
| Sis Ağ Örücüsü | Telegraph then deploys a player-slowing web field |
| Perde Avcısı | Periodic short vanish windows |
| Mühür Tazısı | Leaves temporary frost patches that slow the player |
| Ayna Taklitçisi | Conceals itself at range and reveals when approached |
| Ruh Çapası | Reduces nearby allies' incoming damage |
| Alacakaranlık Hortlağı | Three-hit telegraphed combo, then a brief vulnerability window |

These mechanics are initial implementation values. The scene still uses procedural placeholder graphics; collision feel, spawn frequency, readability and balance need browser/device playtesting. Enemy-specific animation, audio, elite mutations and the complete map/arena interactions remain separate production work.

## Full content catalog status
The first-release data catalog defines all five hunters, five regions, 25 base enemies, five multi-phase bosses, twelve weapons, twelve passives and seven elements. The current run scene can be started with a chosen character and region, but the shipped menu currently selects only the defaults. Only the first region/boss is reachable through the current menu flow. See [CONTENT_CATALOG.md](CONTENT_CATALOG.md).


## Relics v1

The first executable relic set contains ten stable content IDs: five boss relics and five exploration relics, paired into one regional set per region. Each relic declares rarity, source, region, set, base effect, one character affinity and a two-piece set bonus. Element-tagged effects apply only to matching elemental weapon damage or buildup.

A profile can own any number of relics and equip at most three unique owned relics. Equipment is stored as stable IDs in the save profile. Boss relics enter the run reward queue only when the matching boss chest is opened; exploration relics are awarded by successfully completing that region's treasure-hunt event. Both are persisted with the run result, including a later run defeat, and duplicate acquisitions are idempotent.

Save schema v3 added `collections.relicIds` and `progression.equippedRelicIds`; schema v4 adds crafting material counts and permanent weapon-variant unlocks. Existing schema 0, 1, 2 and 3 profiles migrate while preserving all previously supported progress. Relic modifiers are applied to live run damage, attack cadence, maximum health, armor, movement, elemental buildup, critical chance, lifesteal, ability cooldown and magnet radius. The catalog and runtime are implemented; balance and a player-facing Relic Master/equipment interface remain separate work.


## Crafting v1

Five region-bound materials are awarded only when the run's treasure-hunt event is completed: Canlı Kök, Kemik Tozu, Ocak Külçesi, Bataklık Kristali and Perde İpliği. One material is granted per completed event and is persisted with run rewards even if the hunter later falls. Material stacks are capped at 99.

Five recipes each consume two matching regional materials and a region-tuned amount of Ruh Özü. A successful craft is a single validated save transaction: costs are deducted and one permanent weapon-variant ID is unlocked together; insufficient resources, unknown recipes and repeat crafts do not spend anything.

Crafted variants enhance the corresponding weapon's Yayılım branch when that branch is selected during a run. The ordinary two-branch choice remains intact; a crafted variant adds its authored modifiers to the selected branch. Variant ownership and material counts are stored in save schema v4. The crafting runtime is independent of Phaser; the player-facing Blacksmith/Relic Master service and crafting UI remain a later UI task.


## Character mastery v1

Each hunter has an independent persistent mastery-point total. Every completed run grants 3 baseline points, plus 1 point per full 10 kills, and a further 10 points for a boss victory. Defeat never removes earned mastery. The first authored thresholds are 25 points (mastery level 2), 100 points (level 5) and 250 points (level 10); the displayed level is derived from the accumulated points.

Each character's existing data-driven mastery reward IDs are granted once their matching milestone is reached. Level 2 grants the character title, level 5 unlocks the alternate active-ability variant, and level 10 unlocks the authored cosmetic reward. Reward IDs and cosmetic IDs persist independently of the current scene; no mastery UI or alternate-ability selection screen is introduced in this runtime package. Save schema v5 adds the permanent mastery-reward collection and migrates schema 0–4 without discarding mastery points, cosmetics, relics, materials or weapon variants. Save schema v6 adds named character-specific equipment profiles and active-profile selection while preserving all earlier progression.


## Equipment profiles v1

Each unlocked hunter can own up to five named equipment profiles. A profile stores a starting weapon ID, starting passive ID and up to three unique relic IDs. Weapon and passive IDs must exist in the authored catalogs; relics must already be owned. Names are trimmed, normalized and unique within that hunter.

The active profile is remembered independently for each hunter. At run creation, its starting weapon, passive and relic loadout replace that hunter's default starting pair and the globally equipped relic loadout for that run. If the hunter has no active profile, the existing character defaults and globally equipped relics are used unchanged. Profile data is stored as IDs only; profile presentation, comparison and one-touch selection remain part of the later loadout UI.

Save schema v6 adds progression.equipmentProfiles and progression.activeEquipmentProfileIds. Migrations from schema 0–5 initialize empty profile collections and preserve existing progression.


## Achievements (data and progression foundation)

The achievement catalog tracks completed runs, cumulative enemy defeats, boss victories, completed run events, distinct hunters and distinct regions. Progress is committed with the normal run-result save, including defeat results. Each achievement grants one authored reward into the existing cosmetic, relic or weapon-variant collection. Completion and reward grants are idempotent. The player-facing achievement archive and reward presentation are deferred to the later UI phase.


## Collection completion (progression foundation)

Six persistent collections are sourced directly from the authored content catalogs: 25 defeated enemy types, 12 weapons used (including the starting weapon), 10 owned relics, five region lore records, five hunter biographies and five level-ten mastery costumes. Enemy and weapon discoveries are committed at the run-result boundary; hunter biographies are recorded when that hunter completes a run; a region lore record is added after its boss victory; relics and mastery costumes reuse their existing permanent ownership/unlock collections.

Each completed collection unlocks its own named collection reward and achievement. Completing all six grants the final Archivist reward and achievement. Completion and rewards are idempotent. The collection archive UI, item previews, secret-item presentation and additional non-mastery costume catalog remain in the later UI/content phase.

Save schema v8 adds discovered enemy/weapon/biography IDs, completed collection IDs and collection reward IDs. Existing relic, lore and mastery reward data remains the source of truth for those collections. Migrations from schema 0–7 preserve prior profile and achievement progress while initializing only the new fields.
