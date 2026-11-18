# BEYOND THE VEIL — EXECUTION MASTER
## Gemini CLI Full-Game Production Mandate

**Document role:** Single entry point for executing the complete Beyond the Veil project.
**Authority:** This document is subordinate to `AGENTS.md`, the Game Design Document, and the bounded execution permission defined in `AGENTS.md`.
**Product source of truth:** `Game Design Document.md`
**Technical source of truth:** `PLAN.md`
**Progress source of truth:** `docs/IMPLEMENTATION_LEDGER.md`

---

## 0. Start here — mandatory operating sequence

When the user says **“EXECUTION_MASTER.md dosyasını oku ve uygula”**, do not respond with another broad plan and do not stop after analysis. Begin the full production workflow under the exact branch and safety boundaries in `AGENTS.md`.

At the beginning of every session:

1. Read `AGENTS.md`, `GEMINI.md`, this document, `Game Design Document.md`, `PLAN.md`, and `docs/IMPLEMENTATION_LEDGER.md` completely.
2. Read `.agents/skills/router/SKILL.md`, then load only relevant installed skills for the current task.
3. Inspect the current Git branch, working tree, latest commits, repository files, package manager/lockfile (if any), and actual implementation state. Never infer that a planned feature already exists.
4. Read the entire ledger and identify the next highest-priority incomplete work. Reconcile ledger claims against the actual code before trusting them.
5. Continue implementation from the real repository state. Do not redo verified work without reason, and do not skip incomplete work.
6. Keep the ledger current in the same work session as implementation. Never mark work complete merely because files were created.

Do not ask the user to restate this mandate. Ask a question only when a genuine blocker requires a decision that cannot safely be made from the GDD, PLAN, project rules, or a reasonable low-risk default.

## 1. Product objective — complete game, not a prototype

Deliver the complete, integrated, polished game specified by the GDD and expanded by the approved design documentation.

The intended product is a single-player, offline-first dark-fantasy roguelite / Survivors-like action game using Phaser 3, TypeScript, and Vite, with Web as the first target and Capacitor Android packaging later.

The full GDD scope is the target. Do not:
- Replace the game with a prototype, vertical slice, mockup, menu-only build, or one-region sample.
- Declare completion because the core loop works while major systems/content are missing.
- Count a screen that is only decorative as a functional feature.
- Count a data entry, renamed sprite, recolor, or stat-only variant as a distinct enemy, boss, weapon, or character where the GDD requires distinct behavior.
- Hide missing work by deleting requirements, weakening acceptance criteria, or silently changing the GDD.
- Treat placeholder visuals/audio as final production assets.

Internal implementation batches are allowed and encouraged for reliability. They do not reduce the final scope.

## 2. Source-of-truth hierarchy and design autonomy

Apply this precedence:

1. `AGENTS.md` safety and execution boundaries.
2. `Game Design Document.md` product identity, established mechanics, and content commitments.
3. `PLAN.md` technical direction and full-game delivery process.
4. Completed design specifications and recorded decisions in `docs/`.
5. This execution workflow.
6. Installed skill guidance.

Preserve established GDD decisions. Where the GDD or PLAN leaves a design detail unresolved, choose the strongest coherent solution for player experience, readability, balance, accessibility, maintainability, and production feasibility. Do not interrupt the user for minor or reversible choices.

For each material design decision:
- Record the selected decision and rationale in the appropriate design document or decision log.
- Record meaningful alternatives rejected and why, when the choice affects architecture, scope, balance, or UX.
- Keep systems coherent across all characters, regions, enemies, weapons, progression, UI, and story.
- Do not invent online, backend, account, analytics, monetization, or paid-service dependencies.
- If a decision would materially change the game's identity, platform commitments, legal obligations, or cost, stop and request user approval.

Design the complete game before foundational implementation is considered settled. Do not spend the entire project endlessly documenting: once the design package is sufficiently implementable, move into production and update documentation as necessary.

## 3. Exhaustive requirements inventory — no silent omissions

The GDD is the authoritative requirement source. Before substantial implementation:

