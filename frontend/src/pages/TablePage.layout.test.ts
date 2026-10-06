import { describe, expect, it } from 'vitest'
import { getSeatPositions } from './TablePage'

describe('getSeatPositions', () => {
  it.each([2, 4, 6, 9])('provides a unique coordinate for every seat in a %i-player table', (count) => {
    const positions = getSeatPositions(count)
    expect(positions).toHaveLength(count)
    expect(new Set(positions.map((position) => `${position.left}:${position.top}`)).size).toBe(count)
  })
})
