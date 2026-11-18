# Beyond the Veil

Single-player, offline-first dark-fantasy roguelite built with Phaser 3, TypeScript and Vite. The full product target is Game Design Document.md. This repository is in active production, not a finished release.

## Run
Use Node.js 22+, run npm install, then npm run dev. Before changes, run npm run typecheck, npm test and npm run build.

## Current foundation
The development branch has a menu-to-run flow, keyboard/touch movement, dash, Spirit Pulse, nearest-target automatic attacks, enemy pursuit patterns, XP pickups, four level-up upgrades, pause and result flows. Current shapes and content are temporary scaffolding, not final art or the full GDD content set.

## Controls
WASD/arrows: move · Space: dash · E: Spirit Pulse · Escape: pause. Touch: left movement pad and right action buttons.

## Constraints
Phaser 3 remains pinned; Web first, Capacitor Android later. No accounts, backend, mandatory online features, paid APIs, ads or telemetry. See AGENTS.md, PLAN.md, EXECUTION_MASTER.md and docs/IMPLEMENTATION_LEDGER.md.

GitHub Actions checks TypeScript, pure gameplay rules and the Vite production build. Green CI does not prove browser/device runtime quality or GDD completion.