1. Read the entire GDD, section by section.
2. Extract every player-facing feature, system, content quantity, platform requirement, quality rule, accessibility requirement, technical constraint, and release requirement into `docs/IMPLEMENTATION_LEDGER.md`.
3. Give every atomic requirement a stable unique ID. Use readable prefixes such as `CORE`, `CHAR`, `REGION`, `ENEMY`, `BOSS`, `WEAPON`, `PASSIVE`, `ELEMENT`, `RUN`, `PROG`, `QUEST`, `UI`, `SAVE`, `AUDIO`, `ACCESS`, `LOC`, `PLATFORM`, `ASSET`, `QA`, and `RELEASE`.
4. Preserve source traceability: every ledger entry must cite the exact GDD section/subsection (and relevant PLAN section where applicable).
5. Split broad requirements into atomic, independently verifiable entries. Do not represent an entire system with one checkbox if it contains multiple independently testable behaviors.
6. Record required counts explicitly (5 characters, 5 regions, 25 base enemies, 5 bosses, 12 weapons, 12 passives, 7 elements, and every other GDD quantity).
7. Add acceptance criteria and the evidence needed to verify each entry.
8. Cross-check the inventory against every GDD section, including sections near the end of the document. Record a coverage audit showing that no section was skipped.

The initial ledger may contain `NOT_STARTED` entries. It must never be a short sample list. The ledger is the exhaustive checklist for the complete game and must evolve when approved design detail adds requirements.

### Requirement states

Use only these states:

- `NOT_STARTED`: no implementation work has begun.
- `IN_PROGRESS`: work exists but acceptance criteria are not all met.
- `IMPLEMENTED_UNVERIFIED`: implementation appears present but required verification is incomplete.
- `VERIFIED`: all stated acceptance criteria have been checked and evidence is recorded.
- `BLOCKED`: cannot proceed; explain the concrete blocker and what would unblock it.
- `DEFERRED_WITH_APPROVAL`: intentionally postponed only with explicit user approval and a recorded reason.

Never use “done”, “complete”, “mostly done”, or a percentage as a substitute for a requirement state. A requirement is not `VERIFIED` merely because its code compiles.

## 4. Design package required before full production

Create and maintain concise, implementable design documentation under `docs/design/` (create the directory when needed). Cover the complete player experience and all GDD systems, including:

- Full information architecture and screen/navigation map.
- Main menu, Hunter Hub, character gallery/detail/select, region/difficulty selection, run preparation and loadout.
- In-run HUD, controls, pause, level-up, event notices, boss warnings, interaction prompts.
- Victory, defeat, run summary, rewards, progression return flow.
- All character identities, roles, stats, starting equipment, active abilities, mastery, unlocks, cosmetics, and story.
- Five regions, their maps, atmosphere, hazards, enemy rosters, elites, boss, exploration, rewards, and story content.
- All base enemies and bosses with genuinely distinct behavior, attacks, telegraphs, phases, counters, rewards, and readable presentation.
- All weapons, passives, elements, status buildup, interactions, synergies, evolution rules, and balance data.
- Run pacing, spawn/wave director, events, RNG protection, difficulty, game modes, and endgame.
- Permanent progression, Hunter Hub services, economy, crafting, relics, quests, mastery, achievements, collection, and save behavior.
- Settings, accessibility, localization, landscape mobile/desktop responsive behavior, keyboard/gamepad/touch input.
- Audio direction and event coverage.
- Full asset inventory with stable IDs, dimensions/animation needs, formats, intended use, status, provenance, and license.

Do not duplicate the entire GDD without adding implementation-ready detail. Link each design spec to the relevant ledger IDs.

## 5. Technical foundation and architecture

Inspect the actual repository first. The current repository may be documentation/skills-only; if so, scaffold the application rather than pretending a game already exists.

Use:
- Phaser 3 (never Phaser 4 without explicit approval).
- TypeScript with strict checking.
- Vite.
- Capacitor only when the shared Web game is stable enough for Android packaging.
- A single shared gameplay codebase.
- Offline-first local play with no required account, backend, or network service.

Before choosing Phaser APIs, inspect the installed version and official/local skill guidance. Do not upgrade dependencies just because a newer version exists.

