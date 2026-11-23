# Visual Upgrade Log — 2026-11-22

## Implemented
- Added original five-frame pixel-art portrait strip for the canonical hunter roster.
- Added original five-frame pixel-art illustration strip for the canonical regions.
- Registered both sheets in Phaser UI preload and the asset manifest/inventory.
- Added a save-backed Hunter Record panel to the desktop main menu.
- Replaced hunter selection placeholder emblems with distinct portraits.
- Replaced flat region-number tiles with region-specific landscape art.
- Unified run preparation and run-result panel framing with the shared dark-fantasy theme.
- Reworked the combat HUD into character/mode, level/kill/ability, timer/boss countdown, XP and numeric health groups.
- Made level-up cards size to the viewport while retaining existing choice generation and selection actions.

## Preserved
- Phaser 3.85, scene flow, gameplay state, save schema and combat rules.
- Five canonical hunters and five canonical regions.
- 15-minute standard run and 14:00 boss timing.
- Existing real run-result and persisted-reward data.
- All seven approved design PNGs.

## Verification
- Automated build/tests and in-browser visual inspection are pending CI.
- UI illustration strips are not final in-world animation, enemy, boss, region-background or effects production art.
- No merge, release, public deployment, or main-branch change was performed.
