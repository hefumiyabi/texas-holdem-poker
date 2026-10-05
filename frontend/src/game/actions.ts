export type PokerAction = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in'

export function getLegalActions({ currentBet, playerBet, chips }: { currentBet: number; playerBet: number; chips: number }): PokerAction[] {
  if (chips <= 0) return []
  return currentBet <= playerBet
    ? ['fold', 'check', currentBet > 0 ? 'raise' : 'bet', 'all_in']
    : ['fold', 'call', 'raise', 'all_in']
}

export function getBetPresets({ pot, min, max }: { pot: number; min: number; max: number }) {
  const bounded = (amount: number) => Math.max(Math.min(Math.round(amount), max), Math.min(min, max))
  return [
    { label: '½', amount: bounded(pot * 0.5) },
    { label: '¾', amount: bounded(pot * 0.75) },
    { label: '1×', amount: bounded(pot) },
    { label: 'MAX', amount: max },
  ]
}
