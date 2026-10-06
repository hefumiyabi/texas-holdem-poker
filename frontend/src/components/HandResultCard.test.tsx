import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HandResultCard } from './HandResultCard'
import type { HandResult } from '../types'

const showdown: HandResult = {
  is_showdown: true, win_reason: 'best_hand', pot: 320,
  community_cards: [], pots: [],
  winners: [{ player_id: 'p1', nickname: 'Hero', amount: 320, chips: 1320 }],
  showdown_players: [
    { player_id: 'p1', nickname: 'Hero', is_bot: false, hole_cards: [{ suit: '♠', rank: 'A' }, { suit: '♦', rank: 'K' }], hand_description: 'A高顺子', hand_name: '顺子', rank: 1, result: 'winner', winnings: 320, returned: 0, final_chips: 1320 },
    { player_id: 'p2', nickname: 'Bot', is_bot: true, hole_cards: [{ suit: '♣', rank: 'Q' }, { suit: '♥', rank: 'Q' }], hand_description: '一对Q', hand_name: '一对', rank: 2, result: 'loser', winnings: 0, returned: 0, final_chips: 680 },
  ],
}

describe('HandResultCard', () => {
  it('explains the winning hand and shows legally revealed cards', () => {
    render(<HandResultCard language="zh" result={showdown} />)
    expect(screen.getByText('Hero 获胜')).toBeInTheDocument()
    expect(screen.getByText('A高顺子')).toBeInTheDocument()
    expect(screen.getByLabelText('Hero 手牌')).toHaveTextContent('A♠K♦')
    expect(screen.getByText('击败 一对Q')).toBeInTheDocument()
  })

  it('does not invent or reveal mucked cards after a fold win', () => {
    render(<HandResultCard language="zh" result={{ ...showdown, is_showdown: false, win_reason: 'others_folded', showdown_players: [] }} />)
    expect(screen.getByText('其他玩家弃牌')).toBeInTheDocument()
    expect(screen.queryByLabelText('Bot 手牌')).not.toBeInTheDocument()
  })

  it('names every winner and payout for a split pot', () => {
    render(<HandResultCard language="zh" result={{
      ...showdown,
      winners: [
        { player_id: 'p1', nickname: 'Hero', amount: 160, chips: 1160 },
        { player_id: 'p2', nickname: 'Bot', amount: 160, chips: 1160 },
      ],
      showdown_players: showdown.showdown_players.map((player) => ({ ...player, result: 'winner', winnings: 160, hand_description: 'A高顺子', hand_name: '顺子', rank: 1 })),
    }} />)
    expect(screen.getByText('Hero、Bot 平分底池')).toBeInTheDocument()
    expect(screen.getByText('Hero +160')).toBeInTheDocument()
    expect(screen.getByText('Bot +160')).toBeInTheDocument()
  })
})
