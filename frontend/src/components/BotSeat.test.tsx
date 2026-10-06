import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Player } from '../types'
import { BotSeat } from './BotSeat'

const bot = {
  id: 'bot-1', nickname: '深海鱼', chips: 1860, current_bet: 40, total_bet: 40,
  is_bot: true, status: 'active', has_acted: false, is_dealer: false,
  is_small_blind: false, is_big_blind: false, bot_level: 'advanced',
  bot_persona: 'aggressive', persona_label: '爱诈唬',
} satisfies Player

describe('BotSeat', () => {
  it('uses the persona portrait and exposes thinking state with a timer', () => {
    render(<BotSeat language="zh" currency="JPY" player={bot} active thinking />)

    expect(screen.getByRole('img', { name: '深海鱼' })).toHaveAttribute('src', '/avatars/aggressive.webp')
    expect(screen.getByText('爱诈唬')).toBeInTheDocument()
    expect(screen.getByText('思考中')).toBeInTheDocument()
    expect(screen.getByRole('timer', { name: '深海鱼思考中' })).toBeInTheDocument()
    expect(screen.getByText('JP¥1,860')).toBeInTheDocument()
    expect(screen.getByText('JP¥40')).toBeInTheDocument()
  })
})
