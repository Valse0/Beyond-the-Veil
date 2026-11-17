AGENTS.md — AI Development Rules

These rules apply to every AI agent working in this repository.

Read Before Working

* Read Game Design Document.md for the game’s vision, mechanics, and content requirements.
* Read PLAN.md for the target architecture, folder structure, and development order.
* Inspect the existing code before editing. Do not assume the repository is empty or that the proposed structure is already implemented.

Core Rules

* Preserve the game’s dark-fantasy identity and the design decisions in the GDD.
* Follow PLAN.md; create folders and abstractions only when the current task needs them.
* Keep the project runnable. Prefer small, focused changes over large rewrites.
* Do not break or replace working systems without a clear technical reason.
* Use Phaser 3 and TypeScript. Keep types strict and avoid unnecessary dependencies.
* Separate reusable content data from gameplay logic where practical.
* Prefer simple, maintainable solutions over premature abstraction or overengineering.
* Do not add accounts, backend services, mandatory online features, or paid APIs without explicit approval.
* Do not use placeholder UI or fake mechanics as a substitute for implemented gameplay.
* Use original or properly licensed assets; document asset sources when applicable.

Verification

* Run relevant checks or tests after making changes.
* Fix errors introduced by your changes.
* Never claim a feature, build, or test is successful unless it was actually verified.
* Clearly report what changed, what was tested, and any remaining limitations.

Documentation

* Update relevant documentation when architecture, controls, systems, or project workflows change.
* Keep PLAN.md aligned with significant approved changes to the development order or architecture.
