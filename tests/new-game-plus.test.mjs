import test from 'node:test';
import assert from 'node:assert/strict';
import { ENEMIES } from '../.test-dist/src/data/enemies.js';
import { BOSSES } from '../.test-dist/src/data/bosses.js';
import { createInitialSaveData } from '../.test-dist/src/systems/save/save-manager.js';
import {
  MAX_NEW_GAME_PLUS_LEVEL,
  beginNewGamePlus,
  canStartNewGamePlus,
  getNewGamePlusModifiers,
  recordCompletedEnding,
  scaleNewGamePlusBoss,
  scaleNewGamePlusEnemy
} from '../.test-dist/src/gameplay/run/new-game-plus-runtime.js';

test('records each completed ending once in the permanent ending history', () => {
  const save = createInitialSaveData('2026-11-20T00:00:00.000Z');
  save.story.completedEndingId = 'ending-mended-veil';
  const first = recordCompletedEnding(save);
  assert.deepEqual(first.progression.completedEndingIds, ['ending-mended-veil']);
  assert.equal(recordCompletedEnding(first), first);
  const secondEnding = { ...first, story: { ...first.story, completedEndingId: 'ending-torn-veil' } };
  assert.deepEqual(recordCompletedEnding(secondEnding).progression.completedEndingIds, ['ending-mended-veil', 'ending-torn-veil']);
});

test('New Game+ remains locked until a story ending has been completed', () => {
  const save = createInitialSaveData('2026-11-20T00:00:00.000Z');
  assert.equal(canStartNewGamePlus(save), false);
  assert.equal(beginNewGamePlus(save), null);
});

test('starting New Game+ resets campaign state and preserves permanent profile progress', () => {
  const save = createInitialSaveData('2026-11-20T00:00:00.000Z');
  save.story.completedEndingId = 'ending-mended-veil';
  save.story.endingId = 'ending-mended-veil';
  save.story.unlockedPathIds = ['forest-mercy-path'];
  save.story.quests['forest-root-oath'] = {
    status: 'completed',
    objectiveProgress: { 'defeat-root-guard': 1 },
    chosenChoiceId: 'spare-warden',
    outcomeId: 'warden-spared'
  };
  save.progression.soulEssence = 432;
  save.progression.completedRuns = 12;
  save.progression.unlockedRegionIds = ['cursed-forest', 'forgotten-graveyard'];
  save.progression.permanentUpgrades = { maxHealth: 3 };
  save.progression.unlockedCharacterIds.push('dark-knight');
  save.collections.relicIds = ['matriarch-seed'];
  save.collections.characterMastery['cursed-hunter'] = 8;
  save.collections.completedAchievementIds = ['first-blood'];

  const next = beginNewGamePlus(save);
  assert.ok(next);
  assert.equal(next.progression.newGamePlusLevel, 1);
  assert.deepEqual(next.progression.completedEndingIds, ['ending-mended-veil']);
  assert.deepEqual(next.progression.unlockedRegionIds, ['cursed-forest']);
  assert.equal(next.progression.soulEssence, 432);
  assert.equal(next.progression.completedRuns, 12);
  assert.deepEqual(next.progression.permanentUpgrades, { maxHealth: 3 });
  assert.deepEqual(next.progression.unlockedCharacterIds, ['cursed-hunter', 'dark-knight']);
  assert.deepEqual(next.collections.relicIds, ['matriarch-seed']);
  assert.equal(next.collections.characterMastery['cursed-hunter'], 8);
  assert.deepEqual(next.collections.completedAchievementIds, ['first-blood']);
  assert.equal(next.story.completedEndingId, null);
  assert.equal(next.story.endingId, null);
  assert.deepEqual(next.story.quests, {});
  assert.deepEqual(next.story.unlockedPathIds, []);
});

test('completed-ending history is retained, while another cycle still requires a newly completed ending', () => {
  const save = createInitialSaveData('2026-11-20T00:00:00.000Z');
  save.progression.newGamePlusLevel = MAX_NEW_GAME_PLUS_LEVEL;
  save.progression.completedEndingIds = ['ending-mended-veil'];
  save.story.completedEndingId = 'ending-torn-veil';
  assert.equal(canStartNewGamePlus(save), true);
  const next = beginNewGamePlus(save);
  assert.ok(next);
  assert.equal(next.progression.newGamePlusLevel, MAX_NEW_GAME_PLUS_LEVEL);
  assert.deepEqual(next.progression.completedEndingIds, ['ending-mended-veil', 'ending-torn-veil']);
  assert.equal(canStartNewGamePlus(next), false);
});

test('New Game+ modifiers increase progressively and stop at level five', () => {
  assert.deepEqual(getNewGamePlusModifiers(0), {
    enemyHealthMultiplier: 1, enemyDamageMultiplier: 1, enemyMoveSpeedMultiplier: 1,
    bossHealthMultiplier: 1, bossDamageMultiplier: 1, bossMoveSpeedMultiplier: 1
  });
  assert.deepEqual(getNewGamePlusModifiers(1), {
    enemyHealthMultiplier: 1.1, enemyDamageMultiplier: 1.05, enemyMoveSpeedMultiplier: 1.02,
    bossHealthMultiplier: 1.15, bossDamageMultiplier: 1.07, bossMoveSpeedMultiplier: 1.03
  });
  assert.deepEqual(getNewGamePlusModifiers(99), getNewGamePlusModifiers(5));
});

test('live enemy and boss definitions receive their distinct NG+ health, damage and speed scaling', () => {
  const enemy = ENEMIES.find(item => item.id === 'rootbound-husk');
  const boss = BOSSES.find(item => item.id === 'thorn-matriarch');
  assert.ok(enemy);
  assert.ok(boss);
  const scaledEnemy = scaleNewGamePlusEnemy(enemy, 1);
  const scaledBoss = scaleNewGamePlusBoss(boss, 1);
  assert.equal(scaledEnemy.health, Math.round(enemy.health * 1.1));
  assert.equal(scaledEnemy.speed, enemy.speed * 1.02);
  assert.equal(scaledEnemy.contactDamage, enemy.contactDamage * 1.05);
  assert.equal(scaledEnemy.attack.damage, enemy.attack.damage * 1.05);
  assert.equal(scaledBoss.health, Math.round(boss.health * 1.15));
  assert.equal(scaledBoss.contactDamage, boss.contactDamage * 1.07);
  assert.equal(scaledBoss.phases[0].movementMultiplier, (boss.phases[0].movementMultiplier ?? 1) * 1.03);
  assert.equal(scaledBoss.phases[0].attacks[0].damage, boss.phases[0].attacks[0].damage * 1.07);
});
