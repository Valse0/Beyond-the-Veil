# Hunter Hub and Permanent Progression Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Hunter Hub scene and permanent progression upgrade shop where players can spend persistent Ruh Özü on permanent stat bonuses (damage, health, speed, armor, XP gain, rerolls).

**Architecture:** Add `HunterHubScene.ts` in Phaser, extend save data structures in `save-types.ts` and `save-manager.ts` to track permanent upgrade levels, and wire Main Menu navigation to the Hunter Hub.

**Tech Stack:** Phaser 3, TypeScript, Vite, existing save system (`src/systems/save/`).

**Spec:** Game Design Document.md (§14.4, §15) and PLAN.md.

## Global Constraints
- Single-player, offline-first, local persistence using versioned `SaveManager`.
- Dark-fantasy visual identity matching existing Phaser scenes (`MainMenuScene`, `CharacterSelectScene`, `RegionSelectScene`).
- Strict TypeScript type safety and Jest unit tests for save/progression logic.

## Review Focus
1. Save corruption / missing upgrade keys during schema loading.
2. Ruh Özü spending validation (preventing negative currency).
3. Upgrade cap enforcement against max level limits.
4. UI layout responsiveness and controller / D-pad navigation in the upgrade shop.
5. Integration test coverage for purchasing upgrades and verifying persistence across reloads.

---

## Tasks

### Task 1: Save System Extensions for Permanent Upgrades
**Files:**
- Modify: `src/systems/save/save-types.ts`
- Modify: `src/systems/save/save-manager.ts`
- Test: `tests/save-system.test.mjs`

- [ ] Add `permanentUpgrades: Record<string, number>` and currency tracking to `PlayerProfile` in `save-types.ts`.
- [ ] Implement upgrade purchase and cost calculation functions in `SaveManager`.
- [ ] Add unit tests in `tests/save-system.test.mjs` for permanent upgrade purchase, cost scaling, and persistence.

### Task 2: Hunter Hub Scene
**Files:**
- Create: `src/game/scenes/HunterHubScene.ts`
- Modify: `src/game/config/game-config.ts` (register scene)
- Modify: `src/game/scenes/MainMenuScene.ts` (route to Hunter Hub)

- [ ] Create `HunterHubScene` displaying current Ruh Özü balance, available upgrade categories (Health, Damage, Armor, Speed, XP, Rerolls), current levels, upgrade costs, and back-to-menu navigation.
- [ ] Add interactive buttons for purchasing upgrades with keyboard, mouse, and gamepad input support.
- [ ] Register `HunterHubScene` in game config and wire Main Menu button to transition to it.

### Task 3: In-Run Application of Permanent Upgrades
**Files:**
- Modify: `src/game/scenes/RunScene.ts`
- Modify: `src/gameplay/run/run-model.ts`
- Test: `tests/run-model.test.mjs`

- [ ] Apply purchased permanent upgrades as stat modifiers at the start of a new run in `RunScene` / `RunModel`.
- [ ] Add unit tests verifying that permanent upgrades correctly modify hunter base stats.

### Task 4: Automated Testing and Validation
**Files:**
- Test: `tests/save-system.test.mjs`
- Test: `tests/run-model.test.mjs`

- [ ] Run full test suite (`npm test`) and typecheck (`npx tsc --noEmit`) to verify zero regressions.
