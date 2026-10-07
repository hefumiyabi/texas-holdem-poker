import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HandResultCard } from './HandResultCard'
import type { HandResult } from '../types'

const showdown: HandResult = {
  is_showdown: true, win_reason: 'best_hand', pot: 320,
  community_cards: [], pots: [],
  winners: [{ player_id: 'p1', nickname: 'Hero', amount: 320, chips: 1160 }],
  player_results: [
    { player_id: 'p1', nickname: 'Hero', is_bot: false, invested: 160, payout: 320, net: 160, starting_chips: 1000, final_chips: 1160, revealed: true, hole_cards: [{ suit: '♠', rank: 'A' }, { suit: '♦', rank: 'K' }], hand_name: '顺子', hand_description: 'A高顺子' },
    { player_id: 'p2', nickname: 'Bot', is_bot: true, invested: 160, payout: 0, net: -160, starting_chips: 1000, final_chips: 840, revealed: true, hole_cards: [{ suit: '♣', rank: 'Q' }, { suit: '♥', rank: 'Q' }], hand_name: '一对', hand_description: '一对Q' },
  ],
  showdown_players: [
    { player_id: 'p1', nickname: 'Hero', is_bot: false, hole_cards: [{ suit: '♠', rank: 'A' }, { suit: '♦', rank: 'K' }], hand_description: 'A高顺子', hand_name: '顺子', rank: 1, result: 'winner', winnings: 320, returned: 0, final_chips: 1160 },
    { player_id: 'p2', nickname: 'Bot', is_bot: true, hole_cards: [{ suit: '♣', rank: 'Q' }, { suit: '♥', rank: 'Q' }], hand_description: '一对Q', hand_name: '一对', rank: 2, result: 'loser', winnings: 0, returned: 0, final_chips: 840 },
  ],
}

describe('HandResultCard', () => {
  it('explains the winning hand and shows legally revealed cards', () => {
    render(<HandResultCard language="zh" currency="JPY" result={showdown} viewerId="p1" />)
    expect(screen.getByText('Hero 获胜')).toBeInTheDocument()
    expect(screen.getByText('A高顺子')).toBeInTheDocument()
    expect(screen.getByLabelText('Hero 手牌')).toHaveTextContent('A♠K♦')
    expect(screen.getByText('击败 一对Q')).toBeInTheDocument()
    expect(screen.getByText('收回 JP¥320')).toBeInTheDocument()
  })

  it('shows the viewer net, invested, payout, and final stack from the authoritative row', () => {
    render(<HandResultCard language="zh" currency="JPY" result={showdown} viewerId="p1" />)
    expect(screen.getByText('本手 +JP¥160')).toBeInTheDocument()
    expect(screen.getByText('投入 JP¥160')).toBeInTheDocument()
    expect(screen.getByText('收回 JP¥320')).toBeInTheDocument()
    expect(screen.getByText('终局 JP¥1,160')).toBeInTheDocument()
  })

  it('expands all-player settlement rows without revealing absent mucked cards', () => {
    const folded = {
      ...showdown,
      showdown_players: showdown.showdown_players.filter((row) => row.player_id !== 'p2'),
      player_results: showdown.player_results.map((row) => row.player_id === 'p2'
        ? { ...row, revealed: false, hole_cards: undefined, hand_name: undefined, hand_description: undefined }
        : row),
    }
    render(<HandResultCard language="zh" result={folded} viewerId="p1" />)
    expect(screen.queryByTestId('all-player-results')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '查看全部玩家' }))
    const rows = screen.getByTestId('all-player-results')
    expect(rows).toHaveTextContent('Hero')
    expect(rows).toHaveTextContent('Bot')
    expect(rows).toHaveTextContent('+¥160')
    expect(rows).toHaveTextContent('-¥160')
    expect(screen.queryByLabelText('Bot 手牌')).not.toBeInTheDocument()
  })

  it('does not invent or reveal mucked cards after a fold win', () => {
    render(<HandResultCard language="zh" result={{ ...showdown, is_showdown: false, win_reason: 'others_folded', showdown_players: [] }} viewerId="p1" />)
    expect(screen.getByText('其他玩家弃牌')).toBeInTheDocument()
    expect(screen.queryByLabelText('Bot 手牌')).not.toBeInTheDocument()
  })

  it('names every winner and payout for a split pot', () => {
    render(<HandResultCard language="zh" currency="JPY" result={{
      ...showdown,
      winners: [
        { player_id: 'p1', nickname: 'Hero', amount: 160, chips: 1160 },
        { player_id: 'p2', nickname: 'Bot', amount: 160, chips: 1160 },
      ],
      showdown_players: showdown.showdown_players.map((player) => ({ ...player, result: 'winner', winnings: 160, hand_description: 'A高顺子', hand_name: '顺子', rank: 1 })),
    }} viewerId="p1" />)
    expect(screen.getByText('Hero、Bot 平分底池')).toBeInTheDocument()
    expect(screen.getByText('Hero +JP¥160')).toBeInTheDocument()
    expect(screen.getByText('Bot +JP¥160')).toBeInTheDocument()
  })

  it('collapses to a summary and restores showdown details', () => {
    render(<HandResultCard language="zh" result={showdown} viewerId="p1" />)
    fireEvent.click(screen.getByRole('button', { name: '收起结果' }))
    expect(screen.queryByLabelText('Hero 手牌')).not.toBeInTheDocument()
    expect(screen.queryByText('投入 ¥160')).not.toBeInTheDocument()
    expect(screen.getByText('Hero 获胜')).toBeInTheDocument()
    expect(screen.getByText('A高顺子')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '查看结果' }))
    expect(screen.getByLabelText('Hero 手牌')).toHaveTextContent('A♠K♦')
  })
})
