import { Check, Copy, ShareNetwork, UsersThree, X } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'

import { translate } from '../i18n'
import type { CurrencyCode, FriendRoomConfig, Language, RebuyLimit, RoomInfo } from '../types'

const seatCounts = [2, 4, 6] as const
const buyIns: Record<CurrencyCode, readonly number[]> = {
  CNY: [1000, 5000, 10000],
  JPY: [10000, 200000, 500000],
}
const symbols: Record<CurrencyCode, string> = { CNY: '¥', JPY: 'JP¥' }
const rebuyLimits: RebuyLimit[] = [0, 1, 2, 3, 'unlimited']

export function FriendRoomSetup({ language, onClose, onCreate, onEnter }: {
  language: Language
  onClose: () => void
  onCreate: (config: FriendRoomConfig) => Promise<RoomInfo>
  onEnter: (room: RoomInfo) => void
}) {
  const [seatCount, setSeatCount] = useState<2 | 4 | 6>(6)
  const [currency, setCurrency] = useState<CurrencyCode>('CNY')
  const [initialChips, setInitialChips] = useState(1000)
  const [customBuyIn, setCustomBuyIn] = useState(false)
  const [smallBlind, setSmallBlind] = useState('10')
  const [bigBlind, setBigBlind] = useState('20')
  const [rebuyLimit, setRebuyLimit] = useState<RebuyLimit>(1)
  const [room, setRoom] = useState<RoomInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus()
    return () => previousFocus.current?.focus()
  }, [])

  const seatLabel = (value: 2 | 4 | 6) => translate(language, value === 2 ? 'headsUp' : value === 4 ? 'fourPlayers' : 'sixPlayers')
  const rebuyLabel = (value: RebuyLimit) => translate(language, value === 0 ? 'rebuyNone' : value === 1 ? 'rebuyOnce' : value === 2 ? 'rebuyTwice' : value === 3 ? 'rebuyThree' : 'rebuyUnlimited')
  const inviteUrl = room?.invite_url || (room ? `${window.location.origin}/room/${room.join_code}` : '')
  const chooseCurrency = (next: CurrencyCode) => {
    setCurrency(next)
    setInitialChips(next === 'CNY' ? 1000 : 10000)
    setSmallBlind(next === 'CNY' ? '10' : '100')
    setBigBlind(next === 'CNY' ? '20' : '200')
    setCustomBuyIn(false)
    setError('')
  }
  const create = async () => {
    if (busy) return
    const parsedSmallBlind = Number(smallBlind)
    const parsedBigBlind = Number(bigBlind)
    if (!Number.isInteger(initialChips) || initialChips < 100 || initialChips > 10_000_000) {
      setError(translate(language, 'invalidBuyIn')); return
    }
    if (!Number.isInteger(parsedSmallBlind) || parsedSmallBlind < 1 || !Number.isInteger(parsedBigBlind) || parsedBigBlind <= parsedSmallBlind) {
      setError(translate(language, 'invalidBlinds')); return
    }
    if (parsedSmallBlind >= initialChips || parsedBigBlind >= initialChips) {
      setError(translate(language, 'blindsBelowBuyIn')); return
    }
    setBusy(true)
    setError('')
    try { setRoom(await onCreate({ seatCount, currency, initialChips, smallBlind: parsedSmallBlind, bigBlind: parsedBigBlind, rebuyLimit })) }
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
  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
    if (event.key !== 'Tab') return
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])') || [])
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  return <div className="challenge-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section ref={dialogRef} className="challenge-sheet friend-room-sheet" role="dialog" aria-modal="true" aria-label={translate(language, 'setupFriendRoom')} onKeyDown={handleDialogKeyDown}>
      <div className="sheet-grabber" aria-hidden="true" />
      <header><div><span><UsersThree weight="fill" /> {translate(language, 'friendsOnly')}</span><h2>{translate(language, room ? 'roomReady' : 'chooseTable')}</h2></div><button ref={closeRef} className="sheet-close" onClick={onClose} aria-label={translate(language, 'close')}><X /></button></header>
      {!room ? <>
        <p className="friend-room-intro">{translate(language, 'friendRoomHint')}</p>
        <div className="friend-room-form">
          <fieldset><legend>{translate(language, 'currency')}</legend><div className="choice-grid currency-grid">
            {(['CNY', 'JPY'] as const).map((value) => <button key={value} aria-label={`${translate(language, value === 'CNY' ? 'cny' : 'jpy')} ${symbols[value]}`} aria-pressed={currency === value} onClick={() => chooseCurrency(value)}><strong>{symbols[value]}</strong><span>{translate(language, value === 'CNY' ? 'cny' : 'jpy')}</span></button>)}
          </div></fieldset>
          <fieldset><legend>{translate(language, 'tableSize')}</legend><div className="choice-grid seat-grid">{seatCounts.map((value) => <button key={value} aria-label={seatLabel(value)} aria-pressed={seatCount === value} onClick={() => setSeatCount(value)}><UsersThree /><span>{seatLabel(value)}</span></button>)}</div></fieldset>
          <fieldset><legend>{translate(language, 'buyIn')}</legend><div className="choice-grid buyin-grid friend-buyin-grid">{buyIns[currency].map((value) => <button key={value} aria-label={`${translate(language, 'buyIn')} ${symbols[currency]}${value.toLocaleString()}`} aria-pressed={!customBuyIn && initialChips === value} onClick={() => { setInitialChips(value); setCustomBuyIn(false); setError('') }}>{symbols[currency]}{value.toLocaleString()}</button>)}<button aria-label={translate(language, 'customAmount')} aria-pressed={customBuyIn} onClick={() => { setCustomBuyIn(true); setError('') }}>{translate(language, 'customAmount')}</button></div>
            {customBuyIn && <label className="stake-input full-stake-input"><span>{translate(language, 'customBuyIn')}</span><div><b>{symbols[currency]}</b><input aria-label={translate(language, 'customBuyIn')} type="number" min="100" max="10000000" step="1" value={initialChips} onChange={(event) => setInitialChips(Number(event.target.value))} /></div></label>}
          </fieldset>
          <fieldset><legend>{translate(language, 'blinds')}</legend><div className="blind-inputs">
            <label className="stake-input"><span>{translate(language, 'smallBlind')}</span><div><b>{symbols[currency]}</b><input aria-label={translate(language, 'smallBlind')} type="number" min="1" step="1" value={smallBlind} onChange={(event) => setSmallBlind(event.target.value)} /></div></label>
            <label className="stake-input"><span>{translate(language, 'bigBlind')}</span><div><b>{symbols[currency]}</b><input aria-label={translate(language, 'bigBlind')} type="number" min="2" step="1" value={bigBlind} onChange={(event) => setBigBlind(event.target.value)} /></div></label>
          </div></fieldset>
          <fieldset><legend>{translate(language, 'humanRebuys')}</legend><div className="choice-grid rebuy-grid">{rebuyLimits.map((value) => <button key={value} aria-pressed={rebuyLimit === value} onClick={() => setRebuyLimit(value)}>{rebuyLabel(value)}</button>)}</div><small className="field-hint">{translate(language, 'humanRebuysHint')}</small></fieldset>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="start-challenge" disabled={busy} onClick={create}>{busy ? translate(language, 'creatingTable') : translate(language, 'createTable')}</button>
        </div>
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
