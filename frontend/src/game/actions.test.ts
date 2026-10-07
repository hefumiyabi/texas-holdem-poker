import { describe, expect, it } from 'vitest'
import { getBetPresets, getLegalActions } from './actions'

describe('poker actions', () => {
  it('offers check and raise when a blind is already posted', () => {
    expect(getLegalActions({ currentBet: 20, playerBet: 20, chips: 980 })).toEqual([
      'fold', 'check', 'raise', 'all_in',
    ])
  })

  it('offers a bet when no wager exists on the street', () => {
    expect(getLegalActions({ currentBet: 0, playerBet: 0, chips: 980 })).toEqual([
      'fold', 'check', 'bet', 'all_in',
    ])
  })

  it('offers call and raise when facing a bet', () => {
    expect(getLegalActions({ currentBet: 80, playerBet: 20, chips: 980 })).toEqual([
      'fold', 'call', 'raise', 'all_in',
    ])
  })

  it('uses the unopened pot and big blind for sizing targets', () => {
    expect(getBetPresets({ pot: 120, currentBet: 0, playerBet: 0, min: 20, max: 1000, bigBlind: 20 })).toEqual([
      { id: 'half-pot', label: '½', amount: 60 },
      { id: 'three-quarter-pot', label: '¾', amount: 90 },
      { id: 'pot', label: 'Pot', amount: 120 },
      { id: '3x', label: '3×', amount: 60 },
      { id: '4x', label: '4×', amount: 80 },
      { id: '6x', label: '6×', amount: 120 },
      { id: 'all-in', label: 'All in', amount: 1000 },
    ])
  })

  it('uses pot-after-call formulas and current-bet multipliers when facing a bet', () => {
    expect(getBetPresets({ pot: 240, currentBet: 40, playerBet: 20, min: 80, max: 1000, bigBlind: 20 })).toEqual([
      { id: 'half-pot', label: '½', amount: 170 },
      { id: 'three-quarter-pot', label: '¾', amount: 235 },
      { id: 'pot', label: 'Pot', amount: 300 },
      { id: '3x', label: '3×', amount: 120 },
      { id: '4x', label: '4×', amount: 160 },
      { id: '6x', label: '6×', amount: 240 },
      { id: 'all-in', label: 'All in', amount: 1000 },
    ])
  })

  it('rounds to integers and clamps every target to the legal range', () => {
    expect(getBetPresets({ pot: 101, currentBet: 0, playerBet: 0, min: 200, max: 250, bigBlind: 20 })).toEqual([
      { id: 'half-pot', label: '½', amount: 200 },
      { id: 'three-quarter-pot', label: '¾', amount: 200 },
      { id: 'pot', label: 'Pot', amount: 200 },
      { id: '3x', label: '3×', amount: 200 },
      { id: '4x', label: '4×', amount: 200 },
      { id: '6x', label: '6×', amount: 200 },
      { id: 'all-in', label: 'All in', amount: 250 },
    ])
  })
})
