import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCharacterAbility } from '../.test-dist/src/gameplay/characters/character-ability-runtime.js';
const context={origin:{x:100,y:100},targets:[{id:'near',x:160,y:100},{id:'far',x:500,y:100},{id:'diagonal',x:130,y:140}],range:100,maxHealth:100,currentHealth:60,aim:{x:1,y:0}};
test('Spirit Pulse selects nearby targets and computes outward knockback',()=>{const r=resolveCharacterAbility('radial-knockback',context);assert.deepEqual(r.targetIndexes,[0,2]);assert.equal(r.knockback.length,2);assert.ok(r.knockback[0].x>0);assert.equal(r.guardDurationMs,0);});
test('Black Aegis grants a bounded guard window and stagger',()=>{const r=resolveCharacterAbility('guard-and-stagger',context);assert.equal(r.guardDurationMs,2800);assert.equal(r.guardDamageMultiplier,.35);assert.equal(r.staggerDurationMs,1100);assert.deepEqual(r.targetIndexes,[0,2]);});
test('Soul Rift creates a delayed area at the cast position',()=>{const r=resolveCharacterAbility('delayed-spirit-zone',context);assert.deepEqual(r.delayedZone,{x:100,y:100,radius:100,delayMs:650,visualDurationMs:900});});
test('Shade Step moves toward the nearest target and marks it',()=>{const r=resolveCharacterAbility('blink-and-mark',context);assert.equal(r.markedTargetIndex,2);assert.equal(r.markDurationMs,3200);assert.ok(r.blinkDestination.x>100);assert.ok(r.blinkDestination.x<160);});
test('Crimson Rite never sacrifices the final health point and heals from damage',()=>{const r=resolveCharacterAbility('health-sacrifice-lifesteal',context);assert.equal(r.healthCost,12);assert.equal(r.lifestealRatio,.35);const critical=resolveCharacterAbility('health-sacrifice-lifesteal',{...context,currentHealth:1});assert.equal(critical.healthCost,0);});
