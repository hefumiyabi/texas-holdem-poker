import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { TableInfo } from '../types'
import { PokerBoard } from './PokerBoard'

describe('PokerBoard', () => {
  it('keeps the pot and five community-card positions together', () => {
    render(<PokerBoard language="zh" currency="JPY" table={{
      id: 't1', game_stage: 'flop', pot: 360, players: [], small_blind: 100, big_blind: 200,
      blind_seconds_remaining: 125, next_small_blind: 150, next_big_blind: 300, tournament_paused: false,
      community_cards: [{ rank: 'A', suit: '♠' }, { rank: '10', suit: '♥' }, { rank: '7', suit: '♣' }],
    } satisfies TableInfo} />)

    expect(screen.getByText('JP¥360')).toBeInTheDocument()
    expect(screen.getByLabelText('当前盲注')).toHaveTextContent('JP¥100 / JP¥200')
    expect(screen.getByLabelText('当前盲注')).toHaveTextContent('下一级 02:05')
    expect(screen.getByLabelText('当前盲注')).toHaveTextContent('下一档 JP¥150 / JP¥300')
    expect(screen.getByLabelText('公共牌')).toHaveTextContent('A♠10♥7♣')
    expect(screen.getAllByTestId('community-card-slot')).toHaveLength(5)
  })

  it('announces a paused tournament clock', () => {
    render(<PokerBoard language="zh" table={{
      id: 't2', game_stage: 'flop', pot: 30, players: [], small_blind: 10, big_blind: 20,
      blind_seconds_remaining: 400, tournament_paused: true, community_cards: [],
    } satisfies TableInfo} />)

    expect(screen.getByLabelText('当前盲注')).toHaveTextContent('盲注时钟已暂停')
  })
})