Build maintainable boundaries between:
- Phaser boot/configuration/scenes/camera/physics.
- Core types, constants, utilities, deterministic random/seed support, and typed events.
- Player, character, combat, weapons, passives, elements, enemies, bosses, spawning, waves, XP, level-up, loot, and run systems.
- Regions, maps, environment, and exploration.
- Permanent progression, economy, relics, crafting, quests, mastery, achievements, and collection.
- UI screens, components, HUD, and menus.
- Save, audio, localization, input, and platform adapters.
- Structured content data and asset registry.
- Development-only tools and tests.

Prefer the simplest architecture that supports the actual GDD. Avoid needless frameworks, premature abstractions, huge god classes, and hidden global state.

### Data-driven content and validation

Content definitions must be separate from behavior implementation. Use stable IDs, typed schemas, validated references, explicit balance values, and reusable behavior components. Add automated validation for duplicate IDs, missing references, invalid values, and missing asset mappings.

## 6. Asset production and placeholder integrity

Use a central asset manifest/registry and stable asset IDs. Gameplay and content must not depend on hard-coded final file paths.

For every asset, track:
- Stable ID and intended role.
- Required dimensions, frame layout, animation states, anchors, and expected visual footprint.
- File path and format.
- Status: placeholder, final, or blocked.
- Source/creator, license, attribution, and modification notes.

Placeholders may be used to keep systems playable during development. They must preserve approximate dimensions, anchors, collision alignment, animation states, and UI layout. Replacing a placeholder must not require rewriting gameplay logic.

Important:
- A placeholder is never final art.
- A static icon is not a substitute for a required character/enemy animation set.
- Color swaps are not distinct enemy designs.
- Generated assets must be original and checked for consistency with the art direction.
- Use only assets with clear rights for the intended distribution.
- Do not buy assets, subscribe to paid services, incur API charges, or use paid generation without explicit user approval.
- If final-quality assets cannot be created with available, authorized tools, implement safe placeholders, mark the exact asset requirements as not verified/blocked, and report them honestly. Do not claim the entire release package is finished.

## 7. Implementation workflow

Work through the stages in `PLAN.md`, but keep the whole GDD scope visible in the ledger.

For each coherent implementation batch:

1. Select a small related set of ledger IDs.
2. Read relevant design specs and skills.
3. Inspect existing implementation and dependencies.
4. Implement the actual behavior, UI, data, and integrations.
5. Add or update unit, integration, gameplay, and data-validation tests.
6. Run relevant checks (typecheck, lint if configured, unit tests, build, targeted runtime checks).
7. Fix failures caused by the batch before moving on.
8. Update the ledger with exact state, files, tests, and evidence.
9. Update design/technical docs if implementation revealed a real change.
10. Commit coherent work to the authorized development branch with descriptive messages.

Keep the project runnable throughout. Do not create large disconnected code dumps or leave core systems as TODO stubs.

## 8. Anti-false-completion verification system

A completion claim requires evidence. Apply all layers below.

### A. Automated checks
Run all available checks and add missing high-value checks:
- TypeScript strict typecheck.
- Lint/static analysis where configured.
- Unit tests.
- Integration tests.
- Gameplay/system tests.
- Content schema and cross-reference validation.
- Asset manifest/file existence validation.
- Production build.
- Bundle/asset size and performance checks where relevant.

Record exact commands, dates, exit codes, and concise results. Never fabricate a command result.

### B. Runtime verification
Where a browser/runtime is available:
- Launch the actual production build.
- Exercise real user flows, not only isolated functions.
- Verify menu-to-run, movement, dash, automatic attacks, enemy interactions, XP, level-up, rewards, save/reload, progression, and run completion.
- Verify all major screens and controls.
- Check console errors and failed asset loads.
- Test representative desktop and mobile landscape viewports.
- Test long sessions and high enemy/effect density.
- Capture screenshots or recordings where the environment supports it.

If a required runtime/device is unavailable, mark the requirement `IMPLEMENTED_UNVERIFIED` or `BLOCKED`; do not infer success from compilation.

