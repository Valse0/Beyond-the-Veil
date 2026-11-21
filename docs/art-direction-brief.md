# Beyond the Veil — Art Direction Brief

## Game frame
- Player fantasy: a cursed hunter fighting through a collapsing dark-fantasy world.
- Core verbs: move, evade, auto-attack, choose upgrades, explore, survive and defeat bosses.
- Engine and renderer: Phaser 3.85, TypeScript, Vite; pixel-art rendering with nearest-neighbour filtering.
- Target platforms: landscape web/desktop, Android touch, desktop keyboard/mouse and gamepad, smart-TV browsers with supported remote keys.
- Camera/view/facing: 3/4 top-down; gameplay characters and enemies must read from above at small native sizes.
- Native viewport: 1280×720 logical canvas; responsive FIT scaling.
- Typical character asset: 64×64 base frame, bottom-centre anchor; enemy 48×48; boss 160×160; UI icons 32×32.

## Visual system
- Shape language: sharp gothic silhouettes, broken arches, narrow spires, layered stone, torn cloth and readable weapon profiles.
- Silhouette priorities: player first, elite/boss second, ordinary enemies third; hazards and pickups must remain distinct at a glance.
- Value structure: near-black navy shadows, blue-charcoal midtones, pale moonlit highlights and tightly controlled warm gold.
- Palette roles:
  - Abyss: #070A11
  - Deep slate: #111824
  - Raised panel: #171D28
  - Pale text: #E8E0D2
  - Muted text: #A5A7AD
  - Relic gold: #C6A56B
  - Spirit teal: #6FA9A0
  - Blood danger: #B85D67
- Materials: cold stone, worn iron, aged brass, damp earth, ash, frayed cloth and restrained spectral light.
- Edge treatment: crisp pixel clusters for game sprites; thin warm-metal strokes and cut corners for UI.
- Lighting: cool moonlight from upper-right; teal spectral accents; warm gold reserved for relics, rewards and selected states.
- Detail density: high in portraits and environments, simplified silhouettes in active combat.
- Motion character: deliberate menu transitions, short tactile focus pulses, readable hit flashes and restrained screen shake.
- Explicit exclusions: glossy mobile-game gradients, generic sci-fi HUD, emoji icons, overdecorated frames, tiny TV text, and color-only status cues.

## Technical contract
- Sprite filtering: nearest; no mipmaps for pixel art; integer-friendly scale where practical.
- Alpha: transparent character/enemy/effect sprites; environment backgrounds may be opaque.
- Anchors: characters/enemies bottom-centre; UI icons centre; region backgrounds centre.
- Keep gameplay logic, content IDs and visual asset IDs separate. Do not change unlock, combat, save or balance rules to fit art.
- Record source/tool, license, dimensions, frame count, pivot and validation state for every production asset.

## Visual target
- First implemented presentation target: original SVG gothic-wilderness menu backdrop and shared dark-fantasy UI framing.
- This target establishes atmosphere and UI language only. It does not approve final character, enemy, boss or environment sprite families.
- Approval owner: project owner; initial implementation date: 2026-11-21.
