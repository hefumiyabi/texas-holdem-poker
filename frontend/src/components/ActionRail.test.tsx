import { fireEvent, render, screen, within } from '@testing-library/react'
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

  it('opens clear pot-sized raise presets without showing illegal check', () => {
    const player = { id: 'p1', nickname: 'River', chips: 980, current_bet: 20 } as Player
    const table = { id: 'r1', game_stage: 'flop', players: [player], community_cards: [], pot: 240, current_bet: 40, min_raise_to: 80 } as TableInfo
    render(<ActionRail language="zh" table={table} player={player} enabled onAct={vi.fn()} />)

    expect(screen.queryByRole('button', { name: '过牌' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '加注' }))
    const dialog = within(screen.getByRole('dialog', { name: '加注到' }))
    expect(dialog.getByRole('button', { name: '½池' })).toBeInTheDocument()
    expect(dialog.getByRole('button', { name: '¾池' })).toBeInTheDocument()
    expect(dialog.getByRole('button', { name: '满池' })).toBeInTheDocument()
    expect(dialog.getByRole('button', { name: '全下' })).toBeInTheDocument()
  })
})
