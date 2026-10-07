import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ActionRail } from './ActionRail'
import type { Player, TableInfo } from '../types'

describe('ActionRail', () => {
  it('keeps the explicit all-in action available on a live turn', () => {
    const player = { id: 'p1', nickname: 'River', chips: 980, current_bet: 20 } as Player
    const table = { id: 'r1', game_stage: 'pre_flop', players: [player], community_cards: [], pot: 60, current_bet: 40 } as TableInfo
    render(<ActionRail language="zh" currency="JPY" table={table} player={player} enabled onAct={vi.fn()} />)
    expect(screen.getByRole('button', { name: '全下' })).toBeEnabled()
    expect(screen.getByRole('button', { name: /跟注\s*JP¥20/ })).toBeInTheDocument()
  })

  it('opens clear pot-sized raise presets without showing illegal check', () => {
    const player = { id: 'p1', nickname: 'River', chips: 980, current_bet: 20 } as Player
    const table = { id: 'r1', game_stage: 'flop', players: [player], community_cards: [], pot: 240, current_bet: 40, min_raise_to: 80 } as TableInfo
    render(<ActionRail language="zh" currency="JPY" table={table} player={player} enabled onAct={vi.fn()} />)

    expect(screen.queryByRole('button', { name: '过牌' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '加注' }))
    const dialog = within(screen.getByRole('dialog', { name: '加注到' }))
    expect(dialog.queryByRole('slider')).not.toBeInTheDocument()
    for (const name of ['½池 JP¥170', '¾池 JP¥235', '满池 JP¥300', '3× JP¥120', '4× JP¥160', '6× JP¥240', '全下 JP¥1,000']) {
      expect(dialog.getByRole('button', { name })).toBeInTheDocument()
    }
    const confirm = dialog.getByRole('button', { name: /确认\s*JP¥80/ })
    expect(confirm).toHaveClass('bet-confirm-button')
    expect(confirm.querySelector('.confirm-amount')).toHaveTextContent('JP¥80')
  })

  it('submits a custom integer only after explicit confirmation', () => {
    const onAct = vi.fn()
    const player = { id: 'p1', nickname: 'River', chips: 980, current_bet: 20 } as Player
    const table = { id: 'r1', game_stage: 'flop', players: [player], community_cards: [], pot: 240, current_bet: 40, min_raise_to: 80, big_blind: 20 } as TableInfo
    render(<ActionRail language="zh" currency="CNY" table={table} player={player} enabled onAct={onAct} />)

    fireEvent.click(screen.getByRole('button', { name: '加注' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: '自定义金额' }), { target: { value: '333' } })
    expect(onAct).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /确认\s*¥333/ }))

    expect(onAct).toHaveBeenCalledTimes(1)
    expect(onAct).toHaveBeenCalledWith('raise', 333)
  })

  it('cannot submit after the turn becomes disabled', () => {
    const onAct = vi.fn()
    const player = { id: 'p1', nickname: 'River', chips: 980, current_bet: 20 } as Player
    const table = { id: 'r1', game_stage: 'flop', players: [player], community_cards: [], pot: 240, current_bet: 40, min_raise_to: 80, big_blind: 20 } as TableInfo
    const view = render(<ActionRail language="zh" table={table} player={player} enabled onAct={onAct} />)
    fireEvent.click(screen.getByRole('button', { name: '加注' }))

    view.rerender(<ActionRail language="zh" table={table} player={player} enabled={false} onAct={onAct} />)
    fireEvent.click(screen.getByRole('button', { name: /确认/ }))

    expect(onAct).not.toHaveBeenCalled()
  })
})
