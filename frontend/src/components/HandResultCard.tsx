import type { HandResult, Language } from '../types'

export function HandResultCard({ language, result }: { language: Language; result: HandResult }) {
  const winner = result.winners[0]
  const winningPlayer = result.showdown_players.find((player) =>
    player.player_id === winner?.player_id || player.nickname === winner?.nickname)
  const strongestLoser = result.showdown_players
    .filter((player) => player.result !== 'winner')
    .sort((a, b) => a.rank - b.rank)[0]
  const title = language === 'zh' ? `${winner?.nickname || '玩家'} 获胜` : `${winner?.nickname || 'Player'} wins`
  return <section className="hand-result-card" role="status">
    <header><small>{language === 'zh' ? '本手结果' : 'Hand result'}</small><strong>{title}</strong><span>+{winner?.amount || result.pot}</span></header>
    {!result.is_showdown || result.win_reason === 'others_folded'
      ? <p className="result-reason">{language === 'zh' ? '其他玩家弃牌' : 'All other players folded'}</p>
      : <>
        {winningPlayer && <div className="winning-hand">
          <b>{winningPlayer.hand_description}</b>
          <span className="result-cards" aria-label={`${winningPlayer.nickname} ${language === 'zh' ? '手牌' : 'hand'}`}>
            {winningPlayer.hole_cards.map((card) => `${card.rank}${card.suit}`).join('')}
          </span>
        </div>}
        {strongestLoser && <p className="result-reason">{language === 'zh' ? `击败 ${strongestLoser.hand_description}` : `Beats ${strongestLoser.hand_description}`}</p>}
        <div className="showdown-list">{result.showdown_players.filter((player) => player !== winningPlayer).map((player) => <div key={player.player_id || player.nickname}>
          <span>{player.nickname}</span>
          <span aria-label={`${player.nickname} ${language === 'zh' ? '手牌' : 'hand'}`}>{player.hole_cards.map((card) => `${card.rank}${card.suit}`).join('')}</span>
          <b>{player.hand_name}</b>
        </div>)}</div>
      </>}
  </section>
}
