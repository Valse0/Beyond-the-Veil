# Content Catalog — First Release

Status: Designed; gameplay integration and runtime verification pending. All numeric values are initial tuning targets, not playtest-verified balance.

## Hunters

| Character | Combat identity | Starting weapon | Passive | Active ability |
|---|---|---|---|---|
| Lanetli Avcı | Balanced | Eşik Kıvılcımı | Ruh Kabı | Ruh Darbesi |
| Kara Şövalye | Heavy / defense | Mezar Yarıcı | Mezar Zırhı | Kara Siper |
| Ruh Büyücüsü | Area / spirit | Ruh Feneri | Ruh Kabı | Ruh Yarığı |
| Gölge Suikastçı | Speed / critical | Yemin Mızrağı | Avcı Çizmeleri | Gölgeli Geçiş |
| Kan Rahibesi | Health sacrifice / lifesteal | Kan Tezgâhı | Kan Emaneti | Kızıl Ayin |

Each hunter has distinct base stats, active cooldown/effect, weapon and element synergies, mastery milestones, cosmetic rewards and story hook. Cosmetics provide no gameplay advantage.

## Regions, rosters and bosses

| Region | Five base enemies | Boss | Signature hazards |
|---|---|---|---|
| Lanetli Orman | Kök Tutsağı, Diken Sıçrayıcısı, Spor Tüküren, Mezar Çiçeği Yuvası, Diken Sırtlı Koç | Diken Ana | Poison plants, thorn roots, hidden nests |
| Unutulmuş Mezarlık | Mezar Muhafızı, Feryat Eden Ruh, Kemik Kaydıran, Yas Akoliti, Mahzen Sıçrayıcısı | Kemik Kral | Cursed graves, spirit bursts, temporary portals |
| Derin Zindan | Pirinç Nöbetçi, Kor Havanı, Zincir Düellocusu, Tünel Kazıcısı, Rün Sabotajcısı | Ocak Devi | Fire traps, spike floors, moving machinery |
| Çürümüş Bataklık | Bataklık Pusu Avcısı, Bataklık Sülüğü, Çürük Gaz Kesesi, Çamur Cadısı, Sis Ağ Örücüsü | Bataklık Kâhini | Toxic water, slowing mud, collapsing ground |
| Lanetli Kale | Perde Avcısı, Mühür Tazısı, Ayna Taklitçisi, Ruh Çapası, Alacakaranlık Hortlağı | Yazılmamış Hükümdar | Cursed seals, dark energy, shifting gates |

Each enemy has its own behavior key, attack kind, telegraph cue, counterplay rule, reward, element and mutation slots. Each region has four distinct hazards, two exploration discoveries and a distinct elite contract.

## Boss encounter contracts

Every boss has a dedicated arena feature, three health-gated phases, at least two telegraphed attacks per phase, explicit counterplay, adds, elemental weakness/resistance, story and reward. GDD target duration remains 3–5 minutes; actual balance requires playtesting.

- Diken Ana: destroy root pillars to stop healing; evade root cages; fire exposes the heart.
- Kemik Kral: break grave stones; navigate coffin lanes; lightning/spirit break the last shield.
- Ocak Devi: operate gear platforms; read steam/lava lanes; ice slows gears and exposes the core.
- Bataklık Kâhini: rotate between clean islands; clear spores; fire/lightning interrupt the submerged phase.
- Yazılmamış Hükümdar: identify real seal stones and shadow copies; read shifting routes; spirit/blood open the final seal.

## Weapons and passives

Twelve weapon behavior contracts are separate: homing projectile, cleaving arc, piercing thrust, chain lightning, orbiting blades, area seed, spirit seeker, life tether, fan volley, defensive pulse, delayed mortar and delayed sigil. Each weapon has five level rows, two branches and one evolution requiring a specific passive; evolution descriptions explicitly change attack behavior.

Twelve passives cover attack, elemental buildup, critical, XP, defense, movement, healing and special mechanics. Each has five effect rows, a special upgrade and explicit transformations where applicable. Six weapon and six passive slots remain the GDD target.

## Elements

| Element | Status | Main effect |
|---|---|---|
| Ateş | Yanma | Damage over time and threshold burst |
| Buz | Donma | Slow, freeze and heavy-hit shatter |
| Zehir | Zehirlenme | Stacking damage and defense reduction |
| Karanlık | Lanet | Stacking defense reduction |
| Ruh | Ruh Emili | Energy drain, shield and echo |
| Yıldırım | Sersemleme | Short stun and chain propagation |
| Kan | Kanama | Stacking bleed and limited lifesteal |

Cross-element reactions are data-defined. Enemy/boss resistance is constrained to -50%..60%; a resistance cannot invalidate an entire build.

## Asset registry

src/data/asset-registry.ts defines 71 stable IDs: 5 characters, 25 enemies, 5 bosses, 12 weapons, 12 passives, 7 elements and 5 regions. It records dimensions, anchor, nearest filtering, required animation states, creator/license note and approval flags. Every entry remains an explicit placeholder with no final file path; this is not final art.

