import { Robot, WifiSlash } from '@phosphor-icons/react'
import type { Player } from '../types'

function initials(name: string) { return Array.from(name.trim()).slice(0, 2).join('').toUpperCase() }

export function PlayerSeat({ player, active, self, style }: { player: Player; active: boolean; self: boolean; style?: React.CSSProperties }) {
  const disconnected = player.status === 'disconnected'
  return <div className={`player-seat ${active ? 'active' : ''} ${self ? 'self' : ''} ${disconnected ? 'dimmed' : ''}`} style={style}>
    {player.current_bet > 0 && <span className="seat-bet"><i />{player.current_bet.toLocaleString()}</span>}
    <div className="avatar-ring"><div className="avatar">{player.is_bot ? <Robot weight="fill" /> : initials(player.nickname)}</div></div>
    <div className="seat-identity">
      <strong>{player.nickname}{self ? ' · YOU' : ''}</strong>
      <span>{disconnected ? <><WifiSlash /> OFFLINE</> : player.chips.toLocaleString()}</span>
    </div>
    <div className="seat-tags">{player.is_dealer && <b>D</b>}{player.is_small_blind && <b>SB</b>}{player.is_big_blind && <b>BB</b>}</div>
  </div>
}

