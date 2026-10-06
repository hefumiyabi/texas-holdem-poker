import { useEffect, useState, type CSSProperties } from 'react'
import { WifiSlash } from '@phosphor-icons/react'
import { formatMoney } from '../currency'
import { translate } from '../i18n'
import type { CurrencyCode, Language, Player } from '../types'

export function BotSeat({ player, active, thinking, thinkingUntil, now, style, language, currency }: {
  player: Player
  active: boolean
  thinking?: boolean
  thinkingUntil?: number
  now?: number
  style?: CSSProperties
  language: Language
  currency?: CurrencyCode
}) {
  const disconnected = player.status === 'disconnected'
  const folded = player.status === 'folded'
  const [clock, setClock] = useState(() => now ?? Date.now() / 1000)
  useEffect(() => {
    if (now !== undefined) { setClock(now); return }
    const timer = window.setInterval(() => setClock(Date.now() / 1000), 250)
    return () => window.clearInterval(timer)
  }, [now])
  const persona = player.bot_persona || 'balanced'
  const personaLabel = player.persona_label || translate(language, persona)
  const seconds = thinkingUntil ? Math.max(0, Math.ceil(thinkingUntil - (now ?? clock))) : undefined
  const timerLabel = seconds === undefined
    ? (language === 'zh' ? `${player.nickname}思考中` : `${player.nickname} is thinking`)
    : (language === 'zh' ? `${player.nickname} 思考中，约 ${seconds} 秒` : `${player.nickname} is thinking, about ${seconds} seconds`)

  return <div className={`player-seat bot-seat ${active ? 'active' : ''} ${disconnected ? 'dimmed' : ''} ${folded ? 'folded' : ''}`} style={style}>
    {player.current_bet > 0 && <span className="seat-bet"><i />{formatMoney(player.current_bet, currency)}</span>}
    <div className="avatar-ring">
      <img className="avatar portrait-avatar" src={`/avatars/${persona}.webp`} alt={player.nickname} />
      {active && <span className="turn-timer" role="timer" aria-label={timerLabel}><i /></span>}
      {folded && <span className="folded-badge">{language === 'zh' ? '已弃牌' : 'Folded'}</span>}
    </div>
    <div className="seat-identity">
      <strong>{player.nickname}</strong>
      <span>{disconnected ? <><WifiSlash /> OFFLINE</> : formatMoney(player.chips, currency)}</span>
    </div>
    <span className="persona-badge">{personaLabel}</span>
    {thinking && active && <span className="thinking-badge">{translate(language, 'botThinking')}</span>}
    <div className="seat-tags">{player.is_dealer && <b>D</b>}{player.is_small_blind && <b>SB</b>}{player.is_big_blind && <b>BB</b>}</div>
  </div>
}
