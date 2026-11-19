
import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialSaveData } from '../.test-dist/src/systems/save/save-manager.js';
import { QUESTS } from '../.test-dist/src/data/quests.js';
import { areQuestObjectivesComplete, chooseQuestBranch, getAvailableQuests, recordQuestObjective, startQuest } from '../.test-dist/src/gameplay/quests/quest-runtime.js';

const now='2026-11-19T12:00:00.000Z';
function unlocked(questId){
  const quest=QUESTS.find(item=>item.id===questId);
  const save=createInitialSaveData(now);
  save.progression.unlockedRegionIds=[...new Set([...save.progression.unlockedRegionIds,quest.regionId])];
  return save;
}
function finishObjectives(save,questId){
  let next=save;
  const quest=QUESTS.find(item=>item.id===questId);
  for(const objective of quest.objectives)next=recordQuestObjective(next,questId,objective.id,objective.target);
  return next;
}

test('quest catalog covers five regions with ten quests and two distinct choices each',()=>{
  assert.equal(QUESTS.length,10);
  assert.deepEqual(new Set(QUESTS.map(q=>q.regionId)),new Set(['cursed-forest','forgotten-graveyard','deep-dungeon','rotten-swamp','cursed-castle']));
  for(const quest of QUESTS){assert.ok(quest.objectives.length>0);assert.equal(quest.choices.length,2);assert.notEqual(quest.choices[0].outcome.id,quest.choices[1].outcome.id);}
});
test('region and prerequisite locks gate main quest availability',()=>{
  const save=createInitialSaveData(now);
  assert.ok(getAvailableQuests(save,'cursed-forest').some(q=>q.id==='forest-root-oath'));
  assert.ok(!getAvailableQuests(save,'forgotten-graveyard').some(q=>q.id==='grave-names-unforgotten'));
  assert.equal(startQuest(save,'forest-root-oath').story.quests['forest-root-oath'].status,'active');
  assert.equal(startQuest(save,'grave-names-unforgotten'),null);
});
test('objective progress clamps at target, rejects invalid events and does not mutate input',()=>{
  const active=startQuest(unlocked('forest-root-oath'),'forest-root-oath');
  const advanced=recordQuestObjective(active,'forest-root-oath','inspect-root-runes',99);
  assert.equal(advanced.story.quests['forest-root-oath'].objectiveProgress['inspect-root-runes'],2);
  assert.equal(active.story.quests['forest-root-oath'].objectiveProgress['inspect-root-runes'],undefined);
  assert.equal(recordQuestObjective(active,'forest-root-oath','unknown'),null);
  assert.equal(recordQuestObjective(active,'forest-root-oath','inspect-root-runes',0),null);
});
test('branch choice is unavailable until all objectives are complete',()=>{
  const active=startQuest(unlocked('forest-root-oath'),'forest-root-oath');
  assert.equal(chooseQuestBranch(active,'forest-root-oath','spare-warden'),null);
  assert.equal(areQuestObjectivesComplete('forest-root-oath',active.story.quests['forest-root-oath']),false);
});
test('selected branch persists NPC, atmosphere, path, boss, reward, alternate quest and lore outcomes once',()=>{
  const active=startQuest(unlocked('forest-root-oath'),'forest-root-oath');
  const completed=chooseQuestBranch(finishObjectives(active,'forest-root-oath'),'forest-root-oath','spare-warden');
  assert.equal(completed.story.quests['forest-root-oath'].status,'completed');
  assert.equal(completed.story.npcFates['briar-warden'],'spared');
  assert.equal(completed.story.regionAtmospheres['cursed-forest'],'quiet-growth');
  assert.ok(completed.story.unlockedPathIds.includes('forest-mercy-path'));
  assert.ok(completed.story.bossEncounterIds.includes('thorn-matriarch-awakened'));
  assert.ok(completed.story.unlockedRewardIds.includes('root-warden-token'));
  assert.ok(completed.story.unlockedAlternateQuestIds.includes('forest-hidden-spring'));
  assert.equal(completed.progression.soulEssence,40);
  assert.ok(completed.collections.discoveredLoreIds.includes('cursed-forest-lore'));
  assert.equal(chooseQuestBranch(completed,'forest-root-oath','spare-warden'),null);
  const alternate=chooseQuestBranch(finishObjectives(active,'forest-root-oath'),'forest-root-oath','claim-heartwood');
  assert.equal(alternate.story.npcFates['briar-warden'],'vanished');
  assert.equal(alternate.progression.soulEssence,65);
});
test('story-gated side quest unlocks only through its authored parent outcome',()=>{
  let save=startQuest(unlocked('forest-root-oath'),'forest-root-oath');
  save=chooseQuestBranch(finishObjectives(save,'forest-root-oath'),'forest-root-oath','spare-warden');
  assert.ok(getAvailableQuests(save,'cursed-forest').some(q=>q.id==='forest-hidden-spring'));
  assert.equal(getAvailableQuests(save,'forgotten-graveyard').some(q=>q.id==='grave-names-unforgotten'),false);
  assert.equal(startQuest(save,'forest-hidden-spring').story.quests['forest-hidden-spring'].status,'active');
});
test('final story choice stores one of the authored endings and boss encounter variants',()=>{
  let save=createInitialSaveData(now);
  save.progression.unlockedRegionIds=['cursed-forest','forgotten-graveyard','deep-dungeon','rotten-swamp','cursed-castle'];
  for(const id of ['forest-root-oath','grave-names-unforgotten','dungeon-forge-truth','swamp-drowned-vow']){
    save=startQuest(save,id);
    save=chooseQuestBranch(finishObjectives(save,id),id,QUESTS.find(q=>q.id===id).choices[0].id);
  }
  save=startQuest(save,'castle-veil-heir');
  save=chooseQuestBranch(finishObjectives(save,'castle-veil-heir'),'castle-veil-heir','tear-the-veil');
  assert.equal(save.story.endingId,'ending-beyond-veil');
  assert.ok(save.story.bossEncounterIds.includes('unwritten-regent-unbound'));
  assert.ok(save.story.unlockedPathIds.includes('castle-beyond-gate'));
  assert.equal(save.progression.soulEssence,160);
});
