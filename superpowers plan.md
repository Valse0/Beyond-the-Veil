# Beyond the Veil — Comprehensive Superpowers Execution & Report Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a comprehensive status report, architectural roadmap, and actionable implementation plan for delivering the complete *Beyond the Veil* GDD-compliant dark fantasy roguelike game in Phaser 3 + TypeScript + Vite.

**Architecture:** Single-player, offline-first, data-driven architecture separating Phaser 3 scenes, Arcade Physics, typed state models, versioned local persistence, and content catalog definitions.

**Tech Stack:** Phaser 3, TypeScript, Vite, Playwright (browser smoke tests), Jest/Node unit tests.

**Spec:** `Game Design Document.md`, `PLAN.md`, `AGENTS.md`, and `docs/IMPLEMENTATION_LEDGER.md`.

## Global Constraints
- Single-player, offline-first, local persistence with versioned `SaveManager`.
- Dark-fantasy visual identity matching existing Phaser scenes.
- Strict TypeScript type safety, automated tests for all gameplay and persistence systems.
- Complete GDD scope compliance (no shortcuts to vertical slice or prototype).

## Review Focus
1. Save schema version migration and corruption recovery under storage failure conditions.
2. Deterministic AI state machine consistency across all 25 enemy types and 5 boss encounters.
3. Weapon evolution and boss chest interaction robustness.
4. UI controller/D-pad navigation and responsive viewport scaling.
5. Evidence-backed ledger verification for all atomic requirements.

---

## Executive Status Summary & Report

As of November 2026, *Beyond the Veil* has achieved a robust foundational architecture:
- **Core Engine & Build:** Phaser 3 + TypeScript + Vite configured and verified via automated Chromium Playwright smoke tests and unit test suites (77+ unit tests, browser smoke suites).
- **Navigation & Flow:** Main Menu, Character Select, Region Select, and Run Scene integration are established.
- **Run Systems:** 15-minute run pacing, wave director (5 bands, active enemy caps), run events, level-up choices (reroll, banish, skip), boss encounters (3 phases each across all 5 bosses), and weapon evolution mechanics are implemented and unit/browser tested.
- **Content Catalogs:** 5 characters, 5 regions, 25 unique enemy archetypes, 5 main bosses, 12 weapons with dual branches, 12 passives with 12 special upgrades, and 7 elements are defined in structured data schemas.
- **Persistence:** Versioned local storage with automatic backup generation, first-profile bootstrap, and restart/victory persistence.

---

## Actionable Implementation Plan Tasks

### Task 1: Complete Character & Region Runtime Integration
**Files:**
- Modify: `src/game/scenes/CharacterSelectScene.ts`
- Modify: `src/game/scenes/RegionSelectScene.ts`
- Modify: `src/game/scenes/RunScene.ts`
- Test: `tests/browser-smoke.browser.spec.ts`

- [ ] Wire selected character stats, active ability, and starting weapon into `RunScene` initialization.
- [ ] Implement region-specific hazard cycles, environmental storytelling landmarks, and exploration triggers.
- [ ] Add browser smoke test coverage for character selection through region selection into run start.

### Task 2: Enemy AI & Boss Arena Mechanics Refinement
**Files:**
- Modify: `src/gameplay/enemies/enemy-runtime.ts`
- Modify: `src/gameplay/bosses/boss-runtime.ts`
- Test: `tests/runtime-systems.test.mjs`

- [ ] Finalize specialized attack telegraphs and counter windows for all 25 enemy types.
- [ ] Implement arena boundary hazards and phase transition telegraphs for all 5 bosses.
- [ ] Expand unit test suite in `tests/runtime-systems.test.mjs` to verify AI behavior and phase correctness.

### Task 3: Weapon Evolutions, Passives, and Elements Polish
**Files:**
- Modify: `src/gameplay/weapons/build-runtime.ts`
- Modify: `src/gameplay/passives/passive-runtime.ts`
- Modify: `src/gameplay/elements/element-runtime.ts`
- Test: `tests/weapon-evolution.test.mjs`, `tests/passive-runtime.test.mjs`

- [ ] Complete boss-chest spawn and proximity open interaction for weapon evolutions.
- [ ] Wire all 12 passive special upgrades into active run modifiers.
- [ ] Ensure full reaction matrix coverage for all 7 elements.

### Task 4: Permanent Progression & Hunter Hub Services
**Files:**
- Create: `src/game/scenes/HunterHubScene.ts`
- Modify: `src/systems/save/save-manager.ts`
- Test: `tests/save-system.test.mjs`

- [ ] Implement Hunter Hub scene and permanent upgrade shop for spending Ruh Özü.
- [ ] Add save manager persistence for permanent upgrades, unlocks, and currency.
- [ ] Add automated unit tests for upgrade purchases, cost scaling, and profile persistence.

### Task 5: UI/UX, Accessibility, and Final QA Gate
**Files:**
- Modify: `src/game/scenes/` (HUD, Pause, Results, Settings)
- Test: `tests/browser-smoke.browser.spec.ts`

- [ ] Complete in-run HUD elements, pause menu navigation, and victory/defeat reward flows.
- [ ] Add settings for audio, text scale, and gamepad bindings.
- [ ] Execute full verification audit against `docs/IMPLEMENTATION_LEDGER.md` for release readiness.
