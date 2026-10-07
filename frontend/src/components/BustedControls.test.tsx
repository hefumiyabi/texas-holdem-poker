import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BustedControls } from './BustedControls'
import type { Player } from '../types'

const bustedPlayer: Player = {
  id: 'hero', nickname: 'Hero', chips: 0, is_bot: false, status: 'broke',
  current_bet: 0, total_bet: 1000, is_dealer: false, is_small_blind: false,
  is_big_blind: false, has_acted: true, rebuy_limit: 3, rebuys_used: 1,
  rebuys_remaining: 2, can_rebuy: true, tournament_status: 'busted',
}

describe('BustedControls', () => {
  it('offers rebuy, spectate, and leave with the remaining allowance', () => {
    const onRebuy = vi.fn(); const onSpectate = vi.fn(); const onLeave = vi.fn()
    render(<BustedControls language="zh" currency="CNY" player={bustedPlayer} initialChips={5000} onRebuy={onRebuy} onSpectate={onSpectate} onLeave={onLeave}/>)

    expect(screen.getByText('还可重新买入 2 次')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重新买入 ¥5,000' }))
    fireEvent.click(screen.getByRole('button', { name: '继续观看' }))
    fireEvent.click(screen.getByRole('button', { name: '退出牌桌' }))
    expect(onRebuy).toHaveBeenCalledOnce()
    expect(onSpectate).toHaveBeenCalledOnce()
    expect(onLeave).toHaveBeenCalledOnce()
  })

  it('hides rebuy after the allowance is exhausted', () => {
    render(<BustedControls language="zh" player={{ ...bustedPlayer, can_rebuy: false, rebuys_remaining: 0, rebuys_used: 3 }} initialChips={5000} onRebuy={() => {}} onSpectate={() => {}} onLeave={() => {}}/>)
    expect(screen.queryByRole('button', { name: /重新买入/ })).not.toBeInTheDocument()
    expect(screen.getByText('重新买入次数已用完')).toBeInTheDocument()
  })

  it('lets a spectator re-enter between hands when a rebuy remains', () => {
    const onWatchNext = vi.fn()
    render(<BustedControls language="zh" player={{ ...bustedPlayer, tournament_status: 'spectating', can_rebuy: true }} initialChips={1000} onRebuy={() => {}} onSpectate={() => {}} onWatchNext={onWatchNext} onLeave={() => {}}/>)
    expect(screen.getByText('正在观战')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重新买入 ¥1,000' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '继续观看' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '观看下一局' }))
    expect(onWatchNext).toHaveBeenCalledOnce()
  })

  it('keeps the initial continue-watching choice for a newly busted player', () => {
    render(<BustedControls language="zh" player={bustedPlayer} initialChips={1000} onRebuy={() => {}} onSpectate={() => {}} onWatchNext={() => {}} onLeave={() => {}}/>)
    expect(screen.getByRole('button', { name: '继续观看' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '观看下一局' })).not.toBeInTheDocument()
  })
})
