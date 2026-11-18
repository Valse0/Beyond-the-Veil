# BEYOND THE VEIL — IMPLEMENTATION LEDGER

**Purpose:** Exhaustive, evidence-backed traceability from the GDD to the implemented and verified game.
**Source:** `Game Design Document.md` (all sections) and `PLAN.md`.
**Execution rules:** `AGENTS.md` and `EXECUTION_MASTER.md`.

> Initial status: inventory extraction required. The repository currently contains design/agent documentation but no application source tree or package manifest. Do not mistake this initial ledger template for a completed requirements inventory.

## 1. Ledger rules

- Every atomic GDD requirement must receive a stable unique ID.
- Every entry must cite its exact GDD section/subsection.
- Broad systems must be split into independently testable behaviors.
- Explicit content quantities must be represented as countable entries and validated against actual data/assets.
- New design decisions that add requirements must add ledger entries.
- Never delete a requirement to make the project appear complete. If a requirement is genuinely superseded, preserve it with a documented decision and approval reference.
- Update this ledger in the same work batch as the implementation.
- `VERIFIED` requires recorded evidence; compilation alone is insufficient.

## 2. Allowed states

| State | Meaning |
|---|---|
| `NOT_STARTED` | No implementation work has begun. |
| `IN_PROGRESS` | Work exists but acceptance criteria are not all met. |
| `IMPLEMENTED_UNVERIFIED` | Implementation appears present but verification is incomplete. |
| `VERIFIED` | All acceptance criteria have been checked and evidence is recorded. |
| `BLOCKED` | A concrete blocker prevents progress; explain what is needed. |
| `DEFERRED_WITH_APPROVAL` | Explicitly postponed with user approval and a recorded reason. |

## 3. Requirement inventory

The first production task is to replace this notice with the exhaustive requirement inventory.

Required columns:

| ID | Requirement | GDD source | Acceptance criteria | State | Implementation references | Verification evidence | Blocker/notes |
|---|---|---|---|---|---|---|---|

Inventory extraction requirements:

1. Cover every section and subsection of the complete GDD, from Section 1 through Section 30.
2. Include every mechanic, interaction, content item, required quantity, screen, control, accessibility option, language, platform behavior, save behavior, performance target, QA requirement, and release requirement.
3. Create individual IDs for all five playable characters, five regions, 25 base enemies, five main bosses, 12 weapons, 12 passive items, and seven elements. Do not use one row to hide an entire content roster.
4. Include each weapon's attacks, progression, evolution, and relevant synergies; each character's active ability and mastery; each boss's phases, attacks, telegraphs, and rewards; each region's hazards, exploration, and story content.
5. Include all cross-system requirements: combat interactions, elemental buildup/interactions/resistances, run pacing/events, XP/level-up/RNG controls, permanent progression, crafting, quests, mastery, collection, endgame, UI, audio, localization, accessibility, platform, monetization constraints, developer tools, QA, and release.
6. Include acceptance criteria that can be tested or directly inspected.
7. Add a coverage matrix mapping GDD Sections 1–30 to the created ledger IDs. Every section must have at least one mapped entry or an explicit explanation why it creates no implementation requirement.
8. Add inventory totals by category and by state. Totals must be computed from the actual table, not guessed.
9. Validate uniqueness of IDs and completeness of GDD section coverage with a script or a reproducible manual audit.

## 4. GDD section coverage audit

Initial status: `NOT AUDITED`.

| GDD section | Title | Ledger IDs | Coverage status | Audit notes |
|---|---|---|---|---|
| 1–30 | Extract each exact section title from the GDD and create one row per section. | Pending | Pending | Do not leave this range as a single row in the completed ledger. |

The completed ledger must contain 30 individual section rows, not one combined row.

## 5. Content-count audit

| Content type | GDD target | Actual implemented | Verified distinct/functional | Ledger references | Status |
|---|---:|---:|---:|---|---|
| Playable characters | 5 | Pending | Pending | Pending | NOT_STARTED |
| Main regions | 5 | Pending | Pending | Pending | NOT_STARTED |
| Base enemies | 25 | Pending | Pending | Pending | NOT_STARTED |
| Main bosses | 5 | Pending | Pending | Pending | NOT_STARTED |
| Base weapons | 12 | Pending | Pending | Pending | NOT_STARTED |
| Passive items | 12 | Pending | Pending | Pending | NOT_STARTED |
| Elements | 7 | Pending | Pending | Pending | NOT_STARTED |

A count is not verified by filenames or database rows alone. Verify distinct behavior and required presentation where the GDD demands it.

## 6. Verification register

For each verification run, record:

| Date | Commit | Check type | Exact command/scenario | Result/exit code | Evidence or log reference | Related ledger IDs |
|---|---|---|---|---|---|---|

Do not write “all tests passed” without listing the checks actually run.

## 7. Asset register requirements

The asset inventory may be maintained in a linked machine-readable manifest, but it must be traceable from this ledger. Each required asset records:

- Stable asset ID.
- Linked requirement IDs.
- Asset type and intended use.
- Dimensions/frame layout/animation states.
- File path.
- Status: placeholder, final, or blocked.
- Source/creator and license.
- Attribution/usage obligations.
- Validation status.

Placeholders do not satisfy final-art or final-audio requirements.

## 8. Session log

| Date/session | Branch and starting commit | Work completed | Tests actually run | Ledger IDs changed | Next tasks / blockers |
|---|---|---|---|---|---|

Add a new row at the end of each work session. Preserve previous entries.

## 9. Completion gate

The game is not GDD-complete while any in-scope requirement is not `VERIFIED`, any required content count is missing, critical/high-severity defects remain, required runtime checks have not been performed where the environment supports them, or final art/audio is still represented only by placeholders.

The final audit must list every unverified, blocked, or approved-deferred ID. The report result must be either `GDD-COMPLETE` or `NOT COMPLETE`.
