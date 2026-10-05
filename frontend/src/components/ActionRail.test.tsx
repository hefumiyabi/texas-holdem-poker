import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ActionRail } from './ActionRail'
import type { Player, TableInfo } from '../types'

describe('ActionRail', () => {
  it('keeps the explicit all-in action available on a live turn', () => {
    const player = { id: 'p1', nickname: 'River', chips: 980, current_bet: 20 } as Player
    const table = { id: 'r1', game_stage: 'pre_flop', players: [player], community_cards: [], pot: 60, current_bet: 40 } as TableInfo
    render(<ActionRail language="zh" table={table} player={player} enabled onAct={vi.fn()} />)
    expect(screen.getByRole('button', { name: '全下' })).toBeEnabled()
  })
})
