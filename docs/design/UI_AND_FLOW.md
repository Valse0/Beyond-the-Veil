# UI and Player Flow

## Visual direction
Premium dark fantasy: charcoal, smoke and restrained pale gold. The world remains the focus; decorative ornament must not compete with combat information. Temporary vector shapes are not final pixel art.

## Current navigation
Main Menu → Character Select → Region / Difficulty Select → Run HUD → Level-up / Pause → Victory or Defeat → Retry or Main Menu.

The selection screens are real navigation steps, not decorative mockups. The five hunters are selectable from the character catalog. All five regions are visible as previews, while the first region is currently playable. Region progression and difficulty unlocks must be driven by the future persistent profile system; never fake an unlock. Normal is available initially, Hard follows Normal completion, and Nightmare follows Hard completion.

The full target expands this to Hunter Hub, character detail/mastery/cosmetics, loadout, archive, quests, crafting, relics, settings, accessibility and collection.

## Main menu
Primary action is New Run. It opens Character Select instead of starting a default run. Enter / controller A also activates the primary action.

## Character selection
Five catalog-driven hunter cards show role, combat description, health, movement speed and active ability. All five are selectable. Left/right arrows, D-pad or left stick move the selection; Enter / controller A continues; Escape / Backspace / controller B returns to the main menu. Mouse and touch can select a card and activate the continue action.

The current emblems and panels are temporary vector UI. They are not final character portraits or pixel art.

## Region and difficulty selection
All five regions show their subtitle, atmosphere, boss identifier, enemy count and hazard count. The first region is playable; the remaining four are locked previews until story progression is implemented. Selecting a locked region never starts a run. Normal is available; Hard and Nightmare visibly show their sequential unlock requirements.

Left/right arrows, D-pad or left stick move the region selection; Enter / controller A starts only an unlocked region; Escape / Backspace / controller B returns to character selection. Mouse and touch can select a region.

## In-run HUD
Top-left: hunter, level, XP and kills. Top-center: elapsed time. Top-right: health and pause. Bottom-left: touch movement pad. Bottom-right: dash and active ability. HUD reads the run state rather than maintaining duplicate gameplay values.

## Overlays
Level-up pauses the run and shows four upgrade cards; queued levels are presented one at a time. Pause offers resume and return to menu. Victory/defeat shows level and kills and offers retry/menu. Overlays must own input while visible. Gamepad focus is shown with a pale-gold selected border/fill. D-pad or left-stick direction changes the selected option; the bottom face button confirms. The right face button performs the screen's back action where one is defined (resume on pause, return to menu on results); level-up choices cannot be cancelled.

## Responsive and input rules
Reference layout is landscape 1280x720 and scales to fit. Keyboard: WASD/arrows, Space, E, Escape; Enter confirms overlay selections. Touch: left movement, right actions. In gameplay, the left stick or D-pad moves; bottom face button (Xbox A / PlayStation Cross) triggers dash; left face button (Xbox X / PlayStation Square) triggers the active ability; Start pauses. In pause, level-up and result overlays, D-pad or left-stick direction changes the highlighted option, bottom face button confirms, and right face button (Xbox B / PlayStation Circle) performs the available back action. Keyboard arrows and Enter/Space can also navigate/confirm overlay options. The same keyboard/touch paths remain available. Menu screens support mouse/touch, keyboard arrows and Enter/Escape, plus Phaser Gamepad D-pad / left stick, A and B. Smart TV remotes are supported only when their browser exposes directional/confirm/back actions as standard keyboard events; a TV that exposes a standard browser Gamepad API may also be able to use the gamepad path. Actual TV hardware/browser support remains unverified, and this is not a claim of native console distribution. Controller mapping and focus behavior must be tested on physical devices.

## Not yet implemented
Hunter Hub, character detail/mastery/cosmetics, region map, loadout, persistent unlock/save integration, settings, archive/collection, quest/crafting screens, boss/event notices, detailed results, full accessibility/localization flows, and verified mobile/TV/gamepad device coverage.
