import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { Player } from '../types'
import { HeroStack } from './HeroStack'

const viewer: Player = {
  id: 'hero',
  nickname: 'River',
  chips: 4980,
  is_bot: false,
  status: 'active',
  current_bet: 20,
  total_bet: 20,
  is_dealer: false,
  is_small_blind: false,
  is_big_blind: true,
  has_acted: false,
  hole_cards: [{ rank: 'A', suit: '♠' }, { rank: 'K', suit: '♦' }],
}

describe('HeroStack', () => {
  it('keeps the viewer name and current chips with their hand', () => {
    render(<HeroStack player={viewer} />)

    expect(screen.getByText('River')).toBeInTheDocument()
    expect(screen.getByLabelText('Your chips')).toHaveTextContent('4,980')
    expect(screen.getByLabelText('Your hand').querySelectorAll('.playing-card')).toHaveLength(2)
  })
})
