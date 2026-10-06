import { Robot, ShareNetwork, Trash, X } from '@phosphor-icons/react'
import { translate } from '../i18n'
import type { BotDifficulty, BotPersona, Language, Player } from '../types'

const personas: BotPersona[] = ['balanced', 'aggressive', 'tight', 'caller', 'tricky']

export function LineupDrawer({ language, players, maxPlayers, difficulty, host, waiting, onClose, onAdd, onRemove, onReplace, onShare }: {
  language: Language
  players: Player[]
  maxPlayers: number
  difficulty: BotDifficulty
  host: boolean
  waiting: boolean
  onClose: () => void
  onAdd: (persona: BotPersona) => void
  onRemove: (playerId: string) => void
  onReplace: (playerId: string, persona: BotPersona) => void
  onShare: () => void
}) {
  const bots = players.filter((player) => player.is_bot)
  const openSeats = Math.max(0, maxPlayers - players.length)
  const editable = host && waiting

  return <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="settings-drawer lineup-drawer" role="dialog" aria-modal="true" aria-label={translate(language, 'lineup')}>
      <header className="drawer-header"><div><small>{translate(language, difficulty === 'advanced' ? 'expert' : difficulty === 'beginner' ? 'casual' : 'regular')}</small><h2>{translate(language, 'lineup')}</h2></div><button className="sheet-close" onClick={onClose} aria-label={translate(language, 'close')}><X /></button></header>
      <div className="current-lineup">
        {bots.map((bot) => {
          const persona = bot.bot_persona || 'balanced'
          const next = personas[(personas.indexOf(persona) + 1) % personas.length]
          return <article className="lineup-player" key={bot.id}>
            <img src={`/avatars/${persona}.webp`} alt="" />
            <span><strong>{bot.nickname}</strong><small>{bot.persona_label || translate(language, persona)}</small></span>
            {editable && <div><button onClick={() => onReplace(bot.id, next)}>{translate(language, 'change')}</button><button onClick={() => onRemove(bot.id)} aria-label={`${translate(language, 'remove')} ${bot.nickname}`}><Trash /></button></div>}
          </article>
        })}
      </div>
      {openSeats > 0 && <div className="empty-seat-picker">
        <span><Robot /> {openSeats} {translate(language, 'emptySeats')}</span>
        {editable && <div>{personas.map((persona) => <button key={persona} onClick={() => onAdd(persona)} aria-label={language === 'zh' ? `${translate(language, 'add')}${translate(language, persona)}` : `${translate(language, 'add')} ${translate(language, persona)}`}><img src={`/avatars/${persona}.webp`} alt="" /><small>{translate(language, persona)}</small></button>)}</div>}
      </div>}
      <button className="invite-friend-button" onClick={onShare}><ShareNetwork />{translate(language, 'inviteFriend')}</button>
      {!editable && <p className="fair-play-note">{translate(language, 'betweenHandsOnly')}</p>}
    </section>
  </div>
}
