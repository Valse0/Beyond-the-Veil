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

Each enemy has its own behavior key, attack kind, telegraph cue, counterplay rule, reward, element and mutation slots. Each region also has two hazards, two exploration discoveries and a distinct elite contract.

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
