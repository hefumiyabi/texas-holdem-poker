import { ArrowLeft, GearSix, ShareNetwork, UsersThree } from '@phosphor-icons/react'
import { translate } from '../i18n'
import type { Language, RoomInfo, TableInfo } from '../types'

export function TableHeader({ language, room, table, copied = false, onBack, onMenu, onShare, onLineup }: {
  language: Language
  room: RoomInfo
  table: TableInfo
  copied?: boolean
  onBack: () => void
  onMenu: () => void
  onShare: () => void
  onLineup: () => void
}) {
  const difficulty = room.difficulty === 'advanced' ? 'expert' : room.difficulty === 'beginner' ? 'casual' : 'regular'
  const opponents = Math.max(0, table.players.length - 1)
  return <header className="character-table-header">
    <button className="plain-icon" onClick={onBack} aria-label={translate(language, 'leave')}><ArrowLeft /></button>
    <button className="lineup-summary" onClick={onLineup} aria-label={translate(language, 'lineup')}>
      <UsersThree weight="fill" />
      <span><strong>{translate(language, difficulty)}</strong><small>{opponents} {translate(language, 'opponents')}</small></span>
    </button>
    <div className="header-actions">
      <button className="header-icon" onClick={onShare} aria-label={translate(language, 'inviteFriend')}><ShareNetwork /></button>
      <button className="header-icon" onClick={onMenu} aria-label={translate(language, 'settings')}><GearSix /></button>
    </div>
    {copied && <span className="copy-confirmation" role="status">{translate(language, 'copied')}</span>}
  </header>
}
