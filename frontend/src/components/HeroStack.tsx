import { Coins } from '@phosphor-icons/react'

import { formatMoney } from '../currency'
import type { CurrencyCode, Player } from '../types'
import { PlayingCard } from './PlayingCard'

export function HeroStack({ player, currency }: { player: Player; currency?: CurrencyCode }) {
  return <div className="hero-stack">
    <div className="hero-stack-info">
      <strong>{player.nickname}</strong>
      <span aria-label="Your chips"><Coins weight="fill" />{formatMoney(player.chips, currency)}</span>
    </div>
    <div className="hero-hand" aria-label="Your hand"><div>{player.hole_cards?.length
      ? player.hole_cards.map((card, index) => <PlayingCard key={index} card={card} />)
      : <><PlayingCard hidden /><PlayingCard hidden /></>
    }</div></div>
  </div>
}
