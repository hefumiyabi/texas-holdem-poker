import { Check, Copy, ShareNetwork, UsersThree, X } from '@phosphor-icons/react'
import { useState } from 'react'

import { translate } from '../i18n'
import type { FriendRoomConfig, Language, RoomInfo } from '../types'

const seatCounts = [2, 4, 6] as const
const buyIns = [1000, 5000, 10000] as const

export function FriendRoomSetup({ language, onClose, onCreate, onEnter }: {
  language: Language
  onClose: () => void
  onCreate: (config: FriendRoomConfig) => Promise<RoomInfo>
  onEnter: (room: RoomInfo) => void
}) {
  const [seatCount, setSeatCount] = useState<2 | 4 | 6>(6)
  const [initialChips, setInitialChips] = useState<1000 | 5000 | 10000>(1000)
  const [room, setRoom] = useState<RoomInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const seatLabel = (value: 2 | 4 | 6) => translate(language, value === 2 ? 'headsUp' : value === 4 ? 'fourPlayers' : 'sixPlayers')
  const inviteUrl = room?.invite_url || (room ? `${window.location.origin}/room/${room.join_code}` : '')
  const create = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    try { setRoom(await onCreate({ seatCount, initialChips })) }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); setBusy(false) }
  }
  const copyInvite = async () => {
    try { await navigator.clipboard.writeText(inviteUrl); setCopied(true) }
    catch { setError(translate(language, 'copyFailed')) }
  }
  const shareInvite = async () => {
    if (!navigator.share) { await copyInvite(); return }
    try {
      await navigator.share({ title: room?.title, text: translate(language, 'inviteMessage'), url: inviteUrl })
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === 'AbortError') && (reason as { name?: string })?.name !== 'AbortError') {
        setError(translate(language, 'shareFailed'))
      }
    }
  }

  return <div className="challenge-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="challenge-sheet friend-room-sheet" role="dialog" aria-modal="true" aria-label={translate(language, 'setupFriendRoom')}>
      <div className="sheet-grabber" aria-hidden="true" />
      <header><div><span><UsersThree weight="fill" /> {translate(language, 'friendsOnly')}</span><h2>{translate(language, room ? 'roomReady' : 'chooseTable')}</h2></div><button className="sheet-close" onClick={onClose} aria-label={translate(language, 'close')}><X /></button></header>
      {!room ? <>
        <p className="friend-room-intro">{translate(language, 'friendRoomHint')}</p>
        <fieldset><legend>{translate(language, 'tableSize')}</legend><div className="choice-grid seat-grid">{seatCounts.map((value) => <button key={value} aria-label={seatLabel(value)} aria-pressed={seatCount === value} onClick={() => setSeatCount(value)}><UsersThree /><span>{seatLabel(value)}</span></button>)}</div></fieldset>
        <fieldset><legend>{translate(language, 'buyIn')}</legend><div className="choice-grid buyin-grid">{buyIns.map((value) => <button key={value} aria-label={`${translate(language, 'buyIn')} ${value.toLocaleString()}`} aria-pressed={initialChips === value} onClick={() => setInitialChips(value)}>{value.toLocaleString()}</button>)}</div></fieldset>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="start-challenge" disabled={busy} onClick={create}>{busy ? translate(language, 'creatingTable') : translate(language, 'createTable')}</button>
      </> : <div className="invite-ready">
        <p>{translate(language, 'shareCodeHint')}</p>
        <strong className="created-room-code">{room.join_code}</strong>
        <div className="invite-actions">
          <button onClick={copyInvite}>{copied ? <Check weight="bold" /> : <Copy />}<span>{translate(language, copied ? 'copied' : 'copyInvite')}</span></button>
          <button onClick={shareInvite}><ShareNetwork /><span>{translate(language, 'systemShare')}</span></button>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="start-challenge" onClick={() => onEnter(room)}>{translate(language, 'enterCreatedTable')}</button>
      </div>}
    </section>
  </div>
}
