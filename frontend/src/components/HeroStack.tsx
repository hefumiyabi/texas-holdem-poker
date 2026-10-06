import { Coins } from '@phosphor-icons/react'

import type { Player } from '../types'
import { PlayingCard } from './PlayingCard'

export function HeroStack({ player }: { player: Player }) {
  return <div className="hero-stack">
    <div className="hero-stack-info">
      <strong>{player.nickname}</strong>
      <span aria-label="Your chips"><Coins weight="fill" />{player.chips.toLocaleString()}</span>
    </div>
    <div className="hero-hand" aria-label="Your hand"><div>{player.hole_cards?.length
      ? player.hole_cards.map((card, index) => <PlayingCard key={index} card={card} />)
      : <><PlayingCard hidden /><PlayingCard hidden /></>
    }</div></div>
  </div>
}