## Implementation boundary

Definitions live in src/data; shared contracts live in src/core/types/content.ts; validation lives in src/gameplay/content/content-validation.ts. The catalog is design-ready data, not yet wired into all runtime attacks, animations, progression or region scenes.


## Relics

The initial relic catalog contains ten items: five boss drops and five exploration rewards, one pair per region. Rarities are Rare, Epic and Legendary. Each regional pair activates a two-piece set bonus; each relic also carries an elemental or character affinity. Stable IDs and effects live in `src/data/relics.ts`; pure equipment/stat calculations live in `src/gameplay/relics/relic-runtime.ts`.

| Region | Boss relic | Exploration relic | Set |
|---|---|---|---|
| Lanetli Orman | `matriarch-seed` | `forest-heart` | Diken Ahdi |
| Unutulmuş Mezarlık | `king-crown-shard` | `grave-lament` | Sessiz Krallık |
| Derin Zindan | `furnace-heart` | `dungeon-gear` | Son Dövme |
| Çürümüş Bataklık | `oracle-eye` | `swamp-vessel` | Boğulmuş Kehanet |
| Lanetli Kale | `unwritten-crown` | `castle-shard` | Perde Alameti |

Boss relics are claimed by opening the boss chest. Exploration relics are claimed by completing the region's treasure-hunt event. The save stores an unlimited owned collection and a three-slot unique equipped loadout. These are gameplay/data systems only; the collection screen and Relic Master NPC interface remain pending.


## Crafting materials and recipes

The initial crafting catalog contains five regional materials and five one-time recipes. Materials are earned by completing the region's treasure-hunt event; each successful event grants one material and each inventory stack is capped at 99.

| Region | Material | Recipe | Permanent weapon variant |
|---|---|---|---|
| Lanetli Orman | `living-root` — Canlı Kök | Yeşil Veba | Diken Tohumu — strengthened Yayılım |
| Unutulmuş Mezarlık | `ossuary-dust` — Kemik Tozu | Kemik Kasırgası | Mezar Yarıcı — strengthened Yayılım |
| Derin Zindan | `furnace-ingot` — Ocak Külçesi | Ocak Felaketi | Rün Havanı — strengthened Yayılım |
| Çürümüş Bataklık | `bog-crystal` — Bataklık Kristali | Bataklık Ağı | Kan Tezgâhı — strengthened Yayılım |
| Lanetli Kale | `veil-thread` — Perde İpliği | Perde Yarığı | Tutulma Mührü — strengthened Yayılım |

Each recipe costs two matching regional materials and 140–180 Ruh Özü. Crafting is a one-time, validated transaction; the permanent variant unlock strengthens its weapon's Yayılım branch when selected. Stable definitions live in `src/data/crafting.ts`; pure inventory and recipe rules live in `src/gameplay/crafting/crafting-runtime.ts`. Material counts and unlocked variant IDs persist in save schema v4. The Blacksmith service and player-facing crafting screen are not part of this data/runtime package.


## Character mastery rewards

All five hunters use the same initial progression curve: 25 accumulated mastery points unlock level 2, 100 points unlock level 5, and 250 points unlock level 10. A run grants 3 points, one additional point per 10 kills, and 10 additional points for a boss victory; points persist after defeat.

| Hunter | Level 2 title | Level 5 ability variant | Level 10 cosmetic reward |
|---|---|---|---|
| Lanetli Avcı | `hunter-title` | `pulse-alt` | `ashen-trail` |
| Kara Şövalye | `knight-title` | `aegis-alt` | `iron-oath-skin` |
| Ruh Büyücüsü | `mage-title` | `rift-alt` | `astral-mantle` |
| Gölge Suikastçı | `assassin-title` | `shade-alt` | `night-veil` |
| Kan Rahibesi | `priestess-title` | `rite-alt` | `scarlet-regalia` |

The reward IDs are sourced from each hunter's `mastery` data. Earned reward IDs are stored separately from per-hunter mastery-point totals. Level-ten cosmetic rewards are also added to the persistent cosmetic collection. This package implements progression and persistence only; reward presentation and alternate-ability selection remain later player-facing progression work.


## Equipment profile rules

Equipment profiles are character-specific save data, not catalog content. Each unlocked hunter may save up to five named profiles. A profile selects any catalog weapon and passive as its starting build and up to three unique relics from the owned relic collection. The active profile is stored per hunter. Without an active profile, the hunter's authored starting weapon/passive and the existing globally equipped relics remain the run defaults. Profile management and build comparison are reserved for the Run Preparation / Loadout UI.


## Achievement catalog

The data-driven achievement catalog currently contains 13 milestones. Each entry has a stable ID, localized name/description, metric, threshold and one reward routed into the existing cosmetic, relic or weapon-variant collection. Save validation checks achievement IDs and metric data; progression tests verify reward routing against the authored content IDs.
