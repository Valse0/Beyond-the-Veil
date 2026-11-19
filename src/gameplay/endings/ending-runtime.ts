import { QUEST_BY_ID } from '../../data/quests.js';
import type { SaveData } from '../../systems/save/save-types.js';

export interface EndingCompletionInput {
  regionId: string;
  bossId: string;
  victory: boolean;
}

const FINAL_QUEST_ID = 'castle-veil-heir';
const FINAL_REGION_ID = 'cursed-castle';
const FINAL_BOSS_ID = 'unwritten-regent';

/** Records the selected ending only after its matching final boss is defeated. */
export function completeEnding(save: SaveData, input: EndingCompletionInput): SaveData {
  if (!input.victory || input.regionId !== FINAL_REGION_ID || input.bossId !== FINAL_BOSS_ID) return save;
  if (save.story.completedEndingId !== null) return save;

  const quest = QUEST_BY_ID.get(FINAL_QUEST_ID);
  const progress = save.story.quests[FINAL_QUEST_ID];
  if (!quest || progress?.status !== 'completed' || !progress.chosenChoiceId || !progress.outcomeId) return save;

  const choice = quest.choices.find(item => item.id === progress.chosenChoiceId);
  const endingId = choice?.outcome.endingId;
  if (!endingId || choice?.outcome.id !== progress.outcomeId || save.story.endingId !== endingId) return save;

  return { ...save, story: { ...save.story, completedEndingId: endingId } };
}
