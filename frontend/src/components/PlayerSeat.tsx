import { WifiSlash } from '@phosphor-icons/react'
import type { Language, Player } from '../types'
import { BotSeat } from './BotSeat'

function initials(name: string) { return Array.from(name.trim()).slice(0, 2).join('').toUpperCase() }

export function PlayerSeat({ player, active, self, style, language = 'zh', thinkingUntil, now }: { player: Player; active: boolean; self: boolean; style?: React.CSSProperties; language?: Language; thinkingUntil?: number; now?: number }) {
  if (player.is_bot) return <BotSeat player={player} active={active} thinking={active} thinkingUntil={thinkingUntil} now={now} style={style} language={language} />
  const disconnected = player.status === 'disconnected'
  const folded = player.status === 'folded'
  return <div className={`player-seat ${active ? 'active' : ''} ${self ? 'self' : ''} ${disconnected ? 'dimmed' : ''} ${folded ? 'folded' : ''}`} style={style}>
    {player.current_bet > 0 && <span className="seat-bet"><i />{player.current_bet.toLocaleString()}</span>}
    <div className="avatar-ring"><div className="avatar">{initials(player.nickname)}</div>{folded && <span className="folded-badge">{language === 'zh' ? '已弃牌' : 'Folded'}</span>}</div>
    <div className="seat-identity">
      <strong>{player.nickname}{self ? ' · YOU' : ''}</strong>
      <span>{disconnected ? <><WifiSlash /> OFFLINE</> : player.chips.toLocaleString()}</span>
    </div>
    <div className="seat-tags">{player.is_dealer && <b>D</b>}{player.is_small_blind && <b>SB</b>}{player.is_big_blind && <b>BB</b>}</div>
  </div>
}
