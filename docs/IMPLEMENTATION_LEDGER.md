# BEYOND THE VEIL — IMPLEMENTATION LEDGER

Source of truth: Game Design Document.md (Sections 1–30) and PLAN.md. Every requirement must be independently verifiable; a section heading is not completion.

Allowed states: NOT_STARTED · IN_PROGRESS · IMPLEMENTED_UNVERIFIED · VERIFIED · BLOCKED · DEFERRED_WITH_APPROVAL

## Atomic requirement inventory

| ID | Requirement | GDD source | Acceptance criteria | State | Implementation references | Verification evidence | Notes |
|---|---|---|---|---|---|---|---|
| CORE-01 | Offline-first single-player runtime | §1, §2, §22 | Playable without account/network; local persistence. | NOT_STARTED | - | - | - |
| CORE-02 | Phaser 3 + TypeScript + Vite | §1, §22 | Strict typecheck, production build and Phaser boot pass. | IMPLEMENTED_UNVERIFIED | package.json; tsconfig.json; src/main.ts; src/game/config/game-config.ts | CI pending | No local browser runtime in this session. |
| CORE-03 | Landscape 3/4 top-down presentation | §1, §19 | Responsive landscape camera and gameplay framing. | NOT_STARTED | - | - | - |
| RUN-01 | 15-minute standard run | §2, §7 | Pacing bands, timer, final boss and result flow. | IN_PROGRESS | src/game/scenes/RunScene.ts | Runtime/CI pending | Timer exists; full director and final boss do not. |
| RUN-02 | Run/profile state separation | §2, §15, §22 | Temporary power is lost on defeat; permanent profile rewards persist. | NOT_STARTED | - | - | - |
| RUN-03 | Dash and brief immunity | §6 | Directional burst, cooldown and immunity verified. | IN_PROGRESS | src/game/scenes/RunScene.ts | Runtime pending | Initial implementation. |
| RUN-04 | Character active ability | §5.1, §6 | Manual cooldown ability distinct from automatic attacks. | IN_PROGRESS | src/game/scenes/RunScene.ts | Runtime pending | Starting hunter only. |
| RUN-05 | XP pickup and level-up choices | §13 | XP overflow, queued levels and four choices work. | IN_PROGRESS | src/gameplay/run/run-model.ts; src/game/scenes/RunScene.ts | tests/run-model.test.mjs | Pure rules tested in CI pending; UI runtime pending. |
| RUN-06 | Reroll, banish and skip | §13.1 | Limited-use options and unlock rules work. | NOT_STARTED | - | - | - |
| RUN-07 | Wave director and run events | §7 | Spawn pacing, elite/event triggers and fair caps work. | NOT_STARTED | - | - | - |
| RUN-08 | Weapon evolution | §10.3 | Max weapon + required passive + boss chest changes behavior. | NOT_STARTED | - | - | - |
| RUN-09 | Survival, Boss Hunt, challenges, Endless and New Game+ | §7.3, §17 | Each mode has real rules, unlocks and results. | NOT_STARTED | - | - | - |
| CHAR-01 | Lanetli Avcı | §5 | Distinct stats, active skill, weapon, mastery, story and cosmetics. | IN_PROGRESS | src/data/characters.ts; src/game/scenes/RunScene.ts | Runtime pending | Starting identity only. |
| CHAR-02 | Kara Şövalye | §5 | Distinct stats, active skill, weapon, mastery, story and cosmetics. | NOT_STARTED | - | - | - |
| CHAR-03 | Ruh Büyücüsü | §5 | Distinct stats, active skill, weapon, mastery, story and cosmetics. | NOT_STARTED | - | - | - |
| CHAR-04 | Gölge Suikastçı | §5 | Distinct stats, active skill, weapon, mastery, story and cosmetics. | NOT_STARTED | - | - | - |
| CHAR-05 | Kan Rahibesi | §5 | Distinct stats, active skill, weapon, mastery, story and cosmetics. | NOT_STARTED | - | - | - |
| REGION-01 | Lanetli Orman | §4 | Unique atmosphere, enemy pool, elites, boss, music, hazards, exploration, rewards and lore. | NOT_STARTED | - | - | - |
| REGION-02 | Unutulmuş Mezarlık | §4 | Unique atmosphere, enemy pool, elites, boss, music, hazards, exploration, rewards and lore. | NOT_STARTED | - | - | - |
| REGION-03 | Derin Zindan | §4 | Unique atmosphere, enemy pool, elites, boss, music, hazards, exploration, rewards and lore. | NOT_STARTED | - | - | - |
| REGION-04 | Çürümüş Bataklık | §4 | Unique atmosphere, enemy pool, elites, boss, music, hazards, exploration, rewards and lore. | NOT_STARTED | - | - | - |
| REGION-05 | Lanetli Kale | §4 | Unique atmosphere, enemy pool, elites, boss, music, hazards, exploration, rewards and lore. | NOT_STARTED | - | - | - |
| ENEMY-01 | Distinct base enemy 01 | §8 | Unique behavior, attack, telegraph, stats, animation, region placement and reward. | NOT_STARTED | - | - | - |
| ENEMY-02 | Distinct base enemy 02 | §8 | Unique behavior, attack, telegraph, stats, animation, region placement and reward. | NOT_STARTED | - | - | - |
| ENEMY-03 | Distinct base enemy 03 | §8 | Unique behavior, attack, telegraph, stats, animation, region placement and reward. | NOT_STARTED | - | - | - |
| ENEMY-04 | Distinct base enemy 04 | §8 | Unique behavior, attack, telegraph, stats, animation, region placement and reward. | NOT_STARTED | - | - | - |
| ENEMY-05 | Distinct base enemy 05 | §8 | Unique behavior, attack, telegraph, stats, animation, region placement and reward. | NOT_STARTED | - | - | - |
| ENEMY-06 | Distinct base enemy 06 | §8 | Unique behavior, attack, telegraph, stats, animation, region placement and reward. | NOT_STARTED | - | - | - |
| ENEMY-07 | Distinct base enemy 07 | §8 | Unique behavior, attack, telegraph, stats, animation, region placement and reward. | NOT_STARTED | - | - | - |
| ENEMY-08 | Distinct base enemy 08 | §8 | Unique behavior, attack, telegraph, stats, animation, region placement and reward. | NOT_STARTED | - | - | - |
| ENEMY-09 | Distinct base enemy 09 | §8 | Unique behavior, attack, telegraph, stats, animation, region placement and reward. | NOT_STARTED | - | - | - |
| ENEMY-10 | Distinct base enemy 10 | §8 | Unique behavior, attack, telegraph, stats, animation, region placement and reward. | NOT_STARTED | - | - | - |
| ENEMY-11 | Distinct base enemy 11 | §8 | Unique behavior, attack, telegraph, stats, animation, region placement and reward. | NOT_STARTED | - | - | - |
| ENEMY-12 | Distinct base enemy 12 | §8 | Unique behavior, attack, telegraph, stats, animation, region placement and reward. | NOT_STARTED | - | - | - |
| ENEMY-13 | Distinct base enemy 13 | §8 | Unique behavior, attack, telegraph, stats, animation, region placement and reward. | NOT_STARTED | - | - | - |
| ENEMY-14 | Distinct base enemy 14 | §8 | Unique behavior, attack, telegraph, stats, animation, region placement and reward. | NOT_STARTED | - | - | - |
| ENEMY-15 | Distinct base enemy 15 | §8 | Unique behavior, attack, telegraph, stats, animation, region placement and reward. | NOT_STARTED | - | - | - |
| ENEMY-16 | Distinct base enemy 16 | §8 | Unique behavior, attack, telegraph, stats, animation, region placement and reward. | NOT_STARTED | - | - | - |
| ENEMY-17 | Distinct base enemy 17 | §8 | Unique behavior, attack, telegraph, stats, animation, region placement and reward. | NOT_STARTED | - | - | - |
| ENEMY-18 | Distinct base enemy 18 | §8 | Unique behavior, attack, telegraph, stats, animation, region placement and reward. | NOT_STARTED | - | - | - |
| ENEMY-19 | Distinct base enemy 19 | §8 | Unique behavior, attack, telegraph, stats, animation, region placement and reward. | NOT_STARTED | - | - | - |
| ENEMY-20 | Distinct base enemy 20 | §8 | Unique behavior, attack, telegraph, stats, animation, region placement and reward. | NOT_STARTED | - | - | - |
| ENEMY-21 | Distinct base enemy 21 | §8 | Unique behavior, attack, telegraph, stats, animation, region placement and reward. | NOT_STARTED | - | - | - |
| ENEMY-22 | Distinct base enemy 22 | §8 | Unique behavior, attack, telegraph, stats, animation, region placement and reward. | NOT_STARTED | - | - | - |
| ENEMY-23 | Distinct base enemy 23 | §8 | Unique behavior, attack, telegraph, stats, animation, region placement and reward. | NOT_STARTED | - | - | - |
| ENEMY-24 | Distinct base enemy 24 | §8 | Unique behavior, attack, telegraph, stats, animation, region placement and reward. | NOT_STARTED | - | - | - |
| ENEMY-25 | Distinct base enemy 25 | §8 | Unique behavior, attack, telegraph, stats, animation, region placement and reward. | NOT_STARTED | - | - | - |
| BOSS-01 | Major boss 1 | §9 | Unique arena, multiple phases, attacks, telegraphs, adds, elements, rewards and story. | NOT_STARTED | - | - | - |
| BOSS-02 | Major boss 2 | §9 | Unique arena, multiple phases, attacks, telegraphs, adds, elements, rewards and story. | NOT_STARTED | - | - | - |
| BOSS-03 | Major boss 3 | §9 | Unique arena, multiple phases, attacks, telegraphs, adds, elements, rewards and story. | NOT_STARTED | - | - | - |
| BOSS-04 | Major boss 4 | §9 | Unique arena, multiple phases, attacks, telegraphs, adds, elements, rewards and story. | NOT_STARTED | - | - | - |
| BOSS-05 | Major boss 5 | §9 | Unique arena, multiple phases, attacks, telegraphs, adds, elements, rewards and story. | NOT_STARTED | - | - | - |
| WEAPON-01 | Base weapon 1 | §10 | Distinct automatic attack, feedback, levels, branches and behavior-changing evolution. | NOT_STARTED | - | - | - |
| WEAPON-02 | Base weapon 2 | §10 | Distinct automatic attack, feedback, levels, branches and behavior-changing evolution. | NOT_STARTED | - | - | - |
| WEAPON-03 | Base weapon 3 | §10 | Distinct automatic attack, feedback, levels, branches and behavior-changing evolution. | NOT_STARTED | - | - | - |
| WEAPON-04 | Base weapon 4 | §10 | Distinct automatic attack, feedback, levels, branches and behavior-changing evolution. | NOT_STARTED | - | - | - |
| WEAPON-05 | Base weapon 5 | §10 | Distinct automatic attack, feedback, levels, branches and behavior-changing evolution. | NOT_STARTED | - | - | - |
| WEAPON-06 | Base weapon 6 | §10 | Distinct automatic attack, feedback, levels, branches and behavior-changing evolution. | NOT_STARTED | - | - | - |
| WEAPON-07 | Base weapon 7 | §10 | Distinct automatic attack, feedback, levels, branches and behavior-changing evolution. | NOT_STARTED | - | - | - |
| WEAPON-08 | Base weapon 8 | §10 | Distinct automatic attack, feedback, levels, branches and behavior-changing evolution. | NOT_STARTED | - | - | - |
| WEAPON-09 | Base weapon 9 | §10 | Distinct automatic attack, feedback, levels, branches and behavior-changing evolution. | NOT_STARTED | - | - | - |
| WEAPON-10 | Base weapon 10 | §10 | Distinct automatic attack, feedback, levels, branches and behavior-changing evolution. | NOT_STARTED | - | - | - |
| WEAPON-11 | Base weapon 11 | §10 | Distinct automatic attack, feedback, levels, branches and behavior-changing evolution. | NOT_STARTED | - | - | - |
| WEAPON-12 | Base weapon 12 | §10 | Distinct automatic attack, feedback, levels, branches and behavior-changing evolution. | NOT_STARTED | - | - | - |
| PASSIVE-01 | Passive item 1 | §11 | Distinct effect, levels, special upgrades and synergies. | NOT_STARTED | - | - | - |
| PASSIVE-02 | Passive item 2 | §11 | Distinct effect, levels, special upgrades and synergies. | NOT_STARTED | - | - | - |
| PASSIVE-03 | Passive item 3 | §11 | Distinct effect, levels, special upgrades and synergies. | NOT_STARTED | - | - | - |
| PASSIVE-04 | Passive item 4 | §11 | Distinct effect, levels, special upgrades and synergies. | NOT_STARTED | - | - | - |
| PASSIVE-05 | Passive item 5 | §11 | Distinct effect, levels, special upgrades and synergies. | NOT_STARTED | - | - | - |
| PASSIVE-06 | Passive item 6 | §11 | Distinct effect, levels, special upgrades and synergies. | NOT_STARTED | - | - | - |
| PASSIVE-07 | Passive item 7 | §11 | Distinct effect, levels, special upgrades and synergies. | NOT_STARTED | - | - | - |
| PASSIVE-08 | Passive item 8 | §11 | Distinct effect, levels, special upgrades and synergies. | NOT_STARTED | - | - | - |
| PASSIVE-09 | Passive item 9 | §11 | Distinct effect, levels, special upgrades and synergies. | NOT_STARTED | - | - | - |
| PASSIVE-10 | Passive item 10 | §11 | Distinct effect, levels, special upgrades and synergies. | NOT_STARTED | - | - | - |
| PASSIVE-11 | Passive item 11 | §11 | Distinct effect, levels, special upgrades and synergies. | NOT_STARTED | - | - | - |
| PASSIVE-12 | Passive item 12 | §11 | Distinct effect, levels, special upgrades and synergies. | NOT_STARTED | - | - | - |
| ELEM-01 | Ateş | §12 | Buildup, threshold/status, resistance and tested interactions. | NOT_STARTED | - | - | - |
| ELEM-02 | Buz | §12 | Buildup, threshold/status, resistance and tested interactions. | NOT_STARTED | - | - | - |
| ELEM-03 | Zehir | §12 | Buildup, threshold/status, resistance and tested interactions. | NOT_STARTED | - | - | - |
| ELEM-04 | Karanlık | §12 | Buildup, threshold/status, resistance and tested interactions. | NOT_STARTED | - | - | - |
| ELEM-05 | Ruh | §12 | Buildup, threshold/status, resistance and tested interactions. | NOT_STARTED | - | - | - |
| ELEM-06 | Yıldırım | §12 | Buildup, threshold/status, resistance and tested interactions. | NOT_STARTED | - | - | - |
| ELEM-07 | Kan | §12 | Buildup, threshold/status, resistance and tested interactions. | NOT_STARTED | - | - | - |
| PROG-01 | Ruh Özü and permanent upgrades | §15 | Currency persists; capped upgrades and respec work. | NOT_STARTED | - | - | - |
| PROG-02 | Hunter Hub and NPC services | §14.4, §15 | Blacksmith, alchemist, relic master and merchants unlock. | NOT_STARTED | - | - | - |
| PROG-03 | Relics, sets and crafting | §14 | Build-changing relics, materials, variants and recipes. | NOT_STARTED | - | - | - |
| PROG-04 | Equipment profiles | §14.3 | Named character loadouts can be saved, compared and equipped. | NOT_STARTED | - | - | - |
| PROG-05 | Quests and branching choices | §3.3, §16 | Quest categories, branching outcomes and archive-safe content work. | NOT_STARTED | - | - | - |
| PROG-06 | Mastery, achievements and collection | §5.2, §15.3, §17 | Mastery, cosmetics, archive and rewards persist. | NOT_STARTED | - | - | - |
| PROG-07 | Endgame | §17 | NG+, endless difficulty, boss variants, secrets and prestige. | NOT_STARTED | - | - | - |
| WORLD-01 | Environmental storytelling and lore archive | §3 | Camps, graves, inscriptions, NPCs, boss traces and discovered lore. | NOT_STARTED | - | - | - |
| WORLD-02 | Branching story outcomes | §3.3 | Choices alter NPC outcomes, paths, bosses, rewards and endings. | NOT_STARTED | - | - | - |
| WORLD-03 | Organic region maps | §4.6 | Hand-authored landmarks, controlled procedural placement and secrets. | NOT_STARTED | - | - | - |
| UI-01 | Main menu and navigation | §18 | All destinations navigate to functional screens. | IN_PROGRESS | src/game/scenes/MainMenuScene.ts; src/game/scenes/RunScene.ts | Runtime pending | Only new run and basic overlays. |
| UI-02 | Hunter Hub UI | §14.4, §18 | Services reflect saved profile state. | NOT_STARTED | - | - | - |
| UI-03 | Character gallery and selection | §5, §18 | All hunters show unlock, stats, abilities and selection. | NOT_STARTED | - | - | - |
| UI-04 | Region and difficulty selection | §4, §7, §18 | Five regions and Normal/Hard/Nightmare progression. | NOT_STARTED | - | - | - |
| UI-05 | Run preparation and loadout | §2, §14, §18 | Profiles and pre-run choices work. | NOT_STARTED | - | - | - |
| UI-06 | In-run HUD | §18 | Health, XP, timer, cooldowns and prompts readable. | IN_PROGRESS | src/game/scenes/RunScene.ts | Runtime pending | Initial HUD only. |
| UI-07 | Pause, level-up, event and boss overlays | §7, §9, §13, §18 | Overlays pause correctly and own input. | IN_PROGRESS | src/game/scenes/RunScene.ts | Runtime pending | Pause and level-up only. |
| UI-08 | Victory, defeat and result flow | §2, §18 | Rewards, progression and navigation work. | IN_PROGRESS | src/game/scenes/RunScene.ts | Runtime pending | Temporary result panel. |
| UI-09 | Settings and input customization | §6, §18, §21 | Audio, graphics, bindings and touch settings persist. | NOT_STARTED | - | - | - |
| VIS-01 | High-detail dark-fantasy pixel art and animation | §18, §19 | Final art, animation, anchors, scale and combat readability. | NOT_STARTED | - | - | - |
| VIS-02 | Asset IDs, inventory and provenance | §19, PLAN §4 | Every asset has stable ID, dimensions, source, license and status. | NOT_STARTED | - | - | - |
| AUDIO-01 | Sound effects and adaptive music | §20 | Combat/UI sounds and region/boss tracks respond to events. | NOT_STARTED | - | - | - |
| ACCESS-01 | Accessibility | §21 | Text scale, contrast, colorblind-safe cues and motion/flash controls. | NOT_STARTED | - | - | - |
| LOC-01 | Turkish and English localization | §25 | All visible text uses translation keys and both languages complete. | NOT_STARTED | - | - | - |
| SAVE-01 | Local save, backup and migration | §22 | Versioned save, backups, corruption recovery and import/export. | NOT_STARTED | - | - | - |
| PLATFORM-01 | Responsive offline Web build | §26 | Desktop/mobile landscape, input and offline behavior verified. | NOT_STARTED | - | - | - |
| PLATFORM-02 | Capacitor Android build | §26 | Android package builds and is tested on a physical device. | NOT_STARTED | - | - | - |
| QA-01 | Automated gameplay/content tests | §24 | Unit, integration, schema, asset and regression checks pass. | IN_PROGRESS | tests/run-model.test.mjs; .github/workflows/ci.yml | CI pending | Initial pure-rule tests only. |
| QA-02 | Runtime, performance and accessibility audit | §24, §29 | Browser/device flows, long sessions, memory and accessibility checked. | NOT_STARTED | - | - | - |
| RELEASE-01 | Full GDD acceptance gate | §26, §29, §30 | All in-scope requirements VERIFIED; no critical defects; Web/Android verified. | NOT_STARTED | - | - | - |