### C. Independent audit pass
Before declaring the game complete, perform a separate audit pass that is distinct from implementation:
- Re-read the GDD from the beginning to the end.
- Compare every GDD requirement against the ledger and actual code/data/assets.
- Re-run the ledger coverage check and automated validators.
- Inspect critical paths and representative content manually.
- Search for TODO, FIXME, placeholder-only, mock, stub, hard-coded demo data, disabled controls, unreachable screens, and empty handlers.
- Check that all claimed content counts are real and distinct where required.
- Check integration between systems and persistence.
- Produce a gap report listing every unmet or unverified requirement.

If Gemini CLI supports independent subagents/review agents in the current environment, use a separate reviewer context for this audit. If not, start a fresh-context audit pass and use automated checks as additional evidence. Do not describe a same-context self-review as an independent external audit.

### D. Release gate

The project may be called **GDD-complete** only when:
- Every in-scope ledger requirement is `VERIFIED`.
- All required content quantities are present and behaviorally distinct where the GDD requires it.
- No critical or high-severity defects remain.
- The full production build passes.
- Required runtime flows are verified on available targets.
- Save integrity, offline operation, controls, and localization are verified.
- Final art/audio requirements are either completed with valid provenance or explicitly reported as release blockers. The game must not be called visually/audio complete while placeholders remain.
- The final audit report reconciles every GDD section and every ledger ID.

If any condition is unmet, report **NOT COMPLETE** and list exact remaining IDs. Do not conceal gaps behind a “beta”, “MVP”, or completion percentage.

## 9. Progress ledger format and evidence

For every ledger item, maintain:
- ID.
- Requirement summary.
- GDD source section.
- Acceptance criteria.
- State.
- Implementation references (file paths and relevant symbols).
- Verification evidence (test names/commands/results or runtime evidence).
- Known limitations/blockers.

Keep a session log with:
- Date/session.
- Branch and starting commit.
- Work completed.
- Tests actually run and results.
- Ledger IDs changed.
- Remaining next tasks.
- Any blockers or user decisions needed.

At the end of each session, leave the repository in a coherent state and update the ledger. If context/time is running out, stop at a safe checkpoint and record exactly where to resume.

## 10. Git, safety, and external side effects

Follow the bounded permissions in `AGENTS.md` exactly.

- Work only on the dedicated development branch specified there.
- Never push directly to `main`, force-push, rewrite shared history, publish a release, or deploy publicly.
- Do not change repository visibility, secrets, permissions, or GitHub settings.
- Do not expose credentials, tokens, private keys, or personal data in code/logs.
- Do not add telemetry, analytics, ads, payment processing, accounts, backend services, or online dependencies unless the GDD explicitly requires them and the user has approved the concrete implementation.
- Do not introduce paid dependencies or services.
- Do not delete user-authored project files. If a destructive migration is genuinely necessary, stop and request approval.
- Do not modify the GDD's established product identity or reduce scope to make completion easier.
- Do not silently change the version. Follow the versioning rule in `AGENTS.md`.
- Keep commits small enough to review and descriptive enough to audit.

## 11. Required final report

Only when the release gate has been evaluated, produce a final report containing:

1. Overall result: `GDD-COMPLETE` or `NOT COMPLETE`.
2. Branch and commit range.
3. Requirement inventory totals by state.
4. GDD section coverage audit.
5. Implemented systems and content counts (with evidence).
6. Automated test/build commands and exact outcomes.
7. Runtime/device/browser checks actually performed.
8. Asset status: final vs placeholder vs blocked, with provenance.
9. Performance observations and known defects.
10. Every remaining ledger ID and why it is not verified.
11. Clear next action.

Do not call the project complete merely because this report exists. The evidence and ledger states determine the result.

---

## Final operating instruction

Start with repository inspection and exhaustive GDD-to-ledger extraction. Then complete the design package, scaffold the real Phaser application, and implement the entire game in coherent tested batches. Continue across sessions from the ledger until the release gate is genuinely satisfied.

**Do not stop after writing plans. Do not stop after the first playable loop. Do not claim success without evidence.**
