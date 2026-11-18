# UI and Player Flow

## Visual direction
Premium dark fantasy: charcoal, smoke and restrained pale gold. The world remains the focus; decorative ornament must not compete with combat information. Temporary vector shapes are not final pixel art.

## Current navigation
Main Menu → New Run → Run HUD → Level-up / Pause → Victory or Defeat → Retry or Main Menu.

The full target expands this to Hunter Hub, character gallery/detail/select, region and difficulty selection, loadout, archive, quests, crafting, relics, settings, accessibility and collection.

## Main menu
Primary action is New Run. Supporting copy establishes the premise and controls are discoverable. The foundation starts the default hunter immediately; selection screens remain future work.

## In-run HUD
Top-left: hunter, level, XP and kills. Top-center: elapsed time. Top-right: health and pause. Bottom-left: touch movement pad. Bottom-right: dash and active ability. HUD reads the run state rather than maintaining duplicate gameplay values.

## Overlays
Level-up pauses the run and shows four upgrade cards; queued levels are presented one at a time. Pause offers resume and return to menu. Victory/defeat shows level and kills and offers retry/menu. Overlays must own input while visible.

## Responsive and input rules
Reference layout is landscape 1280x720 and scales to fit. Keyboard: WASD/arrows, Space, E, Escape. Touch: left movement, right actions. Full UI work must add safe areas, scalable controls, gamepad focus, rebinding, accessibility and localization.

## Not yet implemented
Hunter Hub, character/region selection, loadout, settings, archive/collection, quest/crafting screens, boss/event notices, detailed results and full accessibility/localization flows.
