export interface LevelUpControlState {
  rerollsRemaining: number;
  banishesRemaining: number;
  skipsRemaining: number;
  bannedChoiceIds: readonly string[];
}

export function createLevelUpControlState(): LevelUpControlState {
  return {
    rerollsRemaining: 2,
    banishesRemaining: 1,
    skipsRemaining: 1,
    bannedChoiceIds: []
  };
}

export function drawLevelUpChoices<T extends { id: string }>(
  candidates: readonly T[],
  state: LevelUpControlState,
  random: () => number = Math.random,
  excludedIds: readonly string[] = []
): T[] {
  const blocked = new Set([...state.bannedChoiceIds, ...excludedIds]);
  const available = candidates.filter(choice => !blocked.has(choice.id));
  const shuffled = [...available];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const sample = random();
    const safeSample = Number.isFinite(sample) ? Math.min(0.999999999, Math.max(0, sample)) : 0;
    const swapIndex = Math.floor(safeSample * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }

  return shuffled.slice(0, 4);
}

export function spendLevelUpReroll(state: LevelUpControlState): LevelUpControlState | null {
  if (state.rerollsRemaining <= 0) return null;
  return { ...state, rerollsRemaining: state.rerollsRemaining - 1 };
}

export function spendLevelUpBanish(
  state: LevelUpControlState,
  choiceId: string
): LevelUpControlState | null {
  if (state.banishesRemaining <= 0 || !choiceId || state.bannedChoiceIds.includes(choiceId)) return null;
  return {
    ...state,
    banishesRemaining: state.banishesRemaining - 1,
    bannedChoiceIds: [...state.bannedChoiceIds, choiceId]
  };
}

export function spendLevelUpSkip(state: LevelUpControlState): LevelUpControlState | null {
  if (state.skipsRemaining <= 0) return null;
  return { ...state, skipsRemaining: state.skipsRemaining - 1 };
}