## GDD coverage audit

| GDD section | Requirement IDs | Assessment |
|---|---|---|
| §1 Vision | CORE-01..03 | Identity/platform documented; runtime pending. |
| §2 Core loop | RUN-01..05, PROG-01 | Partial playable loop; meta progression absent. |
| §3 World and story | WORLD-01..02 | Lore and branching choices absent. |
| §4 Regions | REGION-01..05, WORLD-03 | Five targets tracked; none implemented. |
| §5 Characters | CHAR-01..05 | Starting hunter only; complete kits remain. |
| §6 Combat and movement | RUN-03..04, WEAPON-01..12, UI-09 | Basic movement/ability/weapon in progress. |
| §7 Run system | RUN-01, RUN-07, RUN-09 | Timer and simple spawns only. |
| §8 Enemies | ENEMY-01..25 | Three temporary patterns; full roster absent. |
| §9 Bosses | BOSS-01..05 | Not implemented. |
| §10 Weapons | WEAPON-01..12, RUN-08 | One starter weapon; evolution absent. |
| §11 Passives | PASSIVE-01..12 | Not implemented. |
| §12 Elements | ELEM-01..07 | Not implemented. |
| §13 XP and level-up | RUN-05..06 | XP/choices in progress; RNG controls absent. |
| §14 Relics/crafting/equipment | PROG-02..04 | Not implemented. |
| §15 Economy/progression | PROG-01, PROG-06 | Not implemented. |
| §16 Quests/challenges | PROG-05 | Not implemented. |
| §17 Endgame | PROG-07, RUN-09 | Not implemented. |
| §18 UI/UX | UI-01..09 | Menu, HUD and basic overlays in progress. |
| §19 Visual standards | VIS-01..02 | Vector placeholders only. |
| §20 Audio | AUDIO-01 | Not implemented. |
| §21 Accessibility | ACCESS-01 | Not implemented. |
| §22 Technical architecture | CORE-01..03, SAVE-01 | Engine foundation; persistence pending. |
| §23 Monetization | CORE-01 | No monetization planned; no ads/paid dependencies. |
| §24 QA | QA-01..02 | Initial tests and CI being established. |
| §25 Localization | LOC-01 | Not implemented. |
| §26 Platform/release | PLATFORM-01..02, RELEASE-01 | Web first; Android later. |
| §27 Initial content counts | CHAR-01..05, REGION-01..05, ENEMY-01..25, BOSS-01..05, WEAPON-01..12, PASSIVE-01..12, ELEM-01..07 | All target counts explicit; mostly unimplemented. |
| §28 Production priorities | All IDs | Tracked; evidence governs completion. |
| §29 Quality acceptance | QA-02, RELEASE-01 | Not verified. |
| §30 Success definition | RELEASE-01 | NOT COMPLETE. |

