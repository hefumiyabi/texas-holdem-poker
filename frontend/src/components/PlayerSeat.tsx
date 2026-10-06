import { useEffect, useState } from 'react'
import { WifiSlash } from '@phosphor-icons/react'
import type { Language, Player } from '../types'
import { BotSeat } from './BotSeat'

function initials(name: string) { return Array.from(name.trim()).slice(0, 2).join('').toUpperCase() }

function useClock(now?: number) {
  const [current, setCurrent] = useState(() => now ?? Date.now() / 1000)
  useEffect(() => {
    if (now !== undefined) { setCurrent(now); return }
    const timer = window.setInterval(() => setCurrent(Date.now() / 1000), 250)
    return () => window.clearInterval(timer)
  }, [now])
  return now ?? current
}

export function PlayerSeat({ player, active, self, style, language = 'zh', deadline, thinkingUntil, now }: { player: Player; active: boolean; self: boolean; style?: React.CSSProperties; language?: Language; deadline?: number; thinkingUntil?: number; now?: number }) {
  if (player.is_bot) return <BotSeat player={player} active={active} thinking={active} thinkingUntil={thinkingUntil} now={now} style={style} language={language} />
  const disconnected = player.status === 'disconnected'
  const folded = player.status === 'folded'
  const current = useClock(now)
  const seconds = deadline ? Math.max(0, Math.ceil(deadline - current)) : 0
  const timerLabel = language === 'zh' ? `${player.nickname} 剩余 ${seconds} 秒` : `${player.nickname} has ${seconds} seconds left`
  return <div className={`player-seat ${active ? 'active' : ''} ${self ? 'self' : ''} ${disconnected ? 'dimmed' : ''} ${folded ? 'folded' : ''}`} style={style}>
    {player.current_bet > 0 && <span className="seat-bet"><i />{player.current_bet.toLocaleString()}</span>}
    <div className="avatar-ring"><div className="avatar">{initials(player.nickname)}</div>{active && deadline && <span className="turn-timer" role="timer" aria-label={timerLabel}><i /></span>}{folded && <span className="folded-badge">{language === 'zh' ? '已弃牌' : 'Folded'}</span>}</div>
    <div className="seat-identity">
      <strong>{player.nickname}{self ? ' · YOU' : ''}</strong>
      <span>{disconnected ? <><WifiSlash /> OFFLINE</> : player.chips.toLocaleString()}</span>
    </div>
    <div className="seat-tags">{player.is_dealer && <b>D</b>}{player.is_small_blind && <b>SB</b>}{player.is_big_blind && <b>BB</b>}</div>
  </div>
}
