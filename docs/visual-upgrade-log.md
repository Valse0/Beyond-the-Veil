# Visual Upgrade Log — 2026-11-23

## Seven approved PNGs reviewed

All seven files under `beyond-the-veil-ui-design/` were opened as visual references. They are design targets, not runtime screenshots and are not copied as flat full-screen images.

| Design PNG | Runtime implementation after this pass | Remaining visual work |
|---|---|---|
| `01_main_menu.png` | Atmospheric SVG backdrop, real menu controls and save-backed Hunter Record panel | The title treatment/logo and exact menu composition still need a native-scale visual pass |
| `02_hunter_selection.png` | Reworked to a left portrait rail, large selected portrait, right-side hunter record and real detail/continue actions | Current portraits are stylized busts, not the full-body hero art shown in the reference |
| `03_region_selection.png` | Five larger region illustrations, selected-hunter context chip, difficulty and mode controls | Region art is still a simplified UI illustration strip, not final in-world environment art |
| `04_run_preparation.png` | Two-panel preparation layout with selected hunter portrait and region illustration, plus real equipment-profile choices | Weapon/passive/relic iconography and exact panel proportions can be refined |
| `05_gameplay_hud.png` | Compact hunter dossier, XP, centered timer, upper-right health/pause, quest panel and touch controls | In-world environment is still the existing prototype/procedural presentation rather than the reference's finished region art |
| `06_level_up.png` | Arena remains visible under the overlay; ornate dynamic upgrade cards with category symbols and existing live choices | Final bespoke upgrade icons and full production background art remain outstanding |
| `07_game_over.png` | Defeat-only crimson eclipse/warden illustration behind live run statistics and retry/menu controls | The new illustration is a project-authored SVG placeholder, not final pixel-art character art |

## Implemented

- Added original five-frame hunter portrait strip and five-frame region illustration strip.
- Added a dedicated defeat-screen illustration, registered and preloaded through the shared UI asset pipeline.
- Reworked hunter selection from five horizontal cards into the portrait-led composition from the approved reference.
- Enlarged region art and added the selected hunter context panel.
- Added hunter and region artwork to run preparation without changing profile selection.
- Reworked gameplay HUD hierarchy to separate the compact hunter/XP panel, timer and health/pause area.
- Restyled level-up choices as ornate cards while retaining dynamic choice generation and all reroll/banish/skip/selection actions.
- Added a defeat-specific illustrated result presentation; displayed statistics and rewards continue to come from actual run state and save results.
- Extended the visual preview workflow so all seven design PNGs are previewed, not only the first five.

## Preserved

- Phaser 3.85, scene flow, gameplay state, save schema and combat rules.
- Five canonical hunters and five canonical regions.
- 15-minute standard run and 14:00 boss timing.
- Existing equipment profiles, progression, real run-result and persisted-reward data.
- All seven approved design PNGs remain unchanged.
- No merge, release, public deployment, or main-branch change was performed.

## Verification

- Latest changes require the current GitHub Actions run to complete.
- Native-scale and in-engine visual review is still required before any asset is marked final.
- UI illustration strips and the new defeat backdrop are project-owned presentation assets, not final in-world character, enemy, boss, region-background or effects production art.
