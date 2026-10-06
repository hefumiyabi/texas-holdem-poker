import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PlayerSeat } from './PlayerSeat'
import type { Player } from '../types'

const human = { id: 'p1', nickname: 'Hero', chips: 900, is_bot: false, status: 'playing', current_bet: 0, total_bet: 0, is_dealer: false, is_small_blind: false, is_big_blind: false, has_acted: false } as Player

describe('PlayerSeat states', () => {
  it('keeps a folded badge on the avatar', () => {
    render(<PlayerSeat language="zh" player={{ ...human, status: 'folded' }} active={false} self={false} />)
    expect(screen.getByText('已弃牌')).toBeInTheDocument()
  })

  it('does not show an action countdown for human players', () => {
    render(<PlayerSeat language="zh" player={human} active self now={100} />)
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
  })

  it('shows bot thinking countdown', () => {
    render(<PlayerSeat language="zh" player={{ ...human, id: 'b1', nickname: 'Bot', is_bot: true, bot_persona: 'balanced' }} active self={false} thinkingUntil={103} now={100} />)
    expect(screen.getByRole('timer', { name: 'Bot 思考中，约 3 秒' })).toBeInTheDocument()
  })
})
