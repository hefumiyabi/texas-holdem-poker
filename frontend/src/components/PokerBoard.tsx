import { translate } from '../i18n'
import type { Language, TableInfo } from '../types'
import { PlayingCard } from './PlayingCard'

export function PokerBoard({ language, table }: { language: Language; table: TableInfo }) {
  return <div className="poker-table" aria-label={language === 'zh' ? '牌桌' : 'Poker table'}>
    <div className="felt-grain" aria-hidden="true" />
    {table.small_blind && table.big_blind && <div className="blind-status" aria-label={language === 'zh' ? '当前盲注' : 'Current blinds'}>
      <strong>{table.small_blind.toLocaleString()} / {table.big_blind.toLocaleString()}</strong>
      <small>{language === 'zh' ? `盲注 · ${table.hands_until_blind_increase || 1} 手后升级` : `Blinds · up in ${table.hands_until_blind_increase || 1} hands`}</small>
    </div>}
    <div className="table-center">
      <span className="pot-label">{translate(language, 'pot')}</span>
      <strong className="pot-value"><i />{table.pot.toLocaleString()}</strong>
      <div className="community-cards" aria-label={translate(language, 'communityCards')}>
        {Array.from({ length: 5 }, (_, index) => <span data-testid="community-card-slot" key={index}>
          {table.community_cards[index] ? <PlayingCard card={table.community_cards[index]} /> : <span className="empty-card" />}
        </span>)}
      </div>
      <small>{table.game_stage === 'waiting' ? translate(language, 'waiting') : table.game_stage.replace('_', ' ').toUpperCase()}</small>
    </div>
  </div>
}
