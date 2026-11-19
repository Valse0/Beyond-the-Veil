
import { QUESTS, QUEST_BY_ID } from '../../data/quests.js';
import { applyCollectionProgress } from '../progression/collections.js';
import type { SaveData, QuestProgress, QuestStoryState } from '../../systems/save/save-types.js';
import type { QuestObjectiveEventType } from '../../core/types/content.js';

export function createInitialQuestStoryState(): QuestStoryState {
  return { quests:{}, npcFates:{}, regionAtmospheres:{}, unlockedPathIds:[], bossEncounterIds:[], unlockedRewardIds:[], unlockedAlternateQuestIds:[], endingId:null, completedEndingId:null, appliedOutcomeIds:[] };
}
const uniqueStrings=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(x=>typeof x==='string'&&x.length>0)&&new Set(v).size===v.length;
const stringRecord=(v:unknown):v is Record<string,string>=>typeof v==='object'&&v!==null&&!Array.isArray(v)&&Object.entries(v).every(([k,x])=>k.length>0&&typeof x==='string'&&x.length>0);

export function isQuestStoryState(value:unknown): value is QuestStoryState {
  if(typeof value!=='object'||value===null||Array.isArray(value))return false;
  const s=value as Record<string,unknown>;
  if(typeof s.quests!=='object'||s.quests===null||Array.isArray(s.quests)||!stringRecord(s.npcFates)||!stringRecord(s.regionAtmospheres))return false;
  if(!uniqueStrings(s.unlockedPathIds)||!uniqueStrings(s.bossEncounterIds)||!uniqueStrings(s.unlockedRewardIds)||!uniqueStrings(s.unlockedAlternateQuestIds)||!uniqueStrings(s.appliedOutcomeIds))return false;
  if(s.endingId!==null&&typeof s.endingId!=='string')return false;
  if(s.completedEndingId!==null&&s.completedEndingId!=='ending-mended-veil'&&s.completedEndingId!=='ending-beyond-veil')return false;
  for(const [id,raw] of Object.entries(s.quests as Record<string,unknown>)){
    const q=QUEST_BY_ID.get(id);
    if(!q||typeof raw!=='object'||raw===null||Array.isArray(raw))return false;
    const p=raw as Record<string,unknown>;
    if(p.status!=='active'&&p.status!=='completed')return false;
    if(typeof p.objectiveProgress!=='object'||p.objectiveProgress===null||Array.isArray(p.objectiveProgress))return false;
    const progress=p.objectiveProgress as Record<string,unknown>;
    if(Object.entries(progress).some(([objectiveId,count])=>{const objective=q.objectives.find(x=>x.id===objectiveId);return !objective||typeof count!=='number'||!Number.isInteger(count)||count<0||count>objective.target;}))return false;
    if(p.chosenChoiceId!==null&&(typeof p.chosenChoiceId!=='string'||!q.choices.some(x=>x.id===p.chosenChoiceId)))return false;
    if(p.outcomeId!==null&&(typeof p.outcomeId!=='string'||!q.choices.some(x=>x.outcome.id===p.outcomeId)))return false;
    if(p.status==='completed'&&(!p.chosenChoiceId||!p.outcomeId||q.choices.find(x=>x.id===p.chosenChoiceId)?.outcome.id!==p.outcomeId))return false;
    if(p.status==='active'&&(p.chosenChoiceId!==null||p.outcomeId!==null))return false;
  }
  return true;
}
function cloneSave(save:SaveData):SaveData {
  return {...save,story:{...save.story,quests:Object.fromEntries(Object.entries(save.story.quests).map(([id,p])=>[id,{...p,objectiveProgress:{...p.objectiveProgress}}])),npcFates:{...save.story.npcFates},regionAtmospheres:{...save.story.regionAtmospheres},unlockedPathIds:[...save.story.unlockedPathIds],bossEncounterIds:[...save.story.bossEncounterIds],unlockedRewardIds:[...save.story.unlockedRewardIds],unlockedAlternateQuestIds:[...save.story.unlockedAlternateQuestIds],appliedOutcomeIds:[...save.story.appliedOutcomeIds]}};
}
export function getAvailableQuests(save:SaveData,regionId?:string) {
  return QUESTS.filter(q=>(!regionId||q.regionId===regionId)&&save.progression.unlockedRegionIds.includes(q.regionId)&&(q.availability!=='story'||save.story.unlockedAlternateQuestIds.includes(q.id))&&q.prerequisites.every(id=>save.story.quests[id]?.status==='completed')&&save.story.quests[q.id]?.status!=='completed');
}
export function startQuest(save:SaveData,questId:string):SaveData|null {
  const q=QUEST_BY_ID.get(questId);
  if(!q||!getAvailableQuests(save).some(x=>x.id===questId))return null;
  const next=cloneSave(save);
  if(!next.story.quests[questId])next.story.quests[questId]={status:'active',objectiveProgress:{},chosenChoiceId:null,outcomeId:null};
  return next;
}
export function startAvailableQuests(save:SaveData,regionId:string):SaveData {
  let next=save;
  for(const quest of getAvailableQuests(next,regionId)){
    if(next.story.quests[quest.id])continue;
    const started=startQuest(next,quest.id);
    if(started)next=started;
  }
  return next;
}

