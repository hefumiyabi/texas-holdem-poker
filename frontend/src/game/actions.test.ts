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

  it('caps pot presets at the player all-in amount', () => {
    expect(getBetPresets({ pot: 400, min: 100, max: 250 })).toEqual([
      { label: '½', amount: 200 },
      { label: '¾', amount: 250 },
      { label: '1×', amount: 250 },
      { label: 'MAX', amount: 250 },
    ])
  })
})
