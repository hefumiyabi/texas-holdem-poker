export type PokerAction = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in'

export function getLegalActions({ currentBet, playerBet, chips }: { currentBet: number; playerBet: number; chips: number }): PokerAction[] {
  if (chips <= 0) return []
  return currentBet <= playerBet
    ? ['fold', 'check', currentBet > 0 ? 'raise' : 'bet', 'all_in']
    : ['fold', 'call', 'raise', 'all_in']
}

export type BetPresetId = 'half-pot' | 'three-quarter-pot' | 'pot' | '3x' | '4x' | '6x' | 'all-in'

export function getBetPresets({ pot, currentBet, playerBet, min, max, bigBlind }: {
  pot: number
  currentBet: number
  playerBet: number
  min: number
  max: number
  bigBlind: number
}): { id: BetPresetId; label: string; amount: number }[] {
  const bounded = (amount: number) => Math.max(Math.min(Math.round(amount), max), Math.min(min, max))
  const toCall = Math.max(0, currentBet - playerBet)
  const potTarget = (fraction: number) => currentBet > 0
    ? currentBet + fraction * (pot + toCall)
    : fraction * pot
  const multipleBase = currentBet > 0 ? currentBet : bigBlind
  return [
    { id: 'half-pot', label: '½', amount: bounded(potTarget(0.5)) },
    { id: 'three-quarter-pot', label: '¾', amount: bounded(potTarget(0.75)) },
    { id: 'pot', label: 'Pot', amount: bounded(potTarget(1)) },
    { id: '3x', label: '3×', amount: bounded(multipleBase * 3) },
    { id: '4x', label: '4×', amount: bounded(multipleBase * 4) },
    { id: '6x', label: '6×', amount: bounded(multipleBase * 6) },
    { id: 'all-in', label: 'All in', amount: max },
  ]
}