export function recordQuestEvent(save:SaveData,regionId:string,event:{type:QuestObjectiveEventType;filter?:string;amount?:number}):SaveData {
  const amount=event.amount??1;
  if(!Number.isInteger(amount)||amount<=0)return save;
  let next=startAvailableQuests(save,regionId);
  for(const quest of QUESTS){
    if(quest.regionId!==regionId)continue;
    const progress=next.story.quests[quest.id];
    if(progress?.status!=='active')continue;
    for(const objective of quest.objectives){
      if(objective.event!==event.type||(objective.eventFilter!==undefined&&objective.eventFilter!==event.filter))continue;
      const updated=recordQuestObjective(next,quest.id,objective.id,amount);
      if(updated)next=updated;
    }
  }
  return next;
}

export function recordQuestObjective(save:SaveData,questId:string,objectiveId:string,amount=1):SaveData|null {
  const q=QUEST_BY_ID.get(questId), objective=q?.objectives.find(x=>x.id===objectiveId), current=save.story.quests[questId];
  if(!q||!objective||!current||current.status!=='active'||!Number.isInteger(amount)||amount<=0)return null;
  const next=cloneSave(save), p=next.story.quests[questId]!;
  p.objectiveProgress[objectiveId]=Math.min(objective.target,(p.objectiveProgress[objectiveId]??0)+amount);
  return next;
}
export function areQuestObjectivesComplete(questId:string,progress:QuestProgress|undefined):boolean {
  const q=QUEST_BY_ID.get(questId);
  return Boolean(q&&progress&&q.objectives.every(x=>(progress.objectiveProgress[x.id]??0)>=x.target));
}
export function chooseQuestBranch(save:SaveData,questId:string,choiceId:string):SaveData|null {
  const q=QUEST_BY_ID.get(questId), choice=q?.choices.find(x=>x.id===choiceId), current=save.story.quests[questId];
  if(!q||!choice||!current||current.status!=='active'||!areQuestObjectivesComplete(questId,current)||save.story.appliedOutcomeIds.includes(choice.outcome.id))return null;
  const next=cloneSave(save), p=next.story.quests[questId]!, outcome=choice.outcome;
  p.status='completed';p.chosenChoiceId=choiceId;p.outcomeId=outcome.id;next.story.appliedOutcomeIds.push(outcome.id);
  Object.assign(next.story.npcFates,outcome.npcFates??{});Object.assign(next.story.regionAtmospheres,outcome.regionAtmospheres??{});
  const fields=[['unlockedPathIds',outcome.unlockedPathIds],['bossEncounterIds',outcome.bossEncounterIds],['unlockedRewardIds',outcome.rewardIds],['unlockedAlternateQuestIds',outcome.alternateQuestIds]] as const;
  for(const [field,ids] of fields)for(const id of ids??[]){const target=next.story[field];if(!target.includes(id))target.push(id);}
  if(outcome.endingId)next.story.endingId=outcome.endingId;
  next.progression={...next.progression,soulEssence:next.progression.soulEssence+Math.max(0,Math.floor(outcome.soulEssence??0))};
  next.collections=applyCollectionProgress(next.collections,{loreIds:outcome.loreIds});
  return next;
}
