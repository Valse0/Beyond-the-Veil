import test from 'node:test';import assert from 'node:assert/strict';
import {validateContentCatalog} from '../.test-dist/src/gameplay/content/content-validation.js';
import {CHARACTERS} from '../.test-dist/src/data/characters.js';import {ENEMIES} from '../.test-dist/src/data/enemies.js';import {BOSSES} from '../.test-dist/src/data/bosses.js';import {WEAPONS} from '../.test-dist/src/data/weapons.js';import {PASSIVES} from '../.test-dist/src/data/passives.js';import {ELEMENTS} from '../.test-dist/src/data/elements.js';import {REGIONS} from '../.test-dist/src/data/regions.js';import {ASSET_REGISTRY} from '../.test-dist/src/data/asset-registry.js';
import {COLLECTIONS} from '../.test-dist/src/data/collections.js';
test('full first-release content counts exist',()=>{assert.equal(CHARACTERS.length,5);assert.equal(ENEMIES.length,25);assert.equal(BOSSES.length,5);assert.equal(WEAPONS.length,12);assert.equal(PASSIVES.length,12);assert.equal(ELEMENTS.length,7);assert.equal(REGIONS.length,5);});
test('every region has five assigned enemies and its own three-phase boss',()=>{for(const r of REGIONS){assert.equal(r.enemyIds.length,5);assert.equal(r.hazards.length,4);const b=BOSSES.find(x=>x.id===r.bossId);assert.ok(b);assert.equal(b.phases.length,3);assert.ok(b.phases.every(p=>p.attacks.length>=2));}});
test('all cross references, balance constraints and asset provenance validate',()=>{assert.deepEqual(validateContentCatalog(),[]);assert.equal(ASSET_REGISTRY.length,71);assert.ok(ASSET_REGISTRY.every(a=>a.status==='placeholder'&&a.path===null));});
test('all weapons have five levels, two branches and a behavior-changing evolution',()=>{assert.ok(WEAPONS.every(w=>w.levels.length===5&&w.branches.length>=2&&w.evolution.behaviorChange.length>12));});
test('all seven elements have status buildup and cross-element reactions',()=>{assert.ok(ELEMENTS.every(e=>e.threshold>=100&&e.reactions.length>=2));});

test('all 25 enemies have distinct behavior and attack patterns',()=>{assert.equal(new Set(ENEMIES.map(e=>e.behavior)).size,25);assert.equal(new Set(ENEMIES.map(e=>e.attack.kind)).size,25);});
test('all 12 weapons use distinct attack behavior contracts',()=>{assert.equal(new Set(WEAPONS.map(w=>w.behavior)).size,12);});

test('all six collection sets match the current authored content catalog',()=>{const sizes=Object.fromEntries(COLLECTIONS.map(c=>[c.id,c.itemIds.length]));assert.deepEqual(sizes,{bestiary:25,arsenal:12,'relic-vault':10,'story-archive':5,'character-biographies':5,'mastery-attire':5});});
