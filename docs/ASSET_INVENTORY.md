# Asset Inventory and Art Direction

## Production frame

- Phaser 3, TypeScript and Vite; 2D high-detail dark-fantasy pixel art; 3/4 top-down; landscape.
- Reference viewport 1280×720. Pixel art uses nearest-neighbor filtering and stable bottom-center character/enemy anchors.
- Silhouette first, value separation second, ornament third. Telegraphs must never blend into floor decoration.
- Palette roles: charcoal/smoke backgrounds, restrained pale-gold UI, region-specific midtones, controlled saturated status/telegraph accents.
- Motion: weighty anticipation for heavy attacks; crisp recovery for agile actions; consistent proportions across frames.
- Exclude glossy generic mobile gradients, noisy silhouettes, baked text/logos, fake transparency, and recolors presented as unique creatures.

## Required families

The runtime asset registry defines 71 stable IDs across all first-release content. Source-frame targets: characters 64×64; base enemies 48×48; bosses 160×160; weapon effects/icons 48×48; passive and element icons 32×32; region background/landmark sources 512×512 or larger composed layers. These are targets, not claims that files exist. Animation states are listed per asset record.

## Provenance

Current entries are project-owned runtime vector placeholders, not production artwork. No third-party pack or paid generation was used. Final source, creator, license, attribution, modifications, dimensions, frame count, alpha, palette QA and in-engine review must be recorded per stable ID before an asset can become final.

## Art production gate

Approve a representative character/enemy target, produce coherent families, normalize to pixel grid and shared pivots, validate alpha/palette/frame consistency, inspect at native gameplay scale and in-engine, and keep all placeholders marked until technical and visual checks pass.


## Main menu presentation backdrop — temporary iteration 01

- File: `public/assets/ui/veil-menu-backdrop.svg`.
- Composition: moonlit gothic skyline on the right, layered mountain silhouettes, a broken stone approach/bridge, foreground arch fragments, distant torchlight, and a lone hunter silhouette.
- Layout intent: keep the left third visually quiet and dark so the real Phaser menu controls remain legible; reserve the upper-right sky for the game title.
- Provenance: original hand-authored SVG composition for this project; no third-party image, logo, watermark, studio credit, or baked-in menu text.
- Status: presentation placeholder / iteration asset, **not final pixel art**. It is a visual direction test and may be refined or replaced during the later approved final-art phase.
- QA still required: inspect the rendered 1280×720 canvas and representative mobile landscape scaling; verify menu text contrast and all pointer/touch/gamepad targets in-engine.


## UI art refresh — 2026-11-22

| Stable key | File | Role | Technical format | Source / licence | State |
|---|---|---|---|---|---|
| `ui.hunter-portraits` | `public/assets/ui/hunter-portraits.svg` | Five-frame portrait strip in canonical character order from `src/data/characters.ts` | SVG spritesheet, 800×160, 160×160 frames, crisp edges | Original hand-authored project SVG; project-owned, no third-party source | INTEGRATED_UNVERIFIED |
| `ui.region-art` | `public/assets/ui/region-art.svg` | Five-frame region illustration strip in canonical region order from `src/data/regions.ts` | SVG spritesheet, 1280×160, 256×160 frames, crisp edges | Original hand-authored project SVG; project-owned, no third-party source | INTEGRATED_UNVERIFIED |


| `ui.game-over-backdrop` | `public/assets/ui/game-over-backdrop.svg` | Defeat-only full-screen hooded warden and crimson eclipse backdrop; live UI/results remain Phaser text and controls | SVG, 1280×720, single frame | Original hand-authored project SVG; project-owned, no third-party source | INTEGRATED_UNVERIFIED |

These navigation illustrations are original stylized pixel-art UI assets. They are not final in-world character/environment animation assets and do not close the remaining Stage 5 production-art requirements. The original seven approved design PNGs remain unchanged.
