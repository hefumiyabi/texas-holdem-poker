import { useEffect, useState } from 'react'
import { formatMoney } from '../currency'
import { translate } from '../i18n'
import type { CurrencyCode, Language, TableInfo } from '../types'
import { PlayingCard } from './PlayingCard'

export function PokerBoard({ language, table, currency }: { language: Language; table: TableInfo; currency?: CurrencyCode }) {
  const [observedAt, setObservedAt] = useState(() => Date.now())
  const [, setTick] = useState(0)
  useEffect(() => { setObservedAt(Date.now()) }, [table.blind_seconds_remaining, table.tournament_paused])
  useEffect(() => {
    if (table.tournament_paused) return
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [table.tournament_paused])
  const initialRemaining = Math.max(0, table.blind_seconds_remaining ?? 0)
  const remaining = table.tournament_paused
    ? initialRemaining
    : Math.max(0, initialRemaining - Math.floor((Date.now() - observedAt) / 1000))
  const clock = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`
  return <div className="poker-table" aria-label={language === 'zh' ? '牌桌' : 'Poker table'}>
    <div className="felt-grain" aria-hidden="true" />
    {table.small_blind && table.big_blind && <div className="blind-status" aria-label={language === 'zh' ? '当前盲注' : 'Current blinds'}>
      <strong>{formatMoney(table.small_blind, currency)} / {formatMoney(table.big_blind, currency)}</strong>
      <small>{table.tournament_paused ? (language === 'zh' ? '盲注时钟已暂停' : 'Blind clock paused') : (language === 'zh' ? `下一级 ${clock}` : `Next level ${clock}`)}</small>
      {table.next_small_blind && table.next_big_blind && <small>{language === 'zh' ? '下一档' : 'Next'} {formatMoney(table.next_small_blind, currency)} / {formatMoney(table.next_big_blind, currency)}</small>}
    </div>}
    <div className="table-center">
      <span className="pot-label">{translate(language, 'pot')}</span>
      <strong className="pot-value"><i />{formatMoney(table.pot, currency)}</strong>
      <div className="community-cards" aria-label={translate(language, 'communityCards')}>
        {Array.from({ length: 5 }, (_, index) => <span data-testid="community-card-slot" key={index}>
          {table.community_cards[index] ? <PlayingCard card={table.community_cards[index]} /> : <span className="empty-card" />}
        </span>)}
      </div>
      <small>{table.game_stage === 'waiting' ? translate(language, 'waiting') : table.game_stage.replace('_', ' ').toUpperCase()}</small>
    </div>
  </div>
}
