import type { CSSProperties } from 'react'
import { WifiSlash } from '@phosphor-icons/react'
import { translate } from '../i18n'
import type { Language, Player } from '../types'

export function BotSeat({ player, active, thinking, style, language }: {
  player: Player
  active: boolean
  thinking?: boolean
  style?: CSSProperties
  language: Language
}) {
  const disconnected = player.status === 'disconnected'
  const persona = player.bot_persona || 'balanced'
  const personaLabel = player.persona_label || translate(language, persona)
  const timerLabel = language === 'zh' ? `${player.nickname}思考中` : `${player.nickname} is thinking`

  return <div className={`player-seat bot-seat ${active ? 'active' : ''} ${disconnected ? 'dimmed' : ''}`} style={style}>
    {player.current_bet > 0 && <span className="seat-bet"><i />{player.current_bet.toLocaleString()}</span>}
    <div className="avatar-ring">
      <img className="avatar portrait-avatar" src={`/avatars/${persona}.webp`} alt={player.nickname} />
      {active && <span className="turn-timer" role="timer" aria-label={timerLabel}><i /></span>}
    </div>
    <div className="seat-identity">
      <strong>{player.nickname}</strong>
      <span>{disconnected ? <><WifiSlash /> OFFLINE</> : player.chips.toLocaleString()}</span>
    </div>
    <span className="persona-badge">{personaLabel}</span>
    {thinking && active && <span className="thinking-badge">{translate(language, 'botThinking')}</span>}
    <div className="seat-tags">{player.is_dealer && <b>D</b>}{player.is_small_blind && <b>SB</b>}{player.is_big_blind && <b>BB</b>}</div>
  </div>
}
