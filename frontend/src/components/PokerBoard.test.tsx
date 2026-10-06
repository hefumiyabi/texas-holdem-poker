import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { TableInfo } from '../types'
import { PokerBoard } from './PokerBoard'

describe('PokerBoard', () => {
  it('keeps the pot and five community-card positions together', () => {
    render(<PokerBoard language="zh" currency="JPY" table={{
      id: 't1', game_stage: 'flop', pot: 360, players: [], small_blind: 100, big_blind: 200,
      community_cards: [{ rank: 'A', suit: '♠' }, { rank: '10', suit: '♥' }, { rank: '7', suit: '♣' }],
    } satisfies TableInfo} />)

    expect(screen.getByText('JP¥360')).toBeInTheDocument()
    expect(screen.getByLabelText('当前盲注')).toHaveTextContent('JP¥100 / JP¥200')
    expect(screen.getByLabelText('公共牌')).toHaveTextContent('A♠10♥7♣')
    expect(screen.getAllByTestId('community-card-slot')).toHaveLength(5)
  })
})
