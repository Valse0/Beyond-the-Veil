import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTS } from '../.test-dist/src/data/quests.js';
import { STORY_REGION_ATMOSPHERES, STORY_WORLD_NPCS } from '../.test-dist/src/data/story-world-state.js';
import { resolveStoryWorldState } from '../.test-dist/src/gameplay/world/story-world-state.js';

const regions = ['cursed-forest','forgotten-graveyard','deep-dungeon','rotten-swamp','cursed-castle'];

test('the story-world catalog contains one stable NPC for each of the five regions', () => {
  assert.equal(STORY_WORLD_NPCS.length, 5);
  assert.deepEqual(STORY_WORLD_NPCS.map(npc => npc.regionId), regions);
  assert.equal(new Set(STORY_WORLD_NPCS.map(npc => npc.id)).size, 5);
  for (const npc of STORY_WORLD_NPCS) {
    assert.ok(npc.name.length > 0);
    assert.ok(npc.position.x >= 0 && npc.position.x <= 2400);
    assert.ok(npc.position.y >= 0 && npc.position.y <= 1800);
    assert.equal(npc.fates.length, 2);
    assert.equal(new Set(npc.fates.map(fate => fate.id)).size, 2);
  }
});

test('all ten NPC fate variants match the existing authored quest outcomes', () => {
  for (const npc of STORY_WORLD_NPCS) {
    const authored = QUESTS
      .filter(quest => quest.regionId === npc.regionId)
      .flatMap(quest => quest.choices.flatMap(choice => Object.entries(choice.outcome.npcFates ?? [])
        .filter(([npcId]) => npcId === npc.id)
        .map(([, fateId]) => fateId)));
    assert.deepEqual(new Set(npc.fates.map(fate => fate.id)), new Set(authored), npc.id);
  }
});

test('the thirteen atmosphere variants match the existing authored quest outcomes', () => {
  assert.equal(STORY_REGION_ATMOSPHERES.length, 13);
  assert.equal(new Set(STORY_REGION_ATMOSPHERES.map(item => item.id)).size, 13);
  for (const regionId of regions) {
    const authored = QUESTS
      .filter(quest => quest.regionId === regionId)
      .flatMap(quest => quest.choices.flatMap(choice => Object.entries(choice.outcome.regionAtmospheres ?? [])
        .filter(([targetRegion]) => targetRegion === regionId)
        .map(([, atmosphereId]) => atmosphereId)));
    const catalog = STORY_REGION_ATMOSPHERES.filter(item => item.regionId === regionId).map(item => item.id);
    assert.deepEqual(new Set(catalog), new Set(authored), regionId);
  }
});

test('resolver selects the matching NPC fate and atmosphere in every region', () => {
  for (const npc of STORY_WORLD_NPCS) {
    for (const fate of npc.fates) {
      const atmosphere = STORY_REGION_ATMOSPHERES.find(item => item.regionId === npc.regionId);
      const resolved = resolveStoryWorldState(npc.regionId, {
        npcFates: { [npc.id]: fate.id },
        regionAtmospheres: atmosphere ? { [npc.regionId]: atmosphere.id } : {}
      });
      assert.equal(resolved.npc?.definition.id, npc.id);
      assert.equal(resolved.npc?.fateId, fate.id);
      assert.equal(resolved.atmosphere?.id, atmosphere?.id ?? null);
    }
  }
});

test('unknown and malformed saved values fall back safely without leaking across regions', () => {
  const fallback = resolveStoryWorldState('cursed-forest', {
    npcFates: { 'briar-warden': 'not-an-authored-fate', 'mourner-acolyte': 'redeemed' },
    regionAtmospheres: { 'cursed-forest': 'not-an-authored-atmosphere', 'forgotten-graveyard': 'restful' }
  });
  assert.equal(fallback.npc?.fateId, 'unresolved');
  assert.equal(fallback.atmosphere, null);
  assert.equal(resolveStoryWorldState('cursed-forest', null).npc?.fateId, 'unresolved');
  assert.equal(resolveStoryWorldState('cursed-forest', { npcFates: ['invalid'], regionAtmospheres: 7 }).atmosphere, null);
});