## Required content counts

| Type | GDD target | Current implementation | Verified distinct/functioning |
|---|---:|---:|---:|
| Playable characters | 5 | 1 | 0 |
| Regions | 5 | 0 | 0 |
| Base enemies | 25 | 3 temporary patterns | 0 |
| Main bosses | 5 | 0 | 0 |
| Weapons | 12 | 1 temporary weapon | 0 |
| Passives | 12 | 0 | 0 |
| Elements | 7 | 0 | 0 |

These are honest implementation counts, not release-completion claims. Temporary enemy patterns and the starter weapon do not count as final content.

## Verification register

| Date | Commit | Check | Command/scenario | Result | Evidence |
|---|---|---|---|---|---|
| Pending | Pending | Typecheck/tests/build | npm run typecheck; npm test; npm run build | PENDING CI | .github/workflows/ci.yml |

## Asset status

Vector shapes are temporary placeholders. No final art/audio is claimed. The full stable-ID asset inventory, specifications, provenance and licenses remain outstanding.

## Session log

| Date | Starting commit | Work | Checks actually run | Next |
|---|---|---|---|---|
| 2026-11-18 | 2548cfcc5efa31cfeaef2796abc7ac269eaaf783 | Added the first playable foundation, 113 atomic ledger entries, design specs, architecture notes, pure gameplay tests and a CI workflow. Commits: 73d9447b225a7efd18895594f20eb6635d8703ae and ea1de086273d57fd57aa6fb3ef6ce1b71b60a2fa. | Not run locally: container network could not reach GitHub and Phaser dependencies are unavailable. No Actions run is visible yet. | Trigger/check CI, fix any failures, then continue full-game systems. |

Overall status: NOT COMPLETE. Full GDD remains the target.
