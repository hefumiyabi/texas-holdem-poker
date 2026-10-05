import type { Card } from '../types'

export function PlayingCard({ card, hidden = false, small = false }: { card?: Card; hidden?: boolean; small?: boolean }) {
  if (hidden || !card) return <div className={`playing-card card-back ${small ? 'small' : ''}`} aria-label="Hidden card"><span>♠</span></div>
  const red = card.suit === '♥' || card.suit === '♦'
  return <div className={`playing-card ${red ? 'red' : ''} ${small ? 'small' : ''}`} aria-label={`${card.rank}${card.suit}`}>
    <strong>{card.rank}</strong><span>{card.suit}</span>
  </div>
}

